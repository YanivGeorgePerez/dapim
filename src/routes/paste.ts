import { PasteService }       from "../services/pasteService.ts";
import { verifyRecaptcha }    from "../lib/recaptcha.ts";
import { getUserFromRequest } from "../lib/session.ts";
import { renderEJS }          from "./_utils.ts";
import { UserModel }          from "../models/userModel.ts";
import { ObjectId }           from "mongodb";

const service = new PasteService();

export const pasteRoutes = [
  // GET /paste/:id
  async function viewPaste(req: Request): Promise<Response | null> {
    if (req.method !== "GET") return null;
    const m = new URL(req.url).pathname.match(/^\/paste\/([0-9a-fA-F]{24})$/);
    if (!m) return null;

    const paste = await service.getPasteById(new ObjectId(m[1]));
    if (!paste) return new Response("Not found", { status: 404 });

    const html = await renderEJS("paste", {
      title:   `Paste: ${paste.title}`,
      cssFile: "/styles/paste.css",
      paste,
      req,
    });
    return new Response(html, {
      headers: { "Content-Type": "text/html" },
    });
  },

  // GET & POST /create
  async function createPaste(req: Request): Promise<Response | null> {
    const url = new URL(req.url);
    if (url.pathname !== "/create") return null;

    if (req.method === "GET") {
      const html = await renderEJS("create", {
        title:            "Create Paste",
        cssFile:          "/styles/home.css",
        req,
        recaptchaSiteKey: Bun.env.RECAPTCHA_SITE_KEY ?? "",
      });
      return new Response(html, {
        headers: { "Content-Type": "text/html" },
      });
    }

    if (req.method === "POST") {
      const form = await req.formData();
      const rc   = form.get("g-recaptcha-response")?.toString() ?? "";
      if (!(await verifyRecaptcha(rc)))
        return new Response("Bad CAPTCHA", { status: 400 });

      const title   = form.get("title")?.toString().trim()   || "";
      const content = form.get("content")?.toString().trim() || "";
      if (!title || !content)
        return new Response("Empty fields", { status: 400 });

      const username = getUserFromRequest(req);
      if (!username) return new Response("Login required", { status: 401 });

      const u = await UserModel.findByUsername(username);
      if (!u || !u._id) return new Response("Invalid user", { status: 400 });

      const paste = await service.createPaste(
        title,
        content,
        u._id
      );

      return new Response("", {
        status: 302,
        headers: { Location: `/paste/${paste.id.toHexString()}` },
      });
    }

    return null;
  },
] as const;
