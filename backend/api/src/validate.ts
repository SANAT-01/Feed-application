import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";

/** Validates req.body against a zod schema, replacing it with the parsed
 * (coerced) value on success. multipart/form-data fields all arrive as
 * strings, so route schemas use z.coerce.number() where a number is needed. */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: "invalid request body", issues: result.error.issues });
    }
    req.body = result.data;
    next();
  };
}
