import type { IncomingMessage, ServerResponse } from "http";
import type { Middleware } from "./types";

interface RateLimitOptions {
  windowMs?: number; // Time window in milliseconds (default: 60000 = 1 minute)
  max?: number; // Max requests per window (default: 100)
  message?: string; // Response message when limit exceeded
  statusCode?: number; // Status code when limit exceeded (default: 429)
  keyFn?: (req: IncomingMessage) => string; // Custom key function (default: IP-based)
  headers?: boolean; // Send rate limit headers (default: true)
}

interface ClientRecord {
  count: number;
  resetTime: number;
}

export function rateLimit(options: RateLimitOptions = {}): Middleware {
  const windowMs = options.windowMs ?? 60000;
  const max = options.max ?? 100;
  const message = options.message ?? "Too many requests, please try again later.";
  const statusCode = options.statusCode ?? 429;
  const headers = options.headers ?? true;
  const keyFn = options.keyFn ?? defaultKeyFn;

  const clients = new Map<string, ClientRecord>();

  // Cleanup expired entries periodically
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of clients) {
      if (now >= record.resetTime) {
        clients.delete(key);
      }
    }
  }, windowMs);
  cleanup.unref();

  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const key = keyFn(req);
    const now = Date.now();

    let record = clients.get(key);

    if (!record || now >= record.resetTime) {
      record = { count: 0, resetTime: now + windowMs };
      clients.set(key, record);
    }

    record.count++;

    const remaining = Math.max(0, max - record.count);
    const resetSeconds = Math.ceil((record.resetTime - now) / 1000);

    if (headers) {
      res.setHeader("X-RateLimit-Limit", max);
      res.setHeader("X-RateLimit-Remaining", remaining);
      res.setHeader("X-RateLimit-Reset", resetSeconds);
    }

    if (record.count > max) {
      if (headers) {
        res.setHeader("Retry-After", resetSeconds);
      }
      res.statusCode = statusCode;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: message }));
      return;
    }

    next();
  };
}

function defaultKeyFn(req: IncomingMessage): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    return ips?.split(",")[0]?.trim() || "unknown";
  }
  return req.socket?.remoteAddress || "unknown";
}
