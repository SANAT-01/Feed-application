import { Kafka } from "kafkajs";

const postId = Number(process.argv[2]);
if (!postId) {
  console.error("usage: node replay-one.mjs <postId>");
  process.exit(1);
}

const kafka = new Kafka({ clientId: "learning-script", brokers: ["kafka:9092"] });
const producer = kafka.producer();

await producer.connect();
await producer.send({
  topic: "post.created",
  messages: [{ key: String(postId), value: JSON.stringify({ postId, outboxId: 999999 }) }],
});
console.log(`republished post.created for postId=${postId}`);
await producer.disconnect();
