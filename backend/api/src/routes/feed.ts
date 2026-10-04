import { Router } from "express";
import { getDb, getRedis, feedKey, celebKey, postKey, CachedPost } from "@feed/shared";
import { requireAuth } from "../auth";
import { readLimiter } from "../rateLimiters";
import { asyncHandler } from "../asyncHandler";

export const feedRouter = Router();

const PAGE_SIZE = 50;

// GET /feed/me — the hybrid read path from README §6.2, for the
// authenticated caller only. There's deliberately no "view anyone's feed by
// id" route — same as a real feed app, your home timeline is yours alone.
//   1. Read the user's precomputed "ready list" (normal accounts they follow).
//   2. Pull each followed celebrity's own small list.
//   3. Merge by post id (ids are sequential, so id desc == newest first).
//   4. Resolve ids -> content via the post-content cache, falling back to
//      Postgres on a miss and backfilling the cache.
feedRouter.get("/feed/me", readLimiter, requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user!.userId;

  const db = getDb();
  const redis = getRedis();

  const normalIds = await redis.lrange(feedKey(userId), 0, PAGE_SIZE - 1);

  const celebRows = await db.query(
    `SELECT f.followee_id FROM follows f
     JOIN users u ON u.id = f.followee_id
     WHERE f.follower_id = $1 AND u.is_celebrity`,
    [userId]
  );

  let celebIds: string[] = [];
  for (const row of celebRows.rows) {
    const ids = await redis.lrange(celebKey(row.followee_id), 0, PAGE_SIZE - 1);
    celebIds = celebIds.concat(ids);
  }

  const allIds = Array.from(new Set([...normalIds, ...celebIds]))
    .map(Number)
    .sort((a, b) => b - a)
    .slice(0, PAGE_SIZE);

  const items = await resolveContent(db, redis, allIds);

  res.json({
    userId,
    feed: items,
    precomputed: normalIds.length,
    pulledFromCelebrities: celebIds.length,
  });
}));

async function resolveContent(
  db: ReturnType<typeof getDb>,
  redis: ReturnType<typeof getRedis>,
  ids: number[]
): Promise<CachedPost[]> {
  if (ids.length === 0) return [];

  const cached = await redis.mget(ids.map((id) => postKey(id)));
  const results = new Map<number, CachedPost>();
  const missing: number[] = [];

  ids.forEach((id, i) => {
    const raw = cached[i];
    if (raw) {
      results.set(id, JSON.parse(raw));
    } else {
      missing.push(id);
    }
  });

  if (missing.length > 0) {
    const { rows } = await db.query(
      `SELECT p.id, p.author_id, p.body, p.media_url, p.created_at, u.username
       FROM posts p JOIN users u ON u.id = p.author_id
       WHERE p.id = ANY($1::bigint[])`,
      [missing]
    );
    const pipeline = redis.pipeline();
    for (const row of rows) {
      const post: CachedPost = {
        // posts.id is bigint — node-postgres returns bigint columns as
        // strings (to avoid precision loss), so this MUST be cast. Without
        // it, `post.id` is the string "1", `results.set(post.id, post)`
        // keys the Map with that string, and the later `results.get(id)`
        // (id is a real number from the Redis list) silently misses —
        // the post vanishes from the response even though it was found.
        id: Number(row.id),
        authorId: row.author_id,
        author: row.username,
        body: row.body,
        mediaUrl: row.media_url,
        createdAt: row.created_at,
      };
      results.set(post.id, post);
      pipeline.set(postKey(post.id), JSON.stringify(post));
    }
    await pipeline.exec();
  }

  return ids.map((id) => results.get(id)).filter((p): p is CachedPost => Boolean(p));
}
