import type { IncomingMessage } from "http";

export type Query = Record<string, string>;

export interface OxideRequest extends IncomingMessage {
  body: unknown;
  query: Query;
}

function parseQuery(url: string): Query {
  const query: Query = {};
  const queryIndex = url.indexOf("?");

  if (queryIndex === -1) {
    return query;
  }

  const queryString = url.slice(queryIndex + 1);
  const pairs = queryString.split("&");

  for (const pair of pairs) {
    const [key, value] = pair.split("=");
    if (key) {
      query[decodeURIComponent(key)] = decodeURIComponent(value || "");
    }
  }

  return query;
}

export function enhanceRequest(req: IncomingMessage): OxideRequest {
  const oxideReq = req as OxideRequest;
  oxideReq.body = {};
  oxideReq.query = parseQuery(req.url || "");
  return oxideReq;
}
