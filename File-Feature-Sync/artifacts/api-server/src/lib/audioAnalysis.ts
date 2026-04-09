import OpenAI from "openai";
import { logger } from "./logger";

let _openai: OpenAI | null = null;

function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

export interface SpeechScores {
  fluencyScore: number;
  pauseScore: number;
  vocabularyScore: number;
  confidenceScore: number;
  overallScore: number;
  wordsPerMinute: number;
  uniqueWordRatio: number;
  fillerWordCount: number;
  fillerWords: string[];
  totalWords: number;
  durationSeconds: number;
}

export interface AnalysisResult {
  transcript: string;
  scores: SpeechScores;
  feedback: string;
  strengths: string[];
  improvements: string[];
}

const FILLER_WORDS = [
  "um", "uh", "like", "you know", "basically", "literally",
  "actually", "so", "right", "okay", "well", "kind of", "sort of",
  "i mean", "you see", "you know what i mean", "just", "totally",
];

export async function transcribeAudio(audioPath: string): Promise<string> {
  const openai = getOpenAI();
  if (!openai) throw new Error("No OpenAI API key configured");

  const fs = await import("fs");
  const audioStream = fs.createReadStream(audioPath);

  const transcription = await openai.audio.transcriptions.create({
    file: audioStream as Parameters<typeof openai.audio.transcriptions.create>[0]["file"],
    model: "whisper-1",
    response_format: "verbose_json",
    timestamp_granularities: ["segment"],
  });

  return transcription.text;
}

export function detectFillerWords(words: string[]): { count: number; found: string[] } {
  const lowerWords = words.map((w) => w.toLowerCase().replace(/[^a-z\s]/g, ""));
  const text = lowerWords.join(" ");
  const found: string[] = [];

  for (const filler of FILLER_WORDS) {
    const regex = new RegExp(`\\b${filler.replace(" ", "\\s+")}\\b`, "gi");
    const matches = text.match(regex);
    if (matches && matches.length > 0) {
      for (let i = 0; i < matches.length; i++) {
        found.push(filler);
      }
    }
  }

  return { count: found.length, found };
}

function scoreWPM(wpm: number): number {
  if (wpm >= 120 && wpm <= 160) return 100;
  if (wpm >= 90 && wpm < 120) return 70 + ((wpm - 90) / 30) * 30;
  if (wpm > 160 && wpm <= 200) return 100 - ((wpm - 160) / 40) * 30;
  if (wpm < 90) return Math.max(0, (wpm / 90) * 70);
  return Math.max(0, 100 - ((wpm - 200) / 50) * 50);
}

function scoreFillerWords(fillerCount: number, totalWords: number): number {
  const ratio = totalWords > 0 ? fillerCount / totalWords : 0;
  if (ratio <= 0.01) return 100;
  if (ratio <= 0.03) return 85;
  if (ratio <= 0.05) return 70;
  if (ratio <= 0.08) return 55;
  if (ratio <= 0.12) return 35;
  return 15;
}

function scoreVocabulary(uniqueWordRatio: number): number {
  return Math.min(100, Math.round(uniqueWordRatio * 200));
}

function scoreConfidence(wpm: number, uniqueWordRatio: number, fillerRatio: number): number {
  const pacingFactor = wpm >= 100 && wpm <= 180 ? 1.0 : 0.7;
  const vocabularyFactor = Math.min(1.0, uniqueWordRatio * 2);
  const fillerPenalty = Math.max(0, 1.0 - fillerRatio * 5);
  return Math.round((pacingFactor * 0.4 + vocabularyFactor * 0.3 + fillerPenalty * 0.3) * 100);
}

export function buildFullScores(transcript: string, durationSeconds: number): SpeechScores {
  const words = transcript.trim().split(/\s+/).filter(Boolean);
  const totalWords = words.length;
  const wordsPerMinute = durationSeconds > 0 ? (totalWords / durationSeconds) * 60 : 0;

  const uniqueWords = new Set(words.map((w) => w.toLowerCase().replace(/[^a-z]/g, "")));
  const uniqueWordRatio = totalWords > 0 ? uniqueWords.size / totalWords : 0;

  const { count: fillerWordCount, found: fillerWords } = detectFillerWords(words);
  const fillerRatio = totalWords > 0 ? fillerWordCount / totalWords : 0;

  const fluencyScore = Math.round(scoreWPM(wordsPerMinute));
  const pauseScore = Math.round(scoreFillerWords(fillerWordCount, totalWords));
  const vocabularyScore = scoreVocabulary(uniqueWordRatio);
  const confidenceScore = scoreConfidence(wordsPerMinute, uniqueWordRatio, fillerRatio);
  const overallScore = Math.round((fluencyScore + pauseScore + vocabularyScore + confidenceScore) / 4);

  return {
    fluencyScore,
    pauseScore,
    vocabularyScore,
    confidenceScore,
    overallScore,
    wordsPerMinute: Math.round(wordsPerMinute * 10) / 10,
    uniqueWordRatio: Math.round(uniqueWordRatio * 1000) / 1000,
    fillerWordCount,
    fillerWords: [...new Set(fillerWords)],
    totalWords,
    durationSeconds,
  };
}

