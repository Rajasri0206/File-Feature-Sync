import { useGetSession, useGenerateVoiceFeedback } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { format } from "date-fns";
import {
  ArrowLeft, CheckCircle2, XCircle, FileText, Zap, MessageSquare,
  Volume2, Loader2, Star, Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ScoreGauge } from "@/components/score-gauge";
import { Separator } from "@/components/ui/separator";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

export function SessionDetail() {
  const params = useParams<{ id: string }>();
  const sessionId = parseInt(params.id ?? "0", 10);
  const { toast } = useToast();

  const { data, isLoading, isError } = useGetSession(sessionId, {
    query: { enabled: !!sessionId },
  });

  const generateVoiceMutation = useGenerateVoiceFeedback();
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlayVoiceFeedback = async () => {
    if (!sessionId) return;

    if (audioRef.current && voiceAvailable) {
      audioRef.current.play();
      setIsPlayingVoice(true);
      return;
    }

    setIsPlayingVoice(true);
    try {
      const result = await generateVoiceMutation.mutateAsync({ sessionId });
      if (result.isFallback || !result.audioBase64) {
        toast({
          title: "Voice feedback unavailable",
          description: "Add an OpenAI API key to enable AI voice feedback.",
          variant: "destructive",
        });
        setIsPlayingVoice(false);
        return;
      }

      const audioBytes = Uint8Array.from(atob(result.audioBase64), (c) => c.charCodeAt(0));
      const blob = new Blob([audioBytes], { type: result.mimeType });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      setVoiceAvailable(true);
      audio.onended = () => setIsPlayingVoice(false);
      audio.onerror = () => { setIsPlayingVoice(false); toast({ title: "Playback failed", variant: "destructive" }); };
      audio.play();
    } catch {
      setIsPlayingVoice(false);
      toast({ title: "Voice feedback failed", description: "Please try again.", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto py-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="max-w-3xl mx-auto py-16 flex flex-col items-center text-center">
        <XCircle className="w-12 h-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Session not found</h2>
        <p className="text-muted-foreground mb-6">This session may have been deleted or never existed.</p>
        <Button asChild variant="outline">
          <Link href="/sessions"><ArrowLeft className="mr-2 h-4 w-4" />Back to History</Link>
        </Button>
      </div>
    );
  }

  const { session, scores, feedback, strengths = [], improvements = [] } = data;

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2 text-muted-foreground">
            <Link href="/sessions">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back to History
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">
            Session {format(new Date(session.createdAt), "MMM d, yyyy")}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {format(new Date(session.createdAt), "h:mm a")}
            {session.durationSeconds ? ` · ${Math.round(session.durationSeconds)}s duration` : ""}
            {session.topicUsed && ` · 📝 "${session.topicUsed}"`}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0 mt-1">
          <Badge variant={session.status === "analyzed" ? "default" : "secondary"} className="capitalize text-xs">
            {session.status}
          </Badge>
          {session.xpEarned && (
            <div className="flex items-center gap-1 text-[hsl(35_90%_55%)] text-sm font-bold">
              <Zap size={13} />+{session.xpEarned} XP
            </div>
          )}
        </div>
      </div>

      {/* Score Cards */}
      {scores ? (
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                Speech Scores
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePlayVoiceFeedback}
                disabled={isPlayingVoice || generateVoiceMutation.isPending}
                className="text-xs h-8 gap-1.5"
              >
                {isPlayingVoice || generateVoiceMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
                {isPlayingVoice ? "Playing..." : generateVoiceMutation.isPending ? "Generating..." : "Voice Feedback"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex justify-around flex-wrap gap-6 py-2">
              <ScoreGauge score={scores.overallScore} label="Overall" size="lg" colorClass="text-primary" />
              <ScoreGauge score={scores.fluencyScore} label="Fluency" size="md" colorClass="text-[hsl(var(--chart-1))]" />
              <ScoreGauge score={scores.pauseScore} label="Filler Words" size="md" colorClass="text-[hsl(var(--chart-2))]" />
              <ScoreGauge score={scores.vocabularyScore} label="Vocabulary" size="md" colorClass="text-[hsl(var(--chart-3))]" />
              <ScoreGauge score={scores.confidenceScore} label="Confidence" size="md" colorClass="text-[hsl(var(--chart-4))]" />
            </div>

            <Separator className="my-5" />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{Math.round(scores.wordsPerMinute ?? 0)}</p>
                <p className="text-xs text-muted-foreground">Words/min</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{scores.totalWords ?? 0}</p>
                <p className="text-xs text-muted-foreground">Total words</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{scores.fillerWordCount ?? 0}</p>
                <p className="text-xs text-muted-foreground">Filler words</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{Math.round((scores.uniqueWordRatio ?? 0) * 100)}%</p>
                <p className="text-xs text-muted-foreground">Unique words</p>
              </div>
            </div>

            {scores.fillerWords && scores.fillerWords.length > 0 && (
              <div className="mt-4 p-3 bg-muted/40 rounded-lg">
                <p className="text-xs font-medium text-muted-foreground mb-2">Detected filler words:</p>
                <div className="flex flex-wrap gap-1.5">
                  {scores.fillerWords.map((w, i) => (
                    <Badge key={i} variant="outline" className="text-xs font-mono">{w}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : session.status === "uploaded" || session.status === "analyzing" ? (
        <Card className="border-border/60">
          <CardContent className="py-10 text-center text-muted-foreground">
            {session.status === "analyzing" ? "Analyzing your session..." : "Session uploaded but not yet analyzed."}
          </CardContent>
        </Card>
      ) : null}

      {/* AI Feedback */}
      {(feedback || strengths.length > 0 || improvements.length > 0) && (
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              AI Feedback
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {feedback && (
              <p className="text-sm text-foreground leading-relaxed bg-muted/30 p-4 rounded-lg border border-border/40">
                {feedback}
              </p>
            )}
            <div className="grid sm:grid-cols-2 gap-4">
              {strengths.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-3 text-[hsl(var(--chart-2))] flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Strengths
                  </h4>
                  <ul className="space-y-2">
                    {strengths.map((s, i) => (
                      <li key={i} className="text-sm flex gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-[hsl(var(--chart-2))] shrink-0 mt-0.5" />
                        <span className="text-foreground/80">{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {improvements.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-3 text-[hsl(var(--chart-4))] flex items-center gap-1.5">
                    <XCircle className="w-4 h-4" />
                    To Improve
                  </h4>
                  <ul className="space-y-2">
                    {improvements.map((imp, i) => (
                      <li key={i} className="text-sm flex gap-2.5">
                        <XCircle className="w-4 h-4 text-[hsl(var(--chart-4))] shrink-0 mt-0.5" />
                        <span className="text-foreground/80">{imp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transcript */}
      {session.transcript && (
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Transcript
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-foreground/80 bg-muted/20 p-4 rounded-lg border border-border/30 whitespace-pre-wrap">
              {session.transcript}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
