import { Router } from "../router/router";
import type { Handler } from "../router/router";
import type { Middleware } from "../middleware/types";
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

  get(path: string, handler: Handler) {
    this.router.add("GET", path, handler);
  }

  post(path: string, handler: Handler) {
    this.router.add("POST", path, handler);
  }

  put(path: string, handler: Handler) {
    this.router.add("PUT", path, handler);
  }

  patch(path: string, handler: Handler) {
    this.router.add("PATCH", path, handler);
  }

  delete(path: string, handler: Handler) {
    this.router.add("DELETE", path, handler);
  }

  options(path: string, handler: Handler) {
    this.router.add("OPTIONS", path, handler);
  }

  head(path: string, handler: Handler) {
    this.router.add("HEAD", path, handler);
  }

  all(path: string, handler: Handler) {
    this.router.add("*", path, handler);
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
