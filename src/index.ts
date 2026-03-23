import { createApp } from "./core/app";

const app = createApp();

// Logger middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.get("/", (req, res, params) => {
  res.send("Hello from my framework!");
});

app.get("/test", (req, res, params) => {
  res.json({ message: "This is a test route" });
});

app.get("/users/:id", (req, res, params) => {
  res.json({ userId: params.id });
});

app.get("/users/:id/posts/:postId", (req, res, params) => {
  res.json({ userId: params.id, postId: params.postId });
});

app.post("/submit", (req, res, params) => {
  res.status(201).json({ success: true });
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
