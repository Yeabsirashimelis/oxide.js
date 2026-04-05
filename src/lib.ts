// Core
export { Application, createApp, createRouter, Context } from "./core/app";
export type { Handler, RouteMiddleware, TemplateEngine, AppSettings } from "./core/app";
export { Router, RouteGroup } from "./router/router";
export type { Params } from "./router/router";
export type { SSLOptions } from "./core/server";

// Request / Response
export type { OxideRequest, Query } from "./request/request";
export type { OxideResponse, SendFileOptions } from "./response/response";

// Middleware
export type { Middleware, Next } from "./middleware/types";
export { cors } from "./middleware/cors";
export { jsonParser } from "./body/json";
export { urlencodedParser } from "./body/urlencoded";
export { cookieParser } from "./middleware/cookie";
export type { Cookies, CookieOptions } from "./middleware/cookie";
export { session } from "./middleware/session";
export type { SessionData, SessionOptions } from "./middleware/session";
export { rateLimit } from "./middleware/rate-limit";
export { validate } from "./middleware/validate";
export { compression } from "./middleware/compression";
export { logger } from "./middleware/logger";
export { serveStatic } from "./middleware/static";

// Error handling
export { HttpError } from "./middleware/error-handler";
export type { ErrorHandler, NotFoundHandler } from "./middleware/error-handler";

// WebSocket
export { OxideSocket, OxideWebSocketServer } from "./ws/websocket";
export type { WsHandler } from "./ws/websocket";
