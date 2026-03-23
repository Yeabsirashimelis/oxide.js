import { IncomingMessage, ServerResponse } from "http";
import * as fs from "fs";
import * as path from "path";

type Next = () => void;

const mimeTypes: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain",
  ".pdf": "application/pdf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
};

export interface StaticOptions {
  index?: string;
  dotfiles?: "allow" | "deny" | "ignore";
}

const defaultOptions: StaticOptions = {
  index: "index.html",
  dotfiles: "ignore",
};

export function serveStatic(root: string, options: StaticOptions = {}) {
  const opts = { ...defaultOptions, ...options };
  const rootPath = path.resolve(root);

  return (req: IncomingMessage, res: ServerResponse, next: Next) => {
    // Only handle GET and HEAD requests
    if (req.method !== "GET" && req.method !== "HEAD") {
      return next();
    }

    const url = req.url || "/";
    const urlPath = url.split("?")[0] || "/";

    // Decode URL and prevent directory traversal
    let decodedPath: string;
    try {
      decodedPath = decodeURIComponent(urlPath);
    } catch {
      return next();
    }

    // Check for dotfiles
    const basename = path.basename(decodedPath);
    if (basename.startsWith(".")) {
      if (opts.dotfiles === "deny") {
        res.statusCode = 403;
        res.end("Forbidden");
        return;
      }
      if (opts.dotfiles === "ignore") {
        return next();
      }
    }

    // Build file path
    let filePath = path.join(rootPath, decodedPath);

    // Prevent directory traversal
    if (!filePath.startsWith(rootPath)) {
      return next();
    }

    fs.stat(filePath, (err, stats) => {
      if (err) {
        return next();
      }

      // If directory, try index file
      if (stats.isDirectory()) {
        if (opts.index) {
          filePath = path.join(filePath, opts.index);
        } else {
          return next();
        }
      }

      fs.stat(filePath, (err, fileStats) => {
        if (err || !fileStats.isFile()) {
          return next();
        }

        // Get MIME type
        const ext = path.extname(filePath).toLowerCase();
        const contentType = mimeTypes[ext] || "application/octet-stream";

        // Set headers
        res.setHeader("Content-Type", contentType);
        res.setHeader("Content-Length", fileStats.size);

        // HEAD request - don't send body
        if (req.method === "HEAD") {
          res.end();
          return;
        }

        // Stream file
        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
        stream.on("error", () => {
          res.statusCode = 500;
          res.end("Internal Server Error");
        });
      });
    });
  };
}
