/**
 * Oxide.js — Full Feature Demo
 *
 * This example exercises every feature of the framework:
 *   1.  createApp / Application
 *   2.  Routing (GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD, ALL)
 *   3.  Route parameters & query strings
 *   4.  Route groups
 *   5.  Router mounting
 *   6.  JSON body parser
 *   7.  URL-encoded body parser
 *   8.  CORS middleware
 *   9.  Cookie parser + set/clear cookies
 *  10.  Session middleware
 *  11.  Rate limiting
 *  12.  Request validation
 *  13.  Compression
 *  14.  Logger
 *  15.  Static file serving
 *  16.  Template rendering (EJS)
 *  17.  Error handling (ctx.throw, onError, notFound)
 *  18.  Response helpers (json, send, html, redirect, status, set, type, links)
 *  19.  Request helpers (ip, hostname, protocol, secure, is, get)
 *  20.  sendFile & download
 *  21.  WebSocket with rooms & broadcasting
 *  22.  HttpError class
 *
 * Run:   node examples/app.js
 * Test:  node examples/test-all.js   (automated verification)
 */

const {
  createApp,
  createRouter,
  cors,
  jsonParser,
  urlencodedParser,
  cookieParser,
  session,
  rateLimit,
  validate,
  compression,
  logger,
  serveStatic,
  HttpError,
} = require("../");

const path = require("path");

const app = createApp();

// ── Template engine setup ──────────────────────────────────────────
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// ── Global middleware (order matters) ──────────────────────────────
app.use(logger({ format: "dev" }));
app.use(cors({ origin: "*", credentials: true }));
app.use(compression({ threshold: 256 }));
app.use(jsonParser());
app.use(urlencodedParser());
app.use(cookieParser());
app.use(session({ name: "demo.sid", maxAge: 3600 }));

// ── Static files ───────────────────────────────────────────────────
// Using index: false so that "/" goes to the route handler, not index.html
app.use(serveStatic(path.join(__dirname, "public"), { index: "" }));

// ── Basic routes ───────────────────────────────────────────────────

// 1. Simple GET
app.get("/", (ctx) => {
  ctx.json({ message: "Welcome to Oxide.js!", version: "0.1.0" });
});

// 2. Route parameters
app.get("/users/:id", (ctx) => {
  ctx.json({ userId: ctx.params.id, method: ctx.method });
});

// 3. Query strings
app.get("/search", (ctx) => {
  ctx.json({ query: ctx.query });
});

// 4. POST with JSON body
app.post("/echo", (ctx) => {
  ctx.status(201).json({ received: ctx.body });
});

// 5. PUT
app.put("/users/:id", (ctx) => {
  ctx.json({ updated: ctx.params.id, data: ctx.body });
});

// 6. PATCH
app.patch("/users/:id", (ctx) => {
  ctx.json({ patched: ctx.params.id, data: ctx.body });
});

// 7. DELETE
app.delete("/users/:id", (ctx) => {
  ctx.status(204).send("");
});

// 8. OPTIONS (handled by CORS, but explicit route too)
app.options("/custom-options", (ctx) => {
  ctx.set("Allow", "GET, POST").status(200).send("");
});

// 9. HEAD
app.head("/health", (ctx) => {
  ctx.set("X-Health", "ok").status(200).send("");
});

// 10. ALL (matches any method)
app.all("/any-method", (ctx) => {
  ctx.json({ method: ctx.method, message: "Matched by app.all()" });
});

// ── Response helpers ───────────────────────────────────────────────

// html()
app.get("/html", (ctx) => {
  ctx.html("<h1>Hello from Oxide.js</h1>");
});

// send()
app.get("/text", (ctx) => {
  ctx.type("text/plain").send("Plain text response");
});

// redirect()
app.get("/old-page", (ctx) => {
  ctx.redirect("/");
});

// status chaining + set + type + links
app.get("/headers-demo", (ctx) => {
  ctx
    .status(200)
    .set("X-Custom-Header", "oxide")
    .type("application/json")
    .links({ next: "/page/2", prev: "/page/0" })
    .json({ headers: "set" });
});

// ── Request helpers ────────────────────────────────────────────────
app.get("/request-info", (ctx) => {
  ctx.json({
    ip: ctx.ip,
    hostname: ctx.hostname,
    protocol: ctx.protocol,
    secure: ctx.secure,
    contentType: ctx.get("content-type"),
    isJson: ctx.is("application/json"),
  });
});

// ── sendFile & download ────────────────────────────────────────────
app.get("/file", (ctx) => {
  ctx.sendFile("index.html", { root: path.join(__dirname, "public") });
});

app.get("/download", (ctx) => {
  ctx.download(path.join(__dirname, "public", "style.css"), "theme.css");
});

// ── Template rendering ─────────────────────────────────────────────
app.get("/render", (ctx) => {
  ctx.render("home", { title: "Oxide.js Demo", user: "Developer" });
});

// ── Cookies ────────────────────────────────────────────────────────
app.get("/cookie/set", (ctx) => {
  ctx.setCookie("flavor", "chocolate", { httpOnly: true, maxAge: 3600 });
  ctx.json({ message: "Cookie set" });
});

app.get("/cookie/get", (ctx) => {
  ctx.json({ cookies: ctx.cookies });
});

app.get("/cookie/clear", (ctx) => {
  ctx.clearCookie("flavor");
  ctx.json({ message: "Cookie cleared" });
});

// ── Sessions ───────────────────────────────────────────────────────
app.get("/session/set", (ctx) => {
  ctx.session.username = "oxide-user";
  ctx.session.visits = ((ctx.session.visits) || 0) + 1;
  ctx.json({ session: ctx.session });
});

