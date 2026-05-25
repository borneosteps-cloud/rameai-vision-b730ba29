import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Clapperboard,
  Loader2,
  Copy,
  Camera,
  Move,
  Eye,
  Type,
  Smile,
  Scissors,
  Film,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  generateStoryboard,
  STORYBOARD_STYLES,
  type StoryboardShot,
} from "@/lib/storyboard.functions";
import type { Idea } from "./IdeaCard";

type Style = (typeof STORYBOARD_STYLES)[number];

export function StoryboardDialog({
  idea,
  durationSec = 30,
  language = "id",
  autoOpen = false,
}: {
  idea: Idea;
  durationSec?: number;
  language?: "en" | "id";
  autoOpen?: boolean;
}) {
  const fn = useServerFn(generateStoryboard);
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<Style>("Cinematic");
  const [loading, setLoading] = useState(false);
  const [shots, setShots] = useState<StoryboardShot[]>([]);
  const autoFiredRef = useRef(false);

  useEffect(() => {
    if (autoOpen && !autoFiredRef.current) {
      autoFiredRef.current = true;
      setOpen(true);
      // fire generation once dialog is opening
      setTimeout(() => { run(); }, 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen]);

  async function run() {
    setLoading(true);
    setShots([]);
    try {
      const res = await fn({
        data: {
          title: idea.title,
          hook: idea.hook,
          foreshadow: idea.foreshadow,
          body: idea.body,
          ending: idea.ending,
          durationSec,
          style,
          language,
        },
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setShots(res.shots);
    } catch (e) {
      console.error(e);
      toast.error("Storyboard failed");
    } finally {
      setLoading(false);
    }
  }

  function copyAll() {
    const text =
      `🎬 Storyboard — ${idea.title} (${style})\n\n` +
      shots
        .map(
          (s, i) =>
            `Shot ${i + 1} · ${s.time}\n` +
            `Line: ${s.script}\n` +
            `Shot: ${s.shotType} | Angle: ${s.cameraAngle} | Move: ${s.cameraMovement}\n` +
            `Visual: ${s.visualDirection}\n` +
            `B-roll: ${s.bRoll}\n` +
            `Overlay: ${s.textOverlay}\n` +
            `Expression: ${s.expression}\n` +
            `→ Transition: ${s.transition}`
        )
        .join("\n\n");
    navigator.clipboard.writeText(text).then(
      () => toast.success("Storyboard copied"),
      () => toast.error("Copy failed")
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          <Clapperboard className="mr-1.5 h-3.5 w-3.5" /> Storyboard
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] max-w-2xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border/60 px-4 py-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Film className="h-4 w-4 text-primary" />
            Storyboard
          </DialogTitle>
          <p className="text-xs text-muted-foreground line-clamp-1">{idea.title}</p>
        </DialogHeader>

        <div className="border-b border-border/60 px-4 py-3">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Style
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {STORYBOARD_STYLES.map((s) => (
              <button
                key={s}
                onClick={() => setStyle(s)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                  style === s
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/60 bg-background/40 text-muted-foreground hover:text-foreground"
                )}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              onClick={run}
              disabled={loading}
              className="h-9 flex-1 rounded-lg text-sm font-semibold"
              style={{ background: "var(--gradient-primary)", color: "var(--primary-foreground)" }}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Directing...
                </>
              ) : (
                <>
                  <Clapperboard className="mr-2 h-4 w-4" />
                  {shots.length ? "Regenerate" : "Generate"} ({durationSec}s)
                </>
              )}
            </Button>
            {shots.length > 0 && (
              <Button variant="secondary" size="sm" className="h-9" onClick={copyAll}>
                <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-3 p-4">
            {loading &&
              Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-32 animate-pulse rounded-xl border border-border/60 bg-card/50"
                />
              ))}

            {!loading && shots.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Pick a style and tap Generate to turn this script into a shot list.
              </div>
            )}

            {!loading &&
              shots.map((s, i) => (
                <article
                  key={i}
                  className="rounded-xl border border-border/60 bg-card p-3"
                >
                  <header className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary-glow">
                        Shot {i + 1}
                      </span>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {s.time}
                      </span>
                    </div>
                    <span className="rounded-full bg-muted/40 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {s.shotType}
                    </span>
                  </header>

                  <p className="mb-2 text-sm font-medium leading-snug text-primary-glow">
                    "{s.script}"
                  </p>

                  <div className="grid grid-cols-1 gap-1.5 text-xs">
                    <Row icon={<Camera className="h-3.5 w-3.5" />} label="Angle" value={s.cameraAngle} />
                    <Row icon={<Move className="h-3.5 w-3.5" />} label="Move" value={s.cameraMovement} />
                    <Row icon={<Eye className="h-3.5 w-3.5" />} label="Visual" value={s.visualDirection} />
                    {s.bRoll && s.bRoll !== "—" && (
                      <Row icon={<Film className="h-3.5 w-3.5" />} label="B-roll" value={s.bRoll} />
                    )}
                    {s.textOverlay && s.textOverlay !== "—" && (
                      <Row icon={<Type className="h-3.5 w-3.5" />} label="Overlay" value={s.textOverlay} />
                    )}
                    <Row icon={<Smile className="h-3.5 w-3.5" />} label="Face" value={s.expression} />
                    <Row
                      icon={<Scissors className="h-3.5 w-3.5" />}
                      label="Next"
                      value={s.transition}
                      muted
                    />
                  </div>
                </article>
              ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function Row({
  icon,
  label,
  value,
  muted,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className={cn("mt-0.5 shrink-0", muted ? "text-muted-foreground" : "text-primary/80")}>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        <div className={cn("text-xs leading-snug", muted && "text-muted-foreground")}>
          {value}
        </div>
      </div>
    </div>
  );
}
