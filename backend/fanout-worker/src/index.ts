import {
  getDb,
  getKafka,
  getRedis,
  ensureTopic,
  createLogger,
  registerGracefulShutdown,
  feedKey,
  celebKey,
  postKey,
  processedKey,
  POST_CREATED_TOPIC,
  FEED_LIST_CAP,
  CELEB_LIST_CAP,
  CachedPost,
  PostCreatedEvent,
} from "@feed/shared";

const logger = createLogger("fanout-worker");

// README §6.1/§6.2: consumes "post.created", then either
//   - pushes the post id into EVERY follower's ready list (normal author), or
//   - appends it to the ONE shared celebrity list (celebrity author, pulled
//     at read time instead).
// Also populates the post-content cache once, regardless of path.
async function processPost(postId: number) {
  const db = getDb();
  const redis = getRedis();

  // Idempotency guard (README §6.1): Kafka + the outbox relay are
  // at-least-once, so the same post id can arrive twice. A short-lived key
  // makes a redelivery a no-op instead of double-pushing into every list.
  const claimed = await redis.set(processedKey(postId), "1", "EX", 3600, "NX");
  if (claimed === null) {
    logger.info({ postId }, "already processed — skipping duplicate delivery");
    return;
  }

  const { rows } = await db.query(
    `SELECT p.id, p.author_id, p.body, p.media_url, p.created_at, u.username, u.is_celebrity
     FROM posts p JOIN users u ON u.id = p.author_id
     WHERE p.id = $1`,
    [postId]
  );
  if (rows.length === 0) {
    logger.warn({ postId }, "post not found — skipping");
    return;
  }
  const row = rows[0];

  const cached: CachedPost = {
    // posts.id is bigint -> node-postgres returns it as a string. Cast so
    // CachedPost.id is an honest number everywhere it's constructed (see
    // the matching note in feed.ts's resolveContent for why this matters).
    id: Number(row.id),
    authorId: row.author_id,
    author: row.username,
    body: row.body,
    mediaUrl: row.media_url,
    createdAt: row.created_at,
  };
  await redis.set(postKey(postId), JSON.stringify(cached));

  if (row.is_celebrity) {
    await redis.lpush(celebKey(row.author_id), postId);
    await redis.ltrim(celebKey(row.author_id), 0, CELEB_LIST_CAP - 1);
    logger.info({ postId, author: row.username }, "celebrity post stored for read-time pull (no fan-out)");
    return;
  }

  const followers = await db.query(`SELECT follower_id FROM follows WHERE followee_id = $1`, [row.author_id]);
  logger.info({ postId, author: row.username, followers: followers.rowCount }, "fanning out post");

  const pipeline = redis.pipeline();
  for (const f of followers.rows) {
    pipeline.lpush(feedKey(f.follower_id), postId);
    pipeline.ltrim(feedKey(f.follower_id), 0, FEED_LIST_CAP - 1);
  }
  await pipeline.exec();
  logger.info({ postId }, "fan-out complete");
}

async function main() {
  await ensureTopic(POST_CREATED_TOPIC);

  const kafka = getKafka();
  const consumer = kafka.consumer({ groupId: "fanout-workers" });
  await consumer.connect();
  await consumer.subscribe({ topic: POST_CREATED_TOPIC, fromBeginning: true });

  logger.info({ topic: POST_CREATED_TOPIC }, "fanout-worker ready");

  registerGracefulShutdown(logger, [() => consumer.disconnect(), () => getDb().end()]);

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;
      const event: PostCreatedEvent = JSON.parse(message.value.toString());
      try {
        await processPost(event.postId);
      } catch (err) {
        logger.error({ err, postId: event.postId }, "failed to process post");
        // Rethrow so kafkajs treats this message as failed and retries it,
        // rather than silently committing past a lost fan-out.
        throw err;
      }
    },
  });
}

main().catch((err) => {
  logger.error({ err }, "fanout-worker fatal error");
  process.exit(1);
});
