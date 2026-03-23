import type { IncomingMessage, ServerResponse } from "http";

export type Next = () => void;

export type Middleware = (
  req: IncomingMessage,
  res: ServerResponse,
  next: Next,
) => void | Promise<void>;
