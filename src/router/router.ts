import { IncomingMessage, ServerResponse } from "http";

type Handler = (req: IncomingMessage, res: ServerResponse) => void;

interface Route {
  method: string;
  path: string;
  handler: Handler;
}

export class Router {
  private routes: Route[] = [];

  add(method: string, path: string, handler: Handler) {
    this.routes.push({ method, path, handler });
  }

  handle(req: IncomingMessage, res: ServerResponse) {
    const route = this.routes.find(
      (r) => r.method === req.method && r.path === req.url,
    );

    if (route) {
      route.handler(req, res);
    } else {
      res.statusCode = 404;
      res.end("Not Found");
    }
  }
}
