import pino from "pino";

/** One structured logger shape for api, outbox-poller, and fanout-worker.
 * Pretty-prints in dev (LOG_PRETTY=true), plain JSON lines otherwise — JSON
 * is what you want shipped to a log aggregator in production. */
export function createLogger(service: string) {
  const pretty = process.env.LOG_PRETTY === "true";
  return pino({
    name: service,
    level: process.env.LOG_LEVEL || "info",
    transport: pretty ? { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss" } } : undefined,
  });
}

export type Logger = ReturnType<typeof createLogger>;
