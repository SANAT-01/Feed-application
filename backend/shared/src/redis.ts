import Redis from "ioredis";

let client: Redis | null = null;

/** Lazily-created singleton Redis client. Holds three logical namespaces
 * (see README §5 "The Hybrid"):
 *   feed:<userId>   -> the ready list (post IDs, normal accounts, newest first)
 *   celeb:<userId>  -> one shared list per celebrity author
 *   post:<postId>   -> the post-content cache (body/media/author), written once
 */
export function getRedis(): Redis {
  if (!client) {
    client = new Redis(process.env.REDIS_URL || "redis://redis:6379", {
      maxRetriesPerRequest: null,
    });
  }
  return client;
}

export const FEED_LIST_CAP = 500;
export const CELEB_LIST_CAP = 500;

export const feedKey = (userId: number | string) => `feed:${userId}`;
export const celebKey = (userId: number | string) => `celeb:${userId}`;
export const postKey = (postId: number | string) => `post:${postId}`;
export const processedKey = (postId: number | string) => `processed:${postId}`;
