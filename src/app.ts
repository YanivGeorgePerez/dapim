import { serve } from "bun";
import { pasteRoutes } from "./routes/pasteRoutes.ts";
import path from "path";

// Serve static files from the "public" folder
async function staticFileHandler(req: Request): Promise<Response | null> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // Map /styles/home.css => ./public/styles/home.css
  const filePath = path.join(import.meta.dir, "../public", pathname);

  try {
    const file = Bun.file(filePath);
    if (!(await file.exists())) return null;

    return new Response(file, {
      headers: {
        "Content-Type": getMimeType(filePath),
      },
    });
  } catch (err) {
    return null;
  }
}

// MIME type detection
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return {
    ".css": "text/css",
    ".js": "application/javascript",
    ".html": "text/html",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
  }[ext] || "application/octet-stream";
}

const server = serve({
  port: 3000,
  async fetch(req) {
    // Serve static files first
    const staticResponse = await staticFileHandler(req);
    if (staticResponse) return staticResponse;

    // Otherwise, handle routes
    return pasteRoutes(req);
  },
});

console.log("Server running at http://localhost:3000");
