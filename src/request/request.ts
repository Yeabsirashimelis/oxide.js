import type { IncomingMessage } from "http";

export interface OxideRequest extends IncomingMessage {
  body: unknown;
}

export function enhanceRequest(req: IncomingMessage): OxideRequest {
  const oxideReq = req as OxideRequest;
  oxideReq.body = {};
  return oxideReq;
}
