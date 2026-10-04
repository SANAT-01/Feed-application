import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { createLogger, getDb, getRedis, registerGracefulShutdown } from "@feed/shared";
import { authRouter } from "./routes/auth";
import { usersRouter } from "./routes/users";
import { followRouter } from "./routes/follow";
import { postsRouter } from "./routes/posts";
import { feedRouter } from "./routes/feed";
import { profileRouter } from "./routes/profile";

export const logger = createLogger("api");

const app = express();
// nginx is the only thing in front of this service (one hop), and it sets
// X-Forwarded-For. Without this, express-rate-limit refuses to trust that
// header (ERR_ERL_UNEXPECTED_X_FORWARDED_FOR) and every client behind nginx
// would also get rate-limited together as if they were nginx's single IP.
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());

// Logs one line per request; skips noisy health checks.
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    if (req.path === "/health") return;
    logger.info(
      { method: req.method, path: req.path, status: res.statusCode, durationMs: Date.now() - start },
      "request"
    );
  });
  next();
});

app.get("/health", (_req, res) => res.json({ ok: true }));

// Liveness vs readiness: health just says the process is up; ready checks it
// can actually reach its dependencies (what an orchestrator should probe
// before routing traffic to this instance).
app.get("/ready", async (_req, res) => {
  try {
    await getDb().query("SELECT 1");
    await getRedis().ping();
    res.json({ ready: true });
  } catch (err) {
    logger.error({ err }, "readiness check failed");
    res.status(503).json({ ready: false });
  }
});

// Each router now carries its own rate limiter (and, where needed,
// requireAuth) per-route — see rateLimiters.ts for why that must be scoped
// per-route rather than mounted globally here.
app.use(authRouter);
app.use(usersRouter, feedRouter, profileRouter);
app.use(followRouter, postsRouter);

app.use((req, res) => {
  res.status(404).json({ error: "not found" });
});

app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err, path: req.path }, "request failed");
  res.status(503).json({ error: "backend unavailable" });
});

const PORT = Number(process.env.PORT || 8000);
const server = app.listen(PORT, () => logger.info({ port: PORT }, "feed-api listening"));

registerGracefulShutdown(logger, [
  () => new Promise<void>((resolve) => server.close(() => resolve())),
  () => getDb().end(),
  async () => {
    await getRedis().quit();
  },
]);
