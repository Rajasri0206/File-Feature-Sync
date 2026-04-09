import { Router, type IRouter } from "express";
import { eq, desc, gte, and, avg, count, max } from "drizzle-orm";
import { db, sessionsTable } from "@workspace/db";
import {
  GetUserProgressParams,
  GetUserProgressQueryParams,
  GetUserProgressSummaryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/progress/:userId", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const params = GetUserProgressParams.safeParse({ userId: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const query = GetUserProgressQueryParams.safeParse(req.query);
  const days = query.success ? (query.data.days ?? 30) : 30;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const sessions = await db
    .select({
      id: sessionsTable.id,
      createdAt: sessionsTable.createdAt,
      fluencyScore: sessionsTable.fluencyScore,
      pauseScore: sessionsTable.pauseScore,
      vocabularyScore: sessionsTable.vocabularyScore,
      confidenceScore: sessionsTable.confidenceScore,
      overallScore: sessionsTable.overallScore,
      wordsPerMinute: sessionsTable.wordsPerMinute,
    })
    .from(sessionsTable)
    .where(
      and(
        eq(sessionsTable.userId, params.data.userId),
        gte(sessionsTable.createdAt, cutoff),
        eq(sessionsTable.status, "analyzed"),
      ),
    )
    .orderBy(sessionsTable.createdAt);

  const [totalResult] = await db
    .select({ count: count() })
    .from(sessionsTable)
    .where(eq(sessionsTable.userId, params.data.userId));

  res.json({
    userId: params.data.userId,
    dataPoints: sessions.map((s) => ({
      date: s.createdAt,
      sessionId: s.id,
      fluencyScore: s.fluencyScore,
      pauseScore: s.pauseScore,
      vocabularyScore: s.vocabularyScore,
      confidenceScore: s.confidenceScore,
      overallScore: s.overallScore,
      wordsPerMinute: s.wordsPerMinute,
    })),
    totalSessions: totalResult?.count ?? 0,
    daysTracked: days,
  });
});

router.get("/progress/:userId/summary", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const params = GetUserProgressSummaryParams.safeParse({ userId: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const userId = params.data.userId;

  const allSessions = await db
    .select()
    .from(sessionsTable)
    .where(and(eq(sessionsTable.userId, userId), eq(sessionsTable.status, "analyzed")))
    .orderBy(sessionsTable.createdAt);

  const [aggs] = await db
    .select({
      avgFluency: avg(sessionsTable.fluencyScore),
      avgPause: avg(sessionsTable.pauseScore),
      avgVocab: avg(sessionsTable.vocabularyScore),
      avgConfidence: avg(sessionsTable.confidenceScore),
      avgOverall: avg(sessionsTable.overallScore),
      bestSession: max(sessionsTable.overallScore),
    })
    .from(sessionsTable)
    .where(and(eq(sessionsTable.userId, userId), eq(sessionsTable.status, "analyzed")));

  const [countResult] = await db
    .select({ count: count() })
    .from(sessionsTable)
    .where(eq(sessionsTable.userId, userId));

  const latestSession = allSessions.at(-1);

  let streak = 0;
  if (allSessions.length > 0) {
    const sessionDates = new Set(
      allSessions.map((s) => s.createdAt.toISOString().split("T")[0]),
    );
    const checkDate = new Date();
    while (sessionDates.has(checkDate.toISOString().split("T")[0])) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
  }

  let improvementPercent: number | null = null;
  if (allSessions.length >= 4) {
    const first3Avg =
      allSessions.slice(0, 3).reduce((sum, s) => sum + (s.overallScore ?? 0), 0) / 3;
    const last3Avg =
      allSessions.slice(-3).reduce((sum, s) => sum + (s.overallScore ?? 0), 0) / 3;
    improvementPercent =
      first3Avg > 0 ? ((last3Avg - first3Avg) / first3Avg) * 100 : null;
  }

  const bestSessionRecord = allSessions.reduce<(typeof allSessions)[number] | null>((best, s) => {
    if (!best) return s;
    return (s.overallScore ?? 0) > (best.overallScore ?? 0) ? s : best;
  }, null);

  res.json({
    userId,
    totalSessions: countResult?.count ?? 0,
    avgFluencyScore: aggs?.avgFluency != null ? parseFloat(String(aggs.avgFluency)) : null,
    avgPauseScore: aggs?.avgPause != null ? parseFloat(String(aggs.avgPause)) : null,
    avgVocabularyScore: aggs?.avgVocab != null ? parseFloat(String(aggs.avgVocab)) : null,
    avgConfidenceScore:
      aggs?.avgConfidence != null ? parseFloat(String(aggs.avgConfidence)) : null,
    avgOverallScore: aggs?.avgOverall != null ? parseFloat(String(aggs.avgOverall)) : null,
    bestSession: bestSessionRecord?.id ?? null,
    latestSession: latestSession?.id ?? null,
    streak,
    improvementPercent:
      improvementPercent != null ? parseFloat(improvementPercent.toFixed(1)) : null,
  });
});

export default router;
