import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, userStatsTable, userBadgesTable, badgesTable, usersTable } from "@workspace/db";
import {
  getOrCreateUserStats,
  calculateLevel,
  XP_LEVELS,
} from "../lib/gamification";

const router: IRouter = Router();

router.get("/users/:userId/stats", async (req, res): Promise<void> => {
  const { userId } = req.params;

  if (!userId) {
    res.status(400).json({ error: "userId is required" });
    return;
  }

  const stats = await getOrCreateUserStats(userId);
  const { level, name: levelName, xpToNextLevel, xpForCurrentLevel } = calculateLevel(stats.xp);

  const earnedBadges = await db
    .select({
      id: badgesTable.id,
      name: badgesTable.name,
      description: badgesTable.description,
      icon: badgesTable.icon,
      earnedAt: userBadgesTable.earnedAt,
    })
    .from(userBadgesTable)
    .leftJoin(badgesTable, eq(userBadgesTable.badgeId, badgesTable.id))
    .where(eq(userBadgesTable.userId, userId))
    .orderBy(desc(userBadgesTable.earnedAt));

  res.json({
    userId,
    xp: stats.xp,
    level,
    levelName,
    xpToNextLevel,
    xpForCurrentLevel,
    currentStreak: stats.currentStreak,
    longestStreak: stats.longestStreak,
    lastActiveDate: stats.lastActiveDate ?? null,
    badges: earnedBadges.map((b) => ({
      id: b.id ?? "",
      name: b.name ?? "",
      description: b.description ?? "",
      icon: b.icon ?? "",
      earnedAt: b.earnedAt,
    })),
  });
});

router.get("/leaderboard", async (req, res): Promise<void> => {
  const limit = Math.min(parseInt(String(req.query.limit ?? "10"), 10), 50);

  const entries = await db
    .select({
      userId: userStatsTable.userId,
      xp: userStatsTable.xp,
      level: userStatsTable.level,
      currentStreak: userStatsTable.currentStreak,
      username: usersTable.username,
    })
    .from(userStatsTable)
    .leftJoin(usersTable, eq(userStatsTable.userId, usersTable.id))
    .orderBy(desc(userStatsTable.xp))
    .limit(limit);

  const ranked = entries.map((entry, idx) => {
    const { name: levelName } = calculateLevel(entry.xp);
    return {
      rank: idx + 1,
      userId: entry.userId,
      username: entry.username ?? entry.userId.slice(0, 8),
      xp: entry.xp,
      level: entry.level,
      levelName,
      currentStreak: entry.currentStreak,
    };
  });

  res.json({ entries: ranked, updatedAt: new Date().toISOString() });
});

export default router;
