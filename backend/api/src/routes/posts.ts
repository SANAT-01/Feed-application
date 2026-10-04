import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { getDb } from "@feed/shared";
import { saveMedia } from "../media";
import { validateBody } from "../validate";
import { requireAuth } from "../auth";
import { writeLimiter } from "../rateLimiters";

export const postsRouter = Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

const createPostSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

// POST /posts (multipart/form-data: body, optional "media" file) — requires
// Authorization: Bearer <token>. The author is always the authenticated
// caller, never a client-supplied field — nobody can post as someone else
// just by changing a request body. requireAuth runs BEFORE multer so an
// unauthenticated request is rejected without buffering its upload first.
//
// Write path from README §6.1: the post row and its outbox note are inserted
// in ONE transaction. The request returns as soon as that commits — fan-out
// to followers happens later, asynchronously, via outbox-poller -> Kafka ->
// fanout-worker. The media upload itself happens *before* the transaction,
// since Postgres only ever stores the resulting URL.
postsRouter.post(
  "/posts",
  writeLimiter,
  requireAuth,
  upload.single("media"),
  validateBody(createPostSchema),
  async (req, res) => {
    const { body } = req.body as z.infer<typeof createPostSchema>;
    const authorId = req.user!.userId;

    let mediaUrl: string | null = null;
    if (req.file) {
      try {
        mediaUrl = await saveMedia(req.file);
      } catch (err) {
        // An async rejection here would otherwise escape this handler as an
        // unhandled promise rejection, which crashes the whole Node process
        // (and every in-flight request with it) instead of just failing
        // this one upload.
        console.error("media save failed:", err);
        return res.status(500).json({ error: "media upload failed" });
      }
    }

    const db = getDb();
    const client = await db.connect();
    let postId: number;
    try {
      await client.query("BEGIN");
      const postResult = await client.query(
        `INSERT INTO posts (author_id, body, media_url) VALUES ($1, $2, $3) RETURNING id`,
        [authorId, body, mediaUrl]
      );
      // posts.id is bigint -> node-postgres returns it as a string; cast so
      // the response body and the outbox row both carry an honest number.
      postId = Number(postResult.rows[0].id);
      await client.query(`INSERT INTO outbox (post_id, status) VALUES ($1, 'pending')`, [postId]);
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    res.status(201).json({
      postId,
      author: req.user!.username,
      mediaUrl,
      fanout: "queued",
    });
  }
);
