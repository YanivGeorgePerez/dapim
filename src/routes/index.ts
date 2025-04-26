// src/routes/index.ts
import { homeRoute }   from "./home.ts";
import { pasteRoutes } from "./paste.ts";
import { authRoutes }  from "./auth.ts";
import { profileRoute } from "./profile.ts";
import { tosRoute }     from "./tos.ts";

export async function router(req: Request): Promise<Response> {
  // Home (`/`)
  const hr = await homeRoute(req);
  if (hr) return hr;

  // Paste (`/paste/:id` and `/create`)
  for (const handler of pasteRoutes) {
    const r = await handler(req);
    if (r) return r;
  }

  // Auth (`/login`, `/register`, etc)
  for (const handler of authRoutes) {
    const r = await handler(req);
    if (r) return r;
  }

  // Profile
  const pr = await profileRoute(req);
  if (pr) return pr;

  // TOS
  const tr = await tosRoute(req);
  if (tr) return tr;

  return new Response("Not Found", { status: 404 });
}
