import { Kafka, logLevel } from "kafkajs";

export const POST_CREATED_TOPIC = "post.created";

let kafka: Kafka | null = null;

export function getKafka(): Kafka {
  if (!kafka) {
    const brokers = (process.env.KAFKA_BROKERS || "kafka:9092").split(",");
    kafka = new Kafka({
      clientId: process.env.KAFKA_CLIENT_ID || "feed-app",
      brokers,
      logLevel: logLevel.WARN,
      retry: { retries: 8 },
    });
  }
  return kafka;
}

/** Creates the topic up front via the admin API. Without this, a consumer
 * that subscribes before ANY producer has sent a message (e.g. on first
 * boot, before the first post) can hit UNKNOWN_TOPIC_OR_PARTITION — Kafka's
 * auto-create-on-produce doesn't help a consumer that gets there first. */
export async function ensureTopic(topic: string, numPartitions = 1): Promise<void> {
  const admin = getKafka().admin();
  await admin.connect();
  try {
    await admin.createTopics({ topics: [{ topic, numPartitions }], waitForLeaders: true });
  } finally {
    await admin.disconnect();
  }
}
