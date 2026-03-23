import { createApp } from "./core/app";
import { jsonParser } from "./body/json";
import { urlencodedParser } from "./body/urlencoded";
import { cors } from "./middleware/cors";
import { serveStatic } from "./middleware/static";
import { cookieParser } from "./middleware/cookie";

const app = createApp();

// ============================================
// MIDDLEWARE DEMO
// ============================================

// Logger middleware - runs on every request
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// CORS middleware - enable cross-origin requests
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// JSON body parser middleware
app.use(jsonParser());

// URL-encoded body parser middleware (for HTML forms)
app.use(urlencodedParser());

// Cookie parser middleware
app.use(cookieParser());

// Static file serving - serve files from "public" directory
// Visit http://localhost:3000/index.html or http://localhost:3000/style.css
app.use(serveStatic("public"));

// ============================================
// RESPONSE HELPERS DEMO
// ============================================

// ctx.send() - plain text
app.get("/", (ctx) => {
  ctx.send("Welcome to Oxide.js API");
});

// ctx.json() - JSON response
app.get("/api/health", (ctx) => {
  ctx.json({ status: "ok", uptime: process.uptime() });
});

// ctx.html() - HTML response
app.get("/html", (ctx) => {
  ctx.html("<h1>Hello from Oxide.js</h1><p>This is an HTML response</p>");
});

// ctx.status() - custom status code
app.get("/api/error", (ctx) => {
  ctx.status(500).json({ error: "Internal server error" });
});

// ============================================
// DYNAMIC ROUTE PARAMETERS DEMO
// ============================================

// Single parameter
app.get("/api/users/:id", (ctx) => {
  ctx.json({ userId: ctx.params.id });
});

// Multiple parameters
app.get("/api/users/:userId/posts/:postId", (ctx) => {
  ctx.json({ userId: ctx.params.userId, postId: ctx.params.postId });
});

// ============================================
// QUERY PARSER DEMO
// ============================================

// Search with query params: /api/search?q=hello&limit=10
app.get("/api/search", (ctx) => {
  ctx.json({
    query: ctx.query.q || "",
    limit: ctx.query.limit || "10",
    allParams: ctx.query,
  });
});

// Filter items: /api/products?category=electronics&sort=price
app.get("/api/products", (ctx) => {
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
app.post("/api/echo", (ctx) => {
  ctx.json({ received: ctx.body });
});

// POST user creation
app.post("/api/users", (ctx) => {
  const body = ctx.body as { name?: string; email?: string };
  ctx.status(201).json({
    message: "User created",
    user: { id: Date.now(), name: body.name, email: body.email },
  });
});

// POST with URL-encoded form data (HTML form submission)
app.post("/api/form", (ctx) => {
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
app.get("/api/items", (ctx) => {
  ctx.json({ items: [{ id: 1, name: "Item 1" }, { id: 2, name: "Item 2" }] });
});

// POST - create resource (with body parsing)
app.post("/api/items", (ctx) => {
  const body = ctx.body as { name?: string };
  ctx.status(201).json({ message: "Item created", name: body.name || "unnamed" });
});

// PUT - replace resource
app.put("/api/items/:id", (ctx) => {
  ctx.json({ message: "Item replaced", id: ctx.params.id });
});

// PATCH - update resource
app.patch("/api/items/:id", (ctx) => {
  ctx.json({ message: "Item updated", id: ctx.params.id });
});

// DELETE - remove resource
app.delete("/api/items/:id", (ctx) => {
  ctx.status(204).send("");
});

// HEAD - headers only (same as GET but no body)
app.head("/api/items", (ctx) => {
  ctx.status(200).send("");
});

// ALL - matches any HTTP method
app.all("/api/any", (ctx) => {
  ctx.json({ method: ctx.method, message: "This route accepts any HTTP method" });
});

// ============================================
// COOKIE DEMO
// ============================================

// Set a cookie
app.get("/api/cookie/set", (ctx) => {
  ctx.setCookie("session", "abc123", {
    httpOnly: true,
    maxAge: 3600,
    path: "/",
  });
  ctx.json({ message: "Cookie set!" });
});

// Read cookies
app.get("/api/cookie/get", (ctx) => {
  ctx.json({ cookies: ctx.cookies });
});

// Clear a cookie
app.get("/api/cookie/clear", (ctx) => {
  ctx.clearCookie("session", { path: "/" });
  ctx.json({ message: "Cookie cleared!" });
});

// ============================================
// ROUTE GROUPS DEMO
// ============================================

// Group routes under /api/v1
const v1 = app.group("/api/v1");

v1.get("/status", (ctx) => {
  ctx.json({ version: "v1", status: "active" });
});

v1.get("/users", (ctx) => {
  ctx.json({ version: "v1", users: ["alice", "bob"] });
});

v1.post("/users", (ctx) => {
  ctx.status(201).json({ version: "v1", message: "User created" });
});

// Group routes under /api/v2
const v2 = app.group("/api/v2");

v2.get("/status", (ctx) => {
  ctx.json({ version: "v2", status: "beta" });
});

v2.get("/users", (ctx) => {
  ctx.json({ version: "v2", users: ["alice", "bob", "charlie"] });
});

// ============================================
// ERROR HANDLING DEMO
// ============================================

// Sync error - throws immediately
app.get("/api/crash", (ctx) => {
  throw new Error("Something went wrong!");
});

// Async error - throws in promise
app.get("/api/async-crash", async (ctx) => {
  await new Promise((resolve) => setTimeout(resolve, 100));
  throw new Error("Async error occurred!");
});

// Custom error handler (optional - uncomment to use)
// app.onError((err, ctx) => {
//   ctx.status(500).json({
//     error: err.message,
//     path: ctx.url,
//     timestamp: new Date().toISOString(),
//   });
// });

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
