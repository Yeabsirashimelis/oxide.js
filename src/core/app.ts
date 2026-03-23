import { Router, RouteGroup } from "../router/router";
import type { Handler, RouteMiddleware } from "../router/router";
import { Context } from "./context";

export { Context };
export type { Handler, RouteMiddleware };
import type { Middleware } from "../middleware/types";
import type { ErrorHandler } from "../middleware/error-handler";
import { runMiddlewares } from "../middleware/runner";
import { Server } from "./server";

export class Application {
  private router: Router;
  private middlewares: Middleware[] = [];

  constructor() {
    this.router = new Router();
  }

  use(middleware: Middleware) {
    this.middlewares.push(middleware);
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

  listen(port: number, callback?: () => void) {
    const server = new Server((req, res) => {
      runMiddlewares(this.middlewares, req, res, () => {
        this.router.handle(req, res);
      });
    });

    server.listen(port, callback);
  }
}

export function createApp() {
  return new Application();
}
