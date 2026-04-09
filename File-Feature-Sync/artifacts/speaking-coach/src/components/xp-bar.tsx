import { useGetUserStats } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/auth";
import { Zap, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface XpBarProps {
  className?: string;
  compact?: boolean;
}

export function XpBar({ className, compact = false }: XpBarProps) {
  const { currentUserId, isAuthenticated } = useAuth();

  const { data: stats } = useGetUserStats(currentUserId, {
    query: { enabled: isAuthenticated },
  });

  if (!isAuthenticated || !stats) return null;

  const xpInLevel = stats.xp - stats.xpForCurrentLevel;
  const xpNeeded = stats.xpToNextLevel;
  const levelTotal = xpNeeded + xpInLevel;
  const percentage = levelTotal > 0 ? Math.min(100, (xpInLevel / levelTotal) * 100) : 100;

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="flex items-center gap-1 text-sidebar-primary">
          <Star size={12} />
          <span className="text-xs font-bold">Lvl {stats.level}</span>
        </div>
        <div className="flex-1 h-1.5 bg-sidebar-border rounded-full overflow-hidden">
          <div
            className="h-full bg-sidebar-primary rounded-full transition-all duration-1000"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-xs text-sidebar-foreground/50">{stats.xp} XP</span>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-full bg-sidebar-primary flex items-center justify-center">
            <Star size={12} className="text-sidebar-primary-foreground" />
          </div>
          <div>
            <p className="text-xs font-bold text-sidebar-foreground">
              Level {stats.level} — {stats.levelName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-sidebar-primary">
          <Zap size={12} />
          <span className="text-xs font-semibold">{stats.xp} XP</span>
        </div>
      </div>
      <div className="h-2 bg-sidebar-border rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-sidebar-primary to-[hsl(155_60%_50%)] rounded-full transition-all duration-1000"
          style={{ width: `${percentage}%` }}
        />
      </div>
      {xpNeeded > 0 && (
        <p className="text-xs text-sidebar-foreground/50">
          {xpNeeded} XP to Level {stats.level + 1}
        </p>
      )}
    </div>
  );
}
