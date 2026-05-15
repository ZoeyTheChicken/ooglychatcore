import { Router, type IRouter } from "express";
import { db, reactionsTable, messagesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { AddReactionParams, AddReactionBody, RemoveReactionParams, GetReactionSummaryParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.post("/messages/:id/reactions", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = AddReactionParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = AddReactionBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const user = req.currentUser!;
  const { id: messageId } = params.data;
  const { emoji } = body.data;

  // Check message exists
  const [msg] = await db.select().from(messagesTable).where(eq(messagesTable.id, messageId));
  if (!msg) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  // Upsert: delete existing same reaction from same user, then insert
  await db
    .delete(reactionsTable)
    .where(
      and(
        eq(reactionsTable.messageId, messageId),
        eq(reactionsTable.userId, user.id),
        eq(reactionsTable.emoji, emoji),
      ),
    );

  const [reaction] = await db
    .insert(reactionsTable)
    .values({ messageId, userId: user.id, emoji })
    .returning();

  res.status(201).json({
    id: reaction.id,
    messageId: reaction.messageId,
    userId: reaction.userId,
    emoji: reaction.emoji,
    createdAt: reaction.createdAt.toISOString(),
  });
});

router.delete("/messages/:id/reactions/:emoji", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const rawEmoji = Array.isArray(req.params.emoji) ? req.params.emoji[0] : req.params.emoji;
  const params = RemoveReactionParams.safeParse({ id: parseInt(rawId, 10), emoji: rawEmoji });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const user = req.currentUser!;
  await db
    .delete(reactionsTable)
    .where(
      and(
        eq(reactionsTable.messageId, params.data.id),
        eq(reactionsTable.userId, user.id),
        eq(reactionsTable.emoji, params.data.emoji),
      ),
    );

  res.sendStatus(204);
});

router.get("/messages/:id/reactions/summary", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetReactionSummaryParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const user = req.currentUser!;
  const reactions = await db
    .select()
    .from(reactionsTable)
    .where(eq(reactionsTable.messageId, params.data.id));

  const emojiMap = new Map<string, { count: number; userReacted: boolean }>();
  for (const r of reactions) {
    const existing = emojiMap.get(r.emoji) ?? { count: 0, userReacted: false };
    emojiMap.set(r.emoji, {
      count: existing.count + 1,
      userReacted: existing.userReacted || r.userId === user.id,
    });
  }

  const summary = Array.from(emojiMap.entries()).map(([emoji, data]) => ({
    emoji,
    count: data.count,
    userReacted: data.userReacted,
  }));

  res.json(summary);
});

export default router;
