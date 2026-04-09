import { useListSessions } from "@workspace/api-client-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { PlayCircle, Mic, ChevronRight, Clock, BarChart2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const PAGE_SIZE = 8;

function getScoreColor(score?: number | null): string {
  if (!score) return "text-muted-foreground";
  if (score >= 80) return "text-[hsl(var(--chart-2))]";
  if (score >= 60) return "text-[hsl(var(--chart-4))]";
  return "text-destructive";
}

function getStatusBadge(status: string) {
  switch (status) {
    case "analyzed":
      return <Badge variant="default" className="text-xs capitalize">Analyzed</Badge>;
    case "analyzing":
      return <Badge variant="secondary" className="text-xs capitalize">Analyzing...</Badge>;
    default:
      return <Badge variant="outline" className="text-xs capitalize">{status}</Badge>;
  }
}

export function Sessions() {
  const [offset, setOffset] = useState(0);
  const { data, isLoading } = useListSessions({
    userId: "demo-user",
    limit: PAGE_SIZE,
    offset,
  });

  const sessions = data?.sessions ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Session History</h1>
          <p className="text-muted-foreground mt-1">
            {total > 0 ? `${total} session${total !== 1 ? "s" : ""} recorded` : "No sessions yet"}
          </p>
        </div>
        <Button asChild className="rounded-full px-6">
          <Link href="/record">
            <Mic className="mr-2 h-4 w-4" />
            New Session
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : sessions.length > 0 ? (
        <div className="space-y-3">
          {sessions.map((session) => (
            <Link key={session.id} href={`/sessions/${session.id}`}>
              <Card className="group cursor-pointer hover:border-primary/50 hover:shadow-md transition-all border-border/60 shadow-sm">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center text-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                    <PlayCircle className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold text-sm">
                        {format(new Date(session.createdAt), "MMM d, yyyy · h:mm a")}
                      </p>
                      {getStatusBadge(session.status)}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {session.durationSeconds && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {Math.round(session.durationSeconds)}s
                        </span>
                      )}
                      {session.wordsPerMinute && (
                        <span className="flex items-center gap-1">
                          <BarChart2 className="w-3 h-3" />
                          {Math.round(session.wordsPerMinute)} WPM
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {session.overallScore != null && (
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${getScoreColor(session.overallScore)}`}>
                          {Math.round(session.overallScore)}
                        </div>
                        <div className="text-xs text-muted-foreground">/ 100</div>
                      </div>
                    )}
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="border-border/60 shadow-sm">
          <CardContent className="py-20 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Mic className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No sessions recorded yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Start recording to get AI-powered feedback on your speaking skills.
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            disabled={currentPage <= 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground px-2">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOffset(offset + PAGE_SIZE)}
            disabled={currentPage >= totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
