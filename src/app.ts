// src/app.ts
import { serve }        from "bun";
import { router }       from "./routes/index.ts";   // <-- your combined router
import path             from "path";

import { connectToDB }  from "./lib/mongo.ts";
import { GroupModel }   from "./models/groupModel.ts";

/* ---------- Static file handler ---------- */
async function staticFileHandler(req: Request): Promise<Response | null> {
  const url      = new URL(req.url);
  const pathname = url.pathname;
  const filePath = path.join(import.meta.dir, "../public", pathname);

  try {
    const file = Bun.file(filePath);
    if (!(await file.exists())) return null;
    return new Response(file, {
      headers: { "Content-Type": getMimeType(filePath) },
    });
  } catch {
    return null;
  }
}

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return (
    {
      ".css": "text/css",
      ".js": "application/javascript",
      ".html": "text/html",
      ".json": "application/json",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".svg": "image/svg+xml",
    } as Record<string, string>
  )[ext] || "application/octet-stream";
}

/* ---------- Bootstrap ---------- */
async function bootstrap() {
  await connectToDB();
  await GroupModel.seedDefaults();

  serve({
    port: 3000,
    async fetch(req) {
      try {
        /* 1) Static assets */
        const staticResp = await staticFileHandler(req);
        if (staticResp) return staticResp;

        /* 2) App routes */
        return await router(req);
      } catch (err) {
        // Log detailed error server-side
        console.error("Unhandled request error:", err);
        // Show generic message to client
        return new Response("Server error", { status: 500 });
      }
    },
  });

  console.log("✅ Server running at http://localhost:3000");
}

bootstrap().catch((err) => {
  console.error("Fatal error during startup:", err);
  process.exit(1);
});
