import { Router, type IRouter } from "express";
import OpenAI from "openai";

const router: IRouter = Router();

const FALLBACK_TOPICS: Record<string, Array<{ topic: string; description: string; tips: string[]; suggestedDuration: number }>> = {
  general: [
    { topic: "Your Biggest Achievement", description: "Talk about a goal you accomplished and what it took to get there.", tips: ["Start with the challenge", "Describe the process", "Share what you learned"], suggestedDuration: 120 },
    { topic: "A Skill You're Learning", description: "Discuss a skill you're currently working to develop and your progress.", tips: ["Be specific about the skill", "Share your learning method", "Mention milestones"], suggestedDuration: 90 },
    { topic: "Your Ideal Day", description: "Describe what your perfect day would look like from start to finish.", tips: ["Use vivid descriptions", "Include details", "Show your values through choices"], suggestedDuration: 90 },
    { topic: "A Book or Movie That Changed You", description: "Share about a piece of media that meaningfully shifted your perspective.", tips: ["Summarize briefly", "Focus on the impact", "Connect to your life"], suggestedDuration: 120 },
    { topic: "Technology and Society", description: "Discuss how a specific technology is changing the way we live.", tips: ["Pick one technology", "Give examples", "Share your opinion"], suggestedDuration: 120 },
  ],
  interview: [
    { topic: "Tell Me About Yourself", description: "Practice the classic opening interview question with a structured, compelling response.", tips: ["Past → Present → Future structure", "Keep it to 2 minutes", "Relate to the role"], suggestedDuration: 120 },
    { topic: "Your Greatest Weakness", description: "Turn a weakness into a story of growth and self-awareness.", tips: ["Be honest but strategic", "Show steps you've taken", "End on improvement"], suggestedDuration: 90 },
    { topic: "A Time You Led Under Pressure", description: "Use the STAR method to describe handling a high-pressure leadership situation.", tips: ["Situation → Task → Action → Result", "Be specific", "Quantify impact if possible"], suggestedDuration: 150 },
    { topic: "Why Do You Want This Role?", description: "Practice articulating your motivations clearly and compellingly.", tips: ["Research the company first", "Connect your skills to their needs", "Show genuine enthusiasm"], suggestedDuration: 90 },
    { topic: "Handling Conflict at Work", description: "Describe a workplace conflict and how you navigated it professionally.", tips: ["Stay neutral", "Focus on resolution", "Show emotional intelligence"], suggestedDuration: 120 },
  ],
  public_speaking: [
    { topic: "The Future of Work", description: "Present your vision for how workplaces will evolve over the next decade.", tips: ["Open with a bold statement", "Use 3 key points", "Close with a call to action"], suggestedDuration: 180 },
    { topic: "Why Failure Is Necessary", description: "Make a persuasive case for why failure is essential to growth.", tips: ["Use personal anecdotes", "Support with examples", "Inspire your audience"], suggestedDuration: 150 },
    { topic: "A Local Issue That Matters", description: "Speak about a problem in your community and propose a solution.", tips: ["Establish credibility", "Present evidence", "Be actionable"], suggestedDuration: 180 },
  ],
  casual: [
    { topic: "Your Favorite Hidden Gem", description: "Tell someone about a place, restaurant, or experience that not many people know about.", tips: ["Be enthusiastic", "Use sensory details", "Make them want to go"], suggestedDuration: 60 },
    { topic: "An Embarrassing Story", description: "Share a funny or embarrassing moment and what made it memorable.", tips: ["Build tension", "Use humor naturally", "Show self-awareness"], suggestedDuration: 90 },
    { topic: "If You Could Live Anywhere", description: "Describe your dream location to live and why.", tips: ["Paint a picture", "Explain why it suits you", "Be specific"], suggestedDuration: 60 },
  ],
  storytelling: [
    { topic: "The Day Everything Changed", description: "Tell a true story about a turning point in your life using vivid narrative.", tips: ["Set the scene", "Build suspense", "Reflect on the meaning"], suggestedDuration: 180 },
    { topic: "A Stranger Who Taught You Something", description: "Recount an encounter with someone unexpected who left a lasting impression.", tips: ["Describe them vividly", "Show the conversation", "Reveal the lesson naturally"], suggestedDuration: 150 },
    { topic: "The Trip That Went Wrong", description: "Tell an entertaining story about travel plans that went sideways.", tips: ["Exaggerate the drama slightly", "Show your reactions", "End with the silver lining"], suggestedDuration: 120 },
  ],
};

router.get("/topics/daily", async (req, res): Promise<void> => {
  const goal = String(req.query.goal ?? "general");
  const validGoals = ["general", "interview", "public_speaking", "casual", "storytelling"];
  const safeGoal = validGoals.includes(goal) ? goal : "general";

  const openai = process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

  if (openai) {
    try {
      const goalDescriptions: Record<string, string> = {
        general: "general self-improvement and everyday communication",
        interview: "job interviews and professional settings",
        public_speaking: "formal presentations and speeches",
        casual: "casual social conversations",
        storytelling: "narrative storytelling and personal anecdotes",
      };

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: `Generate a creative daily speaking topic for someone practicing ${goalDescriptions[safeGoal]}.

Respond ONLY with valid JSON:
{
  "topic": "Short catchy topic title (max 6 words)",
  "description": "One sentence explaining what to speak about",
  "tips": ["tip 1", "tip 2", "tip 3"],
  "suggestedDuration": 120
}`,
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 300,
      });

      const parsed = JSON.parse(response.choices[0].message.content ?? "{}");
      if (parsed.topic) {
        res.json({ ...parsed, goal: safeGoal });
        return;
      }
    } catch {
      // fall through to fallback
    }
  }

  const pool = FALLBACK_TOPICS[safeGoal] ?? FALLBACK_TOPICS.general;
  const dayOfYear = Math.floor(Date.now() / 86400000);
  const topic = pool[dayOfYear % pool.length];

  res.json({ ...topic, goal: safeGoal });
});

export default router;
