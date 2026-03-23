import type { Context } from "../core/context";

export type ErrorHandler = (err: Error, ctx: Context) => void;

export const defaultErrorHandler: ErrorHandler = (err, ctx) => {
  console.error(`[Error] ${err.message}`);
  console.error(err.stack);

  if (!ctx.res.headersSent) {
    ctx.status(500).json({
      error: err.message || "Internal Server Error",
    });
  }
};
