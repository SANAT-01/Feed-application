import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getDb } from "@feed/shared";
import { signToken } from "../auth";
import { validateBody } from "../validate";

export const authRouter = Router();

const usernameSchema = z
  .string()
  .trim()
  .min(3)
  .max(32)
  .regex(/^[a-zA-Z0-9_]+$/, "username may only contain letters, numbers, and underscores");

// Signup enforces a minimum password length — a strength policy. Login must
// NOT reuse this: a wrong password that happens to be short should fail
// with 401 (bad credentials) from the bcrypt compare below, not 400 (bad
// request) from validation before that comparison ever runs.
const signupSchema = z.object({ username: usernameSchema, password: z.string().min(8).max(200) });
const loginSchema = z.object({ username: usernameSchema, password: z.string().min(1).max(200) });

authRouter.post("/auth/signup", validateBody(signupSchema), async (req, res) => {
  const { username, password } = req.body as z.infer<typeof signupSchema>;
  const db = getDb();

  const existing = await db.query("SELECT id FROM users WHERE username = $1", [username]);
  if (existing.rowCount && existing.rowCount > 0) {
    return res.status(409).json({ error: "username already taken" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const { rows } = await db.query(
    `INSERT INTO users (username, password_hash, is_celebrity) VALUES ($1, $2, false)
     RETURNING id, username, is_celebrity`,
    [username, passwordHash]
  );
  const user = rows[0];
  const token = signToken({ userId: user.id, username: user.username });
  res.status(201).json({ token, user: { id: user.id, username: user.username, isCelebrity: user.is_celebrity } });
});

authRouter.post("/auth/login", validateBody(loginSchema), async (req, res) => {
  const { username, password } = req.body as z.infer<typeof loginSchema>;
  const db = getDb();

  const { rows } = await db.query(
    "SELECT id, username, password_hash, is_celebrity FROM users WHERE username = $1",
    [username]
  );
  const user = rows[0];
  // Same "invalid username or password" error either way — don't leak
  // which half was wrong.
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: "invalid username or password" });
  }

  const token = signToken({ userId: user.id, username: user.username });
  res.json({ token, user: { id: user.id, username: user.username, isCelebrity: user.is_celebrity } });
});
