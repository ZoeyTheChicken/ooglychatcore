import { Router, type IRouter } from "express";
import { db, mutesTable, usersTable } from "@workspace/db";
import { eq, and, or, gt } from "drizzle-orm";
import {
  MuteUserBody,
  UnmuteUserParams,
  ListMutesQueryParams,
} from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/auth";
import { logModerationAction } from "./moderation-logs";

const router: IRouter = Router();

async function serializeMute(mute: any) {
  const [user] = await db
    .select({ username: usersTable.username })
    .from(usersTable)
    .where(eq(usersTable.id, mute.userId));

  let mutedByUsername: string | null = null;
  if (mute.mutedById) {
    const [admin] = await db
      .select({ username: usersTable.username })
      .from(usersTable)
      .where(eq(usersTable.id, mute.mutedById));
    mutedByUsername = admin?.username ?? null;
  }

  return {
    id: mute.id,
    userId: mute.userId,
    username: user?.username ?? null,
    mutedById: mute.mutedById ?? null,
    mutedByUsername,
    reason: mute.reason,
    isPermanent: mute.isPermanent,
    expiresAt: mute.expiresAt?.toISOString() ?? null,
    createdAt: mute.createdAt.toISOString(),
  };
}

router.get("/mutes", requireAdmin, async (req, res): Promise<void> => {
  const qp = ListMutesQueryParams.safeParse(req.query);
  const active = qp.success ? qp.data.active : undefined;
  const now = new Date();

  let mutes;
  if (active === true) {
    mutes = await db
      .select()
      .from(mutesTable)
      .where(
        or(eq(mutesTable.isPermanent, true), gt(mutesTable.expiresAt, now)),
      )
      .orderBy(mutesTable.createdAt);
  } else {
    mutes = await db.select().from(mutesTable).orderBy(mutesTable.createdAt);
  }

  const serialized = await Promise.all(mutes.map(serializeMute));
  res.json(serialized);
});

router.post("/mutes", requireAdmin, async (req, res): Promise<void> => {
  const body = MuteUserBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const admin = req.currentUser!;
  const { userId, reason, isPermanent, expiresAt } = body.data;

  const [mute] = await db
    .insert(mutesTable)
    .values({
      userId,
      mutedById: admin.id,
      reason,
      isPermanent: isPermanent ?? false,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    })
    .returning();

  // Also set isMuted on user
  await db
    .update(usersTable)
    .set({ isMuted: true })
    .where(eq(usersTable.id, userId));

  const [targetUser] = await db
    .select({ username: usersTable.username })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  await logModerationAction({
    adminId: admin.id,
    adminUsername: admin.username,
    targetUserId: userId,
    targetUsername: targetUser?.username,
    action: "mute",
    reason,
    metadata: { isPermanent, expiresAt },
  });

  res.status(201).json(await serializeMute(mute));
});

router.delete("/mutes/:id", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UnmuteUserParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const admin = req.currentUser!;
  const [mute] = await db
    .select()
    .from(mutesTable)
    .where(eq(mutesTable.id, params.data.id));

  if (!mute) {
    res.status(404).json({ error: "Mute not found" });
    return;
  }

  await db.delete(mutesTable).where(eq(mutesTable.id, params.data.id));

  // Check if user has other active mutes
  const now = new Date();
  const otherMutes = await db
    .select()
    .from(mutesTable)
    .where(
      and(
        eq(mutesTable.userId, mute.userId),
        or(eq(mutesTable.isPermanent, true), gt(mutesTable.expiresAt, now)),
      ),
    )
    .limit(1);

  if (otherMutes.length === 0) {
    await db
      .update(usersTable)
      .set({ isMuted: false })
      .where(eq(usersTable.id, mute.userId));
  }

  const [targetUser] = await db
    .select({ username: usersTable.username })
    .from(usersTable)
    .where(eq(usersTable.id, mute.userId));

  await logModerationAction({
    adminId: admin.id,
    adminUsername: admin.username,
    targetUserId: mute.userId,
    targetUsername: targetUser?.username,
    action: "unmute",
  });

  res.sendStatus(204);
});

export default router;
