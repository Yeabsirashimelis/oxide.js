import type { ServerResponse } from "http";

export interface OxideResponse extends ServerResponse {
  status(code: number): OxideResponse;
  json(data: unknown): void;
  send(body: string): void;
  html(body: string): void;
}

export function enhanceResponse(res: ServerResponse): OxideResponse {
  const oxideRes = res as OxideResponse;

  oxideRes.status = function (code: number): OxideResponse {
    this.statusCode = code;
    return this;
  };

  oxideRes.json = function (data: unknown): void {
    this.setHeader("Content-Type", "application/json");
    this.end(JSON.stringify(data));
  };

  oxideRes.send = function (body: string): void {
    if (!this.getHeader("Content-Type")) {
      this.setHeader("Content-Type", "text/plain");
    }
    this.end(body);
  };

  oxideRes.html = function (body: string): void {
    this.setHeader("Content-Type", "text/html");
    this.end(body);
  };

  return oxideRes;
}
