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
      const result = middleware(req, res, next);
      if (result instanceof Promise) {
        result.catch((err) => {
          res.statusCode = 500;
          res.end(`Internal Server Error: ${err}`);
        });
      }
    } else {
      done();
    }
  };

  next();
}
