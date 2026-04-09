import { useGetLeaderboard, useGetUserStats } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/auth";
import { Trophy, Zap, Flame, Crown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export function Leaderboard() {
  const { currentUserId, isAuthenticated } = useAuth();
  const { data, isLoading } = useGetLeaderboard({ limit: 20 });
  const { data: myStats } = useGetUserStats(currentUserId, {
    query: { enabled: isAuthenticated },
  });

  const rankColors = ["text-[hsl(35_90%_55%)]", "text-[hsl(220_15%_65%)]", "text-[hsl(25_85%_50%)]"];
  const rankBg = ["bg-[hsl(35_90%_55%)]/10", "bg-[hsl(220_15%_65%)]/10", "bg-[hsl(25_85%_50%)]/10"];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Trophy className="w-8 h-8 text-[hsl(35_90%_55%)]" />
          Leaderboard
        </h1>
        <p className="text-muted-foreground mt-1">Top speakers ranked by total XP earned</p>
      </div>

      {isAuthenticated && myStats && (
        <Card className="border-primary/30 bg-primary/5 shadow-sm">
          <CardContent className="py-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
              {currentUserId.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Your Ranking</p>
              <p className="text-xs text-muted-foreground capitalize">
                Level {myStats.level} {myStats.levelName} · {myStats.currentStreak} day streak
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-primary font-bold">
                <Zap size={14} />
                <span>{myStats.xp} XP</span>
              </div>
              <p className="text-xs text-muted-foreground">{myStats.xpToNextLevel} XP to next level</p>
            </div>
          </CardContent>
        </Card>
      )}

      {!isAuthenticated && (
        <Card className="border-border/60">
          <CardContent className="py-6 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <Trophy className="w-10 h-10 text-[hsl(35_90%_55%)] shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">Join the leaderboard!</p>
              <p className="text-sm text-muted-foreground">Create an account to earn XP and compete with other speakers.</p>
            </div>
            <Button asChild className="rounded-full shrink-0">
              <Link href="/login">Sign Up Free</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Global Rankings</CardTitle>
          <CardDescription>Updated in real-time based on total XP</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          ) : !data?.entries.length ? (
            <div className="py-16 text-center text-muted-foreground">
              <Crown className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No users on the leaderboard yet.</p>
              <p className="text-sm mt-1">Be the first to register and claim the #1 spot!</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {data.entries.map((entry) => {
                const isTop3 = entry.rank <= 3;
                const isMe = entry.userId === currentUserId;
                return (
                  <div
                    key={entry.userId}
                    className={cn(
                      "flex items-center gap-4 px-5 py-3.5 transition-colors",
                      isMe && "bg-primary/5",
                      !isMe && "hover:bg-muted/40",
                    )}
                  >
                    <div
                      className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0",
                        isTop3 ? rankBg[entry.rank - 1] : "bg-muted",
                      )}
                    >
                      <span className={isTop3 ? rankColors[entry.rank - 1] : "text-muted-foreground"}>
                        {entry.rank <= 3 ? ["🥇", "🥈", "🥉"][entry.rank - 1] : entry.rank}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn("font-semibold text-sm truncate", isMe && "text-primary")}>
                          {entry.username}
                          {isMe && <span className="text-xs text-primary/60 ml-1">(you)</span>}
                        </p>
                        {entry.currentStreak >= 7 && (
                          <span title={`${entry.currentStreak}-day streak`} className="text-xs">🔥</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Level {entry.level} · {entry.levelName}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 text-sm font-bold text-[hsl(var(--chart-4))]">
                      <Zap size={14} />
                      {entry.xp.toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
