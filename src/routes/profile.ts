// src/routes/profile.ts
import { PasteService } from "../services/pasteService.ts";
import { getUserFromRequest } from "../lib/session.ts";
import { renderEJS } from "./_utils.ts";

const service = new PasteService();

export async function profileRoute(req: Request): Promise<Response|null> {
  if (req.method !== "GET") return null;

  const url = new URL(req.url);
  if (!url.pathname.startsWith("/profile")) return null;

  const loggedIn = getUserFromRequest(req);
  const name     = url.pathname === "/profile"
      ? loggedIn
      : url.pathname.split("/")[2] || null;

  if (!name)   // not logged in requesting /profile
    return new Response("", { status: 302, headers: { Location: "/login" } });

  const pastes  = await service.getPastesByUser(name);
  const html    = await renderEJS("profile", {
    title: `${name}'s profile`,
    cssFile: "/styles/home.css",
    profileUser: name,
    pastes,
    req
  });
  return new Response(html, { headers: { "Content-Type": "text/html" } });
}
