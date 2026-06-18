import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createGeminiProvider, GEMINI_MODEL, mapAiError } from "./ai-gateway";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const ChatInput = z.object({
  messages: z.array(MessageSchema).min(1).max(40),
  language: z.enum(["en", "id"]).default("id"),
});

export const brainstormChat = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ChatInput.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return { ok: false as const, error: "AI not configured. Add GEMINI_API_KEY." };

    const { data: personaRows } = await supabaseAdmin.from("persona").select("*").limit(1);
    const persona = personaRows?.[0];
    const personaName = persona?.name ?? "Wandy POV";
    const personaBlock = persona
      ? `Identity:\n${persona.identity_md}\n\nStyle:\n${persona.style_md}\n\nDo:\n${persona.do_md}\n\nDon't:\n${persona.dont_md}`
      : "Honest Indonesian travel POV creator in Sydney.";

    const langName = data.language === "en" ? "English" : "Bahasa Indonesia";

    const system = `You are a creative brainstorm partner for ${personaName}, a short-form video creator (TikTok/Reels). Your job is to help them find the STORY inside whatever they're experiencing or thinking about.

# Persona context
${personaBlock}

# How you respond
When they describe a place, experience, observation, or idea:
1. Identify 3-5 surprising angles or hidden tensions in what they shared.
2. Ask ONE focused follow-up question to go deeper if needed.
3. Point out what makes this relatable, surprising, or emotionally sticky.
4. Be conversational, enthusiastic, and specific — not generic.

# Format
- Keep responses under 150 words.
- Be punchy. Short sentences. Use light bullet lists when useful.
- Think like a viral content strategist who deeply understands human emotion and storytelling.

# Language
Always respond in ${langName}. If the user switches language, follow them, but default to ${langName}.`;

    try {
      const gemini = createGeminiProvider(apiKey);
      const { text } = await generateText({
        model: gemini(GEMINI_MODEL),
        system,
        temperature: 0.9,
        maxOutputTokens: 600,
        messages: data.messages.map((m) => ({ role: m.role, content: m.content })),
      });
      return { ok: true as const, reply: text.trim() };
    } catch (err) {
      console.error("brainstormChat error:", err);
      return { ok: false as const, error: mapAiError(err) };
    }
  });

const TopicSchema = z.object({
  title: z.string(),
  tone: z.enum(["Honest", "Comedy", "Twist", "Shock", "Informative"]),
  hook: z.string(),
});
const TopicsResult = z.object({ topics: z.array(TopicSchema) });

function extractJson(text: string): unknown {
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON in response");
  return JSON.parse(cleaned.slice(start, end + 1).replace(/,\s*}/g, "}").replace(/,\s*]/g, "]"));
}

export const extractBrainstormTopics = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ChatInput.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return { ok: false as const, error: "AI not configured. Add GEMINI_API_KEY." };

    const langName = data.language === "en" ? "English" : "Bahasa Indonesia";
    const transcript = data.messages
      .map((m) => `${m.role === "user" ? "Creator" : "AI"}: ${m.content}`)
      .join("\n\n");

    const system = `You extract copy-ready short-form video topic suggestions from a brainstorm conversation. Output ${langName} for title and hook. Return ONLY valid JSON, no markdown, no explanation.`;
    const prompt = `Conversation:\n${transcript}\n\nReturn exactly 3 video topic suggestions in this exact JSON shape:\n{"topics":[{"title":"short punchy topic (max 10 words)","tone":"Honest|Comedy|Twist|Shock|Informative","hook":"one-line hook angle"}]}`;

    try {
      const gemini = createGeminiProvider(apiKey);
      const { text } = await generateText({
        model: gemini(GEMINI_MODEL),
        system,
        temperature: 0.7,
        maxOutputTokens: 800,
        prompt,
      });
      const parsed = TopicsResult.parse(extractJson(text));
      return { ok: true as const, topics: parsed.topics.slice(0, 3) };
    } catch (err) {
      console.error("extractBrainstormTopics error:", err);
      return { ok: false as const, error: mapAiError(err) };
    }
  });
