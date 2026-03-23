import type { IncomingMessage, ServerResponse } from "http";
import { enhanceResponse } from "../response/response";
import { enhanceRequest } from "../request/request";
import { Context } from "../core/context";
import {
  defaultErrorHandler,
  type ErrorHandler,
} from "../middleware/error-handler";
import type { Middleware } from "../middleware/types";

export type Params = Record<string, string>;

export type Handler = (ctx: Context) => void | Promise<void>;

export type RouteMiddleware = Middleware | Handler;

interface Route {
  method: string;
  path: string;
  middlewares: Middleware[];
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

  get(path: string, ...handlers: RouteMiddleware[]) {
    this.router.add("GET", this.fullPath(path), ...handlers);
    return this;
  }

  post(path: string, ...handlers: RouteMiddleware[]) {
    this.router.add("POST", this.fullPath(path), ...handlers);
    return this;
  }

  put(path: string, ...handlers: RouteMiddleware[]) {
    this.router.add("PUT", this.fullPath(path), ...handlers);
    return this;
  }

  patch(path: string, ...handlers: RouteMiddleware[]) {
    this.router.add("PATCH", this.fullPath(path), ...handlers);
    return this;
  }

  delete(path: string, ...handlers: RouteMiddleware[]) {
    this.router.add("DELETE", this.fullPath(path), ...handlers);
    return this;
  }

  all(path: string, ...handlers: RouteMiddleware[]) {
    this.router.add("*", this.fullPath(path), ...handlers);
    return this;
  }
}

export class Router {
  private routes: Route[] = [];
  private errorHandler: ErrorHandler = defaultErrorHandler;

  add(method: string, path: string, ...handlers: RouteMiddleware[]) {
    if (handlers.length === 0) {
      throw new Error("At least one handler is required");
    }

    // Last handler is the route handler, rest are middleware
    const handler = handlers[handlers.length - 1] as Handler;
    const middlewares = handlers.slice(0, -1) as Middleware[];

    this.routes.push({ method, path, middlewares, handler });
  }

  // HTTP method shortcuts for standalone router usage
  get(path: string, ...handlers: RouteMiddleware[]) {
    this.add("GET", path, ...handlers);
    return this;
  }

  post(path: string, ...handlers: RouteMiddleware[]) {
    this.add("POST", path, ...handlers);
    return this;
  }

  put(path: string, ...handlers: RouteMiddleware[]) {
    this.add("PUT", path, ...handlers);
    return this;
  }

  patch(path: string, ...handlers: RouteMiddleware[]) {
    this.add("PATCH", path, ...handlers);
    return this;
  }

  delete(path: string, ...handlers: RouteMiddleware[]) {
    this.add("DELETE", path, ...handlers);
    return this;
  }

  options(path: string, ...handlers: RouteMiddleware[]) {
    this.add("OPTIONS", path, ...handlers);
    return this;
  }

  head(path: string, ...handlers: RouteMiddleware[]) {
    this.add("HEAD", path, ...handlers);
    return this;
  }

  all(path: string, ...handlers: RouteMiddleware[]) {
    this.add("*", path, ...handlers);
    return this;
  }

  group(prefix: string): RouteGroup {
    return new RouteGroup(this, prefix);
  }

  // Get all routes (used for mounting)
  getRoutes(): Route[] {
    return this.routes;
  }

  // Mount another router's routes with a prefix
  mount(prefix: string, router: Router) {
    const normalizedPrefix = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix;

    for (const route of router.getRoutes()) {
      const fullPath = route.path === "/"
        ? normalizedPrefix || "/"
        : `${normalizedPrefix}${route.path}`;

      this.routes.push({
        method: route.method,
        path: fullPath,
        middlewares: route.middlewares,
        handler: route.handler,
      });
    }
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

        // Run route-level middleware then handler
        this.runRouteMiddlewares(route.middlewares, req, res, ctx, () => {
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
        });
        return;
      }
    }

    oxideRes.status(404).send("Not Found");
  }

  private runRouteMiddlewares(
    middlewares: Middleware[],
    req: IncomingMessage,
    res: ServerResponse,
    ctx: Context,
    done: () => void
  ) {
    let index = 0;

    const next = () => {
      if (index >= middlewares.length) {
        done();
        return;
      }

      const middleware = middlewares[index++] as Middleware;
      try {
        const result = middleware(req, res, next);
        if (result instanceof Promise) {
          result.catch((err: Error) => {
            this.errorHandler(err, ctx);
          });
        }
      } catch (err) {
        this.errorHandler(err as Error, ctx);
      }
    };

    next();
  }
}

export function createRouter(): Router {
  return new Router();
}
