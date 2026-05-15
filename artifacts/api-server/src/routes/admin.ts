import { Router, type IRouter } from "express";
import { db, usersTable, messagesTable, bansTable, mutesTable, appealsTable, reactionsTable } from "@workspace/db";
import { eq, gt, and, or, gte, count, desc, ne } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { checkFilter } from "../lib/swear-filter";
import { CheckFilterBody } from "@workspace/api-zod";
import { broadcast } from "../lib/ws-broadcast";

const VALID_EFFECTS = [
  "explosion", "fake_ban", "matrix", "disco", "upside_down", "earthquake", "ghost",
  "hacker", "spin", "rick_roll", "rain", "hypnosis", "confetti", "police",
  "zoom_pulse", "black_screen", "strobe",
] as const;

const router: IRouter = Router();

router.get("/admin/stats", requireAdmin, async (req, res): Promise<void> => {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

  const [
    [totalUsersRow],
    [totalMessagesRow],
    [totalReactionsRow],
    [activeBans],
    [activeMutes],
    [pendingAppeals],
    [messagesLast24h],
    [newUsersLast24h],
    [messagesLast7d],
    [totalAdminsRow],
    [onlineRow],
  ] = await Promise.all([
    db.select({ total: count() }).from(usersTable),
    db.select({ total: count() }).from(messagesTable).where(eq(messagesTable.deleted, false)),
    db.select({ total: count() }).from(reactionsTable),
    db.select({ total: count() }).from(bansTable).where(or(eq(bansTable.isPermanent, true), gt(bansTable.expiresAt, now))),
    db.select({ total: count() }).from(mutesTable).where(or(eq(mutesTable.isPermanent, true), gt(mutesTable.expiresAt, now))),
    db.select({ total: count() }).from(appealsTable).where(and(eq(appealsTable.isRead, false), eq(appealsTable.isDismissed, false))),
    db.select({ total: count() }).from(messagesTable).where(and(gte(messagesTable.createdAt, yesterday), eq(messagesTable.deleted, false))),
    db.select({ total: count() }).from(usersTable).where(gte(usersTable.createdAt, yesterday)),
    db.select({ total: count() }).from(messagesTable).where(and(gte(messagesTable.createdAt, sevenDaysAgo), eq(messagesTable.deleted, false))),
    db.select({ total: count() }).from(usersTable).where(eq(usersTable.isAdmin, true)),
    db.select({ total: count() }).from(usersTable).where(gte(usersTable.lastSeen, fiveMinutesAgo)),
  ]);

  const totalUsers = Number(totalUsersRow.total);
  const totalMessages = Number(totalMessagesRow.total);

  res.json({
    totalUsers,
    totalMessages,
    totalReactions: Number(totalReactionsRow.total),
    activeBans: Number(activeBans.total),
    activeMutes: Number(activeMutes.total),
    pendingAppeals: Number(pendingAppeals.total),
    messagesLast24h: Number(messagesLast24h.total),
    messagesLast7d: Number(messagesLast7d.total),
    newUsersLast24h: Number(newUsersLast24h.total),
    totalAdmins: Number(totalAdminsRow.total),
    onlineNow: Number(onlineRow.total),
    avgMsgsPerUser: totalUsers > 0 ? Math.round((totalMessages / totalUsers) * 10) / 10 : 0,
    bannedPercent: totalUsers > 0 ? Math.round((Number(activeBans.total) / totalUsers) * 1000) / 10 : 0,
    mutedPercent: totalUsers > 0 ? Math.round((Number(activeMutes.total) / totalUsers) * 1000) / 10 : 0,
  });
});

// Accessible to any authenticated user (not admin-only) so the online count in sidebar works
router.get("/admin/online-users", requireAuth, async (req, res): Promise<void> => {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  const users = await db
    .select()
    .from(usersTable)
    .where(gte(usersTable.lastSeen, fiveMinutesAgo))
    .orderBy(desc(usersTable.lastSeen))
    .limit(50);

  res.json(
    users.map((u) => {
      const { passwordHash: _, ...safe } = u;
      return {
        ...safe,
        lastSeen: safe.lastSeen?.toISOString() ?? null,
        createdAt: safe.createdAt.toISOString(),
      };
    }),
  );
});

router.post("/admin/troll", requireAdmin, async (req, res): Promise<void> => {
  const { targetUsername, effect } = req.body ?? {};
  // "*" is valid for global broadcast
  if (!targetUsername || typeof targetUsername !== "string") {
    res.status(400).json({ error: "targetUsername required" });
    return;
  }
  if (!effect || !VALID_EFFECTS.includes(effect)) {
    res.status(400).json({ error: `effect must be one of: ${VALID_EFFECTS.join(", ")}` });
    return;
  }
  broadcast({ type: "troll_effect", payload: { targetUsername, effect } });
  res.json({ ok: true });
});

// Promote or demote a user's admin role
// Any admin can promote; only owner can demote
router.post("/admin/users/:id/role", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const targetId = parseInt(rawId, 10);
  if (isNaN(targetId)) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }

  const { isAdmin: makeAdmin } = req.body ?? {};
  if (typeof makeAdmin !== "boolean") {
    res.status(400).json({ error: "isAdmin (boolean) required" });
    return;
  }

  const admin = req.currentUser!;

  const [target] = await db.select().from(usersTable).where(eq(usersTable.id, targetId));
  if (!target) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (target.isOwner) {
    res.status(403).json({ error: "Cannot change the owner's role" });
    return;
  }

  // Only owner can demote
  if (!makeAdmin && !admin.isOwner) {
    res.status(403).json({ error: "Only the owner can demote admins" });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({ isAdmin: makeAdmin })
    .where(eq(usersTable.id, targetId))
    .returning();

  const { passwordHash: _, ...safe } = updated;
  res.json({ ...safe, lastSeen: safe.lastSeen?.toISOString() ?? null, createdAt: safe.createdAt.toISOString() });
});

router.post("/filter/check", requireAdmin, async (req, res): Promise<void> => {
  const body = CheckFilterBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const result = checkFilter(body.data.text);
  res.json(result);
});

export default router;