app.get("/session/get", (ctx) => {
  ctx.json({ session: ctx.session });
});

// ── Validation ─────────────────────────────────────────────────────
app.post(
  "/register",
  validate({
    body: {
      name: { type: "string", required: true, min: 2, max: 50 },
      email: { type: "string", required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
      age: { type: "number", required: true, min: 13, max: 120 },
      role: { type: "string", enum: ["user", "admin", "moderator"] },
    },
  }),
  (ctx) => {
    ctx.status(201).json({ registered: ctx.body });
  }
);

// ── Rate limiting (separate route to not affect other tests) ──────
const limiter = rateLimit({ windowMs: 60000, max: 5, message: "Slow down!" });
app.get("/limited", limiter, (ctx) => {
  ctx.json({ message: "You got through" });
});

// ── Route groups ───────────────────────────────────────────────────
const admin = app.group("/admin");
admin
  .get("/dashboard", (ctx) => {
    ctx.json({ page: "Admin Dashboard" });
  })
  .post("/settings", (ctx) => {
    ctx.json({ saved: ctx.body });
  });

// ── Router mounting ────────────────────────────────────────────────
const apiRouter = createRouter();

apiRouter.get("/products", (ctx) => {
  ctx.json([
    { id: 1, name: "Widget" },
    { id: 2, name: "Gadget" },
  ]);
});

apiRouter.get("/products/:id", (ctx) => {
  ctx.json({ id: ctx.params.id, name: "Widget" });
});

apiRouter.post("/products", (ctx) => {
  ctx.status(201).json({ created: ctx.body });
});

app.use("/api/v1", apiRouter);

// ── Error handling ─────────────────────────────────────────────────

// ctx.throw()
app.get("/error/throw", (ctx) => {
  ctx.throw(403, "Access denied");
});

// HttpError class
app.get("/error/http-error", (ctx) => {
  throw new HttpError(502, "Bad gateway from upstream");
});

// Unhandled error
app.get("/error/unexpected", () => {
  throw new Error("Something broke!");
});

// Custom error handler
app.onError((err, ctx) => {
  const status = err.status || 500;
  ctx.status(status).json({
    error: true,
    status,
    message: status < 500 ? err.message : "Internal Server Error",
  });
});

// Custom 404
app.notFound((ctx) => {
  ctx.status(404).json({ error: true, message: "Route not found" });
});

// ── WebSocket ──────────────────────────────────────────────────────
app.ws("/ws/echo", (socket) => {
  socket.send("Connected to echo server");

  socket.on("message", (data) => {
    socket.send(`Echo: ${data}`);
  });

  socket.on("close", () => {
    console.log("[WS] Echo client disconnected");
  });
});

app.ws("/ws/chat", (socket) => {
  socket.join("lobby");
  socket.send(JSON.stringify({ event: "joined", room: "lobby" }));

  socket.on("message", (data) => {
    try {
      const msg = JSON.parse(data);

      if (msg.action === "join") {
        socket.join(msg.room);
        socket.send(JSON.stringify({ event: "joined", room: msg.room }));
      } else if (msg.action === "leave") {
        socket.leave(msg.room);
        socket.send(JSON.stringify({ event: "left", room: msg.room }));
      } else if (msg.action === "send") {
        socket.to(msg.room).send(JSON.stringify({ event: "message", from: socket.id, text: msg.text }));
      } else if (msg.action === "broadcast") {
        socket.broadcast(JSON.stringify({ event: "broadcast", from: socket.id, text: msg.text }));
      } else if (msg.action === "rooms") {
        socket.send(JSON.stringify({ event: "rooms", rooms: socket.rooms }));
      }
    } catch {
      socket.send(JSON.stringify({ event: "error", message: "Invalid JSON" }));
    }
  });

  socket.on("close", () => {
    console.log("[WS] Chat client disconnected");
  });

  socket.on("error", (err) => {
    console.error("[WS] Error:", err.message);
  });
});

// ── Start server ───────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════╗
  ║   Oxide.js Demo Server running on :${PORT}      ║
  ╠══════════════════════════════════════════════╣
  ║                                              ║
  ║  HTTP Endpoints:                             ║
  ║    GET    /               — JSON welcome     ║
  ║    GET    /users/:id      — route params     ║
  ║    GET    /search?q=test  — query strings    ║
  ║    POST   /echo           — JSON echo        ║
  ║    PUT    /users/:id      — update user      ║
  ║    PATCH  /users/:id      — patch user       ║
  ║    DELETE /users/:id      — delete user      ║
  ║    HEAD   /health         — health check     ║
  ║    ALL    /any-method     — any HTTP method   ║
  ║    GET    /html           — HTML response    ║
  ║    GET    /text           — plain text       ║
  ║    GET    /old-page       — redirect → /     ║
  ║    GET    /headers-demo   — custom headers   ║
  ║    GET    /request-info   — request details  ║
  ║    GET    /file           — sendFile         ║
  ║    GET    /download       — file download    ║
  ║    GET    /render         — EJS template     ║
  ║    GET    /cookie/*       — cookie ops       ║
  ║    GET    /session/*      — session ops      ║
  ║    POST   /register       — validation       ║
  ║    GET    /limited        — rate limited     ║
  ║    GET    /admin/dashboard — route group     ║
  ║    GET    /api/v1/products — mounted router  ║
  ║    GET    /error/*        — error handling   ║
  ║                                              ║
  ║  WebSocket:                                  ║
  ║    ws://localhost:${PORT}/ws/echo             ║
  ║    ws://localhost:${PORT}/ws/chat             ║
  ║                                              ║
  ║  Static: http://localhost:${PORT}/index.html  ║
  ╚══════════════════════════════════════════════╝
  `);
});
