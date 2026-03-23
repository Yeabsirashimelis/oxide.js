import type { IncomingMessage, ServerResponse } from "http";
import { enhanceResponse } from "../response/response";
import { enhanceRequest } from "../request/request";
import { Context } from "../core/context";
import {
  defaultErrorHandler,
  type ErrorHandler,
} from "../middleware/error-handler";

export type Params = Record<string, string>;

export type Handler = (ctx: Context) => void | Promise<void>;

interface Route {
  method: string;
  path: string;
  handler: Handler;
}

function matchRoute(pattern: string, url: string): Params | null {
  const urlPath = url.split("?")[0] ?? url;

  const patternParts = pattern.split("/").filter(Boolean);
  const urlParts = urlPath.split("/").filter(Boolean);

  if (patternParts.length !== urlParts.length) {
    return null;
  }

  const params: Params = {};

  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i] as string;
    const urlPart = urlParts[i] as string;

    if (patternPart.startsWith(":")) {
      const paramName = patternPart.slice(1);
      params[paramName] = urlPart;
    } else if (patternPart !== urlPart) {
      return null;
    }
  }

  return params;
}

export class RouteGroup {
  private router: Router;
  private prefix: string;

  constructor(router: Router, prefix: string) {
    this.router = router;
    this.prefix = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix;
  }

  private fullPath(path: string): string {
    if (path === "/") {
      return this.prefix || "/";
    }
    return `${this.prefix}${path}`;
  }

  get(path: string, handler: Handler) {
    this.router.add("GET", this.fullPath(path), handler);
    return this;
  }

  post(path: string, handler: Handler) {
    this.router.add("POST", this.fullPath(path), handler);
    return this;
  }

  put(path: string, handler: Handler) {
    this.router.add("PUT", this.fullPath(path), handler);
    return this;
  }

  patch(path: string, handler: Handler) {
    this.router.add("PATCH", this.fullPath(path), handler);
    return this;
  }

  delete(path: string, handler: Handler) {
    this.router.add("DELETE", this.fullPath(path), handler);
    return this;
  }

  all(path: string, handler: Handler) {
    this.router.add("*", this.fullPath(path), handler);
    return this;
  }
}

export class Router {
  private routes: Route[] = [];
  private errorHandler: ErrorHandler = defaultErrorHandler;

  add(method: string, path: string, handler: Handler) {
    this.routes.push({ method, path, handler });
  }

  group(prefix: string): RouteGroup {
    return new RouteGroup(this, prefix);
  }

  setErrorHandler(handler: ErrorHandler) {
    this.errorHandler = handler;
  }

  handle(req: IncomingMessage, res: ServerResponse) {
    const url = req.url || "/";
    const oxideReq = enhanceRequest(req);
    const oxideRes = enhanceResponse(res);

    for (const route of this.routes) {
      if (route.method !== "*" && route.method !== req.method) {
        continue;
      }

      const params = matchRoute(route.path, url);
      if (params !== null) {
        const ctx = new Context(oxideReq, oxideRes, params);
        try {
          const result = route.handler(ctx);
          if (result instanceof Promise) {
            result.catch((err: Error) => {
              this.errorHandler(err, ctx);
            });
          }
        } catch (err) {
          this.errorHandler(err as Error, ctx);
        }
        return;
      }
    }

    oxideRes.status(404).send("Not Found");
  }
}
