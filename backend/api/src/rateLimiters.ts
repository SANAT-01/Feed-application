import rateLimit from "express-rate-limit";

// Generous for reads, tighter for writes, tightest for auth (brute-force /
// credential-stuffing resistance on login & signup).
//
// These are attached directly on individual routes (e.g.
// `router.post("/auth/login", authLimiter, ...)`), NOT mounted globally via
// `app.use(limiter, router)`. A limiter mounted with no path prefix runs on
// EVERY request regardless of which router ends up handling it — a request
// that doesn't match authRouter still burns authLimiter's quota before
// falling through, so the tightest limiter silently becomes the ceiling for
// all traffic. Scoping per-route is what actually makes the three limits
// independent.
export const readLimiter = rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: true, legacyHeaders: false });
export const writeLimiter = rateLimit({ windowMs: 60_000, limit: 60, standardHeaders: true, legacyHeaders: false });
export const authLimiter = rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: true, legacyHeaders: false });
