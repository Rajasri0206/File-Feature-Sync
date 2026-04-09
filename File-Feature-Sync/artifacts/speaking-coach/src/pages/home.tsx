import { useGetUserProgressSummary, useListSessions, useGetUserStats, useGetLeaderboard } from "@workspace/api-client-react";
import { Link } from "wouter";
import { useAuth } from "@/contexts/auth";
import {
  Mic, ArrowRight, Activity, Zap, Trophy, PlayCircle, TrendingUp, Star, Flame, Shield, Crown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export function Home() {
  const { currentUserId, isAuthenticated, user } = useAuth();
  const { data: summary, isLoading: isLoadingSummary } = useGetUserProgressSummary(currentUserId);
  const { data: sessionsData, isLoading: isLoadingSessions } = useListSessions({ userId: currentUserId, limit: 3 });
  const { data: stats, isLoading: isLoadingStats } = useGetUserStats(currentUserId, {
    query: { enabled: isAuthenticated },
  });
  const { data: leaderboard } = useGetLeaderboard({ limit: 5 });

  function getScoreBadgeColor(score?: number | null) {
    if (!score) return "secondary";
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    return "destructive";
  }

  return (
    <div className="space-y-8 pb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Welcome back, {user?.username ?? "Demo User"}
          </h1>
          <p className="text-muted-foreground mt-1">Ready for your daily speaking practice?</p>
        </div>
        <Button asChild size="lg" className="rounded-full px-8 shadow-md shrink-0">
          <Link href="/record">
            <Mic className="mr-2 h-5 w-5" />
            Start New Session
          </Link>
        </Button>
      </header>

      {/* Performance Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="overflow-hidden border-border/60 shadow-sm hover:shadow-md transition-shadow">
          <div className="h-1 bg-[hsl(var(--chart-1))] w-full" />
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Flame className="h-3.5 w-3.5 text-[hsl(var(--chart-1))]" /> Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? <Skeleton className="h-9 w-20" /> : (
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">{summary?.streak || 0}</span>
                <span className="text-sm text-muted-foreground">days</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-border/60 shadow-sm hover:shadow-md transition-shadow">
          <div className="h-1 bg-[hsl(var(--chart-2))] w-full" />
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-[hsl(var(--chart-2))]" /> Avg Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? <Skeleton className="h-9 w-20" /> : (
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">
                  {summary?.avgOverallScore ? Math.round(summary.avgOverallScore) : "-"}
                </span>
                <span className="text-sm text-muted-foreground">/ 100</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-border/60 shadow-sm hover:shadow-md transition-shadow">
          <div className="h-1 bg-[hsl(var(--chart-4))] w-full" />
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-[hsl(var(--chart-4))]" /> Improvement
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? <Skeleton className="h-9 w-20" /> : (
              <div className="flex items-baseline gap-2">
                <span className={`text-4xl font-bold ${summary?.improvementPercent && summary.improvementPercent > 0 ? "text-[hsl(var(--chart-2))]" : ""}`}>
                  {summary?.improvementPercent != null
                    ? `${summary.improvementPercent > 0 ? "+" : ""}${Math.round(summary.improvementPercent)}`
                    : "-"}
                </span>
                {summary?.improvementPercent != null && <span className="text-sm text-muted-foreground">%</span>}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-border/60 shadow-sm hover:shadow-md transition-shadow">
          <div className="h-1 bg-[hsl(var(--chart-3))] w-full" />
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-[hsl(var(--chart-3))]" /> Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? <Skeleton className="h-9 w-20" /> : (
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">{summary?.totalSessions ?? 0}</span>
                <span className="text-sm text-muted-foreground">recorded</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gamification: XP + Badges */}
      {isAuthenticated && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* XP / Level Card */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="w-4 h-4 text-[hsl(35_90%_55%)]" />
                Level Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-3xl font-bold">Level {stats.level}</div>
                  <div className="text-sm text-muted-foreground">{stats.levelName}</div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-[hsl(35_90%_55%)] font-bold text-lg">
                    <Zap size={16} />
                    {stats.xp.toLocaleString()} XP
                  </div>
                  {stats.xpToNextLevel > 0 && (
                    <div className="text-xs text-muted-foreground">{stats.xpToNextLevel} to Level {stats.level + 1}</div>
                  )}
                </div>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[hsl(35_90%_55%)] to-[hsl(196_90%_50%)] rounded-full transition-all duration-1000"
                  style={{
                    width: `${stats.xpToNextLevel > 0 ? Math.round(((stats.xp - stats.xpForCurrentLevel) / (stats.xp - stats.xpForCurrentLevel + stats.xpToNextLevel)) * 100) : 100}%`,
                  }}
                />
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Flame size={14} className="text-[hsl(var(--chart-1))]" />
                  {stats.currentStreak} day streak
                </span>
                <span className="flex items-center gap-1">
                  <Trophy size={14} className="text-[hsl(35_90%_55%)]" />
                  Best: {stats.longestStreak} days
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Badges Card */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-4 h-4 text-[hsl(var(--chart-3))]" />
                Badges Earned ({stats.badges.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.badges.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {stats.badges.slice(0, 8).map((badge) => (
                    <div
                      key={badge.id}
                      title={badge.description}
                      className="flex items-center gap-1.5 bg-secondary px-2.5 py-1.5 rounded-full text-xs font-medium hover:bg-muted transition-colors cursor-default"
                    >
                      <span>{badge.icon}</span>
                      <span>{badge.name}</span>
                    </div>
                  ))}
                  {stats.badges.length > 8 && (
                    <div className="bg-muted px-2.5 py-1.5 rounded-full text-xs text-muted-foreground">
                      +{stats.badges.length - 8} more
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  <Shield className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Complete sessions to earn badges!
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Leaderboard Preview */}
      {leaderboard?.entries && leaderboard.entries.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Crown className="w-5 h-5 text-[hsl(35_90%_55%)]" />
              Top Speakers
            </h2>
            <Button variant="ghost" asChild className="text-muted-foreground hover:text-foreground text-sm">
              <Link href="/leaderboard">
                Full leaderboard <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {leaderboard.entries.map((entry) => (
                  <div key={entry.userId} className="flex items-center gap-4 px-5 py-3">
                    <span className="w-6 text-center text-sm font-bold">
                      {entry.rank <= 3 ? ["🥇", "🥈", "🥉"][entry.rank - 1] : entry.rank}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold shrink-0">
                      {entry.username.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{entry.username}</p>
                      <p className="text-xs text-muted-foreground">Level {entry.level} · {entry.levelName}</p>
                    </div>
                    <div className="flex items-center gap-1 text-sm font-bold text-[hsl(35_90%_55%)]">
                      <Zap size={13} />
                      {entry.xp}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Sessions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">Recent Sessions</h2>
          <Button variant="ghost" asChild className="text-muted-foreground hover:text-foreground text-sm">
            <Link href="/sessions">
              View all <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {isLoadingSessions ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
          </div>
        ) : sessionsData?.sessions && sessionsData.sessions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {sessionsData.sessions.map((session) => (
              <Link key={session.id} href={`/sessions/${session.id}`}>
                <Card className="group hover:border-primary/50 hover:shadow-md transition-all cursor-pointer h-full border-border/60 shadow-sm">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <PlayCircle className="w-5 h-5" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        {session.xpEarned && (
                          <span className="text-xs font-semibold text-[hsl(35_90%_55%)] flex items-center gap-0.5">
                            <Zap size={10} />{session.xpEarned}
                          </span>
                        )}
                        {session.overallScore != null && (
                          <Badge variant={getScoreBadgeColor(session.overallScore) as any} className="font-bold text-sm">
                            {Math.round(session.overallScore)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardTitle className="text-base mt-1">
                      {format(new Date(session.createdAt), "MMM d, yyyy")}
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs flex items-center gap-1">
                      {session.durationSeconds ? `${Math.round(session.durationSeconds)}s` : "Unknown duration"}
                      <span>•</span>
                      <span className="capitalize">{session.status}</span>
                    </CardDescription>
                    {session.topicUsed && (
                      <p className="text-xs text-muted-foreground mt-1 truncate" title={session.topicUsed}>
                        📝 {session.topicUsed}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="border-border/60 shadow-sm">
            <CardContent className="py-16 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Mic className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No sessions yet</h3>
              <p className="text-muted-foreground mb-6 max-w-sm">
                Record your first speaking session to get personalized AI feedback and earn XP!
              </p>
              <Button asChild className="rounded-full px-8">
                <Link href="/record">
                  <Mic className="mr-2 h-4 w-4" />
                  Record First Session
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
