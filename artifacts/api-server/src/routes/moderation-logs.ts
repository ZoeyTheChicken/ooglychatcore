import { Router, type IRouter } from "express";
import { db, moderationLogsTable } from "@workspace/db";
import { eq, count, and, SQL } from "drizzle-orm";
import { ListModerationLogsQueryParams } from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

export async function logModerationAction(params: {
  adminId?: number;
  adminUsername: string;
  targetUserId?: number;
  targetUsername?: string;
  action: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await db.insert(moderationLogsTable).values({
    adminId: params.adminId ?? null,
    adminUsername: params.adminUsername,
    targetUserId: params.targetUserId ?? null,
    targetUsername: params.targetUsername ?? null,
    action: params.action,
    reason: params.reason ?? null,
    metadata: params.metadata ?? null,
  });
}

router.get("/moderation-logs", requireAdmin, async (req, res): Promise<void> => {
  const qp = ListModerationLogsQueryParams.safeParse(req.query);
  const page = qp.success ? (qp.data.page ?? 1) : 1;
  const action = qp.success ? qp.data.action : undefined;
  const adminId = qp.success ? qp.data.adminId : undefined;
  const targetUserId = qp.success ? qp.data.targetUserId : undefined;
  const pageSize = 50;
  const offset = (page - 1) * pageSize;

  const conditions: SQL[] = [];
  if (action) conditions.push(eq(moderationLogsTable.action, action));
  if (adminId) conditions.push(eq(moderationLogsTable.adminId, adminId));
  if (targetUserId) conditions.push(eq(moderationLogsTable.targetUserId, targetUserId));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [{ total }] = await db
    .select({ total: count() })
    .from(moderationLogsTable)
    .where(where);

  const logs = await db
    .select()
    .from(moderationLogsTable)
    .where(where)
    .orderBy(moderationLogsTable.createdAt)
    .limit(pageSize)
    .offset(offset);

  res.json({
    logs: logs.map((l) => ({
      ...l,
      metadata: l.metadata ?? null,
      createdAt: l.createdAt.toISOString(),
    })),
    total: Number(total),
  });
});

export default router;
