import { createApp, createRouter, Context } from "./core/app";
import { jsonParser } from "./body/json";
import { urlencodedParser } from "./body/urlencoded";
import { cors } from "./middleware/cors";
import { serveStatic } from "./middleware/static";
import { cookieParser } from "./middleware/cookie";
import { HttpError } from "./middleware/error-handler";
import { compression } from "./middleware/compression";
import { rateLimit } from "./middleware/rate-limit";
import { validate } from "./middleware/validate";
import { session } from "./middleware/session";
import { logger } from "./middleware/logger";

const app = createApp();

// ============================================
// TEMPLATE ENGINE SETUP
// ============================================

app.set("view engine", "ejs");
app.set("views", "views");

// ============================================
// MIDDLEWARE DEMO
// ============================================

// Logger middleware - structured request logging with colors
app.use(logger({ format: "dev" }));

// CORS middleware - enable cross-origin requests
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Compression middleware - gzip/deflate responses
app.use(compression({ threshold: 256 }));

// JSON body parser middleware
app.use(jsonParser());

// URL-encoded body parser middleware (for HTML forms)
app.use(urlencodedParser());

// Cookie parser middleware
app.use(cookieParser());

// Session middleware
app.use(session({ maxAge: 3600 }));

// Static file serving - serve files from "public" directory
// Visit http://localhost:3000/index.html or http://localhost:3000/style.css
app.use(serveStatic("public"));

// ============================================
// RESPONSE HELPERS DEMO
// ============================================

// ctx.send() - plain text
app.get("/", (ctx: Context) => {
  ctx.send("Welcome to Oxide.js API");
});

// ctx.json() - JSON response
app.get("/api/health", (ctx: Context) => {
  ctx.json({ status: "ok", uptime: process.uptime() });
});

// ctx.html() - HTML response
app.get("/html", (ctx: Context) => {
  ctx.html("<h1>Hello from Oxide.js</h1><p>This is an HTML response</p>");
});

// ctx.status() - custom status code
app.get("/api/error", (ctx: Context) => {
  ctx.status(500).json({ error: "Internal server error" });
});

// ============================================
// DYNAMIC ROUTE PARAMETERS DEMO
// ============================================

// Single parameter
app.get("/api/users/:id", (ctx: Context) => {
  ctx.json({ userId: ctx.params.id });
});

// Multiple parameters
app.get("/api/users/:userId/posts/:postId", (ctx: Context) => {
  ctx.json({ userId: ctx.params.userId, postId: ctx.params.postId });
});

// ============================================
// QUERY PARSER DEMO
// ============================================

// Search with query params: /api/search?q=hello&limit=10
app.get("/api/search", (ctx: Context) => {
  ctx.json({
    query: ctx.query.q || "",
    limit: ctx.query.limit || "10",
    allParams: ctx.query,
  });
});

// Filter items: /api/products?category=electronics&sort=price
app.get("/api/products", (ctx: Context) => {
  ctx.json({
    category: ctx.query.category || "all",
    sort: ctx.query.sort || "name",
    filters: ctx.query,
  });
});

// ============================================
// BODY PARSING DEMO
// ============================================

// POST with JSON body
app.post("/api/echo", (ctx: Context) => {
  ctx.json({ received: ctx.body });
});

// POST user creation
app.post("/api/users", (ctx: Context) => {
  const body = ctx.body as { name?: string; email?: string };
  ctx.status(201).json({
    message: "User created",
    user: { id: Date.now(), name: body.name, email: body.email },
  });
});

// POST with URL-encoded form data (HTML form submission)
app.post("/api/form", (ctx: Context) => {
  const body = ctx.body as { name?: string; email?: string; message?: string };
  ctx.json({
    received: "form data",
    name: body.name,
    email: body.email,
    message: body.message,
  });
});

// ============================================
// HTTP METHODS DEMO
// ============================================

// GET - retrieve resource
app.get("/api/items", (ctx: Context) => {
  ctx.json({ items: [{ id: 1, name: "Item 1" }, { id: 2, name: "Item 2" }] });
});

// POST - create resource (with body parsing)
app.post("/api/items", (ctx: Context) => {
  const body = ctx.body as { name?: string };
  ctx.status(201).json({ message: "Item created", name: body.name || "unnamed" });
});

// PUT - replace resource
app.put("/api/items/:id", (ctx: Context) => {
  ctx.json({ message: "Item replaced", id: ctx.params.id });
});

// PATCH - update resource
app.patch("/api/items/:id", (ctx: Context) => {
  ctx.json({ message: "Item updated", id: ctx.params.id });
});

