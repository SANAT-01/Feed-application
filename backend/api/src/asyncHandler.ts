import type { NextFunction, Request, RequestHandler, Response } from "express";

// Express 4 doesn't catch a rejected promise from an async route handler —
// it becomes an unhandled rejection at the Node process level, which Node
// 20 terminates the whole process for by default. Wrapping every async
// handler in this forwards the rejection to next(err) instead, so it hits
// index.ts's error middleware (a 503 to the one request) rather than taking
// down every in-flight request along with it.
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
