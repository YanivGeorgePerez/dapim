// src/routes/home.ts
import { PasteModel } from "../models/pasteModel.ts";
import { renderEJS }  from "./_utils.ts";

let cache: { ts: number; html: string } | null = null;
const TTL = 10_000;

export async function homeRoute(req: Request): Promise<Response|null> {
  if (req.method !== "GET") return null;
  const url = new URL(req.url);
  if (url.pathname !== "/") return null;

  const q = url.searchParams.get("q") ?? "";

  if (!q && cache && Date.now() - cache.ts < TTL) {
    return new Response(cache.html, {
      headers: {
        "Content-Type": "text/html",
        "Cache-Control": `public, max-age=${TTL/1000}`,
      },
    });
  }

  // single‐stage aggregation fetches both recents & author+group
  const pastes = q
    ? await PasteModel.searchWithAuthor(q, 20)
    : await PasteModel.listRecentWithAuthor(20);

  const html = await renderEJS("index", {
    title: "Dapim",
    cssFile: "/styles/home.css",
    pastes,
    query: q,
    req,
    recaptchaSiteKey: Bun.env.RECAPTCHA_SITE_KEY ?? "",
  });

  if (!q) cache = { ts: Date.now(), html };
  return new Response(html, { headers: { "Content-Type": "text/html" } });
}
