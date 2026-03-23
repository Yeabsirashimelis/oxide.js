import type { IncomingMessage, ServerResponse } from "http";

type Next = () => void;

export interface CorsOptions {
  origin?: string | string[] | boolean;
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}

const defaultOptions: CorsOptions = {
  origin: "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false,
};

function getOrigin(
  reqOrigin: string | undefined,
  option: string | string[] | boolean | undefined,
): string | null {
  if (option === true || option === "*") {
    return "*";
  }

  if (option === false) {
    return null;
  }

  if (typeof option === "string") {
    return option;
  }

  if (Array.isArray(option) && reqOrigin) {
    return option.includes(reqOrigin) ? reqOrigin : null;
  }

  return null;
}

export function cors(options: CorsOptions = {}) {
  const opts = { ...defaultOptions, ...options };

  return (req: IncomingMessage, res: ServerResponse, next: Next) => {
    const reqOrigin = req.headers.origin;
    const origin = getOrigin(reqOrigin, opts.origin);

    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    }

    if (opts.credentials) {
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }

    if (opts.exposedHeaders?.length) {
      res.setHeader("Access-Control-Expose-Headers", opts.exposedHeaders.join(", "));
    }

    // Handle preflight request
    if (req.method === "OPTIONS") {
      if (opts.methods?.length) {
        res.setHeader("Access-Control-Allow-Methods", opts.methods.join(", "));
      }

      if (opts.allowedHeaders?.length) {
        res.setHeader("Access-Control-Allow-Headers", opts.allowedHeaders.join(", "));
      }

      if (opts.maxAge !== undefined) {
        res.setHeader("Access-Control-Max-Age", String(opts.maxAge));
      }

      res.statusCode = 204;
      res.end();
      return;
    }

    next();
  };
}
