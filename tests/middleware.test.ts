import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import { createApp, Context } from "../src/core/app";
import { jsonParser } from "../src/body/json";
import { cors } from "../src/middleware/cors";
import { rateLimit } from "../src/middleware/rate-limit";
import { validate } from "../src/middleware/validate";
import { compression } from "../src/middleware/compression";
import { cookieParser } from "../src/middleware/cookie";
import { session } from "../src/middleware/session";
import { logger } from "../src/middleware/logger";

const PORT = 4001;

function request(
  method: string,
  path: string,
  options: {
    body?: unknown;
    headers?: Record<string, string>;
  } = {},
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: any; rawBody: string }> {
  return new Promise((resolve, reject) => {
    const bodyStr = options.body ? JSON.stringify(options.body) : undefined;
    const req = http.request(
      {
        hostname: "localhost",
        port: PORT,
        path,
        method,
        headers: {
          ...options.headers,
          ...(bodyStr
            ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(bodyStr) }
            : {}),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const rawBody = Buffer.concat(chunks).toString();
          let body: any;
          try {
            body = JSON.parse(rawBody);
          } catch {
            body = rawBody;
          }
          resolve({ status: res.statusCode!, headers: res.headers, body, rawBody });
        });
      },
    );
    req.on("error", reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

describe("Middleware", () => {
  beforeAll(async () => {
    const app = createApp();

    // Global middleware
    app.use(logger({ format: "minimal" }));
    app.use(cors({ origin: "http://example.com", methods: ["GET", "POST"] }));
    app.use(jsonParser());
    app.use(cookieParser());
    app.use(session({ name: "test.sid", maxAge: 60 }));

    // Basic route
    app.get("/ok", (ctx: Context) => {
      ctx.json({ ok: true });
    });

    // Rate-limited route
    const limiter = rateLimit({ windowMs: 60000, max: 3 });
    app.get("/limited", limiter as any, (ctx: Context) => {
      ctx.json({ ok: true });
    });

    // Validated route
    app.post(
      "/register",
      validate({
        body: {
          name: { type: "string", required: true, min: 2 },
          email: { type: "string", required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
          age: { type: "number", min: 18 },
          role: { enum: ["admin", "user"] },
        },
      }) as any,
      (ctx: Context) => {
        ctx.status(201).json({ created: true });
      },
    );

    // Session routes
    app.get("/session/set", (ctx: Context) => {
      ctx.session.user = "testuser";
      ctx.json({ set: true });
    });

    app.get("/session/get", (ctx: Context) => {
      ctx.json({ user: ctx.session.user || null });
    });

    // Compression route (large response)
    app.use(compression({ threshold: 100 }));
    app.get("/large", (ctx: Context) => {
      const data = { items: Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Item ${i}` })) };
      ctx.json(data);
    });

    await new Promise<void>((resolve) => {
      app.listen(PORT, () => resolve());
    });
    await new Promise((r) => setTimeout(r, 100));
  });

  // ========== CORS ==========

  describe("CORS", () => {
    it("sets Access-Control-Allow-Origin", async () => {
      const res = await request("GET", "/ok");
      expect(res.headers["access-control-allow-origin"]).toBe("http://example.com");
    });
  });

  // ========== Rate Limiting ==========

  describe("Rate limiting", () => {
    it("allows requests within limit", async () => {
      const res = await request("GET", "/limited");
      expect(res.status).toBe(200);
      expect(res.headers["x-ratelimit-limit"]).toBe("3");
    });

    it("returns rate limit headers", async () => {
      const res = await request("GET", "/limited");
      expect(res.headers["x-ratelimit-remaining"]).toBeDefined();
      expect(res.headers["x-ratelimit-reset"]).toBeDefined();
    });

    it("blocks after exceeding limit", async () => {
      // Make requests until blocked (we already made 2 above)
      await request("GET", "/limited");
      const res = await request("GET", "/limited");
      expect(res.status).toBe(429);
      expect(res.body.error).toContain("Too many requests");
      expect(res.headers["retry-after"]).toBeDefined();
    });
  });

  // ========== Validation ==========

  describe("Validation", () => {
    it("passes valid data", async () => {
      const res = await request("POST", "/register", {
        body: { name: "John", email: "john@test.com", age: 25, role: "admin" },
      });
      expect(res.status).toBe(201);
    });

    it("rejects missing required fields", async () => {
      const res = await request("POST", "/register", { body: {} });
      expect(res.status).toBe(400);
      expect(res.body.errors.length).toBeGreaterThanOrEqual(2);
      expect(res.body.errors.some((e: any) => e.field === "name")).toBe(true);
      expect(res.body.errors.some((e: any) => e.field === "email")).toBe(true);
    });

    it("rejects invalid email format", async () => {
      const res = await request("POST", "/register", {
        body: { name: "John", email: "not-an-email" },
      });
      expect(res.status).toBe(400);
      expect(res.body.errors.some((e: any) => e.field === "email")).toBe(true);
    });

    it("rejects value below min", async () => {
      const res = await request("POST", "/register", {
        body: { name: "J", email: "j@test.com" },
      });
      expect(res.status).toBe(400);
      expect(res.body.errors.some((e: any) => e.field === "name")).toBe(true);
    });

    it("rejects invalid enum value", async () => {
      const res = await request("POST", "/register", {
        body: { name: "John", email: "j@test.com", role: "superadmin" },
      });
      expect(res.status).toBe(400);
      expect(res.body.errors.some((e: any) => e.field === "role")).toBe(true);
    });
  });

  // ========== Session ==========

  describe("Session", () => {
    it("persists session data across requests", async () => {
      // Set session
      const setRes = await request("GET", "/session/set");
      expect(setRes.body).toEqual({ set: true });

      // Extract session cookie
      const setCookie = setRes.headers["set-cookie"];
      const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
      const sidMatch = cookieStr?.match(/test\.sid=([^;]+)/);
      const sid = sidMatch ? sidMatch[1] : "";

      // Get session with cookie
      const getRes = await request("GET", "/session/get", {
        headers: { Cookie: `test.sid=${sid}` },
      });
      expect(getRes.body).toEqual({ user: "testuser" });
    });

    it("returns null without session cookie", async () => {
      const res = await request("GET", "/session/get");
      expect(res.body).toEqual({ user: null });
    });
  });
});
