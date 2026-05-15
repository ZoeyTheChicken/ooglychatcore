import { pgTable, serial, boolean, timestamp, integer, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const appealsTable = pgTable("appeals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  isDismissed: boolean("is_dismissed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAppealSchema = createInsertSchema(appealsTable).omit({ id: true, createdAt: true, isRead: true, isDismissed: true });
export type InsertAppeal = z.infer<typeof insertAppealSchema>;
export type Appeal = typeof appealsTable.$inferSelect;
