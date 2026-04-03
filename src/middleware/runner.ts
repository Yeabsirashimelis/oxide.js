import type { IncomingMessage, ServerResponse } from "http";
import type { Middleware } from "./types";

export function runMiddlewares(
  middlewares: Middleware[],
  req: IncomingMessage,
  res: ServerResponse,
  done: () => void,
  onError?: (err: Error) => void,
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
          if (onError) {
            onError(err);
          } else {
            res.statusCode = 500;
            res.end("Internal Server Error");
          }
        });
      }
    } catch (err) {
      if (onError) {
        onError(err as Error);
      } else {
        res.statusCode = 500;
        res.end("Internal Server Error");
      }
    }
  };

  next();
}
