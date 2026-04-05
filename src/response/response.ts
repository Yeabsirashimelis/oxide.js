import type { ServerResponse } from "http";
import * as fs from "fs";
import * as path from "path";

const CONTENT_TYPE_MAP: Record<string, string> = {
  json: "application/json",
  html: "text/html",
  text: "text/plain",
  xml: "application/xml",
  css: "text/css",
  js: "application/javascript",
  png: "image/png",
  jpg: "image/jpeg",
  gif: "image/gif",
  svg: "image/svg+xml",
  pdf: "application/pdf",
};

const MIME_TYPES: Record<string, string> = {
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
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".xml": "application/xml",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".zip": "application/zip",
};

export interface SendFileOptions {
  root?: string;
}

export interface OxideResponse extends ServerResponse {
  status(code: number): OxideResponse;
  json(data: unknown): void;
  send(body: string): void;
  html(body: string): void;
  redirect(url: string, statusCode?: number): void;
  sendFile(filePath: string, options?: SendFileOptions): void;
  download(filePath: string, filename?: string): void;
  set(name: string, value: string | number): OxideResponse;
  append(name: string, value: string | number): OxideResponse;
  type(contentType: string): OxideResponse;
  attachment(filename?: string): OxideResponse;
  links(links: Record<string, string>): OxideResponse;
}

export function enhanceResponse(res: ServerResponse): OxideResponse {
  const oxideRes = res as OxideResponse;

  oxideRes.status = function (code: number): OxideResponse {
    this.statusCode = code;
    return this;
  };

  oxideRes.json = function (data: unknown): void {
    this.setHeader("Content-Type", "application/json");
    this.end(JSON.stringify(data));
  };

  oxideRes.send = function (body: string): void {
    if (!this.getHeader("Content-Type")) {
      this.setHeader("Content-Type", "text/plain");
    }
    this.end(body);
  };

  oxideRes.html = function (body: string): void {
    this.setHeader("Content-Type", "text/html");
    this.end(body);
  };

  oxideRes.redirect = function (url: string, statusCode: number = 302): void {
    this.statusCode = statusCode;
    this.setHeader("Location", url);
    this.end();
  };

  oxideRes.sendFile = function (
    filePath: string,
    options?: SendFileOptions
  ): void {
    const root = options?.root || process.cwd();
    const fullPath = path.isAbsolute(filePath)
      ? filePath
      : path.join(root, filePath);

    // Prevent directory traversal
    const resolvedPath = path.resolve(fullPath);
    if (!resolvedPath.startsWith(path.resolve(root))) {
      this.statusCode = 403;
      this.end("Forbidden");
      return;
    }

    fs.stat(resolvedPath, (err, stats) => {
      if (err || !stats.isFile()) {
        this.statusCode = 404;
        this.end("Not Found");
        return;
      }

      const ext = path.extname(resolvedPath).toLowerCase();
      const contentType = MIME_TYPES[ext] || "application/octet-stream";

      this.setHeader("Content-Type", contentType);
      this.setHeader("Content-Length", stats.size);

      const stream = fs.createReadStream(resolvedPath);
      stream.pipe(this);
    });
  };

  oxideRes.download = function (filePath: string, filename?: string): void {
    const downloadName = filename || path.basename(filePath);
    this.setHeader(
      "Content-Disposition",
      `attachment; filename="${downloadName}"`
    );
    this.sendFile(filePath);
  };

  oxideRes.set = function (name: string, value: string | number): OxideResponse {
    this.setHeader(name, String(value));
    return this;
  };

  oxideRes.append = function (name: string, value: string | number): OxideResponse {
    const existing = this.getHeader(name);
    if (existing) {
      const newValue = Array.isArray(existing)
        ? [...existing, String(value)]
        : [String(existing), String(value)];
      this.setHeader(name, newValue);
    } else {
      this.setHeader(name, String(value));
    }
    return this;
  };

  oxideRes.type = function (contentType: string): OxideResponse {
    const resolved = CONTENT_TYPE_MAP[contentType] || contentType;
    this.setHeader("Content-Type", resolved);
    return this;
  };

  oxideRes.attachment = function (filename?: string): OxideResponse {
    if (filename) {
      const ext = path.extname(filename).toLowerCase();
      const contentType = MIME_TYPES[ext] || "application/octet-stream";
      this.setHeader("Content-Type", contentType);
      this.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    } else {
      this.setHeader("Content-Disposition", "attachment");
    }
    return this;
  };

  oxideRes.links = function (links: Record<string, string>): OxideResponse {
    const parts = Object.entries(links).map(
      ([rel, url]) => `<${url}>; rel="${rel}"`
    );
    const existing = this.getHeader("Link");
    if (existing) {
      const prev = Array.isArray(existing) ? existing.join(", ") : String(existing);
      this.setHeader("Link", `${prev}, ${parts.join(", ")}`);
    } else {
      this.setHeader("Link", parts.join(", "));
    }
    return this;
  };

  return oxideRes;
}
