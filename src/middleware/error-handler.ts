import type { Context } from "../core/context";

export class HttpError extends Error {
  status: number;
  expose: boolean;

  constructor(status: number, message?: string) {
    super(message || HttpError.defaultMessage(status));
    this.status = status;
    // Expose message to client for 4xx errors, hide for 5xx
    this.expose = status < 500;
  }

  private static defaultMessage(status: number): string {
    const messages: Record<number, string> = {
      400: "Bad Request",
      401: "Unauthorized",
      403: "Forbidden",
      404: "Not Found",
      405: "Method Not Allowed",
      408: "Request Timeout",
      409: "Conflict",
      410: "Gone",
      413: "Payload Too Large",
      415: "Unsupported Media Type",
      422: "Unprocessable Entity",
      429: "Too Many Requests",
      500: "Internal Server Error",
      501: "Not Implemented",
      502: "Bad Gateway",
      503: "Service Unavailable",
    };
    return messages[status] || "Unknown Error";
  }
}

export type ErrorHandler = (err: Error, ctx: Context) => void;

export type NotFoundHandler = (ctx: Context) => void;

export const defaultErrorHandler: ErrorHandler = (err, ctx) => {
  const isHttpError = err instanceof HttpError;
  const status = isHttpError ? err.status : 500;
  const message = isHttpError && err.expose
    ? err.message
    : "Internal Server Error";

  // Only log 5xx errors
  if (status >= 500) {
    console.error(`[Error] ${err.message}`);
    console.error(err.stack);
  }

  if (!ctx.res.headersSent) {
    ctx.status(status).json({ error: message });
  }
};

export const defaultNotFoundHandler: NotFoundHandler = (ctx) => {
  ctx.status(404).json({ error: "Not Found" });
};
