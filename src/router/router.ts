import type { IncomingMessage, ServerResponse } from "http";
import { enhanceResponse } from "../response/response";
import type { OxideResponse } from "../response/response";
import { enhanceRequest } from "../request/request";
import type { OxideRequest } from "../request/request";
import {
  defaultErrorHandler,
  type ErrorHandler,
} from "../middleware/error-handler";

export type Params = Record<string, string>;

export type Handler = (
  req: OxideRequest,
  res: OxideResponse,
  params: Params,
) => void | Promise<void>;

interface Route {
  method: string;
  path: string;
  handler: Handler;
}

function matchRoute(pattern: string, url: string): Params | null {
  const urlPath = url.split("?")[0] ?? url;

  const patternParts = pattern.split("/").filter(Boolean);
  const urlParts = urlPath.split("/").filter(Boolean);

  if (patternParts.length !== urlParts.length) {
    return null;
  }

  const params: Params = {};

  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i] as string;
    const urlPart = urlParts[i] as string;

    if (patternPart.startsWith(":")) {
      const paramName = patternPart.slice(1);
      params[paramName] = urlPart;
    } else if (patternPart !== urlPart) {
      return null;
    }
  }

  return params;
}

export class Router {
  private routes: Route[] = [];
  private errorHandler: ErrorHandler = defaultErrorHandler;

  add(method: string, path: string, handler: Handler) {
    this.routes.push({ method, path, handler });
  }

  setErrorHandler(handler: ErrorHandler) {
    this.errorHandler = handler;
  }

  handle(req: IncomingMessage, res: ServerResponse) {
    const url = req.url || "/";
    const oxideReq = enhanceRequest(req);
    const oxideRes = enhanceResponse(res);

    for (const route of this.routes) {
      if (route.method !== "*" && route.method !== req.method) {
        continue;
      }

      const params = matchRoute(route.path, url);
      if (params !== null) {
        try {
          const result = route.handler(oxideReq, oxideRes, params);
          if (result instanceof Promise) {
            result.catch((err: Error) => {
              this.errorHandler(err, oxideReq, oxideRes);
            });
          }
        } catch (err) {
          this.errorHandler(err as Error, oxideReq, oxideRes);
        }
        return;
      }
    }

    oxideRes.status(404).send("Not Found");
  }
}
