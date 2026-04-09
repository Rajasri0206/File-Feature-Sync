import { useGetUserProgress, useGetUserProgressSummary } from "@workspace/api-client-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { format } from "date-fns";
import { TrendingUp, Award, CalendarDays, Mic2, Brain, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value?: number | null;
  icon: LucideIcon;
  isLoading?: boolean;
  suffix?: string;
  colorClass?: string;
  trend?: "up" | "down" | null;
}

function StatCard({ title, value, icon: Icon, isLoading, suffix, colorClass = "text-primary", trend }: StatCardProps) {
  return (
    <Card className="border-border/60 shadow-sm overflow-hidden">
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Icon className={`h-3.5 w-3.5 ${colorClass}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-9 w-24" />
        ) : value != null ? (
          <div className="flex items-baseline gap-1">
            <span
              className={`text-3xl font-bold ${
                trend === "up" ? "text-[hsl(var(--chart-2))]" : trend === "down" ? "text-destructive" : "text-foreground"
              }`}
            >
              {trend === "up" && "+"}
              {Math.round(value)}
            </span>
            {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
          </div>
        ) : (
          <span className="text-3xl font-bold text-muted-foreground">—</span>
        )}
      </CardContent>
    </Card>
  );
}

export function Progress() {
  const { data: progress, isLoading: isLoadingProgress } = useGetUserProgress("demo-user", { days: 30 });
  const { data: summary, isLoading: isLoadingSummary } = useGetUserProgressSummary("demo-user");

  const chartData =
    progress?.dataPoints.map((dp) => ({
      ...dp,
      date: format(new Date(dp.date), "MMM d"),
      overall: dp.overallScore != null ? Math.round(dp.overallScore) : null,
      fluency: dp.fluencyScore != null ? Math.round(dp.fluencyScore) : null,
      pacing: dp.pauseScore != null ? Math.round(dp.pauseScore) : null,
      vocabulary: dp.vocabularyScore != null ? Math.round(dp.vocabularyScore) : null,
      confidence: dp.confidenceScore != null ? Math.round(dp.confidenceScore) : null,
    })) ?? [];

  const commonLineProps = {
    type: "monotone" as const,
    strokeWidth: 2.5,
    dot: { r: 4 },
    activeDot: { r: 6 },
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Your Progress</h1>
        <p className="text-muted-foreground mt-1">
          Track your speaking improvements over the last 30 days.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Sessions"
          value={summary?.totalSessions}
          icon={Mic2}
          isLoading={isLoadingSummary}
          colorClass="text-[hsl(var(--chart-1))]"
        />
        <StatCard
          title="Days Tracked"
          value={progress?.daysTracked}
          icon={CalendarDays}
          isLoading={isLoadingProgress}
          colorClass="text-[hsl(var(--chart-3))]"
        />
        <StatCard
          title="Avg Overall Score"
          value={summary?.avgOverallScore}
          icon={Award}
          isLoading={isLoadingSummary}
          suffix="/100"
          colorClass="text-primary"
        />
        <StatCard
          title="Improvement"
          value={summary?.improvementPercent}
          icon={TrendingUp}
          isLoading={isLoadingSummary}
          suffix="%"
          trend={summary?.improvementPercent != null ? (summary.improvementPercent > 0 ? "up" : "down") : null}
          colorClass="text-[hsl(var(--chart-2))]"
        />
      </div>

      {/* Avg Score Breakdown */}
      {!isLoadingSummary && summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Avg Fluency", value: summary.avgFluencyScore, color: "text-[hsl(var(--chart-1))]" },
            { label: "Avg Filler Control", value: summary.avgPauseScore, color: "text-[hsl(var(--chart-2))]" },
            { label: "Avg Vocabulary", value: summary.avgVocabularyScore, color: "text-[hsl(var(--chart-3))]" },
            { label: "Avg Confidence", value: summary.avgConfidenceScore, color: "text-[hsl(var(--chart-4))]" },
          ].map((item) => (
            <Card key={item.label} className="border-border/60 shadow-sm">
              <CardContent className="pt-4 pb-4 text-center">
                <div className={`text-2xl font-bold ${item.color}`}>
                  {item.value != null ? Math.round(item.value) : "—"}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{item.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Chart */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Score Trends</CardTitle>
          <CardDescription>Your score history over the last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingProgress ? (
            <Skeleton className="h-72 w-full rounded-xl" />
          ) : chartData.length > 1 ? (
            <Tabs defaultValue="overall">
              <TabsList className="mb-4">
                <TabsTrigger value="overall">Overall</TabsTrigger>
                <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
              </TabsList>

              <TabsContent value="overall">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: 12,
                      }}
                    />
                    <Line
                      {...commonLineProps}
                      dataKey="overall"
                      name="Overall"
                      stroke="hsl(196 90% 45%)"
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </TabsContent>

              <TabsContent value="breakdown">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: 12,
                      }}
                    />
                    <Legend />
                    <Line {...commonLineProps} dataKey="fluency" name="Fluency" stroke="hsl(196 90% 45%)" connectNulls />
                    <Line {...commonLineProps} dataKey="pacing" name="Filler Control" stroke="hsl(155 60% 45%)" connectNulls />
                    <Line {...commonLineProps} dataKey="vocabulary" name="Vocabulary" stroke="hsl(271 80% 60%)" connectNulls />
                    <Line {...commonLineProps} dataKey="confidence" name="Confidence" stroke="hsl(35 90% 55%)" connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="h-72 flex items-center justify-center text-muted-foreground text-sm">
              {chartData.length <= 1
                ? "Record at least 2 sessions to see progress charts."
                : "No analyzed sessions in the last 30 days."}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
