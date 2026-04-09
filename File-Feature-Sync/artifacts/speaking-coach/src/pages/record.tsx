import { useState, useRef, useEffect } from "react";
import { useUploadAudio, useAnalyzeSession, useGetDailyTopic } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth";
import {
  Mic, Square, UploadCloud, Loader2, AlertCircle, Volume2, Info,
  Lightbulb, RefreshCw, Zap, Star, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const GOAL_OPTIONS = [
  { value: "general", label: "General Practice" },
  { value: "interview", label: "Interview Prep" },
  { value: "public_speaking", label: "Public Speaking" },
  { value: "casual", label: "Casual Chat" },
  { value: "storytelling", label: "Storytelling" },
];

export function RecordSession() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { currentUserId } = useAuth();

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "analyzing" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedGoal, setSelectedGoal] = useState("general");
  const [showTopicTips, setShowTopicTips] = useState(false);
  const [useTopic, setUseTopic] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  const uploadAudioMutation = useUploadAudio();
  const analyzeSessionMutation = useAnalyzeSession();

  const { data: topicData, isLoading: isLoadingTopic, refetch: refetchTopic } = useGetDailyTopic(
    { goal: selectedGoal as any },
    { query: { staleTime: 60_000 } }
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== "closed") audioContextRef.current.close();
    };
  }, []);

  const drawWaveform = () => {
    if (!analyzerRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
    analyzerRef.current.getByteTimeDomainData(dataArray);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "hsl(196 90% 50%)";
    ctx.shadowColor = "hsl(196 90% 50%)";
    ctx.shadowBlur = 4;
    ctx.beginPath();
    const sliceWidth = (width * 1.0) / dataArray.length;
    let x = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const y = ((dataArray[i] / 128.0) * height) / 2;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      x += sliceWidth;
    }
    ctx.stroke();
    animationRef.current = requestAnimationFrame(drawWaveform);
  };

  const startRecording = async () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setErrorMessage("");
    setRecordingTime(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new AudioContext();
      analyzerRef.current = audioContextRef.current.createAnalyser();
      audioContextRef.current.createMediaStreamSource(stream).connect(analyzerRef.current);
      analyzerRef.current.fftSize = 2048;
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        canvasRef.current.width = rect.width * devicePixelRatio;
        canvasRef.current.height = rect.height * devicePixelRatio;
        canvasRef.current.getContext("2d")?.scale(devicePixelRatio, devicePixelRatio);
      }
      drawWaveform();
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        canvasRef.current?.getContext("2d")?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      };
      mediaRecorder.start();
      setIsRecording(true);
      timerRef.current = setInterval(() => setRecordingTime((p) => p + 1), 1000);
    } catch {
      setErrorMessage("Could not access microphone. Please check permissions and try again.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const submitRecording = async () => {
    if (!audioBlob) return;
    setUploadStatus("uploading");
    setErrorMessage("");
    try {
      const file = new File([audioBlob], `recording-${Date.now()}.webm`, { type: "audio/webm" });
      const uploadBody: Record<string, unknown> = { audio: file, userId: currentUserId };
      if (useTopic && topicData?.topic) uploadBody.topic = topicData.topic;

      const uploadResult = await uploadAudioMutation.mutateAsync({ data: uploadBody as any });
      setUploadStatus("analyzing");
      const analysis = await analyzeSessionMutation.mutateAsync({ sessionId: uploadResult.sessionId });

      setUploadStatus("success");

      if ((analysis as any).xpEarned) {
        toast({
          title: `+${(analysis as any).xpEarned} XP earned! 🎉`,
          description: `Session analyzed. Score: ${Math.round((analysis as any).scores?.overallScore ?? 0)}/100`,
        });
      } else {
        toast({ title: "Session analyzed!", description: "Your feedback is ready." });
      }

      if ((analysis as any).newBadges?.length > 0) {
        setTimeout(() => {
          toast({
            title: `🏆 Badge Unlocked: ${(analysis as any).newBadges[0].icon} ${(analysis as any).newBadges[0].name}`,
            description: (analysis as any).newBadges[0].description,
          });
        }, 1500);
      }

      setLocation(`/sessions/${uploadResult.sessionId}`);
    } catch (err: unknown) {
      setUploadStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Failed to process your recording.");
    }
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const isProcessing = uploadStatus === "uploading" || uploadStatus === "analyzing";

  return (
    <div className="max-w-2xl mx-auto py-6 animate-in fade-in duration-500 space-y-5">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Record Session</h1>
        <p className="text-muted-foreground mt-2">
          Speak naturally for at least 30 seconds for the best AI feedback.
        </p>
      </div>

      {/* Topic Generator */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-[hsl(35_90%_55%)]" />
              Daily Topic Generator
            </span>
            <div className="flex items-center gap-2">
              <Select value={selectedGoal} onValueChange={setSelectedGoal}>
                <SelectTrigger className="h-7 w-36 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_OPTIONS.map((g) => (
                    <SelectItem key={g.value} value={g.value} className="text-xs">{g.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => refetchTopic()}
                disabled={isLoadingTopic}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoadingTopic ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {isLoadingTopic ? (
            <div className="h-16 flex items-center justify-center text-muted-foreground text-sm">
              Generating topic...
            </div>
          ) : topicData ? (
            <>
              <div className="bg-muted/40 rounded-lg p-3 border border-border/40">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{topicData.topic}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{topicData.description}</p>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {topicData.suggestedDuration}s
                  </Badge>
                </div>
              </div>

              <button
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                onClick={() => setShowTopicTips(!showTopicTips)}
              >
                {showTopicTips ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                Speaking tips
              </button>

              {showTopicTips && (
                <ul className="space-y-1.5 pl-3">
                  {topicData.tips.map((tip, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              )}

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useTopic}
                  onChange={(e) => setUseTopic(e.target.checked)}
                  className="rounded border-border"
                />
                <span className="text-xs text-muted-foreground">Record on this topic</span>
              </label>
            </>
          ) : null}
        </CardContent>
      </Card>

      {/* Recording Card */}
      <Card className="border-border/60 shadow-lg overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-primary via-[hsl(var(--chart-3))] to-[hsl(var(--chart-2))]" />
        <CardContent className="pt-10 pb-8 flex flex-col items-center gap-8">
          <div className="w-full h-28 relative flex items-center justify-center bg-muted/40 rounded-xl border border-border/50 overflow-hidden">
            {isRecording ? (
              <canvas ref={canvasRef} className="w-full h-full" style={{ width: "100%", height: "100%" }} />
            ) : audioUrl ? (
              <div className="w-full px-6 flex flex-col items-center justify-center gap-2">
                <Volume2 className="w-6 h-6 text-primary opacity-60" />
                <audio src={audioUrl} controls className="w-full max-w-xs" />
              </div>
            ) : (
              <div className="flex flex-col items-center text-muted-foreground opacity-50">
                <Mic className="w-8 h-8 mb-2" />
                <span className="text-sm font-medium">Ready to record</span>
              </div>
            )}
          </div>

          <div className="text-5xl font-mono tracking-widest font-bold tabular-nums">
            <span className={isRecording ? "text-destructive" : "text-foreground"}>
              {formatTime(recordingTime)}
            </span>
          </div>

          {isRecording && recordingTime < 30 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/60 px-3 py-2 rounded-full">
              <Info className="w-3.5 h-3.5" />
              Speak for at least 30 seconds for better analysis
            </div>
          )}

          {errorMessage && (
            <Alert variant="destructive" className="w-full">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-4 items-center">
            {!isRecording && !audioBlob && (
              <Button size="lg" onClick={startRecording} className="rounded-full w-28 h-28 flex flex-col gap-1.5 shadow-xl text-base font-bold">
                <Mic size={28} />
                <span>Start</span>
              </Button>
            )}
            {isRecording && (
              <Button size="lg" variant="destructive" onClick={stopRecording} className="rounded-full w-28 h-28 flex flex-col gap-1.5 shadow-xl text-base font-bold animate-pulse">
                <Square size={28} fill="currentColor" />
                <span>Stop</span>
              </Button>
            )}
            {!isRecording && audioBlob && (
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => { setAudioBlob(null); setAudioUrl(null); setRecordingTime(0); setUploadStatus("idle"); }} disabled={isProcessing} className="rounded-full px-6 h-12">
                  Discard
                </Button>
                <Button onClick={submitRecording} disabled={isProcessing} className="rounded-full px-8 h-12 shadow-md">
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {uploadStatus === "uploading" ? "Uploading..." : "Analyzing..."}
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4 mr-2" />
                      Get AI Feedback
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="bg-muted/20 border-t border-border px-6 py-3 text-xs text-center justify-center text-muted-foreground">
          Your audio is processed securely. Registered users earn XP for each session.
        </CardFooter>
      </Card>
    </div>
  );
}
