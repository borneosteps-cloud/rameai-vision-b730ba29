import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const IdeaSchema = z.object({
  title: z.string(),
  hook: z.string(),
  foreshadow: z.string(),
  body: z.string(),
  ending: z.string(),
  caption: z.string(),
  hashtags: z.array(z.string()),
});

const ResultSchema = z.object({
  ideas: z.array(IdeaSchema),
});

const InputSchema = z.object({
  topic: z.string().min(1).max(2000),
  tone: z.enum(["Honest", "Sarcastic", "Confused", "Mindblown", "Frustrated", "Comedy", "Twist", "Informative"]),
  count: z.number().int().min(1).max(10),
  viralBoost: z.boolean(),
  durationSec: z.number().int().min(10).max(120).default(30),
  language: z.enum(["en", "id"]).default("id"),
});

function buildStructure(duration: number) {
  // Scale section timings proportionally to total duration.
  const hookEnd = Math.max(2, Math.round(duration * 0.1));
  const foreEnd = Math.max(hookEnd + 2, Math.round(duration * 0.2));
  const bodyEnd = Math.max(foreEnd + 3, Math.round(duration * 0.85));
  return { hookEnd, foreEnd, bodyEnd, total: duration };
}

const TONE_GUIDE: Record<string, string> = {
  Honest: "Brutally honest, observational, no sugarcoating.",
  Sarcastic: "Dry sarcasm, light eye-roll energy, witty.",
  Confused: "Genuinely puzzled, asking 'kenapa sih?' a lot.",
  Mindblown: "Wide-eyed disbelief, 'gila nggak sih ini?' energy.",
  Frustrated: "Mildly annoyed, calling out things that don't make sense.",
  Comedy: "Punchy, comedic timing, exaggeration for laughs.",
  Twist: "Set up an expectation then flip it with an unexpected reveal at the end.",
  Informative: "Educational, insightful, share specific facts/numbers/details while staying casual.",
};

