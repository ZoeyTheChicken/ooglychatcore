import { pgTable, serial, boolean, timestamp, integer, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bansTable = pgTable("bans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  bannedById: integer("banned_by_id"),
  reason: text("reason").notNull(),
  isPermanent: boolean("is_permanent").notNull().default(false),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBanSchema = createInsertSchema(bansTable).omit({ id: true, createdAt: true });
export type InsertBan = z.infer<typeof insertBanSchema>;
export type Ban = typeof bansTable.$inferSelect;
