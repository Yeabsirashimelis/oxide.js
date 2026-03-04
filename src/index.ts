import { createApp } from "./core/app";
import { Router } from "./router/router";

const app = createApp();

app.get("/", (req: any, res: any) => {
  res.end("Hello from my framework! 🚀");
});

app.get("/test", (req: any, res: any) => {
  res.end("This is a test route");
});

app.post("/submit", (req: any, res: any) => {
  res.end("POST request received");
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
