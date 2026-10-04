import { Kafka } from "kafkajs";

const kafka = new Kafka({ clientId: "learning-script", brokers: ["kafka:9092"] });
const producer = kafka.producer();

await producer.connect();
await producer.send({
  topic: "learning-demo",
  messages: [
    { key: "a", value: "message from a Node script" },
    { key: "b", value: JSON.stringify({ hello: "world", n: 42 }) },
  ],
});
console.log("sent 2 messages");
await producer.disconnect();
