// src/routes/paste.ts
import { PasteService }  from "../services/pasteService.ts";
import { verifyRecaptcha } from "../lib/recaptcha.ts";
import { getUserFromRequest } from "../lib/session.ts";
import { renderEJS }     from "./_utils.ts";

const service = new PasteService();

/* ---------------------------------------------------------- */
/* GET /paste/:id                                             */
async function viewPaste(req: Request): Promise<Response | null> {
  if (req.method !== "GET") return null;
  const match = new URL(req.url).pathname.match(/^\/paste\/([^/]+)$/);
  if (!match) return null;

  const id    = match[1];
  const paste = await service.getPasteById(id);
  if (!paste) return new Response("Paste not found", { status: 404 });

  const html  = await renderEJS("paste", {
    title  : `Paste: ${paste.title}`,
    cssFile: "/styles/paste.css",
    paste,
    req
  });
  return new Response(html, { headers: { "Content-Type": "text/html" } });
}

/* ---------------------------------------------------------- */
/* GET  /create                                               */
/* POST /create (ReCAPTCHA)                                   */
async function createPaste(req: Request): Promise<Response | null> {
  const url = new URL(req.url);
  if (url.pathname !== "/create") return null;

  if (req.method === "GET") {
    const html = await renderEJS("create", {
      title: "Create Paste",
      cssFile: "/styles/home.css",
      req,
      recaptchaSiteKey: Bun.env.RECAPTCHA_SITE_KEY ?? ""
    });
    return new Response(html, { headers: { "Content-Type": "text/html" } });
  }

  /* ---- POST ---- */
  if (req.method === "POST") {
    const form   = await req.formData();
    const rcResp = form.get("g-recaptcha-response")?.toString() ?? "";
    if (!(await verifyRecaptcha(rcResp)))
      return new Response("Bad captcha", { status: 400 });

    const title = form.get("title")?.toString()?.trim() ?? "";
    const body  = form.get("content")?.toString()?.trim() ?? "";
    if (!title || !body)
      return new Response("Empty fields", { status: 400 });

    const username = getUserFromRequest(req) ?? "Anonymous";
    const paste    = await service.createPaste(title, body, username);
    return new Response("", {
      status: 302,
      headers: { Location: `/paste/${paste.id}` }
    });
  }

  return null;
}

/* ---------------------------------------------------------- */
export const pasteRoutes = [viewPaste, createPaste] as const;
