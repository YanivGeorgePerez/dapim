// src/routes/tos.ts
import { renderEJS } from "./_utils.ts";

export async function tosRoute(req: Request): Promise<Response|null> {
  if (req.method !== "GET" || new URL(req.url).pathname !== "/tos")
    return null;

  const html = await renderEJS("tos", {
    title: "Terms of Service",
    cssFile: "/styles/home.css",
    req
  });
  return new Response(html, { headers: { "Content-Type": "text/html" } });
}
