import { Pool } from "pg";

let pool: Pool | null = null;

/** Lazily-created singleton Postgres pool, configured from env vars shared by
 * every backend service (api, outbox-poller, fanout-worker). */
export function getDb(): Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.PGHOST || "postgres",
      port: Number(process.env.PGPORT || 5432),
      user: process.env.PGUSER || "app",
      password: process.env.PGPASSWORD || "app",
      database: process.env.PGDATABASE || "feedapp",
    });
  }
  return pool;
}
