import { db, userStatsTable, userBadgesTable, badgesTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

export const XP_LEVELS = [
  { level: 1, name: "Novice", xpRequired: 0 },
  { level: 2, name: "Beginner", xpRequired: 100 },
  { level: 3, name: "Developing", xpRequired: 300 },
  { level: 4, name: "Intermediate", xpRequired: 600 },
  { level: 5, name: "Proficient", xpRequired: 1000 },
  { level: 6, name: "Advanced", xpRequired: 1500 },
  { level: 7, name: "Expert", xpRequired: 2200 },
  { level: 8, name: "Master", xpRequired: 3000 },
  { level: 9, name: "Champion", xpRequired: 4000 },
  { level: 10, name: "Legend", xpRequired: 5200 },
];

export const PREDEFINED_BADGES = [
  { id: "first_session", name: "First Words", description: "Complete your first speaking session", icon: "🎤", condition: "sessions_1" },
  { id: "sessions_5", name: "Getting Warmed Up", description: "Complete 5 speaking sessions", icon: "🔥", condition: "sessions_5" },
  { id: "sessions_10", name: "Dedicated Speaker", description: "Complete 10 sessions", icon: "💪", condition: "sessions_10" },
  { id: "sessions_50", name: "Marathon Speaker", description: "Complete 50 sessions", icon: "🏆", condition: "sessions_50" },
  { id: "streak_3", name: "3-Day Habit", description: "Maintain a 3-day practice streak", icon: "⚡", condition: "streak_3" },
  { id: "streak_7", name: "Week Warrior", description: "Maintain a 7-day streak", icon: "🗓️", condition: "streak_7" },
  { id: "streak_30", name: "Monthly Champion", description: "Maintain a 30-day streak", icon: "🌟", condition: "streak_30" },
  { id: "fluency_master", name: "Fluency Master", description: "Achieve a fluency score of 90+", icon: "🎯", condition: "fluency_90" },
  { id: "vocab_pro", name: "Vocabulary Pro", description: "Achieve a vocabulary score of 85+", icon: "📚", condition: "vocab_85" },
  { id: "confidence_king", name: "Confidence King", description: "Achieve a confidence score of 85+", icon: "👑", condition: "confidence_85" },
  { id: "high_scorer", name: "High Achiever", description: "Score 85+ overall in a session", icon: "⭐", condition: "overall_85" },
  { id: "perfect_100", name: "Perfectionist", description: "Score 95+ overall in a session", icon: "💎", condition: "overall_95" },
  { id: "level_5", name: "Halfway There", description: "Reach Level 5", icon: "🚀", condition: "level_5" },
  { id: "level_10", name: "Legend", description: "Reach Level 10", icon: "🦅", condition: "level_10" },
];

export function calculateLevel(xp: number): { level: number; name: string; xpForCurrentLevel: number; xpToNextLevel: number } {
  let currentLevel = XP_LEVELS[0];
  for (const lvl of XP_LEVELS) {
    if (xp >= lvl.xpRequired) currentLevel = lvl;
    else break;
  }
  const nextLevel = XP_LEVELS.find((l) => l.level === currentLevel.level + 1);
  return {
    level: currentLevel.level,
    name: currentLevel.name,
    xpForCurrentLevel: currentLevel.xpRequired,
    xpToNextLevel: nextLevel ? nextLevel.xpRequired - xp : 0,
  };
}

export function calculateXpEarned(overallScore: number, currentStreak: number): number {
  const baseXp = 50;
  const performanceXp = Math.round(overallScore * 0.5);
  const streakBonus = Math.min(currentStreak * 5, 30);
  return baseXp + performanceXp + streakBonus;
}

export async function seedBadges(): Promise<void> {
  for (const badge of PREDEFINED_BADGES) {
    const [existing] = await db
      .select()
      .from(badgesTable)
      .where(eq(badgesTable.id, badge.id));
    if (!existing) {
      await db.insert(badgesTable).values(badge);
    }
  }
}

function todayString(): string {
  return new Date().toISOString().split("T")[0];
}

function yesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

export async function getOrCreateUserStats(userId: string): Promise<typeof userStatsTable.$inferSelect> {
  const [existing] = await db.select().from(userStatsTable).where(eq(userStatsTable.userId, userId));
  if (existing) return existing;

  const [created] = await db
    .insert(userStatsTable)
    .values({ userId, xp: 0, level: 1, currentStreak: 0, longestStreak: 0 })
    .returning();
  return created;
}

export async function awardXpAndUpdateStreak(
  userId: string,
  xpEarned: number,
  sessionScores: {
    overallScore: number;
    fluencyScore: number;
    vocabularyScore: number;
    confidenceScore: number;
    totalSessions: number;
  },
): Promise<{ newBadges: typeof badgesTable.$inferSelect[]; newLevel: number | null; stats: typeof userStatsTable.$inferSelect }> {
  const stats = await getOrCreateUserStats(userId);
  const today = todayString();
  const yesterday = yesterdayString();

  let newStreak = stats.currentStreak;
  if (stats.lastActiveDate === today) {
    // Already practiced today, no streak change
  } else if (stats.lastActiveDate === yesterday) {
    newStreak = stats.currentStreak + 1;
  } else {
    newStreak = 1;
  }

  const newXp = stats.xp + xpEarned;
  const prevLevel = calculateLevel(stats.xp).level;
  const { level: newLevel } = calculateLevel(newXp);
  const longestStreak = Math.max(newStreak, stats.longestStreak);

  const [updatedStats] = await db
    .update(userStatsTable)
    .set({
      xp: newXp,
      level: newLevel,
      currentStreak: newStreak,
      longestStreak,
      lastActiveDate: today,
      updatedAt: new Date(),
    })
    .where(eq(userStatsTable.userId, userId))
    .returning();

  const newBadges = await checkAndAwardBadges(userId, {
    ...sessionScores,
    currentStreak: newStreak,
    level: newLevel,
  });

  return {
    newBadges,
    newLevel: newLevel > prevLevel ? newLevel : null,
    stats: updatedStats,
  };
}

export async function checkAndAwardBadges(
  userId: string,
  stats: {
    totalSessions: number;
    currentStreak: number;
    level: number;
    overallScore: number;
    fluencyScore: number;
    vocabularyScore: number;
    confidenceScore: number;
  },
): Promise<typeof badgesTable.$inferSelect[]> {
  const existingBadges = await db
    .select({ badgeId: userBadgesTable.badgeId })
    .from(userBadgesTable)
    .where(eq(userBadgesTable.userId, userId));
  const earnedIds = new Set(existingBadges.map((b) => b.badgeId));

  const toAward: string[] = [];

  const check = (condition: string, id: string) => {
    if (earnedIds.has(id)) return;
    let met = false;
    switch (condition) {
      case "sessions_1": met = stats.totalSessions >= 1; break;
      case "sessions_5": met = stats.totalSessions >= 5; break;
      case "sessions_10": met = stats.totalSessions >= 10; break;
      case "sessions_50": met = stats.totalSessions >= 50; break;
      case "streak_3": met = stats.currentStreak >= 3; break;
      case "streak_7": met = stats.currentStreak >= 7; break;
      case "streak_30": met = stats.currentStreak >= 30; break;
      case "fluency_90": met = stats.fluencyScore >= 90; break;
      case "vocab_85": met = stats.vocabularyScore >= 85; break;
      case "confidence_85": met = stats.confidenceScore >= 85; break;
      case "overall_85": met = stats.overallScore >= 85; break;
      case "overall_95": met = stats.overallScore >= 95; break;
      case "level_5": met = stats.level >= 5; break;
      case "level_10": met = stats.level >= 10; break;
    }
    if (met) toAward.push(id);
  };

  for (const badge of PREDEFINED_BADGES) {
    check(badge.condition, badge.id);
  }

  if (toAward.length === 0) return [];

  await db.insert(userBadgesTable).values(
    toAward.map((badgeId) => ({ userId, badgeId })),
  );

  const newBadges = await db
    .select()
    .from(badgesTable)
    .where(
      toAward.length === 1
        ? eq(badgesTable.id, toAward[0])
        : eq(badgesTable.id, toAward[0]),
    );

  const allNew = await db.select().from(badgesTable);
  return allNew.filter((b) => toAward.includes(b.id));
}
