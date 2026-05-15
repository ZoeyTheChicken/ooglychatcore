import { Router, type IRouter } from "express";
import { db, messagesTable, usersTable, bansTable, mutesTable, reactionsTable } from "@workspace/db";
import { eq, desc, lt, and, gt, isNull, or, sql, inArray } from "drizzle-orm";
import {
  SendMessageBody,
  DeleteMessageParams,
  ListMessagesQueryParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { checkFilter } from "../lib/swear-filter";
import { logModerationAction } from "./moderation-logs";
import { broadcast } from "../lib/ws-broadcast";

const router: IRouter = Router();

function serializeMessage(msg: any, authorUsername: string, reactions: any[] = []) {
  return {
    id: msg.id,
    content: msg.content,
    authorId: msg.authorId,
    authorUsername,
    deleted: msg.deleted,
    replyToId: msg.replyToId ?? null,
    replyToContent: msg.replyToContent ?? null,
    replyToUsername: msg.replyToUsername ?? null,
    reactions,
    createdAt: msg.createdAt.toISOString(),
  };
}

router.get("/messages", requireAuth, async (req, res): Promise<void> => {
  const queryResult = ListMessagesQueryParams.safeParse(req.query);
  const before = queryResult.success ? queryResult.data.before : undefined;
  const limit = queryResult.success ? (queryResult.data.limit ?? 50) : 50;

  const conditions = [];
  if (before) {
    conditions.push(lt(messagesTable.id, before));
  }

  const msgs = await db
    .select()
    .from(messagesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(messagesTable.id))
    .limit(Math.min(limit, 100));

  const authorIds = [...new Set(msgs.map((m) => m.authorId))];
  let users: Array<{ id: number; username: string }> = [];
  if (authorIds.length > 0) {
    users = await db
      .select({ id: usersTable.id, username: usersTable.username })
      .from(usersTable)
      .where(inArray(usersTable.id, authorIds));
  }
  const userMap = new Map(users.map((u) => [u.id, u.username]));

  const msgIds = msgs.map((m) => m.id);
  let allReactions: any[] = [];
  if (msgIds.length > 0) {
    allReactions = await db
      .select()
      .from(reactionsTable)
      .where(inArray(reactionsTable.messageId, msgIds));
  }

  const currentUserId = req.currentUser!.id;

  const result = msgs.map((msg) => {
    const msgReactions = allReactions.filter((r) => r.messageId === msg.id);
    const emojiMap = new Map<string, { count: number; userReacted: boolean }>();
    for (const r of msgReactions) {
      const existing = emojiMap.get(r.emoji) ?? { count: 0, userReacted: false };
      emojiMap.set(r.emoji, {
        count: existing.count + 1,
        userReacted: existing.userReacted || r.userId === currentUserId,
      });
    }
    const reactions = Array.from(emojiMap.entries()).map(([emoji, data]) => ({
      emoji,
      count: data.count,
      userReacted: data.userReacted,
    }));

    return serializeMessage(msg, userMap.get(msg.authorId) ?? "unknown", reactions);
  });

  res.json(result);
});

router.post("/messages", requireAuth, async (req, res): Promise<void> => {
  const user = req.currentUser!;

  const now = new Date();
  const activeBan = await db
    .select()
    .from(bansTable)
    .where(
      and(
        eq(bansTable.userId, user.id),
        or(
          eq(bansTable.isPermanent, true),
          gt(bansTable.expiresAt, now),
        ),
      ),
    )
    .limit(1);

  if (activeBan.length > 0) {
    res.status(403).json({ error: "You are banned from this chat.", ban: activeBan[0] });
    return;
  }

  const activeMute = await db
    .select()
    .from(mutesTable)
    .where(
      and(
        eq(mutesTable.userId, user.id),
        or(
          eq(mutesTable.isPermanent, true),
          gt(mutesTable.expiresAt, now),
        ),
      ),
    )
    .limit(1);

  if (activeMute.length > 0 || user.isMuted) {
    res.status(403).json({ error: "You are muted and cannot send messages.", mute: activeMute[0] });
    return;
  }

  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { content, replyToId } = parsed.data;

  const filterResult = checkFilter(content);
  if (filterResult.flagged) {
    res.status(400).json({
      error: "Your message contains prohibited content.",
      matches: filterResult.matches,
    });
    return;
  }

  let replyToContent: string | undefined;
  let replyToUsername: string | undefined;

  if (replyToId) {
    const [replyMsg] = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.id, replyToId))
      .limit(1);

    if (replyMsg) {
      const [replyAuthor] = await db
        .select({ username: usersTable.username })
        .from(usersTable)
        .where(eq(usersTable.id, replyMsg.authorId));
      replyToContent = replyMsg.deleted ? "[deleted]" : replyMsg.content;
      replyToUsername = replyAuthor?.username ?? "unknown";
    }
  }

  const [msg] = await db
    .insert(messagesTable)
    .values({
      content,
      authorId: user.id,
      replyToId: replyToId ?? null,
      replyToContent: replyToContent ?? null,
      replyToUsername: replyToUsername ?? null,
    })
    .returning();

  const serialized = serializeMessage(msg, user.username, []);
  broadcast({ type: "new_message", payload: serialized });
  res.status(201).json(serialized);
});

router.delete("/messages/:id", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = DeleteMessageParams.safeParse({ id: parseInt(rawId, 10) });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const user = req.currentUser!;
  const [msg] = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.id, parsed.data.id));

  if (!msg) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  if (msg.authorId !== user.id && !user.isAdmin && !user.isOwner) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db
    .update(messagesTable)
    .set({ deleted: true, content: "[deleted]" })
    .where(eq(messagesTable.id, parsed.data.id));

  if (user.isAdmin || user.isOwner) {
    await logModerationAction({
      adminId: user.id,
      adminUsername: user.username,
      action: "delete_message",
      reason: `Message ID ${parsed.data.id} deleted`,
      metadata: { messageId: parsed.data.id },
    });
  }

  broadcast({ type: "delete_message", payload: { id: parsed.data.id } });
  res.sendStatus(204);
});

export default router;
