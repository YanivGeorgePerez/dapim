// ────────────────────────────────────────────────────────────
// src/routes/home.ts
// ────────────────────────────────────────────────────────────
import { PasteModel }  from "../models/pasteModel.ts";
import { renderEJS }   from "./_utils.ts";

/* simple in-memory cache for the “/” page when no ?q search */
let cached: { ts: number; html: string } | null = null;
const TTL = 10_000;                                     // 10 s

export async function homeRoute(req: Request): Promise<Response | null> {
  /* route guard ---------------------------------------------------------- */
  if (req.method !== "GET")       return null;
  const url = new URL(req.url);
  if (url.pathname !== "/")       return null;

  const q = url.searchParams.get("q") ?? "";

  /* serve cache (only when no search) ------------------------------------ */
  if (!q && cached && Date.now() - cached.ts < TTL) {
    return new Response(cached.html, {
      headers: {
        "Content-Type": "text/html",
        "Cache-Control": `public, max-age=${TTL / 1000}`,
      },
    });
  }

  /* fetch enriched pastes in ONE aggregation ----------------------------- */
  const pastes = q
    ? await PasteModel.searchWithAuthor(q, 20)
    : await PasteModel.listRecentWithAuthor(20);

  /* render ---------------------------------------------------------------- */
  const html = await renderEJS("index", {
    title: "Dapim",
    cssFile: "/styles/home.css",
    pastes,
    query: q,
    req,
    recaptchaSiteKey: Bun.env.RECAPTCHA_SITE_KEY ?? "",
  });

  if (!q) cached = { ts: Date.now(), html };            // refresh cache

  return new Response(html, { headers: { "Content-Type": "text/html" } });
}
