import type { IncomingMessage, ServerResponse } from "http";
import type { Middleware } from "./types";

export function runMiddlewares(
  middlewares: Middleware[],
  req: IncomingMessage,
  res: ServerResponse,
  done: () => void,
) {
  let index = 0;

  const next = () => {
    if (index < middlewares.length) {
      const middleware = middlewares[index++] as Middleware;
      middleware(req, res, next);
    } else {
      done();
    }
  };

  next();
}
