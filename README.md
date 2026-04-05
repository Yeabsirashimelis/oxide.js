# oxide.js

A TypeScript backend framework that doesn't get in your way. Built from scratch on top of Node's `http` module — no Express under the hood.

## Why?

I wanted something that felt like Express but with a cleaner API. Instead of `req` and `res` flying around everywhere, you get a single `ctx` object. TypeScript-first, so you actually get autocomplete.

## Install

```bash
npm install oxide.js
```

## Quick start

```typescript
import { createApp, jsonParser, logger } from "oxide.js";

const app = createApp();

app.use(logger({ format: "dev" }));
app.use(jsonParser());

app.get("/", (ctx) => {
  ctx.json({ hello: "world" });
});

app.get("/users/:id", (ctx) => {
  ctx.json({ userId: ctx.params.id });
});

app.post("/users", (ctx) => {
  const body = ctx.body as { name: string };
  ctx.status(201).json({ created: body.name });
});

app.listen(3000, () => {
  console.log("Running on http://localhost:3000");
});
```

## What's included

- Routing with params, groups, and nested routers
- Middleware (CORS, body parsing, cookies, sessions, rate limiting, compression, logging, validation, static files)
- WebSocket with rooms and broadcasting
- Template engine support (EJS, Pug, etc.)
- HTTPS/TLS
- Error handling with `ctx.throw()`
- TypeScript types for everything

## Routing

```typescript
// Route params
app.get("/posts/:id", (ctx) => {
  ctx.json({ id: ctx.params.id });
});

// Query strings — /search?q=hello&limit=10
app.get("/search", (ctx) => {
  ctx.json({ q: ctx.query.q, limit: ctx.query.limit });
});

// All HTTP methods
app.get("/items", handler);
app.post("/items", handler);
app.put("/items/:id", handler);
app.patch("/items/:id", handler);
app.delete("/items/:id", handler);
```

### Route groups

```typescript
const api = app.group("/api/v1");

api.get("/users", (ctx) => { /* ... */ });
api.post("/users", (ctx) => { /* ... */ });
api.get("/posts", (ctx) => { /* ... */ });
```

### Nested routers

```typescript
import { createRouter } from "oxide.js";

const usersRouter = createRouter();
usersRouter.get("/", listUsers);
usersRouter.get("/:id", getUser);
usersRouter.post("/", createUser);

app.use("/api/users", usersRouter);
// Registers /api/users, /api/users/:id, etc.
```

## Middleware

Oxide ships with a bunch of built-in middleware. Use what you need.

```typescript
import {
  cors,
  jsonParser,
  urlencodedParser,
  cookieParser,
  session,
  compression,
  logger,
  rateLimit,
  validate,
  serveStatic,
} from "oxide.js";

app.use(logger({ format: "dev" }));
app.use(cors({ origin: "http://localhost:5173" }));
app.use(jsonParser());
app.use(urlencodedParser());
app.use(cookieParser());
app.use(session({ maxAge: 3600 }));
app.use(compression());
app.use(serveStatic("public"));
```

### Route-level middleware

```typescript
const auth = (req, res, next) => {
  if (req.headers.authorization === "Bearer secret") {
    next();
  } else {
    res.statusCode = 401;
    res.end("Unauthorized");
  }
};

app.get("/admin", auth, (ctx) => {
  ctx.json({ secret: "stuff" });
});
```

### Rate limiting

```typescript
const limiter = rateLimit({
  windowMs: 60000, // 1 minute
  max: 100,        // 100 requests per window
});

app.get("/api/data", limiter, handler);
```

