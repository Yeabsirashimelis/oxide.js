import type { IncomingMessage, ServerResponse } from "http";
import type { OxideRequest } from "../request/request";

type Next = () => void;

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk: Buffer) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      resolve(body);
    });
    req.on("error", (err) => {
      reject(err);
    });
  });
}

export function jsonParser() {
  return async (req: IncomingMessage, res: ServerResponse, next: Next) => {
    const contentType = req.headers["content-type"] || "";

    if (contentType.includes("application/json")) {
      try {
        const rawBody = await readBody(req);
        if (rawBody) {
          (req as OxideRequest).body = JSON.parse(rawBody);
        }
      } catch {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Invalid JSON" }));
        return;
      }
    }

    next();
  };
}
