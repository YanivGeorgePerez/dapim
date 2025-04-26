// src/routes/pasteRoutes.ts
import path from "path";
import { parse } from "cookie";

import { PasteService } from "../services/pasteService.ts";
import { AuthService  } from "../services/authService.ts";
import { UserModel    } from "../models/userModel.ts";
import { GroupModel   } from "../models/groupModel.ts";

import { setSessionCookie, getUserFromRequest } from "../lib/session.ts";
import { destroySession                       } from "../lib/sessionManager.ts";
import { verifyRecaptcha                      } from "../lib/recaptcha.ts";

const pasteService = new PasteService();
const authService  = new AuthService();

// Simple in-memory cache for the home page
let homepageCache: { ts: number; pastes: Awaited<ReturnType<PasteService["getRecentPastes"]>> } | null = null;
const CACHE_TTL = 10_000;

// Central EJS renderer (never leaks full stack)
async function renderEJS(template: string, data: any): Promise<string> {
  const viewsPath = path.join(import.meta.dir, "../views");
  const ejs       = await import("ejs");
  const body      = await ejs.renderFile(path.join(viewsPath, `${template}.ejs`), data);
  return await ejs.renderFile(
    path.join(viewsPath, "layout.ejs"),
    { ...data, user: getUserFromRequest(data.req), body }
  ) as string;
}

export async function pasteRoutes(req: Request): Promise<Response> {
  const url  = new URL(req.url);
  const user = getUserFromRequest(req);

  const serverError = () =>
    new Response("Server error", { status: 500, headers: { "Content-Type":"text/html" } });

  // ─── HOME (with optional search & cache) ─────────────────────────
  if (req.method === "GET" && url.pathname === "/") {
    const q = url.searchParams.get("q") || "";

    // cached hit
    if (!q && homepageCache && Date.now() - homepageCache.ts < CACHE_TTL) {
      const html = await renderEJS("index", {
        title: "Dapim",
        cssFile: "/styles/home.css",
        pastes: homepageCache.pastes,
        query: q,
        req,
        recaptchaSiteKey: Bun.env.RECAPTCHA_SITE_KEY ?? "",
      });
      return new Response(html, {
        status: 200,
        headers: {
          "Content-Type":  "text/html",
          "Cache-Control": `public, max-age=${CACHE_TTL/1000}`,
        },
      });
    }

    try {
      // now returns PasteForList[], each has .user & .userColor
      const pastes = q
        ? await pasteService.searchPastes(q)
        : await pasteService.getRecentPastes();

      if (!q) homepageCache = { ts: Date.now(), pastes };

      const html = await renderEJS("index", {
        title: "Dapim",
        cssFile: "/styles/home.css",
        pastes,
        query: q,
        req,
        recaptchaSiteKey: Bun.env.RECAPTCHA_SITE_KEY ?? "",
      });
      return new Response(html, {
        status: 200,
        headers: {
          "Content-Type":  "text/html",
          "Cache-Control": !q ? `public, max-age=${CACHE_TTL/1000}` : "no-cache",
        },
      });
    } catch (err) {
      console.error("Home route error:", err);
      return serverError();
    }
  }

  // ─── VIEW SINGLE PASTE ────────────────────────────────────────────
  if (req.method === "GET" && url.pathname.startsWith("/paste/")) {
    const id = url.pathname.replace("/paste/", "");

    try {
      const paste = await pasteService.getPasteById(id);
      if (!paste) return new Response("Paste not found", { status: 404 });

      // record a unique view
      const ip = req.headers.get("x-forwarded-for")
              ?? req.headers.get("remote-addr")
              ?? "unknown";
      await pasteService.addViewToPaste(id, ip);

      const html = await renderEJS("paste", {
        title:   paste.title,
        paste,
        cssFile: "/styles/paste.css",
        req,
      });
      return new Response(html, { status: 200, headers: { "Content-Type":"text/html" } });
    } catch (err) {
      console.error("View-paste error:", err);
      return serverError();
    }
  }

  // ─── TERMS OF SERVICE ─────────────────────────────────────────────
  if (req.method === "GET" && url.pathname === "/tos") {
    const html = await renderEJS("tos", {
      title:   "Terms of Service",
      cssFile: "/styles/home.css",
      req,
    });
    return new Response(html, { status: 200, headers: { "Content-Type":"text/html" } });
  }

  // ─── CREATE PASTE (GET) ───────────────────────────────────────────
  if (req.method === "GET" && url.pathname === "/create") {
    const html = await renderEJS("create", {
      title:            "Create Paste",
      cssFile:          "/styles/home.css",
      req,
      recaptchaSiteKey: Bun.env.RECAPTCHA_SITE_KEY ?? "",
    });
    return new Response(html, { status: 200, headers: { "Content-Type":"text/html" } });
  }

  // ─── CREATE PASTE (POST + reCAPTCHA) ─────────────────────────────
  if (req.method === "POST" && url.pathname === "/create") {
    const form              = await req.formData();
    const title             = form.get("title")?.toString()           ?? "";
    const content           = form.get("content")?.toString()         ?? "";
    const recaptchaResponse = form.get("g-recaptcha-response")?.toString() ?? "";

    if (!(await verifyRecaptcha(recaptchaResponse))) {
      return new Response("reCAPTCHA failed", { status: 400 });
    }
    if (!title.trim() || !content.trim()) {
      return new Response("Title/content empty", { status: 400 });
    }

    try {
      const who  = user || "Anonymous";
      const paste = await pasteService.createPaste(title, content, who);
      homepageCache = null;  // invalidate
      return new Response("", {
        status: 302,
        headers: { Location: `/paste/${paste.id}` },
      });
    } catch (err) {
      console.error("Create-paste error:", err);
      return serverError();
    }
  }

  // ─── ADD COMMENT ──────────────────────────────────────────────────
  if (req.method === "POST" && /^\/paste\/[^/]+\/comment$/.test(url.pathname)) {
    const id   = url.pathname.split("/")[2];
    const form = await req.formData();
    const txt  = form.get("content")?.toString() ?? "";

    if (!txt.trim()) {
      return new Response("Comment empty", { status: 400 });
    }

    try {
      const who = user || "Anonymous";
      const comment = await pasteService.addCommentToPaste(id, who, txt);
      if (!comment) return new Response("Paste not found", { status: 404 });
      return new Response("", {
        status: 302,
        headers: { Location: `/paste/${id}` },
      });
    } catch (err) {
      console.error("Add-comment error:", err);
      return serverError();
    }
  }

  // ─── LOGOUT ────────────────────────────────────────────────────────
  if (req.method === "GET" && url.pathname === "/logout") {
    const header = req.headers.get("cookie");
    if (header) {
      const cookies = parse(header);
      if (cookies.session) {
        await destroySession(cookies.session);
      }
    }
    return new Response("", {
      status: 302,
      headers: {
        "Set-Cookie": "session=; Path=/; Max-Age=0",
        Location:   "/",
      },
    });
  }

  // ─── FALLBACK 404 ───────────────────────────────────────────────────
  return new Response("Not Found", { status: 404, headers: { "Content-Type":"text/html" } });
}
