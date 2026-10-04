import type { Producer } from "kafkajs";
import { getDb, getKafka, ensureTopic, createLogger, registerGracefulShutdown, POST_CREATED_TOPIC } from "@feed/shared";

const logger = createLogger("outbox-poller");

const POLL_INTERVAL_MS = 1000;
const BATCH_SIZE = 100;

let stopping = false;

async function pollOnce(producer: Producer) {
  const db = getDb();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    // SKIP LOCKED lets multiple poller replicas run safely side by side —
    // each one grabs a different batch of pending rows instead of blocking.
    const { rows } = await client.query(
      `SELECT id, post_id FROM outbox
       WHERE status = 'pending'
       ORDER BY id
       LIMIT $1
       FOR UPDATE SKIP LOCKED`,
      [BATCH_SIZE]
    );

    if (rows.length === 0) {
      await client.query("COMMIT");
      return;
    }

    // outbox.id / outbox.post_id are bigint -> node-postgres returns them as
    // strings; cast so the Kafka payload's postId/outboxId are honest
    // numbers (see the matching note in feed.ts's resolveContent for why a
    // stray string id can silently break a later Map/strict-equality check).
    const idPairs = rows.map((r: { id: string; post_id: string }) => ({
      id: Number(r.id),
      postId: Number(r.post_id),
    }));

    // Publish BEFORE marking done: if we crash after publishing but before
    // the UPDATE, the row is picked up again next poll and republished. The
    // fanout-worker's idempotency guard (processed:<postId>) absorbs that
    // duplicate — see README §6.1.
    await producer.send({
      topic: POST_CREATED_TOPIC,
      messages: idPairs.map(({ id, postId }) => ({
        key: String(postId),
        value: JSON.stringify({ postId, outboxId: id }),
      })),
    });

    await client.query(`UPDATE outbox SET status = 'done' WHERE id = ANY($1::bigint[])`, [
      idPairs.map(({ id }) => id),
    ]);
    await client.query("COMMIT");
    logger.info({ count: rows.length }, "relayed outbox batch");
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error({ err }, "outbox batch failed, will retry next poll");
  } finally {
    client.release();
  }
}

async function main() {
  await ensureTopic(POST_CREATED_TOPIC);

  const kafka = getKafka();
  const producer = kafka.producer();
  await producer.connect();
  logger.info({ pollIntervalMs: POLL_INTERVAL_MS }, "outbox-poller ready");

  registerGracefulShutdown(logger, [
    () => {
      stopping = true;
    },
    () => producer.disconnect(),
    () => getDb().end(),
  ]);

  while (!stopping) {
    await pollOnce(producer);
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

main().catch((err) => {
  logger.error({ err }, "outbox-poller fatal error");
  process.exit(1);
});
