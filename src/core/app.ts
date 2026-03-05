import { Router } from "../router/router";
import type { Handler } from "../router/router";
import { Server } from "./server";

export class Application {
  private router: Router;
  constructor() {
    this.router = new Router();
  }

  get(path: string, handler: Handler) {
    this.router.add("GET", path, handler);
  }

  post(path: string, handler: Handler) {
    this.router.add("POST", path, handler);
  }

  listen(port: number, callback?: () => void) {
    const server = new Server((req, res) => {
      this.router.handle(req, res);
    });

    server.listen(port, callback);
  }
}

export function createApp() {
  return new Application();
}
