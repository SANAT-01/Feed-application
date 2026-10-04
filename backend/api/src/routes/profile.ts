import { Router, type Request, type Response } from "express";
import { getDb } from "@feed/shared";
import { optionalAuth } from "../auth";
import { readLimiter } from "../rateLimiters";

export const profileRouter = Router();

// GET /users/:id — profile header data: counts + (if logged in) whether the
// caller follows this person. Public — optionalAuth just adds the
// isFollowedByMe field when there's a valid token, instead of requiring one.
profileRouter.get("/users/:id", readLimiter, optionalAuth, async (req, res) => {
  const userId = Number(req.params.id);
  if (!userId) return res.status(400).json({ error: "bad user id" });

  const db = getDb();
  const { rows } = await db.query(
    `SELECT
       u.id, u.username, u.is_celebrity,
       (SELECT count(*) FROM posts   WHERE author_id  = u.id) AS post_count,
       (SELECT count(*) FROM follows WHERE followee_id = u.id) AS follower_count,
       (SELECT count(*) FROM follows WHERE follower_id = u.id) AS following_count
     FROM users u
     WHERE u.id = $1`,
    [userId]
  );
  if (rows.length === 0) return res.status(404).json({ error: "no such user" });
  const row = rows[0];

  let isFollowedByMe: boolean | null = null;
  if (req.user) {
    const follow = await db.query(`SELECT 1 FROM follows WHERE follower_id = $1 AND followee_id = $2`, [
      req.user.userId,
      userId,
    ]);
    isFollowedByMe = (follow.rowCount ?? 0) > 0;
  }

  res.json({
    id: row.id,
    username: row.username,
    isCelebrity: row.is_celebrity,
    postCount: Number(row.post_count),
    followerCount: Number(row.follower_count),
    followingCount: Number(row.following_count),
    isFollowedByMe,
    isMe: req.user?.userId === userId,
  });
});

// GET /users/:id/posts — this user's own post history (their profile grid),
// straight from Postgres. Distinct from GET /feed/me, which is the VIEWER's
// personalized home timeline assembled from Redis.
profileRouter.get("/users/:id/posts", readLimiter, async (req, res) => {
  const userId = Number(req.params.id);
  if (!userId) return res.status(400).json({ error: "bad user id" });

  const db = getDb();
  const { rows } = await db.query(
    `SELECT id, author_id, body, media_url, created_at
     FROM posts WHERE author_id = $1 ORDER BY id DESC LIMIT 50`,
    [userId]
  );
  res.json({
    posts: rows.map((r) => ({
      id: Number(r.id),
      authorId: r.author_id,
      body: r.body,
      mediaUrl: r.media_url,
      createdAt: r.created_at,
    })),
  });
});

async function userList(req: Request, res: Response, direction: "followers" | "following") {
  const userId = Number(req.params.id);
  if (!userId) return res.status(400).json({ error: "bad user id" });

  const db = getDb();
  const column = direction === "followers" ? "followee_id" : "follower_id";
  const otherColumn = direction === "followers" ? "follower_id" : "followee_id";

  const { rows } = await db.query(
    `SELECT u.id, u.username, u.is_celebrity,
            EXISTS(
              SELECT 1 FROM follows f2
              WHERE f2.follower_id = $2 AND f2.followee_id = u.id
            ) AS is_followed_by_me
     FROM follows f
     JOIN users u ON u.id = f.${otherColumn}
     WHERE f.${column} = $1
     ORDER BY u.username`,
    [userId, req.user?.userId ?? null]
  );

  res.json({
    users: rows.map((r) => ({
      id: r.id,
      username: r.username,
      isCelebrity: r.is_celebrity,
      isFollowedByMe: req.user ? r.is_followed_by_me : null,
    })),
  });
}

profileRouter.get("/users/:id/followers", readLimiter, optionalAuth, (req, res) => userList(req, res, "followers"));
profileRouter.get("/users/:id/following", readLimiter, optionalAuth, (req, res) => userList(req, res, "following"));
