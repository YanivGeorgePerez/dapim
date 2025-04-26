import { PasteService }       from "../services/pasteService.ts";
import { getUserFromRequest } from "../lib/session.ts";
import { renderEJS }          from "./_utils.ts";

const service = new PasteService();

export async function profileRoute(req: Request): Promise<Response | null> {
  if (req.method !== "GET") return null;
  const url = new URL(req.url);
  if (!url.pathname.startsWith("/profile")) return null;

  const loggedIn = getUserFromRequest(req);
  const target   = url.pathname === "/profile"
    ? loggedIn
    : url.pathname.split("/")[2];

  if (!target) {
    return new Response("", {
      status: 302,
      headers: { Location: "/login" },
    });
  }

  const pastes = await service.getPastesByUser(target);
  const html   = await renderEJS("profile", {
    title:       `${target}'s Profile`,
    cssFile:     "/styles/home.css",
    profileUser: target,
    pastes,
    req,
  });
  return new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
}
