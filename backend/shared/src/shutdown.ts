import type { Logger } from "./logger";

type Cleanup = () => Promise<void> | void;

/** Registers SIGTERM/SIGINT handlers that run cleanup callbacks (close DB
 * pool, disconnect Redis/Kafka, stop accepting new work) before exiting.
 * Without this, a container `docker stop` sends SIGTERM and the process is
 * killed mid-write/mid-poll after the default 10s grace period instead of
 * shutting down cleanly. */
export function registerGracefulShutdown(logger: Logger, cleanups: Cleanup[]) {
  let shuttingDown = false;

  async function shutdown(signal: string) {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, "shutting down");
    const results = await Promise.allSettled(cleanups.map((fn) => fn()));
    results.forEach((r, i) => {
      if (r.status === "rejected") logger.error({ err: r.reason, cleanupIndex: i }, "cleanup failed");
    });
    process.exit(0);
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}
