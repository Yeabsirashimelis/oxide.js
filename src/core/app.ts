import { Router, RouteGroup, createRouter } from "../router/router";
import type { Handler, RouteMiddleware } from "../router/router";
import { Context } from "./context";

export { Context, createRouter };
export type { Handler, RouteMiddleware };
import type { Middleware } from "../middleware/types";
import type { ErrorHandler, NotFoundHandler } from "../middleware/error-handler";
import { runMiddlewares } from "../middleware/runner";
import { Server } from "./server";

export type TemplateEngine = (
  filePath: string,
  data: Record<string, unknown>,
  callback: (err: Error | null, html?: string) => void,
) => void;

export interface AppSettings {
  views: string;
  "view engine": string;
  [key: string]: unknown;
}

export class Application {
  private router: Router;
  private middlewares: Middleware[] = [];
  private settings: AppSettings = {
    views: "views",
    "view engine": "",
  };
  private engines: Record<string, TemplateEngine> = {};

  constructor() {
    this.router = new Router();
  }

  set(key: string, value: unknown) {
    (this.settings as Record<string, unknown>)[key] = value;

    // Auto-register known engines when view engine is set
    if (key === "view engine" && typeof value === "string") {
      const ext = `.${value}`;
      if (!this.engines[ext]) {
        try {
          // Try to require the engine module (works for ejs, pug, handlebars, etc.)
          const engineModule = require(value);
          if (typeof engineModule.renderFile === "function") {
            this.engines[ext] = engineModule.renderFile;
          } else if (typeof engineModule.__express === "function") {
            this.engines[ext] = engineModule.__express;
          }
        } catch {
          // Engine not installed — user must register manually via app.engine()
        }
      }
    }
  }

  getSetting(key: string): unknown {
    return (this.settings as Record<string, unknown>)[key];
  }

  engine(ext: string, fn: TemplateEngine) {
    const extension = ext.startsWith(".") ? ext : `.${ext}`;
    this.engines[extension] = fn;
  }

  getEngine(ext: string): TemplateEngine | undefined {
    const extension = ext.startsWith(".") ? ext : `.${ext}`;
    return this.engines[extension];
  }

  getSettings(): AppSettings {
    return this.settings;
  }

  getEngines(): Record<string, TemplateEngine> {
    return this.engines;
  }

  use(middleware: Middleware): void;
  use(path: string, router: Router): void;
  use(pathOrMiddleware: string | Middleware, router?: Router): void {
    if (typeof pathOrMiddleware === "string" && router) {
      this.router.mount(pathOrMiddleware, router);
    } else if (typeof pathOrMiddleware === "function") {
      this.middlewares.push(pathOrMiddleware);
    }
  }

  get(path: string, ...handlers: RouteMiddleware[]) {
    this.router.add("GET", path, ...handlers);
  }

  post(path: string, ...handlers: RouteMiddleware[]) {
    this.router.add("POST", path, ...handlers);
  }

  put(path: string, ...handlers: RouteMiddleware[]) {
    this.router.add("PUT", path, ...handlers);
  }

  patch(path: string, ...handlers: RouteMiddleware[]) {
    this.router.add("PATCH", path, ...handlers);
  }

  delete(path: string, ...handlers: RouteMiddleware[]) {
    this.router.add("DELETE", path, ...handlers);
  }

  options(path: string, ...handlers: RouteMiddleware[]) {
    this.router.add("OPTIONS", path, ...handlers);
  }

  head(path: string, ...handlers: RouteMiddleware[]) {
    this.router.add("HEAD", path, ...handlers);
  }

  all(path: string, ...handlers: RouteMiddleware[]) {
    this.router.add("*", path, ...handlers);
  }

  group(prefix: string): RouteGroup {
    return this.router.group(prefix);
  }

  onError(handler: ErrorHandler) {
    this.router.setErrorHandler(handler);
  }

  notFound(handler: NotFoundHandler) {
    this.router.setNotFoundHandler(handler);
  }

  listen(port: number, callback?: () => void) {
    // Pass app reference to router for template rendering
    this.router.setApp(this);

    const server = new Server((req, res) => {
      runMiddlewares(
        this.middlewares,
        req,
        res,
        () => {
          this.router.handle(req, res);
        },
        (err) => {
          this.router.handleError(err, req, res);
        },
      );
    });

    server.listen(port, callback);
  }
}

export function createApp() {
  return new Application();
}
