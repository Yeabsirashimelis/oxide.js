import { Router, RouteGroup, createRouter } from "../router/router";
import type { Handler, RouteMiddleware } from "../router/router";
import { Context } from "./context";

export { Context, createRouter };
export type { Handler, RouteMiddleware };
import type { Middleware } from "../middleware/types";
import type { ErrorHandler, NotFoundHandler } from "../middleware/error-handler";
import { runMiddlewares } from "../middleware/runner";
import { Server } from "./server";

export class Application {
  private router: Router;
  private middlewares: Middleware[] = [];

  constructor() {
    this.router = new Router();
  }

  use(middleware: Middleware): void;
  use(path: string, router: Router): void;
  use(pathOrMiddleware: string | Middleware, router?: Router): void {
    if (typeof pathOrMiddleware === "string" && router) {
      this.router.mount(pathOrMiddleware, router);
    } else if (typeof pathOrMiddleware === "function") {
      this.middlewares.push(pathOrMiddleware);
    }
  }

  get(path: string, ...handlers: RouteMiddleware[]) {
    this.router.add("GET", path, ...handlers);
  }

  post(path: string, ...handlers: RouteMiddleware[]) {
    this.router.add("POST", path, ...handlers);
  }

  put(path: string, ...handlers: RouteMiddleware[]) {
    this.router.add("PUT", path, ...handlers);
  }

  patch(path: string, ...handlers: RouteMiddleware[]) {
    this.router.add("PATCH", path, ...handlers);
  }

  delete(path: string, ...handlers: RouteMiddleware[]) {
    this.router.add("DELETE", path, ...handlers);
  }

  options(path: string, ...handlers: RouteMiddleware[]) {
    this.router.add("OPTIONS", path, ...handlers);
  }

  head(path: string, ...handlers: RouteMiddleware[]) {
    this.router.add("HEAD", path, ...handlers);
  }

  all(path: string, ...handlers: RouteMiddleware[]) {
    this.router.add("*", path, ...handlers);
  }

  group(prefix: string): RouteGroup {
    return this.router.group(prefix);
  }

  onError(handler: ErrorHandler) {
    this.router.setErrorHandler(handler);
  }

  notFound(handler: NotFoundHandler) {
    this.router.setNotFoundHandler(handler);
  }

  listen(port: number, callback?: () => void) {
    const server = new Server((req, res) => {
      runMiddlewares(
        this.middlewares,
        req,
        res,
        () => {
          this.router.handle(req, res);
        },
        (err) => {
          this.router.handleError(err, req, res);
        },
      );
    });

    server.listen(port, callback);
  }
}

export function createApp() {
  return new Application();
}
