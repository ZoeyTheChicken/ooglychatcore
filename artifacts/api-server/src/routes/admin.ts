import { Router, type IRouter } from "express";
import { db, usersTable, messagesTable, bansTable, mutesTable, appealsTable } from "@workspace/db";
import { eq, gt, and, or, gte, count, sql } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";
import { checkFilter } from "../lib/swear-filter";
import { CheckFilterBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/admin/stats", requireAdmin, async (req, res): Promise<void> => {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [[totalUsersRow], [totalMessagesRow]] = await Promise.all([
    db.select({ total: count() }).from(usersTable),
    db.select({ total: count() }).from(messagesTable).where(eq(messagesTable.deleted, false)),
  ]);

  const [activeBans] = await db
    .select({ total: count() })
    .from(bansTable)
    .where(
      or(eq(bansTable.isPermanent, true), gt(bansTable.expiresAt, now)),
    );

  const [activeMutes] = await db
    .select({ total: count() })
    .from(mutesTable)
    .where(
      or(eq(mutesTable.isPermanent, true), gt(mutesTable.expiresAt, now)),
    );

  const [pendingAppeals] = await db
    .select({ total: count() })
    .from(appealsTable)
    .where(and(eq(appealsTable.isRead, false), eq(appealsTable.isDismissed, false)));

  const [messagesLast24h] = await db
    .select({ total: count() })
    .from(messagesTable)
    .where(and(gte(messagesTable.createdAt, yesterday), eq(messagesTable.deleted, false)));

  const [newUsersLast24h] = await db
    .select({ total: count() })
    .from(usersTable)
    .where(gte(usersTable.createdAt, yesterday));

  res.json({
    totalUsers: Number(totalUsersRow.total),
    totalMessages: Number(totalMessagesRow.total),
    activeBans: Number(activeBans.total),
    activeMutes: Number(activeMutes.total),
    pendingAppeals: Number(pendingAppeals.total),
    messagesLast24h: Number(messagesLast24h.total),
    newUsersLast24h: Number(newUsersLast24h.total),
  });
});

router.get("/admin/online-users", requireAdmin, async (req, res): Promise<void> => {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  const users = await db
    .select()
    .from(usersTable)
    .where(gte(usersTable.lastSeen, fiveMinutesAgo))
    .orderBy(usersTable.lastSeen)
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
