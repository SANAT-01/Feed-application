import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  // Fail loudly rather than silently signing tokens with an empty/undefined
  // secret — that would make every token forgeable.
  throw new Error("JWT_SECRET is required");
}

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "2h";

// Deliberately NOT using JWT's standard `sub` claim name — jsonwebtoken's
// own types declare `sub` as `string`, which would force an awkward
// string<->number conversion everywhere else just to satisfy that overlap.
export interface AuthPayload {
  userId: number;
  username: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function signToken(payload: AuthPayload): string {
  // jwt's types want `expiresIn` as a branded string literal type, not a
  // plain `string` — JWT_EXPIRES_IN comes from an env var, so it's always a
  // plain string at the type level even though "2h" etc. are valid values.
  const options: jwt.SignOptions = { expiresIn: JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] };
  return jwt.sign(payload, JWT_SECRET as string, options);
}

function isAuthPayload(decoded: string | jwt.JwtPayload): decoded is jwt.JwtPayload & AuthPayload {
  return typeof decoded === "object" && typeof decoded.userId === "number" && typeof decoded.username === "string";
}

function bearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  return header?.startsWith("Bearer ") ? header.slice(7) : null;
}

function decode(token: string): AuthPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET as string);
    return isAuthPayload(decoded) ? { userId: decoded.userId, username: decoded.username } : null;
  } catch {
    return null;
  }
}

/** Requires a valid `Authorization: Bearer <token>` header and attaches the
 * decoded { userId, username } to req.user. Write routes (create post,
 * follow) use this so authorId/followerId always come from the token, never
 * from a client-supplied body field. */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = bearerToken(req);
  const user = token && decode(token);
  if (!user) {
    return res.status(401).json({ error: "missing, invalid, or expired bearer token" });
  }
  req.user = user;
  next();
}

/** Like requireAuth, but a missing/invalid token just means req.user stays
 * undefined instead of a 401 — for routes that are public but behave
 * slightly differently for a logged-in caller (e.g. a profile page showing
 * "Follow"/"Unfollow" only when someone's actually logged in). */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = bearerToken(req);
  if (token) {
    const user = decode(token);
    if (user) req.user = user;
  }
  next();
}
