import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, sessionsTable, feedbackTable } from "@workspace/db";
import OpenAI from "openai";

const router: IRouter = Router();

router.post("/feedback/:sessionId/audio", async (req, res): Promise<void> => {
  const sessionId = parseInt(req.params.sessionId, 10);
  if (isNaN(sessionId)) {
    res.status(400).json({ error: "Invalid session ID" });
    return;
  }

  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.id, sessionId));

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const [fb] = await db
    .select()
    .from(feedbackTable)
    .where(eq(feedbackTable.sessionId, sessionId));

  if (!fb) {
    res.status(404).json({ error: "Feedback not found. Analyze the session first." });
    return;
  }

  if (fb.audioFeedbackBase64) {
    res.json({
      sessionId,
      audioBase64: fb.audioFeedbackBase64,
      mimeType: "audio/mpeg",
      text: fb.feedback,
      isFallback: false,
    });
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    const fallbackText = fb.feedback;
    res.json({
      sessionId,
      audioBase64: "",
      mimeType: "audio/mpeg",
      text: fallbackText,
      isFallback: true,
    });
    return;
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const strengthsText =
      fb.strengths && fb.strengths.length > 0
        ? `Your strengths: ${fb.strengths.join(". ")}.`
        : "";
    const improvementsText =
      fb.improvements && fb.improvements.length > 0
        ? `Areas to improve: ${fb.improvements.join(". ")}.`
        : "";

    const fullText = `${fb.feedback} ${strengthsText} ${improvementsText}`.trim();
    const textToSpeak = fullText.length > 1000 ? fullText.slice(0, 997) + "..." : fullText;

    const mp3Response = await openai.audio.speech.create({
      model: "tts-1",
      voice: "nova",
      input: textToSpeak,
    });

    const arrayBuffer = await mp3Response.arrayBuffer();
    const audioBase64 = Buffer.from(arrayBuffer).toString("base64");

    await db
      .update(feedbackTable)
      .set({ audioFeedbackBase64: audioBase64 })
      .where(eq(feedbackTable.id, fb.id));

    res.json({
      sessionId,
      audioBase64,
      mimeType: "audio/mpeg",
      text: textToSpeak,
      isFallback: false,
    });
  } catch (err) {
    req.log.error({ err }, "TTS generation failed");
    res.json({
      sessionId,
      audioBase64: "",
      mimeType: "audio/mpeg",
      text: fb.feedback,
      isFallback: true,
    });
  }
});

export default router;
