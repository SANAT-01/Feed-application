import { Router } from "express";
import { getDb } from "@feed/shared";
import { optionalAuth } from "../auth";
import { readLimiter } from "../rateLimiters";
import { asyncHandler } from "../asyncHandler";

export const usersRouter = Router();

// Public listing: who's on the platform, to discover and follow or browse
// their feed. Never returns password_hash. optionalAuth adds
// isFollowedByMe per row when there's a valid token, so Explore/Suggested
// Accounts can render the right Follow/Following state without a separate
// round trip per user.
usersRouter.get("/users", readLimiter, optionalAuth, asyncHandler(async (req, res) => {
  const { rows } = await getDb().query(
    `SELECT u.id, u.username, u.is_celebrity,
            EXISTS(
              SELECT 1 FROM follows f WHERE f.follower_id = $1 AND f.followee_id = u.id
            ) AS is_followed_by_me
     FROM users u
     ORDER BY u.id`,
    [req.user?.userId ?? null]
  );
  res.json({
    users: rows.map((r) => ({
      id: r.id,
      username: r.username,
      is_celebrity: r.is_celebrity,
      isFollowedByMe: req.user ? r.is_followed_by_me : null,
    })),
  });
}));
