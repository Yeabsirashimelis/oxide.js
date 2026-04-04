import * as path from "path";
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
import { HttpError } from "../middleware/error-handler";
import type { Application } from "./app";

export class Context {
  readonly req: OxideRequest;
  readonly res: OxideResponse;
  readonly params: Params;
  private app?: Application;

  constructor(req: OxideRequest, res: OxideResponse, params: Params, app?: Application) {
    this.req = req;
    this.res = res;
    this.params = params;
    this.app = app;
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

  get ip(): string | undefined {
    // Check X-Forwarded-For header first (for proxied requests)
    const forwarded = this.req.headers["x-forwarded-for"];
    if (forwarded) {
      const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
      return ips?.split(",")[0]?.trim();
    }
    // Fall back to socket remote address
    return this.req.socket?.remoteAddress;
  }

  get hostname(): string | undefined {
    // Get host header and strip port if present
    const host = this.req.headers["host"];
    if (!host) return undefined;
    // Handle IPv6 addresses in brackets
    const bracketIndex = host.indexOf("]");
    if (bracketIndex !== -1) {
      return host.substring(0, bracketIndex + 1);
    }
    // Strip port from hostname
    return host.split(":")[0];
  }

  get protocol(): string {
    const proto = this.req.headers["x-forwarded-proto"];
    if (proto) {
      return Array.isArray(proto) ? proto[0] as string : proto;
    }
    return "http";
  }

  get secure(): boolean {
    return this.protocol === "https";
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

  render(view: string, data: Record<string, unknown> = {}): void {
    if (!this.app) {
      throw new Error("Cannot render: no app context available");
    }

    const viewEngine = this.app.getSetting("view engine") as string;
    const viewsDir = this.app.getSetting("views") as string || "views";

    if (!viewEngine) {
      throw new Error("No view engine set. Use app.set('view engine', 'ejs')");
    }

    const ext = `.${viewEngine}`;
    const engine = this.app.getEngine(ext);

    if (!engine) {
      throw new Error(`No engine registered for extension "${ext}". Use app.engine('${viewEngine}', engineFn)`);
    }

    const filePath = path.resolve(viewsDir, `${view}${ext}`);

    engine(filePath, data, (err, html) => {
      if (err) {
        throw err;
      }
      this.html(html as string);
    });
  }

  throw(status: number, message?: string): never {
    throw new HttpError(status, message);
  }
}
