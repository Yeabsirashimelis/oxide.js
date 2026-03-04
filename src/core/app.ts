import { Router } from "../router/router";
import { Server } from "./server";
import { IncomingMessage, ServerResponse } from "http";

type Handler = (req: IncomingMessage, res: ServerResponse) => void;

export class Application {
  private router: Router;
  constructor() {
    this.router = new Router();
  }

  get(path: string, handler: any) {
    this.router.add("GET", path, handler);
  }

  post(path: string, handler: any) {
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
