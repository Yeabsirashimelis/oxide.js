import { Server } from "./server";
import { IncomingMessage, ServerResponse } from "http";

type Handler = (req: IncomingMessage, res: ServerResponse) => void;

interface Route {
  method: string;
  path: string;
  handler: Handler;
}

export class Application {
  private routes: Route[] = [];

  get(path: string, handler: Handler) {
    this.routes.push({ method: "GET", path, handler });
  }

  post(path: string, handler: Handler) {
    this.routes.push({ method: "POST", path, handler });
  }

  listen(port: number, callback?: () => void) {
    const server = new Server((req, res) => {
      const route = this.routes.find(
        r => r.method === req.method && r.path === req.url
      );

      if (route) {
        route.handler(req, res);
      } else {
        res.statusCode = 404;
        res.end("Not Found");
      }
    });

    server.listen(port, callback);
  }
}

export function createApp() {
  return new Application();
}