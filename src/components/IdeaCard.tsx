import { useState } from "react";
import { Copy, Check, Bookmark, Quote } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { StoryboardDialog } from "@/components/StoryboardDialog";

export type Idea = {
  id?: string;
  title: string;
  hook: string;
  foreshadow: string;
  body: string;
  ending: string;
  caption: string;
  hashtags: string[];
  topic?: string;
  tone?: string;
  viral_boost?: boolean;
};

function fullScript(i: Idea) {
  return `🎬 ${i.title}\n\nHOOK (0–3s)\n${i.hook}\n\nFORESHADOW (3–6s)\n${i.foreshadow}\n\nBODY (6–20s)\n${i.body}\n\nENDING (20–30s)\n${i.ending}\n\nCAPTION\n${i.caption}\n\n${i.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}`;
}

async function copy(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  } catch {
    toast.error("Copy failed");
  }
}

export function IdeaCard({
  idea,
  context,
  onSaved,
  durationSec,
  autoOpenStoryboard,
}: {
  idea: Idea;
  context?: { topic: string; tone: string; viralBoost: boolean; durationSec?: number; language?: "en" | "id" };
  onSaved?: (id: string) => void;
  durationSec?: number;
  autoOpenStoryboard?: boolean;
}) {
  const effectiveDuration = durationSec ?? context?.durationSec ?? 30;
  const effectiveLanguage = context?.language ?? (idea as Idea & { language?: "en" | "id" }).language ?? "id";
  const [savedId, setSavedId] = useState<string | undefined>(idea.id);
  const [savingHook, setSavingHook] = useState(false);

  async function saveIdea() {
    if (savedId) return;
    const { data, error } = await supabase
      .from("ideas")
      .insert({
        topic: context?.topic ?? idea.topic ?? "",
        tone: context?.tone ?? idea.tone ?? "Honest",
        viral_boost: context?.viralBoost ?? idea.viral_boost ?? false,
        title: idea.title,
        hook: idea.hook,
        foreshadow: idea.foreshadow,
        body: idea.body,
        ending: idea.ending,
        caption: idea.caption,
        hashtags: idea.hashtags,
        language: effectiveLanguage,
      })
      .select("id")
      .single();
    if (error || !data) return toast.error("Save failed");
    setSavedId(data.id);
    onSaved?.(data.id);
    toast.success("Saved to library");
  }

  async function saveHook() {
    setSavingHook(true);
    const { error } = await supabase
      .from("hooks")
      .insert({ text: idea.hook, category: "generated", source: "generated", language: effectiveLanguage });
    setSavingHook(false);
    if (error) return toast.error("Couldn't save hook");
    toast.success("Hook saved to library");
  }

  return (
    <article className="rounded-2xl border border-border/60 bg-card p-4 shadow-[var(--shadow-glow)]">
      <header className="mb-3 flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold leading-tight">{idea.title}</h3>
        <div className="flex shrink-0 gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={saveHook}
            disabled={savingHook}
            title="Save hook to library"
          >
            <Quote className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={saveIdea}
            disabled={!!savedId}
            title="Save idea"
          >
            {savedId ? <Check className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      <Section label="Hook · 0–3s" text={idea.hook} accent />
      <Section label="Foreshadow · 3–6s" text={idea.foreshadow} />
      <Section label="Body · 6–20s" text={idea.body} />
      <Section label="Ending · 20–30s" text={idea.ending} />

      <div className="mt-3 rounded-xl bg-muted/40 p-3">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Caption</div>
        <p className="mt-1 text-sm leading-relaxed">{idea.caption}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {idea.hashtags.map((h) => (
            <span
              key={h}
              className="rounded-full bg-background/60 px-2 py-0.5 text-[11px] text-primary-glow"
            >
              {h.startsWith("#") ? h : `#${h}`}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Button variant="secondary" size="sm" onClick={() => copy(fullScript(idea), "Script")}>
          <Copy className="mr-1.5 h-3.5 w-3.5" /> Script
        </Button>
        <Button variant="secondary" size="sm" onClick={() => copy(idea.caption, "Caption")}>
          <Copy className="mr-1.5 h-3.5 w-3.5" /> Caption
        </Button>
        <Button variant="secondary" size="sm" onClick={() => copy(idea.hook, "Hook")}>
          <Copy className="mr-1.5 h-3.5 w-3.5" /> Hook
        </Button>
      </div>

      <div className="mt-2">
        <StoryboardDialog
          idea={idea}
          durationSec={effectiveDuration}
          language={effectiveLanguage}
          autoOpen={autoOpenStoryboard}
        />
      </div>
    </article>
  );
}

function Section({ label, text, accent }: { label: string; text: string; accent?: boolean }) {
  return (
    <div className="mt-3 first:mt-0">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <p
        className={
          accent
            ? "mt-1 text-base font-medium leading-snug text-primary-glow"
            : "mt-1 text-sm leading-relaxed"
        }
      >
        {text}
      </p>
    </div>
  );
}
