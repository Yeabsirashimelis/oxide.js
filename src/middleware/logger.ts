import type { IncomingMessage, ServerResponse } from "http";
import type { Middleware } from "./types";

type LogLevel = "info" | "warn" | "error" | "debug";

interface LoggerOptions {
  format?: "dev" | "combined" | "minimal";
  skip?: (req: IncomingMessage, res: ServerResponse) => boolean;
}

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
  white: "\x1b[37m",
  magenta: "\x1b[35m",
};

function colorStatus(status: number): string {
  if (status >= 500) return `${colors.red}${status}${colors.reset}`;
  if (status >= 400) return `${colors.yellow}${status}${colors.reset}`;
  if (status >= 300) return `${colors.cyan}${status}${colors.reset}`;
  return `${colors.green}${status}${colors.reset}`;
}

function colorMethod(method: string): string {
  switch (method) {
    case "GET": return `${colors.green}${method}${colors.reset}`;
    case "POST": return `${colors.cyan}${method}${colors.reset}`;
    case "PUT": return `${colors.yellow}${method}${colors.reset}`;
    case "PATCH": return `${colors.yellow}${method}${colors.reset}`;
    case "DELETE": return `${colors.red}${method}${colors.reset}`;
    default: return `${colors.white}${method}${colors.reset}`;
  }
}

function formatDuration(ms: number): string {
  if (ms < 1) return `${colors.green}${ms.toFixed(2)}ms${colors.reset}`;
  if (ms < 100) return `${colors.green}${ms.toFixed(1)}ms${colors.reset}`;
  if (ms < 1000) return `${colors.yellow}${ms.toFixed(0)}ms${colors.reset}`;
  return `${colors.red}${(ms / 1000).toFixed(2)}s${colors.reset}`;
}

export function logger(options: LoggerOptions = {}): Middleware {
  const format = options.format ?? "dev";

  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const start = process.hrtime.bigint();
    const method = req.method || "GET";
    const url = req.url || "/";

    // Hook into response finish to log after response is sent
    const originalEnd = res.end.bind(res);
    res.end = function (chunk?: any, ...args: any[]): any {
      const result = originalEnd(chunk, ...args);

      if (options.skip && options.skip(req, res)) {
        return result;
      }

      const duration = Number(process.hrtime.bigint() - start) / 1_000_000;
      const status = res.statusCode;

      if (format === "dev") {
        const line = `  ${colorMethod(method)} ${url} ${colorStatus(status)} ${formatDuration(duration)}`;
        console.log(line);
      } else if (format === "combined") {
        const ip = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "-";
        const userAgent = req.headers["user-agent"] || "-";
        const timestamp = new Date().toISOString();
        const contentLength = res.getHeader("content-length") || "-";
        console.log(
          `${ip} - [${timestamp}] "${method} ${url}" ${status} ${contentLength} "${userAgent}"`
        );
      } else {
        // minimal
        console.log(`${method} ${url} ${status}`);
      }

      return result;
    } as any;

    next();
  };
}
