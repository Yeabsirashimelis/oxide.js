import { IncomingMessage, ServerResponse } from "http";

export type Params = Record<string, string>;

export type Handler = (
  req: IncomingMessage,
  res: ServerResponse,
  params: Params,
) => void;

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

  add(method: string, path: string, handler: Handler) {
    this.routes.push({ method, path, handler });
  }

  handle(req: IncomingMessage, res: ServerResponse) {
    const url = req.url || "/";

    for (const route of this.routes) {
      if (route.method !== "*" && route.method !== req.method) {
        continue;
      }

      const params = matchRoute(route.path, url);
      if (params !== null) {
        route.handler(req, res, params);
        return;
      }
    }

    res.statusCode = 404;
    res.end("Not Found");
  }
}
