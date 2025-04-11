// src/lib/session.ts
import { parse, serialize } from "cookie";
import { createSession, getSessionData } from "./sessionManager.ts";

export function setSessionCookie(user: string): ResponseInit["headers"] {
  // Create a session and get its ID.
  const sessionId = createSession(user);
  const cookie = serialize("session", sessionId, {
    path: "/",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7, // 1 week
  });
  return { "Set-Cookie": cookie };
}

export function getUserFromRequest(req: Request): string | null {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return null;
  const cookies = parse(cookieHeader);
  const sessionId = cookies.session;
  if (!sessionId) return null;
  const sessionData = getSessionData(sessionId);
  return sessionData ? sessionData.user : null;
}
