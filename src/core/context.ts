import type { IncomingMessage } from "http";
import type { OxideRequest, Query } from "../request/request";
import type { OxideResponse, SendFileOptions } from "../response/response";
import type { Params } from "../router/router";
import type {
  Cookies,
  CookieOptions,
  OxideRequestWithCookies,
  OxideResponseWithCookies,
} from "../middleware/cookie";

export class Context {
  readonly req: OxideRequest;
  readonly res: OxideResponse;
  readonly params: Params;

  constructor(req: OxideRequest, res: OxideResponse, params: Params) {
    this.req = req;
    this.res = res;
    this.params = params;
  }

  // Request helpers
  get method(): string | undefined {
    return this.req.method;
  }

  get url(): string | undefined {
    return this.req.url;
  }

  get query(): Query {
    return this.req.query;
  }

  get body(): unknown {
    return this.req.body;
  }

  get headers(): IncomingMessage["headers"] {
    return this.req.headers;
  }

  // Response helpers
  status(code: number): this {
    this.res.status(code);
    return this;
  }

  json(data: unknown): void {
    this.res.json(data);
  }

  send(body: string): void {
    this.res.send(body);
  }

  html(body: string): void {
    this.res.html(body);
  }

  redirect(url: string, statusCode?: number): void {
    this.res.redirect(url, statusCode);
  }

  sendFile(filePath: string, options?: SendFileOptions): void {
    this.res.sendFile(filePath, options);
  }

  download(filePath: string, filename?: string): void {
    this.res.download(filePath, filename);
  }

  // Header helpers
  set(name: string, value: string | number): this {
    this.res.set(name, value);
    return this;
  }

  append(name: string, value: string | number): this {
    this.res.append(name, value);
    return this;
  }

  type(contentType: string): this {
    this.res.type(contentType);
    return this;
  }

  get(name: string): string | undefined {
    const value = this.req.headers[name.toLowerCase()];
    return Array.isArray(value) ? value[0] : value;
  }

  is(type: string): boolean {
    const contentType = this.req.headers["content-type"] || "";
    const normalizedType = type.toLowerCase();

    if (normalizedType === "json") {
      return contentType.includes("application/json");
    }
    if (normalizedType === "html") {
      return contentType.includes("text/html");
    }
    if (normalizedType === "text") {
      return contentType.includes("text/plain");
    }
    if (normalizedType === "multipart") {
      return contentType.includes("multipart/");
    }
    if (normalizedType === "urlencoded") {
      return contentType.includes("application/x-www-form-urlencoded");
    }

    return contentType.includes(normalizedType);
  }

  // Cookie helpers
  get cookies(): Cookies {
    return (this.req as unknown as OxideRequestWithCookies).cookies || {};
  }

  setCookie(name: string, value: string, options?: CookieOptions): void {
    const res = this.res as unknown as OxideResponseWithCookies;
    if (res.setCookie) {
      res.setCookie(name, value, options);
    }
  }

  clearCookie(name: string, options?: CookieOptions): void {
    const res = this.res as unknown as OxideResponseWithCookies;
    if (res.clearCookie) {
      res.clearCookie(name, options);
    }
  }
}