export async function generateFeedback(
  transcript: string,
  scores: SpeechScores,
): Promise<{ feedback: string; strengths: string[]; improvements: string[] }> {
  const openai = getOpenAI();
  if (!openai) {
    return generateFallbackFeedback(scores);
  }

  const prompt = `You are an expert public speaking coach. Analyze this speech and provide structured, actionable feedback.

Transcript:
"${transcript.slice(0, 2000)}"

Speech Metrics:
- Fluency (pacing/WPM): ${scores.fluencyScore}/100 (${scores.wordsPerMinute.toFixed(0)} WPM — ideal range: 120-160)
- Filler word control: ${scores.pauseScore}/100 (${scores.fillerWordCount} filler words detected: ${scores.fillerWords.slice(0, 5).join(", ") || "none"})
- Vocabulary richness: ${scores.vocabularyScore}/100 (${(scores.uniqueWordRatio * 100).toFixed(0)}% unique words)
- Confidence score: ${scores.confidenceScore}/100 (heuristic based on pacing, vocabulary, and fillers)
- Overall score: ${scores.overallScore}/100
- Duration: ${scores.durationSeconds.toFixed(0)}s, ${scores.totalWords} words

Respond ONLY with valid JSON in this exact structure:
{
  "feedback": "2-3 sentence overall assessment highlighting what stood out most",
  "strengths": ["specific strength 1", "specific strength 2"],
  "improvements": ["actionable improvement 1", "actionable improvement 2"]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 600,
    });

    const content = response.choices[0].message.content ?? "{}";
    const parsed = JSON.parse(content);
    return {
      feedback: parsed.feedback ?? "Great speaking session! Keep practicing to improve.",
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 3) : [],
      improvements: Array.isArray(parsed.improvements) ? parsed.improvements.slice(0, 3) : [],
    };
  } catch (err) {
    logger.error({ err }, "Failed to generate AI feedback");
    return generateFallbackFeedback(scores);
  }
}

function generateFallbackFeedback(scores: SpeechScores): {
  feedback: string;
  strengths: string[];
  improvements: string[];
} {
  const strengths: string[] = [];
  const improvements: string[] = [];

  if (scores.fluencyScore >= 80) {
    strengths.push("Your speaking pace is well-controlled and easy to follow");
  } else if (scores.wordsPerMinute < 100) {
    improvements.push("Try speaking a bit faster — aim for 120-160 words per minute for optimal engagement");
  } else {
    improvements.push("Slow down slightly — rapid speech can reduce clarity for your audience");
  }

  if (scores.pauseScore >= 80) {
    strengths.push("Excellent filler word control — your speech sounds polished and confident");
  } else {
    improvements.push(
      `Reduce filler words (${scores.fillerWords.slice(0, 3).join(", ")}). Practice pausing silently instead`,
    );
  }

  if (scores.vocabularyScore >= 70) {
    strengths.push("Your vocabulary is varied and expressive");
  } else {
    improvements.push("Expand your vocabulary — try using more varied words and avoid repetition");
  }

  if (scores.confidenceScore >= 75) {
    strengths.push("You sound confident and in command of your material");
  }

  const feedback = `Your speech scored ${scores.overallScore}/100 overall. ${
    scores.overallScore >= 80
      ? "This is excellent — you are speaking with clarity and confidence."
      : scores.overallScore >= 60
        ? "Good effort! Focus on the improvement areas below to reach the next level."
        : "Keep practicing — consistency is the key to improving your speaking skills."
  }`;

  return { feedback, strengths, improvements };
}

export async function analyzeAudioFile(audioPath: string): Promise<AnalysisResult> {
  const fs = await import("fs");
  const stat = fs.statSync(audioPath);
  const fileSizeBytes = stat.size;
  const estimatedDurationSeconds = Math.max(10, fileSizeBytes / 16000);

  let transcript: string;
  if (!process.env.OPENAI_API_KEY) {
    transcript =
      "This is a sample transcript generated for demonstration purposes. The audio file was uploaded successfully but the OpenAI API key is not configured for actual speech recognition. You can add your OpenAI API key in the environment secrets to enable real transcription and AI feedback.";
  } else {
    transcript = await transcribeAudio(audioPath);
  }

  const scores = buildFullScores(transcript, estimatedDurationSeconds);
  const { feedback, strengths, improvements } = await generateFeedback(transcript, scores);

  return { transcript, scores, feedback, strengths, improvements };
}
