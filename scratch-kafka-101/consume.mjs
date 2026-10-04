import { Kafka } from "kafkajs";

const kafka = new Kafka({ clientId: "learning-script", brokers: ["localhost:9092"] });
const consumer = kafka.consumer({ groupId: "my-learning-group" });

await consumer.connect();
await consumer.subscribe({ topic: "learning-demo", fromBeginning: true });

console.log("waiting for messages... (Ctrl+C to stop)");

await consumer.run({
  eachMessage: async ({ partition, message }) => {
    console.log({
      partition,
      offset: message.offset,
      key: message.key?.toString(),
      value: message.value?.toString(),
    });
  },
});
