import type { IncomingMessage, ServerResponse } from "http";

type Next = () => void;

export type Cookies = Record<string, string>;

export interface CookieOptions {
  maxAge?: number;
  expires?: Date;
  path?: string;
  domain?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
}

export interface OxideResponseWithCookies extends ServerResponse {
  cookies: Cookies;
  setCookie(name: string, value: string, options?: CookieOptions): void;
  clearCookie(name: string, options?: CookieOptions): void;
}

export interface OxideRequestWithCookies extends IncomingMessage {
  cookies: Cookies;
}

function parseCookies(cookieHeader: string | undefined): Cookies {
  const cookies: Cookies = {};

  if (!cookieHeader) {
    return cookies;
  }

  const pairs = cookieHeader.split(";");

  for (const pair of pairs) {
    const [key, ...valueParts] = pair.split("=");
    if (key) {
      const trimmedKey = key.trim();
      const value = valueParts.join("=").trim();
      cookies[trimmedKey] = decodeURIComponent(value);
    }
  }

  return cookies;
}

function serializeCookie(
  name: string,
  value: string,
  options: CookieOptions = {},
): string {
  let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

  if (options.maxAge !== undefined) {
    cookie += `; Max-Age=${options.maxAge}`;
  }

  if (options.expires) {
    cookie += `; Expires=${options.expires.toUTCString()}`;
  }

  if (options.path) {
    cookie += `; Path=${options.path}`;
  }

  if (options.domain) {
    cookie += `; Domain=${options.domain}`;
  }

  if (options.secure) {
    cookie += "; Secure";
  }

  if (options.httpOnly) {
    cookie += "; HttpOnly";
  }

  if (options.sameSite) {
    cookie += `; SameSite=${options.sameSite}`;
  }

  return cookie;
}

export function cookieParser() {
  return (req: IncomingMessage, res: ServerResponse, next: Next) => {
    const reqWithCookies = req as OxideRequestWithCookies;
    const resWithCookies = res as OxideResponseWithCookies;

    // Parse cookies from request
    reqWithCookies.cookies = parseCookies(req.headers.cookie);

    // Add setCookie method to response
    resWithCookies.setCookie = function (
      name: string,
      value: string,
      options: CookieOptions = {},
    ) {
      const cookie = serializeCookie(name, value, options);
      const existing = this.getHeader("Set-Cookie");

      if (existing) {
        const cookies = Array.isArray(existing) ? existing : [String(existing)];
        cookies.push(cookie);
        this.setHeader("Set-Cookie", cookies);
      } else {
        this.setHeader("Set-Cookie", cookie);
      }
    };

    // Add clearCookie method to response
    resWithCookies.clearCookie = function (
      name: string,
      options: CookieOptions = {},
    ) {
      this.setCookie(name, "", {
        ...options,
        expires: new Date(0),
        maxAge: 0,
      });
    };

    next();
  };
}
