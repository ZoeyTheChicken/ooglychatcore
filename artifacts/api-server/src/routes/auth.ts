import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import {
  sessions,
  generateToken,
  requireAuth,
} from "../middlewares/auth";
import { checkUsernameFilter } from "../lib/swear-filter";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let { username, password } = parsed.data;

  // Store the original username for display
  const originalUsername = username;
  
  // Convert to lowercase for case-insensitive checking
  const lowercaseUsername = username.toLowerCase();

  // Username filter check (check the original username for profanity)
  if (checkUsernameFilter(username)) {
    res.status(400).json({ error: "Username is not appropriate for Oogly Chat." });
    return;
  }

  // Username format check (allow original case but enforce character rules)
  if (!/^[a-zA-Z0-9_-]{3,32}$/.test(username)) {
    res
      .status(400)
      .json({ error: "Username must be 3-32 alphanumeric characters, underscores, or hyphens." });
    return;
  }

  // Check for existing username (case-insensitive)
  const existing = await db
    .select()
    .from(usersTable)
    .where(sql`LOWER(${usersTable.username}) = ${lowercaseUsername}`);

  if (existing.length > 0) {
    res.status(400).json({ error: "Username has already been claimed. (Case-insensitive check)" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const [user] = await db
    .insert(usersTable)
    .values({
      username: originalUsername, // Store the original case for display
      passwordHash,
      isAdmin: false,
      isOwner: false,
      isMuted: false,
    })
    .returning();

  const token = generateToken();
  sessions.set(token, user.id);

  const { passwordHash: _, ...safeUser } = user;
  res.status(201).json({
    user: {
      ...safeUser,
      lastSeen: safeUser.lastSeen?.toISOString() ?? null,
      createdAt: safeUser.createdAt.toISOString(),
    },
    token,
  });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let { username, password } = parsed.data;

  // Convert to lowercase for case-insensitive lookup
  const lowercaseUsername = username.toLowerCase();

  // Find user case-insensitively
  const [user] = await db
    .select()
    .from(usersTable)
    .where(sql`LOWER(${usersTable.username}) = ${lowercaseUsername}`);

  if (!user) {
    res.status(401).json({ error: "Your username or password was incorrect." });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Your username or password was incorrect." });
    return;
  }

  const token = generateToken();
  sessions.set(token, user.id);

  const { passwordHash: _, ...safeUser } = user;
  res.status(200).json({
    user: {
      ...safeUser,
      lastSeen: safeUser.lastSeen?.toISOString() ?? null,
      createdAt: safeUser.createdAt.toISOString(),
    },
    token,
  });
});

router.post("/auth/logout", requireAuth, async (req, res): Promise<void> => {
  const auth = req.headers.authorization!;
  const token = auth.slice(7);
  sessions.delete(token);
  res.json({ success: true });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const u = req.currentUser!;
  const { passwordHash: _, ...safeUser } = u;
  res.json({
    ...safeUser,
    lastSeen: safeUser.lastSeen?.toISOString() ?? null,
    createdAt: safeUser.createdAt.toISOString(),
  });
});

export default router;
