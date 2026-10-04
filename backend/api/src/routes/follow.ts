import { Router } from "express";
import { z } from "zod";
import { getDb, getRedis, feedKey, FEED_LIST_CAP } from "@feed/shared";
import { validateBody } from "../validate";

export const followRouter = Router();

const followSchema = z.object({
  followeeId: z.coerce.number().int().positive(),
});

// POST /follow — requires Authorization: Bearer <token>. followerId is
// always the authenticated caller (see requireAuth in index.ts), the same
// way followerId can't be spoofed via the request body.
followRouter.post("/follow", validateBody(followSchema), async (req, res) => {
  const { followeeId } = req.body as z.infer<typeof followSchema>;
  const followerId = req.user!.userId;

  if (followerId === followeeId) {
    return res.status(400).json({ error: "cannot follow yourself" });
  }

  const db = getDb();
  const followee = await db.query("SELECT is_celebrity FROM users WHERE id = $1", [followeeId]);
  if (followee.rowCount === 0) {
    return res.status(404).json({ error: "no such user" });
  }

  const inserted = await db.query(
    `INSERT INTO follows (follower_id, followee_id) VALUES ($1, $2)
     ON CONFLICT DO NOTHING RETURNING follower_id`,
    [followerId, followeeId]
  );

  // Backfill: fan-out-on-write only pushed the followee's past posts to
  // whoever followed them AT POST TIME. Without this, following someone
  // with existing posts shows nothing from them until their *next* post —
  // "I followed someone and don't see their recent posts". Celebrities
  // don't need this; they're pulled live on every read in feed.ts
  // regardless of when you followed them, so there's nothing to backfill.
  const isNewFollow = (inserted.rowCount ?? 0) > 0;
  if (isNewFollow && !followee.rows[0].is_celebrity) {
    await backfillFollow(followerId, followeeId);
  }

  res.status(201).json({ followerId, followeeId });
});

// DELETE /follow — unfollow. Deliberately does NOT retroactively scrub the
// followee's already-delivered posts out of the follower's Redis ready
// list; it just stops FUTURE fan-out (the worker checks the live follows
// table) and the UI stops showing them as followed. Same real-world
// tradeoff fan-out-on-write always makes — see README §7.
followRouter.delete("/follow", validateBody(followSchema), async (req, res) => {
  const { followeeId } = req.body as z.infer<typeof followSchema>;
  const followerId = req.user!.userId;

  await getDb().query(`DELETE FROM follows WHERE follower_id = $1 AND followee_id = $2`, [followerId, followeeId]);
  res.status(200).json({ followerId, followeeId, unfollowed: true });
});

async function backfillFollow(followerId: number, followeeId: number) {
  const db = getDb();
  const redis = getRedis();

  const recentPosts = await db.query(`SELECT id FROM posts WHERE author_id = $1 ORDER BY id DESC LIMIT $2`, [
    followeeId,
    FEED_LIST_CAP,
  ]);
  if (recentPosts.rowCount === 0) return;

  // Merge with whatever's already in the ready list (newest-first, same
  // convention the fan-out worker uses) rather than just appending, so the
  // backfilled posts interleave correctly by recency instead of all
  // landing at one end.
  const existing = await redis.lrange(feedKey(followerId), 0, -1);
  const merged = Array.from(new Set([...existing.map(Number), ...recentPosts.rows.map((r) => Number(r.id))]))
    .sort((a, b) => b - a)
    .slice(0, FEED_LIST_CAP);

  const pipeline = redis.multi();
  pipeline.del(feedKey(followerId));
  if (merged.length > 0) pipeline.rpush(feedKey(followerId), ...merged);
  await pipeline.exec();
}
