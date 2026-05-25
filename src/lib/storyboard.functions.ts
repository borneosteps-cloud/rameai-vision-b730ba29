import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway";

const ShotSchema = z.object({
  time: z.string(),
  script: z.string(),
  shotType: z.string(),
  cameraAngle: z.string(),
  cameraMovement: z.string(),
  visualDirection: z.string(),
  bRoll: z.string(),
  textOverlay: z.string(),
  expression: z.string(),
  transition: z.string(),
});

export type StoryboardShot = z.infer<typeof ShotSchema>;

const ResultSchema = z.object({ shots: z.array(ShotSchema) });

const STYLES = [
  "Cinematic",
  "Funny",
  "Fast-paced",
  "Luxury vlog",
  "Foodie",
  "Travel",
  "Minimalist",
] as const;

const InputSchema = z.object({
  title: z.string(),
  hook: z.string(),
  foreshadow: z.string(),
  body: z.string(),
  ending: z.string(),
  durationSec: z.number().int().min(10).max(120).default(30),
  style: z.enum(STYLES).default("Cinematic"),
  language: z.enum(["en", "id"]).default("id"),
});

const STYLE_GUIDE: Record<string, string> = {
  Cinematic: "Slow dramatic push-ins, anamorphic feel, moody color, smooth gimbal moves.",
  Funny: "Snap zooms, jump cuts, exaggerated reaction faces, meme-style text overlays.",
  "Fast-paced": "Rapid 1-2s cuts, whip pans, beat-synced transitions, high energy.",
  "Luxury vlog": "Polished slow-mo, golden hour, product close-ups, elegant typography.",
  Foodie: "Macro close-ups, sizzles, top-down shots, steam, ASMR cuts, hand-held warmth.",
  Travel: "Wide establishing shots, walking POV, time-lapses, street ambience, drone-like reveals.",
  Minimalist: "Static framing, single subject, clean negative space, subtle text only.",
};

function extractJson(text: string): unknown {
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON in response");
  return JSON.parse(
    cleaned.slice(start, end + 1).replace(/,\s*}/g, "}").replace(/,\s*]/g, "]")
  );
}

export const generateStoryboard = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { ok: false as const, error: "AI not configured." };

    const fullScript = `HOOK: ${data.hook}\nFORESHADOW: ${data.foreshadow}\nBODY: ${data.body}\nENDING: ${data.ending}`;
    const sceneCount = Math.max(4, Math.min(12, Math.round(data.durationSec / 3)));

    const langName = data.language === "en" ? "English" : "Bahasa Indonesia";
    const system = `You are a Reels/TikTok storyboard director. Convert a spoken script into a shot-by-shot storyboard optimized for retention on vertical short-form video.

# Style: ${data.style}
${STYLE_GUIDE[data.style]}

# OUTPUT LANGUAGE — STRICT
Write EVERY field (script, shotType, cameraAngle, cameraMovement, visualDirection, bRoll, textOverlay, expression, transition) entirely in ${langName}.
DO NOT mix languages. Keep universally accepted production terms (close-up, push-in, etc.) only if they're standard in ${langName} creator vocabulary; otherwise translate naturally.

# Rules
- Total runtime: ~${data.durationSec}s. Break into ~${sceneCount} shots, each 1.5–4s.
- First shot must be a strong visual hook (scroll-stopper) within the first 2s.
- Pace ramps with the script. Action/visual interest changes every shot.
- "script" field must quote the exact spoken line (or a short slice of it) playing during that shot, in ${langName}. Do NOT invent new dialogue.
- Suggest concrete, easy-to-film shots a solo creator can shoot on a phone.
- Camera angle: front cam / top-down / low angle / over-the-shoulder / wide / close-up etc.
- Camera movement: static / push-in / pull-out / pan / whip pan / handheld / gimbal walk / orbit.
- bRoll: 1 short concrete b-roll idea (or "—" if the talking shot stays on screen).
- textOverlay: short on-screen text caption for that shot in ${langName} (or "—").
- expression: facial expression / emotion the creator should perform.
- transition: how to cut into the NEXT shot (hard cut / match cut / whip / zoom / J-cut etc.). Last shot can use "end card".
- "time" format: "0–2s", "2–4s" etc., contiguous, ending at ~${data.durationSec}s.`;

    try {
      const gateway = createLovableAiGatewayProvider(apiKey);
      const model = gateway("google/gemini-3.1-flash-lite-preview");
      const { text } = await generateText({
        model,
        system,
        temperature: 0.7,
        maxOutputTokens: 6000,
        prompt: `Title: ${data.title}\n\nScript:\n${fullScript}\n\nReturn ONLY JSON in this exact shape:\n{"shots":[{"time":"","script":"","shotType":"","cameraAngle":"","cameraMovement":"","visualDirection":"","bRoll":"","textOverlay":"","expression":"","transition":""}]}`,
      });
      const parsed = ResultSchema.parse(extractJson(text));
      return { ok: true as const, shots: parsed.shots, style: data.style };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("generateStoryboard error:", msg);
      if (msg.includes("429")) return { ok: false as const, error: "Rate limit hit. Retry shortly." };
      if (msg.includes("402")) return { ok: false as const, error: "AI credits exhausted." };
      return { ok: false as const, error: `Storyboard failed: ${msg.slice(0, 200)}` };
    }
  });

export const STORYBOARD_STYLES = STYLES;
