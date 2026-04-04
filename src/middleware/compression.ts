import * as zlib from "zlib";
import type { IncomingMessage, ServerResponse } from "http";
import type { Middleware } from "./types";

interface CompressionOptions {
  threshold?: number; // Minimum size in bytes to compress (default: 1024)
  level?: number; // Compression level 1-9 (default: 6)
}

export function compression(options: CompressionOptions = {}): Middleware {
  const threshold = options.threshold ?? 1024;
  const level = options.level ?? 6;

  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const acceptEncoding = req.headers["accept-encoding"] || "";

    // Determine best encoding
    let encoding: "gzip" | "deflate" | null = null;
    if (acceptEncoding.includes("gzip")) {
      encoding = "gzip";
    } else if (acceptEncoding.includes("deflate")) {
      encoding = "deflate";
    }

    if (!encoding) {
      next();
      return;
    }

    // Override res.end to compress the response
    const originalEnd = res.end.bind(res);
    const originalWrite = res.write.bind(res);
    const chunks: Buffer[] = [];

    res.write = function (chunk: any, ...args: any[]): boolean {
      if (chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      return true;
    } as any;

    res.end = function (chunk?: any, ...args: any[]): any {
      if (chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }

      const body = Buffer.concat(chunks);

      // Skip compression for small responses
      if (body.length < threshold) {
        // Remove any encoding header we might have set
        res.removeHeader("Content-Encoding");
        originalEnd(body);
        return res;
      }

      const compressFn = encoding === "gzip"
        ? zlib.gzip
        : zlib.deflate;

      const zlibOptions = { level };

      compressFn(body, zlibOptions, (err, compressed) => {
        if (err) {
          // Fall back to uncompressed on error
          originalEnd(body);
          return;
        }

        res.setHeader("Content-Encoding", encoding as string);
        res.setHeader("Vary", "Accept-Encoding");
        res.removeHeader("Content-Length");
        originalEnd(compressed);
      });

      return res;
    } as any;

    next();
  };
}
