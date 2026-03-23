import type { IncomingMessage } from "http";
import type { OxideRequest, Query } from "../request/request";
import type { OxideResponse } from "../response/response";
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
