import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import { createApp, Context } from "../src/core/app";
import { jsonParser } from "../src/body/json";
import { HttpError } from "../src/middleware/error-handler";

const PORT = 4000;

function request(
  method: string,
  path: string,
  options: { body?: unknown; headers?: Record<string, string> } = {},
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: any }> {
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
          ...(bodyStr ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(bodyStr) } : {}),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          let body: any;
          try {
            body = JSON.parse(data);
          } catch {
            body = data;
          }
          resolve({ status: res.statusCode!, headers: res.headers, body });
        });
      },
    );
    req.on("error", reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

describe("Oxide.js App", () => {
  let server: any;

  beforeAll(async () => {
    const app = createApp();

    app.use(jsonParser());

    // Basic routes
    app.get("/", (ctx: Context) => {
      ctx.send("Hello");
    });

    app.get("/json", (ctx: Context) => {
      ctx.json({ message: "ok" });
    });

    app.get("/html", (ctx: Context) => {
      ctx.html("<h1>Hello</h1>");
    });

    // Status codes
    app.get("/created", (ctx: Context) => {
      ctx.status(201).json({ created: true });
    });

    // Route params
    app.get("/users/:id", (ctx: Context) => {
      ctx.json({ id: ctx.params.id });
    });

    app.get("/users/:userId/posts/:postId", (ctx: Context) => {
      ctx.json({ userId: ctx.params.userId, postId: ctx.params.postId });
    });

    // Query params
    app.get("/search", (ctx: Context) => {
      ctx.json({ q: ctx.query.q, limit: ctx.query.limit });
    });

    // Body parsing
    app.post("/echo", (ctx: Context) => {
      ctx.json({ received: ctx.body });
    });

    // HTTP methods
    app.post("/items", (ctx: Context) => {
      ctx.status(201).json({ method: "POST" });
    });

    app.put("/items/:id", (ctx: Context) => {
      ctx.json({ method: "PUT", id: ctx.params.id });
    });

    app.patch("/items/:id", (ctx: Context) => {
      ctx.json({ method: "PATCH", id: ctx.params.id });
    });

    app.delete("/items/:id", (ctx: Context) => {
      ctx.status(204).send("");
    });

    // Headers
    app.get("/headers", (ctx: Context) => {
      ctx.set("X-Custom", "test-value");
      ctx.type("json");
      ctx.json({ header: ctx.get("X-Test") });
    });

    // Redirect
    app.get("/redirect", (ctx: Context) => {
      ctx.redirect("/json");
    });

    app.get("/redirect-permanent", (ctx: Context) => {
      ctx.redirect("/json", 301);
    });

    // Request info
    app.get("/info", (ctx: Context) => {
      ctx.json({
        ip: ctx.ip,
        hostname: ctx.hostname,
        protocol: ctx.protocol,
        secure: ctx.secure,
        method: ctx.method,
      });
    });

    // Error handling
    app.get("/throw-401", (ctx: Context) => {
      ctx.throw(401, "Not authorized");
    });

    app.get("/throw-404", (ctx: Context) => {
      ctx.throw(404);
    });

    app.get("/throw-500", (ctx: Context) => {
      throw new Error("Server error");
    });

    app.get("/async-error", async (ctx: Context) => {
      await new Promise((r) => setTimeout(r, 10));
      throw new Error("Async error");
    });

    // Route groups
    const v1 = app.group("/api/v1");
    v1.get("/status", (ctx: Context) => {
      ctx.json({ version: "v1" });
    });

    // Error handler
    app.onError((err, ctx) => {
      const status = err instanceof HttpError ? err.status : 500;
      const message = err instanceof HttpError && err.expose ? err.message : "Internal Server Error";
      ctx.status(status).json({ error: message });
    });

    // 404 handler
    app.notFound((ctx) => {
      ctx.status(404).json({ error: "Not found" });
    });

    await new Promise<void>((resolve) => {
      app.listen(PORT, () => resolve());
      server = app;
    });
    // Give server time to start
    await new Promise((r) => setTimeout(r, 100));
  });

  afterAll(async () => {
    // Force close by killing the port
    await new Promise((r) => setTimeout(r, 100));
  });

  // ========== Response Helpers ==========

  describe("Response helpers", () => {
    it("ctx.send() returns plain text", async () => {
      const res = await request("GET", "/");
      expect(res.status).toBe(200);
      expect(res.body).toBe("Hello");
      expect(res.headers["content-type"]).toContain("text/plain");
    });

    it("ctx.json() returns JSON", async () => {
      const res = await request("GET", "/json");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "ok" });
      expect(res.headers["content-type"]).toContain("application/json");
    });

    it("ctx.html() returns HTML", async () => {
      const res = await request("GET", "/html");
      expect(res.status).toBe(200);
      expect(res.body).toBe("<h1>Hello</h1>");
      expect(res.headers["content-type"]).toContain("text/html");
    });

    it("ctx.status() sets status code", async () => {
      const res = await request("GET", "/created");
      expect(res.status).toBe(201);
      expect(res.body).toEqual({ created: true });
    });
  });

  // ========== Routing ==========

  describe("Routing", () => {
    it("matches single route param", async () => {
      const res = await request("GET", "/users/42");
      expect(res.body).toEqual({ id: "42" });
    });

    it("matches multiple route params", async () => {
      const res = await request("GET", "/users/5/posts/10");
      expect(res.body).toEqual({ userId: "5", postId: "10" });
    });

    it("parses query params", async () => {
      const res = await request("GET", "/search?q=hello&limit=10");
      expect(res.body).toEqual({ q: "hello", limit: "10" });
    });

    it("returns 404 for unmatched routes", async () => {
      const res = await request("GET", "/nonexistent");
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: "Not found" });
    });

    it("route groups work", async () => {
      const res = await request("GET", "/api/v1/status");
      expect(res.body).toEqual({ version: "v1" });
    });
  });

  // ========== HTTP Methods ==========

  describe("HTTP methods", () => {
    it("POST", async () => {
      const res = await request("POST", "/items");
      expect(res.status).toBe(201);
      expect(res.body.method).toBe("POST");
    });

    it("PUT", async () => {
      const res = await request("PUT", "/items/1");
      expect(res.body).toEqual({ method: "PUT", id: "1" });
    });

    it("PATCH", async () => {
      const res = await request("PATCH", "/items/1");
      expect(res.body).toEqual({ method: "PATCH", id: "1" });
    });

    it("DELETE", async () => {
      const res = await request("DELETE", "/items/1");
      expect(res.status).toBe(204);
    });
  });

  // ========== Body Parsing ==========

  describe("Body parsing", () => {
    it("parses JSON body", async () => {
      const res = await request("POST", "/echo", { body: { name: "test" } });
      expect(res.body).toEqual({ received: { name: "test" } });
    });

    it("handles empty body", async () => {
      const res = await request("POST", "/echo");
      expect(res.body).toEqual({ received: {} });
    });
  });

  // ========== Headers ==========

  describe("Headers", () => {
    it("ctx.set() sets response header", async () => {
      const res = await request("GET", "/headers");
      expect(res.headers["x-custom"]).toBe("test-value");
    });

    it("ctx.get() reads request header", async () => {
      const res = await request("GET", "/headers", { headers: { "X-Test": "hello" } });
      expect(res.body.header).toBe("hello");
    });

    it("ctx.type() sets content-type", async () => {
      const res = await request("GET", "/headers");
      expect(res.headers["content-type"]).toContain("application/json");
    });
  });

  // ========== Redirect ==========

  describe("Redirect", () => {
    it("302 redirect", async () => {
      const res = await request("GET", "/redirect");
      expect(res.status).toBe(302);
      expect(res.headers["location"]).toBe("/json");
    });

    it("301 redirect", async () => {
      const res = await request("GET", "/redirect-permanent");
      expect(res.status).toBe(301);
      expect(res.headers["location"]).toBe("/json");
    });
  });

  // ========== Request Info ==========

  describe("Request info", () => {
    it("returns request info", async () => {
      const res = await request("GET", "/info");
      expect(res.body.method).toBe("GET");
      expect(res.body.protocol).toBe("http");
      expect(res.body.secure).toBe(false);
      expect(res.body.hostname).toBe("localhost");
    });

    it("respects X-Forwarded-For", async () => {
      const res = await request("GET", "/info", {
        headers: { "X-Forwarded-For": "203.0.113.50, 70.41.3.18" },
      });
      expect(res.body.ip).toBe("203.0.113.50");
    });

    it("respects X-Forwarded-Proto", async () => {
      const res = await request("GET", "/info", {
        headers: { "X-Forwarded-Proto": "https" },
      });
      expect(res.body.protocol).toBe("https");
      expect(res.body.secure).toBe(true);
    });
  });

  // ========== Error Handling ==========

  describe("Error handling", () => {
    it("ctx.throw(401) returns 401", async () => {
      const res = await request("GET", "/throw-401");
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "Not authorized" });
    });

    it("ctx.throw(404) returns 404 with default message", async () => {
      const res = await request("GET", "/throw-404");
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: "Not Found" });
    });

    it("sync errors return 500", async () => {
      const res = await request("GET", "/throw-500");
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "Internal Server Error" });
    });

    it("async errors return 500", async () => {
      const res = await request("GET", "/async-error");
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "Internal Server Error" });
    });
  });
});
