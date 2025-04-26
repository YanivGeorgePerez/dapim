// src/app.ts
import { serve } from "bun";
import { pasteRoutes } from "./routes/pasteRoutes.ts";
import path from "path";

// — your Mongo + Groups bootstrap —
import { connectToDB } from "./lib/mongo.ts";
import { GroupModel } from "./models/groupModel.ts";

// Serve static files from the "public" folder
async function staticFileHandler(req: Request): Promise<Response | null> {
  const url = new URL(req.url);
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

// MIME type detection
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return ({
    ".css": "text/css",
    ".js":  "application/javascript",
    ".html":"text/html",
    ".json":"application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg":"image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
  } as Record<string,string>)[ext] || "application/octet-stream";
}

// Utility to get client IP, respecting Cloudflare's header
function getClientIp(req: Request): string {
  return req.headers.get("cf-connecting-ip")
      || req.headers.get("x-forwarded-for")
      || req.headers.get("remote-addr")
      || "unknown";
}

async function bootstrap() {
  // 1) connect to MongoDB
  await connectToDB();

  // 2) seed default groups if needed
  await GroupModel.seedDefaults();

  // 3) now start the HTTP server
  const server = serve({
    port: 3000,
    async fetch(req) {
      // 3a) static assets
      const staticResponse = await staticFileHandler(req);
      if (staticResponse) return staticResponse;

      // 3b) your application routes
      return pasteRoutes(req);
    },
  });

  console.log("✅ Server running at http://localhost:3000");
}

bootstrap().catch(err => {
  console.error("Fatal error during startup:", err);
  process.exit(1);
});
