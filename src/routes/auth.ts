// src/routes/auth.ts
import { AuthService } from "../services/authService.ts";
import { setSessionCookie } from "../lib/session.ts";
import { verifyRecaptcha }  from "../lib/recaptcha.ts";
import { renderEJS }        from "./_utils.ts";

const auth = new AuthService();

/* ---------- helpers ---------- */
function render(page: "login" | "register", req: Request) {
  return renderEJS(`auth/${page}`, {
    title : page === "login" ? "Login" : "Register",
    cssFile: "/styles/home.css",
    req,
    recaptchaSiteKey: Bun.env.RECAPTCHA_SITE_KEY ?? ""
  });
}

/* ---------------- LOGIN ---------------- */
async function loginRoute(req: Request): Promise<Response|null> {
  const url = new URL(req.url);
  if (url.pathname !== "/login") return null;

  if (req.method === "GET") {
    return new Response(await render("login", req),
      { headers: { "Content-Type": "text/html" } });
  }

  /* POST */
  const fd     = await req.formData();
  const token  = fd.get("g-recaptcha-response")?.toString() ?? "";
  if (!(await verifyRecaptcha(token)))
    return new Response("Bad captcha", { status: 400 });

  const u = fd.get("username")?.toString() ?? "";
  const p = fd.get("password")?.toString() ?? "";
  await auth.login(u, p);

  return new Response("", {
    status: 302,
    headers: {
      ...setSessionCookie(u),
      Location: "/"
    }
  });
}

/* ---------------- REGISTER -------------- */
async function registerRoute(req: Request): Promise<Response|null> {
  const url = new URL(req.url);
  if (url.pathname !== "/register") return null;

  if (req.method === "GET")
    return new Response(await render("register", req),
      { headers: { "Content-Type": "text/html" } });

  /* POST */
  const fd     = await req.formData();
  const token  = fd.get("g-recaptcha-response")?.toString() ?? "";
  if (!(await verifyRecaptcha(token)))
    return new Response("Bad captcha", { status: 400 });

  await auth.register(
    fd.get("username")!.toString(),
    fd.get("password")!.toString()
  );
  return new Response("", { status: 302, headers: { Location: "/login" } });
}

/* --------------- LOGOUT ----------------- */
function logoutRoute(req: Request): Promise<Response|null> {
  if (req.method === "GET" && new URL(req.url).pathname === "/logout") {
    return Promise.resolve(new Response("", {
      status : 302,
      headers: { "Set-Cookie": "session=; Path=/; Max-Age=0", Location: "/" }
    }));
  }
  return Promise.resolve(null);
}

export const authRoutes = [loginRoute, registerRoute, logoutRoute] as const;
