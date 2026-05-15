import { pgTable, serial, timestamp, integer, text, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const moderationLogsTable = pgTable("moderation_logs", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id"),
  adminUsername: text("admin_username").notNull(),
  targetUserId: integer("target_user_id"),
  targetUsername: text("target_username"),
  action: text("action").notNull(),
  reason: text("reason"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertModerationLogSchema = createInsertSchema(moderationLogsTable).omit({ id: true, createdAt: true });
export type InsertModerationLog = z.infer<typeof insertModerationLogSchema>;
export type ModerationLog = typeof moderationLogsTable.$inferSelect;