// DELETE - remove resource
app.delete("/api/items/:id", (ctx: Context) => {
  ctx.status(204).send("");
});

// HEAD - headers only (same as GET but no body)
app.head("/api/items", (ctx: Context) => {
  ctx.status(200).send("");
});

// ALL - matches any HTTP method
app.all("/api/any", (ctx: Context) => {
  ctx.json({ method: ctx.method, message: "This route accepts any HTTP method" });
});

// ============================================
// COOKIE DEMO
// ============================================

// Set a cookie
app.get("/api/cookie/set", (ctx: Context) => {
  ctx.setCookie("session", "abc123", {
    httpOnly: true,
    maxAge: 3600,
    path: "/",
  });
  ctx.json({ message: "Cookie set!" });
});

// Read cookies
app.get("/api/cookie/get", (ctx: Context) => {
  ctx.json({ cookies: ctx.cookies });
});

// Clear a cookie
app.get("/api/cookie/clear", (ctx: Context) => {
  ctx.clearCookie("session", { path: "/" });
  ctx.json({ message: "Cookie cleared!" });
});

// ============================================
// ROUTE-LEVEL MIDDLEWARE DEMO
// ============================================

// Auth middleware    (example)
const authMiddleware = (req: any, res: any, next: () => void) => {
  const authHeader = req.headers["authorization"];
  if (authHeader === "Bearer secret-token") {
    next();
  } else {
    res.statusCode = 401;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Unauthorized" }));
  }
};

// Logging middleware for specific routes
const routeLogger = (req: any, res: any, next: () => void) => {
  console.log(`[ADMIN] Accessing: ${req.url}`);
  next();
};

// Route with single middleware
app.get("/api/admin/dashboard", authMiddleware, (ctx: Context) => {
  ctx.json({ message: "Welcome to admin dashboard" });
});

// Route with multiple middleware (chained)
app.get("/api/admin/settings", routeLogger, authMiddleware, (ctx: Context) => {
  ctx.json({ settings: { theme: "dark", notifications: true } });
});

// ============================================
// ROUTE GROUPS DEMO
// ============================================

// Group routes under /api/v1
const v1 = app.group("/api/v1");

v1.get("/status", (ctx: Context) => {
  ctx.json({ version: "v1", status: "active" });
});

v1.get("/users", (ctx: Context) => {
  ctx.json({ version: "v1", users: ["alice", "bob"] });
});

v1.post("/users", (ctx: Context) => {
  ctx.status(201).json({ version: "v1", message: "User created" });
});

// Group routes under /api/v2
const v2 = app.group("/api/v2");

v2.get("/status", (ctx: Context) => {
  ctx.json({ version: "v2", status: "beta" });
});

v2.get("/users", (ctx: Context) => {
  ctx.json({ version: "v2", users: ["alice", "bob", "charlie"] });
});

// ============================================
// REQUEST INFO DEMO
// ============================================

// ctx.ip - get client IP address
// ctx.hostname - get request hostname
// ctx.protocol - get protocol (http/https)
// ctx.secure - check if HTTPS
app.get("/api/request-info", (ctx: Context) => {
  ctx.json({
    ip: ctx.ip,
    hostname: ctx.hostname,
    protocol: ctx.protocol,
    secure: ctx.secure,
    method: ctx.method,
    url: ctx.url,
  });
});

// ============================================
// HEADER HELPERS DEMO
// ============================================

// ctx.set() - set response header
app.get("/api/headers/set", (ctx: Context) => {
  ctx.set("X-Custom-Header", "my-value");
  ctx.set("X-Request-Id", Date.now());
  ctx.json({ message: "Custom headers set!" });
});

// ctx.append() - append to response header
app.get("/api/headers/append", (ctx: Context) => {
  ctx.append("X-Multi", "value1");
  ctx.append("X-Multi", "value2");
  ctx.json({ message: "Headers appended!" });
});

// ctx.type() - set content-type shorthand
app.get("/api/headers/type", (ctx: Context) => {
  ctx.type("json").send('{"message": "Content-Type set via type()"}');
});

// ctx.get() - get request header
app.get("/api/headers/get", (ctx: Context) => {
  ctx.json({
    userAgent: ctx.get("User-Agent"),
    accept: ctx.get("Accept"),
    custom: ctx.get("X-Custom"),
  });
});

// ctx.is() - check request content-type
app.post("/api/headers/check", (ctx: Context) => {
  ctx.json({
    isJson: ctx.is("json"),
    isHtml: ctx.is("html"),
    isMultipart: ctx.is("multipart"),
    isUrlencoded: ctx.is("urlencoded"),
  });
});