function extractJson(text: string): unknown {
  const cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```/g, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("AI response did not contain JSON");
  }

  const jsonText = cleaned
    .slice(start, end + 1)
    .replace(/,\s*}/g, "}")
    .replace(/,\s*]/g, "]")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  return JSON.parse(jsonText);
}

function normalizeIdea(raw: unknown) {
  const idea = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const toText = (value: unknown) => (typeof value === "string" ? value.trim() : String(value ?? "").trim());

  return IdeaSchema.parse({
    title: toText(idea.title),
    hook: toText(idea.hook),
    foreshadow: toText(idea.foreshadow),
    body: toText(idea.body),
    ending: toText(idea.ending),
    caption: toText(idea.caption),
    hashtags: Array.isArray(idea.hashtags) ? idea.hashtags.map(toText).filter(Boolean).slice(0, 5) : [],
  });
}

export const generateIdeas = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "AI not configured. Add LOVABLE_API_KEY." };
    }

    // Load persona from DB
    const { data: personaRows } = await supabaseAdmin
      .from("persona")
      .select("*")
      .limit(1);
    const persona = personaRows?.[0];

    const personaBlock = persona
      ? `# Persona: ${persona.name}\n\n## Identity\n${persona.identity_md}\n\n## Style\n${persona.style_md}\n\n## Do\n${persona.do_md}\n\n## Don't\n${persona.dont_md}`
      : "Persona: Wandy POV — honest Indonesian travel creator in Sydney.";

    const system = `You are RameAL, the creative brain of the creator persona "Wandy POV".

${personaBlock}

# Thinking system (apply silently before writing)
1. Identify the default assumption people have about this topic.
2. Find the hidden tension or contradiction.
3. Amplify emotional relatability.
4. Turn it into a story with expectation vs reality.
5. Deliver a payoff that feels "too real, why nobody talks about this?"

${(() => {
  const s = buildStructure(data.durationSec);
  const wordTarget = Math.round(data.durationSec * 2.5); // ~150 wpm spoken
  const isEn = data.language === "en";
  const hookExamples = isEn
    ? `"Nobody talks about this in...", "You'd be shocked if...", "Stop saying ... before you know this".`
    : `"Orang nggak kasih tau di...", "Kamu pasti kaget kalo...", "Stop bilang ... sebelum lo tau ini".`;
  const bodyHint = isEn
    ? "observation or experience, expectation vs reality, cultural comparison (Australia ↔ Indonesia when relevant), micro-details: prices (in $ AUD or Rp), behaviors, systems, food, environment."
    : "observation atau pengalaman, expectation vs reality, perbandingan budaya (Australia ↔ Indonesia kalau relevan), micro-details: harga (dalam $ AUD atau Rp), behavior, sistem, makanan, environment.";
  const hashtagsHint = isEn
    ? "max 5, lowercase, English-friendly travel/lifestyle tags."
    : "max 5, lowercase, mix Bahasa Indonesia + travel relevant.";
  return `# Target script length
Total duration: ~${s.total} seconds (~${wordTarget} spoken words across HOOK + FORESHADOW + BODY + ENDING combined). Pace and density should match this length — for longer scripts add more concrete beats, examples, micro-stories, and comparisons. Do NOT pad with filler.

# Required structure for every idea
- HOOK (0–${s.hookEnd}s): strong pattern interrupt, curiosity or emotional trigger, reverse psychology preferred. Example openers: ${hookExamples}
- FORESHADOW (${s.hookEnd}–${s.foreEnd}s): hint at something surprising, create a curiosity gap.
- BODY (${s.foreEnd}–${s.bodyEnd}s): ${bodyHint}
- ENDING (${s.bodyEnd}–${s.total}s): memorable closing, slight sarcasm or truth bomb, optional subtle CTA.
- CAPTION: 1–2 punchy sentences in the same voice, can include 1 emoji max.
- HASHTAGS: ${hashtagsHint}`;
})()}

# Voice
${data.language === "en"
  ? "Natural conversational English, TikTok/Reels creator rhythm. Short, punchy, spoken rhythm. Avoid generic travel content, fake hype, corporate writing."
  : "Casual Bahasa Indonesia, natural creator tone, spoken rhythm. Short, punchy. Avoid generic travel content, fake hype, corporate writing."}

# Tone for this batch
${TONE_GUIDE[data.tone]}

${data.viralBoost ? "# Viral Boost ON\nIncrease curiosity gap, emotional tension, and slightly controversial edge. Stay safe for social media — no hate, no slurs, no targeted attacks." : ""}

# OUTPUT LANGUAGE — STRICT
Write EVERY field (title, hook, foreshadow, body, ending, caption, hashtags) entirely in ${data.language === "en" ? "English" : "Bahasa Indonesia"}.
DO NOT mix languages. Do not insert words from another language unless they are universally accepted loanwords (brand names, "TikTok", "Reels", currency symbols).
${data.language === "en" ? "If the topic is written in Indonesian, translate the meaning naturally into English." : "Kalau topic-nya in English, terjemahin maknanya ke Bahasa Indonesia natural — bukan word-for-word."}

Return ${data.count} distinct, non-repetitive ideas. Each TITLE must be a short internal label (4–7 words), not a hashtag.`;

    try {
      const gateway = createLovableAiGatewayProvider(apiKey);
      const model = gateway("google/gemini-3-flash-preview");

      const { text } = await generateText({
        model,
        system,
        temperature: 0.8,
        maxOutputTokens: 8192,
        prompt: `Topic: ${data.topic}\n\nGenerate ${data.count} ideas now in ${data.language === "en" ? "English" : "Bahasa Indonesia"}. Return ONLY valid JSON. No markdown. No explanation. Use this exact shape:\n{"ideas":[{"title":"","hook":"","foreshadow":"","body":"","ending":"","caption":"","hashtags":[""]}]}`,
      });

      const parsed = ResultSchema.partial().passthrough().parse(extractJson(text));
      const ideas = (parsed.ideas ?? []).slice(0, data.count).map(normalizeIdea);

      if (!ideas.length) {
        throw new Error("AI returned no ideas");
      }

      return { ok: true as const, ideas, topic: data.topic, tone: data.tone, viralBoost: data.viralBoost, durationSec: data.durationSec, language: data.language };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("generateIdeas error:", msg);
      if (msg.includes("429")) return { ok: false as const, error: "Rate limit hit. Please retry shortly." };
      if (msg.includes("402")) return { ok: false as const, error: "AI credits exhausted. Add credits in Workspace settings." };
      return { ok: false as const, error: `Generation failed: ${msg.slice(0, 200)}` };
    }
  });
