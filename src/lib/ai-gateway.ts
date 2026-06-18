import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export const GEMINI_MODEL = "gemini-1.5-flash";

export const createGeminiProvider = (apiKey: string) =>
  createOpenAICompatible({
    name: "gemini",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    apiKey,
  });

export function mapAiError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("429")) return "Rate limit hit. Wait a moment and retry.";
  if (msg.includes("401")) return "Invalid Gemini API key.";
  return msg;
}
