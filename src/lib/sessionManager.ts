// src/lib/sessionManager.ts
const sessions = new Map<string, { user: string }>();

export function createSession(user: string): string {
  // Generate a unique session ID (using crypto.randomUUID, available in Node/Bun)
  const sessionId = crypto.randomUUID();
  sessions.set(sessionId, { user });
  return sessionId;
}

export function getSessionData(sessionId: string): { user: string } | null {
  return sessions.get(sessionId) || null;
}

export function destroySession(sessionId: string): boolean {
  return sessions.delete(sessionId);
}
