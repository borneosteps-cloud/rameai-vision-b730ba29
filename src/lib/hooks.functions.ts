import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway";

const MODES = ["rewrite", "viral", "shorten", "translate", "generate"] as const;

const InputSchema = z.object({
  mode: z.enum(MODES),
  hook: z.string().max(500).optional(),
  niche: z.string().max(200).optional(),
  language: z.string().max(40).optional(),
  appLanguage: z.enum(["en", "id"]).default("id"),
  count: z.number().int().min(1).max(10).default(5),
});

const MODE_PROMPT: Record<(typeof MODES)[number], (d: z.infer<typeof InputSchema>) => string> = {
  rewrite: (d) =>
    `Rewrite this hook in ${d.count} fresh variations. Keep the meaning, change the wording. Hook: "${d.hook}"`,
  viral: (d) =>
    `Make this hook more viral: stronger curiosity gap, sharper pattern interrupt, scroll-stopping. Give ${d.count} variations. Hook: "${d.hook}"`,
  shorten: (d) =>
    `Shorten this hook to under 8 words while keeping its punch. Give ${d.count} variations. Hook: "${d.hook}"`,
  translate: (d) =>
    `Translate this hook to ${d.language || (d.appLanguage === "en" ? "English" : "Bahasa Indonesia")} while keeping it punchy and natural for spoken short-form video. Give ${d.count} variations. Hook: "${d.hook}"`,
  generate: (d) =>
    `Generate ${d.count} brand-new viral short-form hooks for this niche: "${d.niche || "general lifestyle"}". Mix categories (POV, Curiosity, Shock, Storytelling, Comedy, Relatable). Each hook must be a single line, scroll-stopping, under 14 words.`,
};

function systemFor(appLanguage: "en" | "id", mode: (typeof MODES)[number]): string {
  const langName = appLanguage === "en" ? "English" : "Bahasa Indonesia";
  // Translate mode picks the user-supplied target language inside MODE_PROMPT itself.
  const langRule =
    mode === "translate"
      ? `Output language is whatever the user requested in the prompt.`
      : `Write EVERY hook entirely in ${langName}. Do NOT mix languages — no English words inside Indonesian hooks (and vice versa) unless they are universally accepted brand names like "TikTok" or "Reels".`;
  return `You are a short-form viral hook writer for TikTok and Reels.
Write hooks the way top creators do: punchy, scroll-stopping, in spoken rhythm, no hashtags, no quotes, no numbering.
${langRule}
Return ONLY valid JSON in this exact shape:
{"hooks":["hook 1","hook 2"]}`;
}

function extractJson(text: string): unknown {
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON in AI response");
  return JSON.parse(cleaned.slice(start, end + 1));
}

export const enhanceHooks = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { ok: false as const, error: "AI not configured." };

    if (data.mode !== "generate" && !data.hook?.trim()) {
      return { ok: false as const, error: "Need a hook for this mode." };
    }

    try {
      const gateway = createLovableAiGatewayProvider(apiKey);
      const model = gateway("openai/gpt-4o");
      const { text } = await generateText({
        model,
        system: systemFor(data.appLanguage, data.mode),
        temperature: 0.9,
        maxOutputTokens: 1200,
        prompt: MODE_PROMPT[data.mode](data) + `\n\nReturn ONLY JSON. No markdown.`,
      });
      const parsed = z.object({ hooks: z.array(z.string()) }).parse(extractJson(text));
      const hooks = parsed.hooks
        .map((h) => h.replace(/^["'\s\-•\d.)]+|["'\s]+$/g, "").trim())
        .filter(Boolean)
        .slice(0, data.count);
      if (!hooks.length) throw new Error("AI returned no hooks");
      return { ok: true as const, hooks };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("enhanceHooks error:", msg);
      if (msg.includes("429")) return { ok: false as const, error: "Rate limit hit. Retry shortly." };
      if (msg.includes("402")) return { ok: false as const, error: "AI credits exhausted." };
      return { ok: false as const, error: `AI failed: ${msg.slice(0, 200)}` };
    }
  });
