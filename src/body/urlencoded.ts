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

function parseUrlEncoded(body: string): Record<string, string> {
  const result: Record<string, string> = {};

  if (!body) {
    return result;
  }

  const pairs = body.split("&");

  for (const pair of pairs) {
    const [key, ...valueParts] = pair.split("=");
    if (key) {
      const decodedKey = decodeURIComponent(key.replace(/\+/g, " "));
      const value = valueParts.join("=");
      const decodedValue = decodeURIComponent(value.replace(/\+/g, " "));
      result[decodedKey] = decodedValue;
    }
  }

  return result;
}

export function urlencodedParser() {
  return async (req: IncomingMessage, res: ServerResponse, next: Next) => {
    const contentType = req.headers["content-type"] || "";

    if (contentType.includes("application/x-www-form-urlencoded")) {
      try {
        const rawBody = await readBody(req);
        (req as OxideRequest).body = parseUrlEncoded(rawBody);
      } catch {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Invalid form data" }));
        return;
      }
    }

    next();
  };
}
