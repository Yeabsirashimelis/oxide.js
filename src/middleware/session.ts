import * as crypto from "crypto";
import type { IncomingMessage, ServerResponse } from "http";
import type { Middleware } from "./types";
import type { OxideRequestWithCookies, OxideResponseWithCookies } from "./cookie";

export type SessionData = Record<string, unknown>;

export interface SessionOptions {
  name?: string; // Cookie name (default: "oxide.sid")
  maxAge?: number; // Session max age in seconds (default: 86400 = 24h)
  httpOnly?: boolean; // HttpOnly cookie flag (default: true)
  secure?: boolean; // Secure cookie flag (default: false)
  path?: string; // Cookie path (default: "/")
  sameSite?: "Strict" | "Lax" | "None"; // SameSite (default: "Lax")
}

export interface OxideRequestWithSession extends IncomingMessage {
  session: SessionData;
  sessionId: string;
}

// In-memory session store
const store = new Map<string, { data: SessionData; expires: number }>();

function generateId(): string {
  return crypto.randomBytes(24).toString("hex");
}

// Cleanup expired sessions periodically
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [id, session] of store) {
    if (now >= session.expires) {
      store.delete(id);
    }
  }
}, 60000);
cleanupInterval.unref();

export function session(options: SessionOptions = {}): Middleware {
  const name = options.name ?? "oxide.sid";
  const maxAge = options.maxAge ?? 86400;
  const httpOnly = options.httpOnly ?? true;
  const secure = options.secure ?? false;
  const cookiePath = options.path ?? "/";
  const sameSite = options.sameSite ?? "Lax";

  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const reqWithCookies = req as unknown as OxideRequestWithCookies;
    const resWithCookies = res as unknown as OxideResponseWithCookies;
    const reqWithSession = req as unknown as OxideRequestWithSession;

    // Get existing session ID from cookie
    let sessionId = reqWithCookies.cookies?.[name];
    let sessionData: SessionData = {};
    let isNew = false;

    if (sessionId && store.has(sessionId)) {
      const entry = store.get(sessionId)!;
      if (Date.now() < entry.expires) {
        sessionData = entry.data;
      } else {
        // Session expired
        store.delete(sessionId);
        sessionId = undefined;
      }
    }

    if (!sessionId) {
      sessionId = generateId();
      isNew = true;
    }

    reqWithSession.session = sessionData;
    reqWithSession.sessionId = sessionId;

    // Save session and set cookie on response end
    const originalEnd = res.end.bind(res);
    res.end = function (chunk?: any, ...args: any[]): any {
      // Save session data to store
      store.set(sessionId as string, {
        data: reqWithSession.session,
        expires: Date.now() + maxAge * 1000,
      });

      // Set session cookie if new
      if (isNew && resWithCookies.setCookie) {
        resWithCookies.setCookie(name, sessionId as string, {
          maxAge,
          httpOnly,
          secure,
          path: cookiePath,
          sameSite,
        });
      }

      return originalEnd(chunk, ...args);
    } as any;

    next();
  };
}