// ============================================
// REDIRECT DEMO
// ============================================

// Temporary redirect (302 - default)
app.get("/old-page", (ctx: Context) => {
  ctx.redirect("/");
});

// Permanent redirect (301)
app.get("/legacy-api", (ctx: Context) => {
  ctx.redirect("/api/v2/status", 301);
});

// Redirect to external URL
app.get("/github", (ctx: Context) => {
  ctx.redirect("https://github.com");
});

// ============================================
// FILE RESPONSE DEMO
// ============================================

// Send a file (inline display)
app.get("/api/file", (ctx: Context) => {
  ctx.sendFile("public/index.html");
});

// Download a file (prompts save dialog)
app.get("/api/download", (ctx: Context) => {
  ctx.download("public/index.html", "example.html");
});

// ============================================
// NESTED ROUTERS DEMO
// ============================================

// Create a standalone router for users
const usersRouter = createRouter();

usersRouter.get("/", (ctx: Context) => {
  ctx.json({ users: ["alice", "bob", "charlie"] });
});

usersRouter.get("/:id", (ctx: Context) => {
  ctx.json({ user: { id: ctx.params.id, name: "User " + ctx.params.id } });
});

usersRouter.post("/", (ctx: Context) => {
  ctx.status(201).json({ message: "User created", data: ctx.body });
});

// Create a standalone router for posts
const postsRouter = createRouter();

postsRouter.get("/", (ctx: Context) => {
  ctx.json({ posts: [{ id: 1, title: "Hello World" }] });
});

postsRouter.get("/:id", (ctx: Context) => {
  ctx.json({ post: { id: ctx.params.id, title: "Post " + ctx.params.id } });
});

// Mount routers at specific paths
app.use("/api/v3/users", usersRouter);
app.use("/api/v3/posts", postsRouter);

// ============================================
// TEMPLATE ENGINE DEMO
// ============================================

// ctx.render() - render a view with data
app.get("/page/home", (ctx: Context) => {
  ctx.render("home", {
    title: "Oxide.js",
    framework: "Oxide.js",
    items: ["Fast routing", "Middleware support", "Template engine", "Error handling"],
  });
});

// Render with dynamic data from route params
app.get("/page/user/:name", (ctx: Context) => {
  ctx.render("user", {
    user: {
      name: ctx.params.name,
      email: `${ctx.params.name}@example.com`,
      role: "Developer",
    },
  });
});

// ============================================
// RATE LIMITING DEMO
// ============================================

// Rate-limited route: 5 requests per 30 seconds
const apiLimiter = rateLimit({
  windowMs: 30000,
  max: 5,
  message: "API rate limit exceeded. Try again in 30 seconds.",
});

app.get("/api/limited", apiLimiter as any, (ctx: Context) => {
  ctx.json({ message: "This route is rate-limited (5 req / 30s)" });
});

// ============================================
// ATTACHMENT & LINKS DEMO
// ============================================

// ctx.attachment() - set Content-Disposition for download
app.get("/api/report", (ctx: Context) => {
  ctx.attachment("report.json");
  ctx.json({ revenue: 50000, users: 1200, month: "March 2026" });
});

// ctx.links() - set Link header for pagination
app.get("/api/articles", (ctx: Context) => {
  const page = parseInt(ctx.query.page || "1");
  ctx.links({
    first: "/api/articles?page=1",
    prev: page > 1 ? `/api/articles?page=${page - 1}` : "",
    next: `/api/articles?page=${page + 1}`,
    last: "/api/articles?page=10",
  });
  ctx.json({
    page,
    articles: [{ id: page, title: `Article ${page}` }],
  });
});

// ============================================
// SESSION DEMO
// ============================================

// Set session data
app.get("/api/session/login", (ctx: Context) => {
  ctx.session.user = "Yeabsira";
  ctx.session.role = "admin";
  ctx.session.loggedInAt = new Date().toISOString();
  ctx.json({ message: "Logged in", session: ctx.session });
});

// Read session data
app.get("/api/session/profile", (ctx: Context) => {
  if (!ctx.session.user) {
    ctx.status(401).json({ error: "Not logged in" });
    return;
  }
  ctx.json({ session: ctx.session });
});

// Clear session
app.get("/api/session/logout", (ctx: Context) => {
  ctx.session = {};
  ctx.json({ message: "Logged out" });
});

// ============================================
// REQUEST VALIDATION DEMO
// ============================================