Sends `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `Retry-After` headers automatically.

### Validation

```typescript
app.post("/api/users", validate({
  body: {
    name: { type: "string", required: true, min: 2, max: 50 },
    email: { type: "string", required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    age: { type: "number", min: 18 },
    role: { enum: ["admin", "user", "moderator"] },
  }
}), (ctx) => {
  ctx.status(201).json({ created: true });
});
```

Returns `400` with an `errors` array if validation fails.

### Sessions

```typescript
app.use(cookieParser());
app.use(session({ name: "sid", maxAge: 86400 }));

app.get("/login", (ctx) => {
  ctx.session.user = "alice";
  ctx.json({ loggedIn: true });
});

app.get("/profile", (ctx) => {
  if (!ctx.session.user) {
    ctx.throw(401);
  }
  ctx.json({ user: ctx.session.user });
});
```

## Responses

```typescript
ctx.json({ data: "value" });           // JSON
ctx.send("plain text");                 // text/plain
ctx.html("<h1>Hello</h1>");            // text/html
ctx.status(201).json({ created: true });// set status
ctx.redirect("/new-url");              // 302 redirect
ctx.redirect("/moved", 301);           // 301 redirect
ctx.sendFile("public/report.pdf");     // serve a file
ctx.download("files/data.csv");        // trigger download
ctx.attachment("export.json");         // set Content-Disposition
```

### Headers

```typescript
ctx.set("X-Request-Id", "abc123");
ctx.append("X-Tags", "fast");
ctx.type("json");

const ua = ctx.get("User-Agent");
const isJson = ctx.is("json");
```

### Pagination links

```typescript
ctx.links({
  next: "/api/posts?page=3",
  prev: "/api/posts?page=1",
  last: "/api/posts?page=50",
});
// Sets the Link header
```

## Request info

```typescript
ctx.ip        // client IP (respects X-Forwarded-For)
ctx.hostname  // from Host header
ctx.protocol  // "http" or "https" (respects X-Forwarded-Proto)
ctx.secure    // true if https
ctx.method    // "GET", "POST", etc.
ctx.url       // request path
ctx.query     // parsed query params
ctx.body      // parsed body (needs jsonParser or urlencodedParser)
ctx.params    // route params
ctx.headers   // request headers
ctx.cookies   // parsed cookies (needs cookieParser)
ctx.session   // session data (needs session middleware)
```

## Error handling

```typescript
// Throw HTTP errors from anywhere in a handler
app.get("/protected", (ctx) => {
  ctx.throw(401, "Login required");
});

app.get("/item/:id", (ctx) => {
  const item = db.find(ctx.params.id);
  if (!item) ctx.throw(404, "Item not found");
  ctx.json(item);
});

// Custom error handler
app.onError((err, ctx) => {
  console.error(err);
  ctx.status(500).json({ error: "Something broke" });
});

// Custom 404
app.notFound((ctx) => {
  ctx.status(404).json({ error: "Nothing here" });
});
```

`HttpError` is also exported if you need it:

```typescript
import { HttpError } from "oxide.js";
throw new HttpError(403, "Forbidden");
```

## Template engine

```typescript
app.set("view engine", "ejs");
app.set("views", "views");

app.get("/", (ctx) => {
  ctx.render("home", { title: "Welcome", items: ["a", "b", "c"] });
});
```

Works with EJS out of the box. For other engines, register them manually:

```typescript
app.engine(".hbs", handlebars.__express);
```

## WebSocket

Built-in WebSocket support with rooms and broadcasting. No extra setup — it runs on the same port as your HTTP server.

```typescript
app.ws("/ws/chat", (socket) => {
  socket.join("general");

  socket.send({ type: "welcome", id: socket.id });

  socket.on("message", (data) => {
    socket.to("general").send({ from: socket.id, message: data });
  });

  socket.on("close", () => {
    socket.to("general").send({ type: "left", id: socket.id });
  });
});
```

### Socket API

```typescript
socket.send(data)           // send to this client (string or object)
socket.broadcast(data)      // send to everyone except this client
socket.join("room")         // join a room
socket.leave("room")        // leave a room
socket.to("room").send(data)// send to everyone in a room (except self)
socket.close()              // disconnect
socket.id                   // unique client ID
socket.rooms                // list of rooms this client is in
```

## HTTPS

```typescript
import fs from "fs";

app.listen(443, {
  key: fs.readFileSync("server.key"),
  cert: fs.readFileSync("server.cert"),
}, () => {
  console.log("HTTPS running");
});
```

## Running the demo

There's a demo server in `src/index.ts` that shows off every feature:

```bash
npm run demo
```

## Tests

```bash
npm test
```

48 tests covering routing, middleware, WebSocket, and error handling.

## License

MIT
