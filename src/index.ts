import { createApp } from "./core/app";

const app = createApp();

app.get("/", (req, res, params) => {
  res.end("Hello from my framework!");
});

app.get("/test", (req, res, params) => {
  res.end("This is a test route");
});

app.get("/users/:id", (req, res, params) => {
  res.end(`User ID: ${params.id}`);
});

app.get("/users/:id/posts/:postId", (req, res, params) => {
  res.end(`User ID: ${params.id}, Post ID: ${params.postId}`);
});

app.post("/submit", (req, res, params) => {
  res.end("POST request received");
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