// Validate POST body
app.post("/api/register", validate({
  body: {
    name: { type: "string", required: true, min: 2, max: 50 },
    email: { type: "string", required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    age: { type: "number", min: 18, max: 120 },
    role: { enum: ["admin", "user", "moderator"] },
  },
}) as any, (ctx: Context) => {
  ctx.status(201).json({ message: "User registered", data: ctx.body });
});

// Validate query params
app.get("/api/search-validated", validate({
  query: {
    q: { type: "string", required: true, min: 1 },
    limit: { type: "number", min: 1, max: 100 },
  },
}) as any, (ctx: Context) => {
  ctx.json({ query: ctx.query.q, limit: ctx.query.limit || "10" });
});

// ============================================
// ERROR HANDLING DEMO
// ============================================

// ctx.throw() - throw HTTP errors with proper status codes
app.get("/api/protected", (ctx: Context) => {
  ctx.throw(401, "Authentication required");
});

// ctx.throw() - 404 with custom message
app.get("/api/missing-item", (ctx: Context) => {
  ctx.throw(404, "Item not found");
});

// ctx.throw() - 403 forbidden
app.get("/api/forbidden", (ctx: Context) => {
  ctx.throw(403);
});

// Sync error - caught by error handler
app.get("/api/crash", (ctx: Context) => {
  throw new Error("Something went wrong!");
});

// Async error - caught by error handler
app.get("/api/async-crash", async (ctx: Context) => {
  await new Promise((resolve) => setTimeout(resolve, 100));
  throw new Error("Async error occurred!");
});

// Custom error handler
app.onError((err, ctx) => {
  const status = err instanceof HttpError ? err.status : 500;
  const message = err instanceof HttpError && err.expose
    ? err.message
    : "Internal Server Error";

  if (status >= 500) {
    console.error(`[Error] ${err.message}`);
  }

  ctx.status(status).json({
    error: message,
    path: ctx.url,
    timestamp: new Date().toISOString(),
  });
});

// Custom 404 handler
app.notFound((ctx) => {
  ctx.status(404).json({
    error: "Route not found",
    path: ctx.url,
    suggestion: "Check the API documentation",
  });
});

// ============================================
// WEBSOCKET DEMO
// ============================================

// Basic echo WebSocket
app.ws("/ws/echo", (socket) => {
  socket.send({ type: "connected", message: "Echo server ready" });

  socket.on("message", (data) => {
    socket.send({ type: "echo", data });
  });

  socket.on("close", () => {
    console.log(`[WS] Echo client ${socket.id} disconnected`);
  });
});

// Chat room WebSocket
app.ws("/ws/chat", (socket) => {
  socket.join("general");

  socket.send({ type: "system", message: `Welcome! Your ID: ${socket.id}` });
  socket.to("general").send({ type: "system", message: `User ${socket.id} joined` });

  socket.on("message", (data) => {
    try {
      const msg = JSON.parse(data);

      if (msg.type === "chat") {
        // Broadcast message to everyone in the room
        socket.to("general").send({
          type: "chat",
          from: socket.id,
          message: msg.message,
        });
        // Echo back to sender as confirmation
        socket.send({
          type: "chat",
          from: "you",
          message: msg.message,
        });
      } else if (msg.type === "join") {
        socket.leave("general");
        socket.join(msg.room);
        socket.send({ type: "system", message: `Joined room: ${msg.room}` });
      }
    } catch {
      socket.send({ type: "error", message: "Invalid JSON" });
    }
  });

  socket.on("close", () => {
    socket.to("general").send({ type: "system", message: `User ${socket.id} left` });
  });
});

// Broadcast WebSocket - live notifications
app.ws("/ws/notifications", (socket) => {
  socket.send({ type: "connected", message: "Notification stream ready" });

  socket.on("message", (data) => {
    // Broadcast notification to all other clients
    socket.broadcast({ type: "notification", from: socket.id, data });
  });

  socket.on("close", () => {
    console.log(`[WS] Notification client ${socket.id} disconnected`);
  });
});

app.listen(3002, () => {
  console.log("Server running on http://localhost:3002");
  console.log("WebSocket endpoints:");
  console.log("  ws://localhost:3002/ws/echo");
  console.log("  ws://localhost:3002/ws/chat");
  console.log("  ws://localhost:3002/ws/notifications");
});

// ============================================
// HTTPS EXAMPLE (uncomment to use)
// ============================================
// import * as fs from "fs";
// const sslApp = createApp();
// sslApp.get("/", (ctx: Context) => {
//   ctx.json({ secure: true, protocol: ctx.protocol });
// });
// sslApp.listen(3443, {
//   key: fs.readFileSync("test-key.pem"),
//   cert: fs.readFileSync("test-cert.pem"),
// }, () => {
//   console.log("HTTPS server running on https://localhost:3443");
// });
