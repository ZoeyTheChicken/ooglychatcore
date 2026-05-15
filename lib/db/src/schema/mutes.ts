import { pgTable, serial, boolean, timestamp, integer, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const mutesTable = pgTable("mutes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  mutedById: integer("muted_by_id"),
  reason: text("reason").notNull(),
  isPermanent: boolean("is_permanent").notNull().default(false),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMuteSchema = createInsertSchema(mutesTable).omit({ id: true, createdAt: true });
export type InsertMute = z.infer<typeof insertMuteSchema>;
export type Mute = typeof mutesTable.$inferSelect;
