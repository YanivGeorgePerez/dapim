import { PasteService } from "../services/pasteService.ts";
import { AuthService } from "../services/authService.ts";
import { setSessionCookie, getUserFromRequest } from "../lib/session.ts";
import { verifyRecaptcha } from "../lib/recaptcha.ts";
import path from "path";

const pasteService = new PasteService();
const authService = new AuthService();

export const pasteRoutes = async (req: Request) => {
  const url = new URL(req.url);
  const user = getUserFromRequest(req);

  // Helper: Generic error response
  function serverError(): Response {
    return new Response("Server error", {
      status: 500,
      headers: { "Content-Type": "text/html" },
    });
  }

  // ------------------
  // HOMEPAGE WITH SEARCH
  // ------------------
  if (req.method === "GET" && url.pathname === "/") {
    const q = url.searchParams.get("q") || "";
    try {
      const pastes = q
        ? await pasteService.searchPastes(q)
        : await pasteService.getRecentPastes();
      return new Response(
        await renderEJS("index", {
          title: "Dapim",
          cssFile: "/styles/home.css",
          pastes,
          query: q,
          req,
        }) as string,
        { status: 200, headers: { "Content-Type": "text/html" } }
      );
    } catch (err) {
      console.error("Error in homepage route:", err);
      return serverError();
    }
  }

  // ------------------
  // PASTE VIEW PAGE
  // ------------------
  if (req.method === "GET" && url.pathname.startsWith("/paste/")) {
    const pasteId = url.pathname.split("/paste/")[1];
    try {
      const paste = await pasteService.getPasteById(pasteId);
      if (!paste) {
        return new Response("Paste not found", {
          status: 404,
          headers: { "Content-Type": "text/html" },
        });
      }
      // Get client IP (you can adjust this for Cloudflare if needed)
      const clientIp = req.headers.get("x-forwarded-for") ||
        req.headers.get("remote-addr") ||
        "unknown";
      await pasteService.addViewToPaste(pasteId, clientIp);
      return new Response(
        await renderEJS("paste", {
          title: `Paste: ${paste.title}`,
          paste,
          cssFile: "/styles/paste.css",
          req,
        }) as string,
        { status: 200, headers: { "Content-Type": "text/html" } }
      );
    } catch (err) {
      console.error("Error in paste view route:", err);
      return serverError();
    }
  }

  // ------------------
  // CREATE PASTE PAGE (Render Form)
  // ------------------
  if (req.method === "GET" && url.pathname === "/create") {
    return new Response(
      await renderEJS("create", {
        title: "Create Paste",
        cssFile: "/styles/home.css",
        req,
      }) as string,
      { status: 200, headers: { "Content-Type": "text/html" } }
    );
  }

  // ------------------
  // HANDLE CREATE PASTE FORM SUBMISSION (with ReCAPTCHA)
  // ------------------
  if (req.method === "POST" && url.pathname === "/create") {
    const form = await req.formData();
    const pasteTitle = form.get("title")?.toString() || "";
    const content = form.get("content")?.toString() || "";
    const recaptchaResponse = form.get("g-recaptcha-response")?.toString() || "";

    // Verify ReCAPTCHA
    if (!(await verifyRecaptcha(recaptchaResponse))) {
      return new Response("ReCAPTCHA verification failed", {
        status: 400,
        headers: { "Content-Type": "text/html" },
      });
    }

    // Basic validation: non-empty and reasonable length
    if (!pasteTitle.trim() || !content.trim()) {
      return new Response("Title and content cannot be empty", {
        status: 400,
        headers: { "Content-Type": "text/html" },
      });
    }
    if (pasteTitle.length > 100) {
      return new Response("Title is too long (max 100 characters)", {
        status: 400,
        headers: { "Content-Type": "text/html" },
      });
    }
    if (content.length > 10000) {
      return new Response("Content is too long (max 10,000 characters)", {
        status: 400,
        headers: { "Content-Type": "text/html" },
      });
    }

    // Get user from session or default to "Anonymous"
    const creator = user || "Anonymous";

    try {
      const paste = await pasteService.createPaste(pasteTitle, content, creator);
      return new Response("", {
        status: 302,
        headers: { Location: `/paste/${paste.id}` },
      });
    } catch (err) {
      console.error("Error creating paste:", err);
      return serverError();
    }
  }

  // ------------------
  // REGISTER PAGE
  // ------------------
  if (req.method === "GET" && url.pathname === "/register") {
    return new Response(
      await renderEJS("auth/register", {
        title: "Register",
        cssFile: "/styles/home.css",
        req,
      }) as string,
      { status: 200, headers: { "Content-Type": "text/html" } }
    );
  }

  // ------------------
  // HANDLE REGISTER FORM (with ReCAPTCHA)
  // ------------------
  if (req.method === "POST" && url.pathname === "/register") {
    const form = await req.formData();
    const username = form.get("username")?.toString() || "";
    const password = form.get("password")?.toString() || "";
    const recaptchaResponse = form.get("g-recaptcha-response")?.toString() || "";

    // Verify ReCAPTCHA
    if (!(await verifyRecaptcha(recaptchaResponse))) {
      return new Response("ReCAPTCHA verification failed", {
        status: 400,
        headers: { "Content-Type": "text/html" },
      });
    }

    // Validate basic inputs
    if (!username.trim() || !password.trim()) {
      return new Response("Username and password cannot be empty", {
        status: 400,
        headers: { "Content-Type": "text/html" },
      });
    }
    if (username.length > 50) {
      return new Response("Username is too long (max 50 characters)", {
        status: 400,
        headers: { "Content-Type": "text/html" },
      });
    }
    if (password.length < 6) {
      return new Response("Password must be at least 6 characters", {
        status: 400,
        headers: { "Content-Type": "text/html" },
      });
    }

    try {
      await authService.register(username, password);
      return new Response("", {
        status: 302,
        headers: { Location: "/login" },
      });
    } catch (err) {
      console.error("Error during registration:", err);
      return new Response("Registration failed", {
        status: 400,
        headers: { "Content-Type": "text/html" },
      });
    }
  }

  // ------------------
  // LOGIN PAGE
  // ------------------
  if (req.method === "GET" && url.pathname === "/login") {
    return new Response(
      await renderEJS("auth/login", {
        title: "Login",
        cssFile: "/styles/home.css",
        req,
      }) as string,
      { status: 200, headers: { "Content-Type": "text/html" } }
    );
  }

  // ------------------
  // HANDLE LOGIN FORM (with ReCAPTCHA)
  // ------------------
  if (req.method === "POST" && url.pathname === "/login") {
    const form = await req.formData();
    const username = form.get("username")?.toString() || "";
    const password = form.get("password")?.toString() || "";
    const recaptchaResponse = form.get("g-recaptcha-response")?.toString() || "";

    // Verify ReCAPTCHA
    if (!(await verifyRecaptcha(recaptchaResponse))) {
      return new Response("ReCAPTCHA verification failed", {
        status: 400,
        headers: { "Content-Type": "text/html" },
      });
    }
    
    if (!username.trim() || !password.trim()) {
      return new Response("Username and password cannot be empty", {
        status: 400,
        headers: { "Content-Type": "text/html" },
      });
    }

    try {
      await authService.login(username, password);
      return new Response("", {
        status: 302,
        headers: {
          ...setSessionCookie(username),
          Location: "/",
        },
      });
    } catch (err) {
      console.error("Login error:", err);
      return new Response("Login failed", {
        status: 401,
        headers: { "Content-Type": "text/html" },
      });
    }
  }

  // ------------------
  // PROFILE ROUTE
  // This will match /profile and /profile/:name
  // ------------------
  if (req.method === "GET" && url.pathname.startsWith("/profile")) {
    let profileUser: string | null = null;

    // If the URL is exactly /profile, use the logged-in user's name.
    if (url.pathname === "/profile") {
      profileUser = user;
      if (!profileUser) {
        return new Response("", {
          status: 302,
          headers: { Location: "/login" },
        });
      }
    } else {
      const parts = url.pathname.split("/");
      profileUser = parts[2];
    }

    try {
      const pastes = await pasteService.getPastesByUser(profileUser);
      return new Response(
        await renderEJS("profile", {
          title: `${profileUser}'s Profile`,
          cssFile: "/styles/home.css",
          profileUser,
          pastes,
          req,
        }) as string,
        { status: 200, headers: { "Content-Type": "text/html" } }
      );
    } catch (err) {
      console.error("Error loading profile:", err);
      return new Response("Server error", { status: 500 });
    }
  }

  // ------------------
  // HANDLE COMMENT SUBMISSION FOR A PASTE
  // ------------------
  if (req.method === "POST" && url.pathname.match(/^\/paste\/[^\/]+\/comment$/)) {
    const pasteId = url.pathname.split("/")[2];
    const form = await req.formData();
    const commentContent = form.get("content")?.toString() || "";

    if (!commentContent.trim()) {
      return new Response("Comment cannot be empty", {
        status: 400,
        headers: { "Content-Type": "text/html" },
      });
    }

    // Use session user if available; default to "Anonymous" if not
    const commenter = getUserFromRequest(req) || "Anonymous";

    try {
      const comment = await pasteService.addCommentToPaste(pasteId, commenter, commentContent);
      if (!comment) {
        return new Response("Paste not found", {
          status: 404,
          headers: { "Content-Type": "text/html" },
        });
      }
      return new Response("", {
        status: 302,
        headers: { Location: `/paste/${pasteId}` },
      });
    } catch (err) {
      const error = err as Error;
      console.error("Error adding comment:", error);
      return new Response("Server error", {
        status: 500,
        headers: { "Content-Type": "text/html" },
      });
    }
  }

  // ------------------
  // LOGOUT
  // ------------------
  if (req.method === "GET" && url.pathname === "/logout") {
    return new Response("", {
      status: 302,
      headers: {
        "Set-Cookie": "user=; Path=/; Max-Age=0",
        Location: "/",
      },
    });
  }

  // ------------------
  // DEFAULT 404
  // ------------------
  return new Response("Not Found", {
    status: 404,
    headers: { "Content-Type": "text/html" },
  });
};

// RENDERER — injects user into layout automatically
async function renderEJS(template: string, data: any) {
  const viewsPath = path.join(import.meta.dir, "../views");
  const ejs = await import("ejs");

  const body = await ejs.renderFile(path.join(viewsPath, `${template}.ejs`), data);
  return await ejs.renderFile(path.join(viewsPath, "layout.ejs"), {
    ...data,
    user: getUserFromRequest(data.req),
    body,
  }) as string;
}
