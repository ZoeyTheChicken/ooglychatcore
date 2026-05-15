import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, ilike, sql, count } from "drizzle-orm";
import {
  GetUserParams,
  ListUsersQueryParams,
  UpdateUserParams,
  UpdateUserBody,
  UpdateSettingsBody,
} from "@workspace/api-zod";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

function safeUser(u: typeof usersTable.$inferSelect) {
  const { passwordHash: _, ...safe } = u;
  return {
    ...safe,
    lastSeen: safe.lastSeen?.toISOString() ?? null,
    createdAt: safe.createdAt.toISOString(),
  };
}

router.get("/users", requireAdmin, async (req, res): Promise<void> => {
  const qp = ListUsersQueryParams.safeParse(req.query);
  const search = qp.success ? qp.data.search : undefined;
  const page = qp.success ? (qp.data.page ?? 1) : 1;
  const pageSize = 25;
  const offset = (page - 1) * pageSize;

  const where = search
    ? ilike(usersTable.username, `%${search}%`)
    : undefined;

  const [{ total }] = await db
    .select({ total: count() })
    .from(usersTable)
    .where(where);

  const users = await db
    .select()
    .from(usersTable)
    .where(where)
    .orderBy(usersTable.id)
    .limit(pageSize)
    .offset(offset);

  res.json({
    users: users.map(safeUser),
    total: Number(total),
  });
});

router.get("/users/:id", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetUserParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, params.data.id));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(safeUser(user));
});

router.patch("/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateUserParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateUserBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set(body.data)
    .where(eq(usersTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(safeUser(updated));
});

router.patch("/users/me/settings", requireAuth, async (req, res): Promise<void> => {
  const body = UpdateSettingsBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const user = req.currentUser!;
  const [updated] = await db
    .update(usersTable)
    .set(body.data)
    .where(eq(usersTable.id, user.id))
    .returning();

  res.json(safeUser(updated));
});

export default router;
