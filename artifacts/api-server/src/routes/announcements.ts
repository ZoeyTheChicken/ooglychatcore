import { Router, type IRouter } from "express";
import { db, announcementsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateAnnouncementBody,
  DeleteAnnouncementParams,
} from "@workspace/api-zod";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { logModerationAction } from "./moderation-logs";

const router: IRouter = Router();

async function serializeAnnouncement(a: any) {
  const [author] = await db
    .select({ username: usersTable.username })
    .from(usersTable)
    .where(eq(usersTable.id, a.authorId));

  return {
    id: a.id,
    content: a.content,
    authorId: a.authorId,
    authorUsername: author?.username ?? null,
    createdAt: a.createdAt.toISOString(),
  };
}

router.get("/announcements", requireAuth, async (req, res): Promise<void> => {
  const announcements = await db
    .select()
    .from(announcementsTable)
    .orderBy(announcementsTable.createdAt);

  const serialized = await Promise.all(announcements.map(serializeAnnouncement));
  res.json(serialized);
});

router.post("/announcements", requireAdmin, async (req, res): Promise<void> => {
  const body = CreateAnnouncementBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const admin = req.currentUser!;
  const [announcement] = await db
    .insert(announcementsTable)
    .values({
      content: body.data.content,
      authorId: admin.id,
    })
    .returning();

  await logModerationAction({
    adminId: admin.id,
    adminUsername: admin.username,
    action: "create_announcement",
    reason: body.data.content.slice(0, 100),
  });

  res.status(201).json(await serializeAnnouncement(announcement));
});

router.delete("/announcements/:id", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteAnnouncementParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(announcementsTable)
    .where(eq(announcementsTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Announcement was not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
