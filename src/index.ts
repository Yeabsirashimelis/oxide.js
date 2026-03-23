import { createApp } from "./core/app";
import { jsonParser } from "./body/json";

const app = createApp();

// ============================================
// MIDDLEWARE DEMO
// ============================================

// Logger middleware - runs on every request
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// JSON body parser middleware
app.use(jsonParser());

// ============================================
// RESPONSE HELPERS DEMO
// ============================================

// res.send() - plain text
app.get("/", (req, res, params) => {
  res.send("Welcome to Oxide.js API");
});

// res.json() - JSON response
app.get("/api/health", (req, res, params) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// res.html() - HTML response
app.get("/html", (req, res, params) => {
  res.html("<h1>Hello from Oxide.js</h1><p>This is an HTML response</p>");
});

// res.status() - custom status code
app.get("/api/error", (req, res, params) => {
  res.status(500).json({ error: "Internal server error" });
});

// ============================================
// DYNAMIC ROUTE PARAMETERS DEMO
// ============================================

// Single parameter
app.get("/api/users/:id", (req, res, params) => {
  res.json({ userId: params.id });
});

// Multiple parameters
app.get("/api/users/:userId/posts/:postId", (req, res, params) => {
  res.json({ userId: params.userId, postId: params.postId });
});

// ============================================
// BODY PARSING DEMO
// ============================================

// POST with JSON body
app.post("/api/echo", (req, res, params) => {
  res.json({ received: req.body });
});

// POST user creation
app.post("/api/users", (req, res, params) => {
  const body = req.body as { name?: string; email?: string };
  res.status(201).json({
    message: "User created",
    user: { id: Date.now(), name: body.name, email: body.email },
  });
});

// ============================================
// HTTP METHODS DEMO
// ============================================

// GET - retrieve resource
app.get("/api/items", (req, res, params) => {
  res.json({ items: [{ id: 1, name: "Item 1" }, { id: 2, name: "Item 2" }] });
});

// POST - create resource (with body parsing)
app.post("/api/items", (req, res, params) => {
  const body = req.body as { name?: string };
  res.status(201).json({ message: "Item created", name: body.name || "unnamed" });
});

// PUT - replace resource
app.put("/api/items/:id", (req, res, params) => {
  res.json({ message: "Item replaced", id: params.id });
});

// PATCH - update resource
app.patch("/api/items/:id", (req, res, params) => {
  res.json({ message: "Item updated", id: params.id });
});

// DELETE - remove resource
app.delete("/api/items/:id", (req, res, params) => {
  res.status(204).send("");
});

// OPTIONS - CORS preflight
app.options("/api/items", (req, res, params) => {
  res.status(204).send("");
});

// HEAD - headers only (same as GET but no body)
app.head("/api/items", (req, res, params) => {
  res.status(200).send("");
});

// ALL - matches any HTTP method
app.all("/api/any", (req, res, params) => {
  res.json({ method: req.method, message: "This route accepts any HTTP method" });
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
