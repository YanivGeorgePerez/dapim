// src/routes/pasteRoutes.ts

import { PasteService } from "../services/pasteService.ts";
import { AuthService } from "../services/authService.ts";
import { setSessionCookie, getUserFromRequest } from "../lib/session.ts";
import { destroySession } from "../lib/sessionManager.ts";
import { verifyRecaptcha } from "../lib/recaptcha.ts";
import { parse } from "cookie";
import { UserModel } from "../models/userModel.ts";
import { GroupModel } from "../models/groupModel.ts";
import path from "path";

const pasteService = new PasteService();
const authService = new AuthService();

// In-memory cache for homepage (only when there's no search)
let homepageCache: {
  timestamp: number;
  pastes: Awaited<ReturnType<PasteService["getRecentPastes"]>>;
} | null = null;
const CACHE_TTL = 10_000; // 10 seconds

export const pasteRoutes = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const user = getUserFromRequest(req);

  const serverError = () =>
    new Response("Server error", {
      status: 500,
      headers: { "Content-Type": "text/html" },
    });

  // ----------------------------------
  // HOMEPAGE WITH SEARCH, CACHE & COLORS
  // ----------------------------------
  if (req.method === "GET" && url.pathname === "/") {
    const q = url.searchParams.get("q") || "";

    // Serve cache if fresh and no query
    if (!q && homepageCache && Date.now() - homepageCache.timestamp < CACHE_TTL) {
      const html = await renderEJS("index", {
        title: "Dapim",
        cssFile: "/styles/home.css",
        pastes: homepageCache.pastes,
        query: q,
        req,
        recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY || "",
      });
      return new Response(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html",
          "Cache-Control": `public, max-age=${CACHE_TTL / 1000}`,
        },
      });
    }

    try {
      // Fetch raw pastes
      const raw = q
        ? await pasteService.searchPastes(q)
        : await pasteService.getRecentPastes();

      // Enrich with userColor from group
      const pastes = await Promise.all(
        raw.map(async (p) => {
          const u = await UserModel.findByUsername(p.user);
          const grp = u ? await GroupModel.getByName(u.group) : null;
          return {
            ...p,
            userColor: grp?.color ?? "var(--accent)",
          };
        })
      );

      // Cache if no query
      if (!q) homepageCache = { timestamp: Date.now(), pastes };

      const html = await renderEJS("index", {
        title: "Dapim",
        cssFile: "/styles/home.css",
        pastes,
        query: q,
        req,
        recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY || "",
      });
      return new Response(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html",
          "Cache-Control": !q
            ? `public, max-age=${CACHE_TTL / 1000}`
            : "no-cache",
        },
      });
    } catch (err) {
      console.error("Error in homepage route:", err);
      return serverError();
    }
  }

  // -------------------
  // VIEW A SINGLE PASTE
  // -------------------
  if (req.method === "GET" && url.pathname.startsWith("/paste/")) {
    const pasteId = url.pathname.split("/paste/")[1];
    try {
      const paste = await pasteService.getPasteById(pasteId);
      if (!paste) {
        return new Response("Paste not found", { status: 404, headers: { "Content-Type": "text/html" } });
      }
      // Record view
      const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("remote-addr") || "unknown";
      await pasteService.addViewToPaste(pasteId, clientIp);

      const html = await renderEJS("paste", {
        title: `Paste: ${paste.title}`,
        paste,
        cssFile: "/styles/paste.css",
        req,
      });
      return new Response(html, { status: 200, headers: { "Content-Type": "text/html" } });
    } catch (err) {
      console.error("Error in paste view route:", err);
      return serverError();
    }
  }

  // -------------------
  // TERMS OF SERVICE
  // -------------------
  if (req.method === "GET" && url.pathname === "/tos") {
    const html = await renderEJS("tos", {
      title: "Terms of Service",
      cssFile: "/styles/home.css",
      req,
    });
    return new Response(html, { status: 200, headers: { "Content-Type": "text/html" } });
  }

  // -------------------
  // CREATE PASTE (GET)
  // -------------------
  if (req.method === "GET" && url.pathname === "/create") {
    const html = await renderEJS("create", {
      title: "Create Paste",
      cssFile: "/styles/home.css",
      req,
      recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY || "",
    });
    return new Response(html, { status: 200, headers: { "Content-Type": "text/html" } });
  }

  // -------------------
  // CREATE PASTE (POST + ReCAPTCHA)
  // -------------------
  if (req.method === "POST" && url.pathname === "/create") {
    const form = await req.formData();
    const pasteTitle = form.get("title")?.toString() || "";
    const content = form.get("content")?.toString() || "";
    const recaptchaResponse = form.get("g-recaptcha-response")?.toString() || "";

    if (!(await verifyRecaptcha(recaptchaResponse))) {
      return new Response("ReCAPTCHA verification failed", { status: 400, headers: { "Content-Type": "text/html" } });
    }
    if (!pasteTitle.trim() || !content.trim()) {
      return new Response("Title and content cannot be empty", { status: 400, headers: { "Content-Type": "text/html" } });
    }
    if (pasteTitle.length > 100) {
      return new Response("Title is too long", { status: 400, headers: { "Content-Type": "text/html" } });
    }
    if (content.length > 10000) {
      return new Response("Content is too long", { status: 400, headers: { "Content-Type": "text/html" } });
    }

    try {
      const creator = user || "Anonymous";
      const paste = await pasteService.createPaste(pasteTitle, content, creator);
      homepageCache = null; // invalidate
      return new Response("", { status: 302, headers: { Location: `/paste/${paste.id}` } });
    } catch (err) {
      console.error("Error creating paste:", err);
      return serverError();
    }
  }

  // -------------------
  // REGISTER (GET)
  // -------------------
  if (req.method === "GET" && url.pathname === "/register") {
    const html = await renderEJS("auth/register", {
      title: "Register",
      cssFile: "/styles/home.css",
      req,
      recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY || "",
    });
    return new Response(html, { status: 200, headers: { "Content-Type": "text/html" } });
  }

  // -------------------
  // REGISTER (POST + ReCAPTCHA)
  // -------------------
  if (req.method === "POST" && url.pathname === "/register") {
    const form = await req.formData();
    const username = form.get("username")?.toString() || "";
    const password = form.get("password")?.toString() || "";
    const recaptchaResponse = form.get("g-recaptcha-response")?.toString() || "";

    if (!(await verifyRecaptcha(recaptchaResponse))) {
      return new Response("ReCAPTCHA verification failed", { status: 400, headers: { "Content-Type": "text/html" } });
    }
    if (!username.trim() || !password.trim()) {
      return new Response("Username and password cannot be empty", { status: 400, headers: { "Content-Type": "text/html" } });
    }
    if (username.length > 50) {
      return new Response("Username is too long", { status: 400, headers: { "Content-Type": "text/html" } });
    }
    if (password.length < 6) {
      return new Response("Password must be at least 6 characters", { status: 400, headers: { "Content-Type": "text/html" } });
    }

    try {
      await authService.register(username, password);
      return new Response("", { status: 302, headers: { Location: "/login" } });
    } catch (err) {
      console.error("Error during registration:", err);
      return new Response("Registration failed", { status: 400, headers: { "Content-Type": "text/html" } });
    }
  }

  // -------------------
  // LOGIN (GET)
  // -------------------
  if (req.method === "GET" && url.pathname === "/login") {
    const html = await renderEJS("auth/login", {
      title: "Login",
      cssFile: "/styles/home.css",
      req,
      recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY || "",
    });
    return new Response(html, { status: 200, headers: { "Content-Type": "text/html" } });
  }

  // -------------------
  // LOGIN (POST + ReCAPTCHA)
  // -------------------
  if (req.method === "POST" && url.pathname === "/login") {
    const form = await req.formData();
    const username = form.get("username")?.toString() || "";
    const password = form.get("password")?.toString() || "";
    const recaptchaResponse = form.get("g-recaptcha-response")?.toString() || "";

    if (!(await verifyRecaptcha(recaptchaResponse))) {
      return new Response("ReCAPTCHA verification failed", { status: 400, headers: { "Content-Type": "text/html" } });
    }
    if (!username.trim() || !password.trim()) {
      return new Response("Username and password cannot be empty", { status: 400, headers: { "Content-Type": "text/html" } });
    }

    try {
      await authService.login(username, password);
      return new Response("", {
        status: 302,
        headers: {
          ...setSessionCookie(username),
          Location: "/",
        },
      });
    } catch (err) {
      console.error("Login error:", err);
      return new Response("Login failed", { status: 401, headers: { "Content-Type": "text/html" } });
    }
  }

  // -------------------
  // PROFILE (GET /profile & /profile/:name)
  // -------------------
  if (req.method === "GET" && url.pathname.startsWith("/profile")) {
    let profileUser: string | null = null;
    if (url.pathname === "/profile") {
      profileUser = user;
      if (!profileUser) {
        return new Response("", { status: 302, headers: { Location: "/login" } });
      }
    } else {
      profileUser = url.pathname.split("/")[2] || null;
    }

    try {
      const pastes = await pasteService.getPastesByUser(profileUser!);
      const html = await renderEJS("profile", {
        title: `${profileUser}'s Profile`,
        cssFile: "/styles/home.css",
        profileUser,
        pastes,
        req,
      });
      return new Response(html, { status: 200, headers: { "Content-Type": "text/html" } });
    } catch (err) {
      console.error("Error loading profile:", err);
      return serverError();
    }
  }

  // -------------------
  // ADD COMMENT (POST)
  // -------------------
  if (req.method === "POST" && url.pathname.match(/^\/paste\/[^\/]+\/comment$/)) {
    const pasteId = url.pathname.split("/")[2];
    const form = await req.formData();
    const commentContent = form.get("content")?.toString() || "";

    if (!commentContent.trim()) {
      return new Response("Comment cannot be empty", { status: 400, headers: { "Content-Type": "text/html" } });
    }

    const commenter = user || "Anonymous";
    try {
      const comment = await pasteService.addCommentToPaste(pasteId, commenter, commentContent);
      if (!comment) {
        return new Response("Paste not found", { status: 404, headers: { "Content-Type": "text/html" } });
      }
      return new Response("", { status: 302, headers: { Location: `/paste/${pasteId}` } });
    } catch (err) {
      console.error("Error adding comment:", err);
      return new Response("Server error", { status: 500, headers: { "Content-Type": "text/html" } });
    }
  }

  // -------------------
  // LOGOUT
  // -------------------
  if (req.method === "GET" && url.pathname === "/logout") {
    const cookieHeader = req.headers.get("cookie");
    if (cookieHeader) {
      const cookies = parse(cookieHeader);
      if (cookies.session) {
        await destroySession(cookies.session);
      }
    }
    return new Response("", {
      status: 302,
      headers: { "Set-Cookie": "session=; Path=/; Max-Age=0", Location: "/" },
    });
  }

  // -------------------
  // FALLBACK 404
  // -------------------
  return new Response("Not Found", { status: 404, headers: { "Content-Type": "text/html" } });
};

// Shared EJS renderer
async function renderEJS(template: string, data: any): Promise<string> {
  const viewsPath = path.join(import.meta.dir, "../views");
  const ejs = await import("ejs");
  const body = await ejs.renderFile(path.join(viewsPath, `${template}.ejs`), data);
  return await ejs.renderFile(path.join(viewsPath, "layout.ejs"), {
    ...data,
    user: getUserFromRequest(data.req),
    body,
  }) as string;
}
