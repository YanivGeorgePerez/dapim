import { parse, serialize } from "cookie";

export function setSessionCookie(username: string): ResponseInit["headers"] {
  const cookie = serialize("user", username, {
    path: "/",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7,
  });
  return { "Set-Cookie": cookie };
}

export function getUserFromRequest(req: Request): string | null {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return null;

  const cookies = parse(cookieHeader);
  return cookies.user || null;
}
