import { Router, type IRouter } from "express";
import { db, appealsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  SubmitAppealBody,
  MarkAppealReadParams,
  DismissAppealParams,
  ListAppealsQueryParams,
} from "@workspace/api-zod";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

async function serializeAppeal(appeal: any) {
  const [user] = await db
    .select({ username: usersTable.username })
    .from(usersTable)
    .where(eq(usersTable.id, appeal.userId));

  return {
    id: appeal.id,
    userId: appeal.userId,
    username: user?.username ?? null,
    message: appeal.message,
    isRead: appeal.isRead,
    isDismissed: appeal.isDismissed,
    createdAt: appeal.createdAt.toISOString(),
  };
}

router.get("/appeals", requireAdmin, async (req, res): Promise<void> => {
  const qp = ListAppealsQueryParams.safeParse(req.query);
  const unread = qp.success ? qp.data.unread : undefined;

  let appeals;
  if (unread === true) {
    appeals = await db
      .select()
      .from(appealsTable)
      .where(eq(appealsTable.isRead, false))
      .orderBy(appealsTable.createdAt);
  } else {
    appeals = await db.select().from(appealsTable).orderBy(appealsTable.createdAt);
  }

  const serialized = await Promise.all(appeals.map(serializeAppeal));
  res.json(serialized);
});

router.post("/appeals", requireAuth, async (req, res): Promise<void> => {
  const body = SubmitAppealBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const user = req.currentUser!;
  const [appeal] = await db
    .insert(appealsTable)
    .values({
      userId: user.id,
      message: body.data.message,
    })
    .returning();

  res.status(201).json(await serializeAppeal(appeal));
});

router.patch("/appeals/:id/read", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = MarkAppealReadParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [updated] = await db
    .update(appealsTable)
    .set({ isRead: true })
    .where(eq(appealsTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Appeal not found" });
    return;
  }

  res.json(await serializeAppeal(updated));
});

router.patch("/appeals/:id/dismiss", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DismissAppealParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [updated] = await db
    .update(appealsTable)
    .set({ isRead: true, isDismissed: true })
    .where(eq(appealsTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Appeal not found" });
    return;
  }

  res.json(await serializeAppeal(updated));
});

export default router;
