import type { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { bansTable, mutesTable } from "@workspace/db";
import { and, eq, or, isNull, gt } from "drizzle-orm";

// Simple in-memory session store: token -> userId
// In production, use Redis or a DB-backed session table
export const sessions = new Map<string, number>();

export function generateToken(): string {
  return (
    Math.random().toString(36).slice(2) +
    Math.random().toString(36).slice(2) +
    Date.now().toString(36)
  );
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = auth.slice(7);
  const userId = sessions.get(token);
  if (!userId) {
    res.status(401).json({ error: "Invalid or expired session" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!user) {
    sessions.delete(token);
    res.status(401).json({ error: "User not found" });
    return;
  }

  // Check for an active ban — permanent OR not yet expired
  const [activeBan] = await db
    .select()
    .from(bansTable)
    .where(
      and(
        eq(bansTable.userId, user.id),
        or(
          eq(bansTable.isPermanent, true),
          gt(bansTable.expiresAt, new Date()),
        ),
      ),
    );

  if (activeBan) {
    sessions.delete(token);
    res.status(403).json({
      banned: true,
      reason: activeBan.reason,
      expiresAt: activeBan.expiresAt,
    });
    return;
  }

  // Check for an active mute — permanent OR not yet expired
  const [activeMute] = await db
    .select()
    .from(mutesTable)
    .where(
      and(
        eq(mutesTable.userId, user.id),
        or(
          eq(mutesTable.isPermanent, true),
          gt(mutesTable.expiresAt, new Date()),
        ),
      ),
    );

  // Update last seen
  await db
    .update(usersTable)
    .set({
      lastSeen: new Date(),
      isMuted: !!activeMute,
    })
    .where(eq(usersTable.id, userId));

  // Attach mute state to the user object so /auth/me and other routes see it
  req.currentUser = { ...user, isMuted: !!activeMute };
  next();
}

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  await requireAuth(req, res, async () => {
    if (!req.currentUser?.isAdmin && !req.currentUser?.isOwner) {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    next();
  });
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      currentUser?: import("@workspace/db").User;
    }
  }
}
