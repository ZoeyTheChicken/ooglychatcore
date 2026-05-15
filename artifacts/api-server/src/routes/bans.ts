import { Router, type IRouter } from "express";
import { db, bansTable, usersTable } from "@workspace/db";
import { eq, and, or, gt, isNull } from "drizzle-orm";
import {
  BanUserBody,
  UnbanUserParams,
  GetUserBanStatusParams,
  ListBansQueryParams,
} from "@workspace/api-zod";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { logModerationAction } from "./moderation-logs";

const router: IRouter = Router();

async function serializeBan(ban: any) {
  const [user] = await db
    .select({ username: usersTable.username })
    .from(usersTable)
    .where(eq(usersTable.id, ban.userId));
  
  let bannedByUsername: string | null = null;
  if (ban.bannedById) {
    const [admin] = await db
      .select({ username: usersTable.username })
      .from(usersTable)
      .where(eq(usersTable.id, ban.bannedById));
    bannedByUsername = admin?.username ?? null;
  }

  return {
    id: ban.id,
    userId: ban.userId,
    username: user?.username ?? null,
    bannedById: ban.bannedById ?? null,
    bannedByUsername,
    reason: ban.reason,
    isPermanent: ban.isPermanent,
    expiresAt: ban.expiresAt?.toISOString() ?? null,
    createdAt: ban.createdAt.toISOString(),
  };
}

router.get("/bans", requireAdmin, async (req, res): Promise<void> => {
  const qp = ListBansQueryParams.safeParse(req.query);
  const active = qp.success ? qp.data.active : undefined;

  const now = new Date();
  let bans;

  if (active === true) {
    bans = await db
      .select()
      .from(bansTable)
      .where(
        or(
          eq(bansTable.isPermanent, true),
          gt(bansTable.expiresAt, now),
        ),
      )
      .orderBy(bansTable.createdAt);
  } else {
    bans = await db.select().from(bansTable).orderBy(bansTable.createdAt);
  }

  const serialized = await Promise.all(bans.map(serializeBan));
  res.json(serialized);
});

router.post("/bans", requireAdmin, async (req, res): Promise<void> => {
  const body = BanUserBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const admin = req.currentUser!;
  const { userId, reason, isPermanent, expiresAt } = body.data;

  const [ban] = await db
    .insert(bansTable)
    .values({
      userId,
      bannedById: admin.id,
      reason,
      isPermanent: isPermanent ?? false,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    })
    .returning();

  const [targetUser] = await db
    .select({ username: usersTable.username })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  await logModerationAction({
    adminId: admin.id,
    adminUsername: admin.username,
    targetUserId: userId,
    targetUsername: targetUser?.username,
    action: "ban",
    reason,
    metadata: { isPermanent, expiresAt },
  });

  res.status(201).json(await serializeBan(ban));
});

router.delete("/bans/:id", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UnbanUserParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const admin = req.currentUser!;
  const [ban] = await db
    .select()
    .from(bansTable)
    .where(eq(bansTable.id, params.data.id));

  if (!ban) {
    res.status(404).json({ error: "Ban not found" });
    return;
  }

  await db.delete(bansTable).where(eq(bansTable.id, params.data.id));

  const [targetUser] = await db
    .select({ username: usersTable.username })
    .from(usersTable)
    .where(eq(usersTable.id, ban.userId));

  await logModerationAction({
    adminId: admin.id,
    adminUsername: admin.username,
    targetUserId: ban.userId,
    targetUsername: targetUser?.username,
    action: "unban",
  });

  res.sendStatus(204);
});

router.get("/users/:id/ban-status", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetUserBanStatusParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const now = new Date();
  const [activeBan] = await db
    .select()
    .from(bansTable)
    .where(
      and(
        eq(bansTable.userId, params.data.id),
        or(
          eq(bansTable.isPermanent, true),
          gt(bansTable.expiresAt, now),
        ),
      ),
    )
    .limit(1);

  if (!activeBan) {
    res.json({ isBanned: false });
    return;
  }

  res.json({ isBanned: true, ban: await serializeBan(activeBan) });
});

export default router;
