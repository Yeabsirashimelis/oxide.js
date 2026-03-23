import type { ServerResponse } from "http";
import type { OxideRequest } from "../request/request";
import type { OxideResponse } from "../response/response";

export type ErrorHandler = (
  err: Error,
  req: OxideRequest,
  res: OxideResponse,
) => void;

export const defaultErrorHandler: ErrorHandler = (err, req, res) => {
  console.error(`[Error] ${err.message}`);
  console.error(err.stack);

  if (!res.headersSent) {
    res.status(500).json({
      error: err.message || "Internal Server Error",
    });
  }
};
