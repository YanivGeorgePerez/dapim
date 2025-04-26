// src/routes/index.ts
import { homeRoute    } from "./home.ts";
import { pasteRoutes  } from "./paste.ts";
import { authRoutes   } from "./auth.ts";
import { profileRoute } from "./profile.ts";
import { tosRoute     } from "./tos.ts";

/**
 * Runs every route handler in sequence; the first one
 * that returns a non-null Response “wins”.
 */
const handlers = [
  homeRoute,
  ...pasteRoutes,     // pasteRoutes exports an array
  ...authRoutes,
  profileRoute,
  tosRoute,
];

export async function router(req: Request): Promise<Response> {
  for (const h of handlers) {
    const res = await h(req);
    if (res) return res;
  }
  return new Response("Not Found", { status: 404 });
}
