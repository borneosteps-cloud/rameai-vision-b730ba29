import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Copy,
  Plus,
  Trash2,
  Search,
  Star,
  Flame,
  Clock,
  Sparkles,
  Wand2,
  Loader2,
  ArrowRight,
  X,
  Clapperboard,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { enhanceHooks } from "@/lib/hooks.functions";
import { cn } from "@/lib/utils";
import { useLang } from "@/i18n/LanguageProvider";
import { usePersistentState } from "@/hooks/usePersistentState";

export const Route = createFileRoute("/hooks")({
  head: () => ({
    meta: [
      { title: "Hook library · RAMEAI" },
      { name: "description", content: "20+ viral hook templates, AI-rewriter, and quick insert into scripts." },
    ],
  }),
  component: HooksPage,
});

type Hook = {
  id: string;
  text: string;
  category: string;
  source: string;
  emotion: string;
  content_type: string;
  favorite: boolean;
  use_count: number;
  last_used_at: string | null;
  created_at: string;
  language: string;
};

const SUGGESTED_CATEGORIES = [
  "Travel",
  "Food",
  "Lifestyle",
  "Luxury",
  "Comedy",
  "Couple",
  "Fitness",
  "Motivation",
  "Storytime",
  "Hidden spots",
  "Educational",
  "Cinematic vlog",
  "POV",
  "Curiosity",
  "Shock",
  "Storytelling",
];

function HooksPage() {
  const navigate = useNavigate();
  const { lang, t } = useLang();
  const [items, setItems] = useState<Hook[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = usePersistentState<string>("rameal:hooks:cat", "all");
  const [query, setQuery] = usePersistentState<string>("rameal:hooks:q", "");
  const [favOnly, setFavOnly] = usePersistentState<boolean>("rameal:hooks:fav", false);

  // Add hook form
  const [newHook, setNewHook] = useState("");
  const [newCat, setNewCat] = useState("Travel");

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("hooks")
      .select("*")
      .eq("language", lang)
      .order("created_at", { ascending: false });
    if (error) toast.error("Couldn't load hooks");
    setItems((data as Hook[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const categories = useMemo(() => {
    const s = new Set<string>(items.map((i) => i.category));
    return ["all", ...Array.from(s).sort()];
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((h) => {
      if (activeCat !== "all" && h.category !== activeCat) return false;
      if (favOnly && !h.favorite) return false;
      if (q && !h.text.toLowerCase().includes(q) && !h.category.toLowerCase().includes(q) && !h.emotion.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [items, activeCat, query, favOnly]);

  const trending = useMemo(
    () => [...items].filter((h) => h.use_count > 0).sort((a, b) => b.use_count - a.use_count).slice(0, 5),
    [items]
  );
  const recent = useMemo(
    () =>
      [...items]
        .filter((h) => h.last_used_at)
        .sort((a, b) => (b.last_used_at ?? "").localeCompare(a.last_used_at ?? ""))
        .slice(0, 5),
    [items]
  );

  async function addHook() {
    const text = newHook.trim();
    if (!text) return;
    const { data, error } = await supabase
      .from("hooks")
      .insert({ text, category: newCat.trim() || "general", source: "user", language: lang })
      .select("*")
      .single();
    if (error || !data) return toast.error("Couldn't add hook");
    setItems((prev) => [data as Hook, ...prev]);
    setNewHook("");
    toast.success(t("hooks.added"));
  }

  async function removeHook(id: string) {
    const { error } = await supabase.from("hooks").delete().eq("id", id);
    if (error) return toast.error("Delete failed");
    setItems((p) => p.filter((i) => i.id !== id));
  }

  async function toggleFavorite(h: Hook) {
    const next = !h.favorite;
    setItems((p) => p.map((x) => (x.id === h.id ? { ...x, favorite: next } : x)));
    const { error } = await supabase.from("hooks").update({ favorite: next }).eq("id", h.id);
    if (error) {
      setItems((p) => p.map((x) => (x.id === h.id ? { ...x, favorite: !next } : x)));
      toast.error("Couldn't save favorite");
    }
  }

  async function markUsed(h: Hook) {
    const next = { ...h, use_count: h.use_count + 1, last_used_at: new Date().toISOString() };
    setItems((p) => p.map((x) => (x.id === h.id ? next : x)));
    await supabase
      .from("hooks")
      .update({ use_count: next.use_count, last_used_at: next.last_used_at })
      .eq("id", h.id);
  }

  async function copyHook(h: Hook) {
    await navigator.clipboard.writeText(h.text);
    toast.success("Hook copied");
    markUsed(h);
  }

  function sendToGenerate(h: Hook, intent: "script" | "storyboard" = "script") {
    markUsed(h);
    navigate({ to: "/generate", search: { topic: h.text, autorun: 1, intent } });
  }

  async function saveGenerated(text: string, category: string) {
    const { data, error } = await supabase
      .from("hooks")
      .insert({ text, category, source: "ai", emotion: "Curiosity", content_type: "Reels", language: lang })
      .select("*")
      .single();
    if (error || !data) {
      toast.error("Couldn't save hook");
      return;
    }
    setItems((p) => [data as Hook, ...p]);
    toast.success(t("hooks.saved_lib"));
  }

  return (
    <div className="space-y-5 pb-12">
      <header>
        <h1 className="text-3xl font-black tracking-tight">{t("hooks.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {items.length} {t("hooks.subtitle_a")} · {items.filter((i) => i.favorite).length} {t("hooks.subtitle_b")}
        </p>
      </header>

      {/* Search + filters */}
      <section className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search hooks, categories, emotions..."
            className="h-11 border-border/60 bg-card pl-9 pr-9"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted"
              aria-label="Clear"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFavOnly((v) => !v)}
            className={cn(
              "flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium",
              favOnly
                ? "border-yellow-400 bg-yellow-400/15 text-yellow-300"
                : "border-border/60 bg-card text-muted-foreground"
            )}
          >
            <Star className={cn("h-3 w-3", favOnly && "fill-current")} /> Favorites
          </button>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCat(c)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                activeCat === c
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/60 bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      {/* AI + Add */}
      <section className="grid grid-cols-2 gap-2">
        <AIHooksDialog onSave={saveGenerated} />

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="secondary" className="h-11 rounded-xl">
              <Plus className="mr-1.5 h-4 w-4" /> Add hook
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>New hook</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                value={newHook}
                onChange={(e) => setNewHook(e.target.value)}
                placeholder="POV: ..."
                className="border-border/60 bg-background/40"
              />
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewCat(c)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px]",
                      newCat === c
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border/60 bg-card text-muted-foreground"
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <Button onClick={addHook} className="w-full">
                Save hook
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </section>

      {/* Trending + Recent */}
      {(trending.length > 0 || recent.length > 0) && (
        <section className="grid gap-3 sm:grid-cols-2">
          {trending.length > 0 && (
            <MiniList
              title="Trending"
              icon={<Flame className="h-3.5 w-3.5 text-orange-400" />}
              items={trending}
              onPick={sendToGenerate}
            />
          )}
          {recent.length > 0 && (
            <MiniList
              title="Recently used"
              icon={<Clock className="h-3.5 w-3.5 text-primary" />}
              items={recent}
              onPick={sendToGenerate}
            />
          )}
        </section>
      )}

      {/* Hook cards */}
      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl border border-border/60 bg-card/50" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/30 p-8 text-center text-sm text-muted-foreground">
          No hooks match your search.
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {filtered.map((h) => (
            <HookCard
              key={h.id}
              hook={h}
              onCopy={() => copyHook(h)}
              onToggleFav={() => toggleFavorite(h)}
              onUse={() => sendToGenerate(h, "script")}
              onStoryboard={() => sendToGenerate(h, "storyboard")}
              onDelete={() => removeHook(h.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function MiniList({
  title,
  icon,
  items,
  onPick,
}: {
  title: string;
  icon: React.ReactNode;
  items: Hook[];
  onPick: (h: Hook) => void;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-3">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {icon} {title}
      </div>
      <ul className="space-y-1">
        {items.map((h) => (
          <li key={h.id}>
            <button
              onClick={() => onPick(h)}
              className="group flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-muted/50"
            >
              <span className="line-clamp-1">{h.text}</span>
              <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground group-hover:text-primary" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HookCard({
  hook,
  onCopy,
  onToggleFav,
  onUse,
  onStoryboard,
  onDelete,
}: {
  hook: Hook;
  onCopy: () => void;
  onToggleFav: () => void;
  onUse: () => void;
  onStoryboard: () => void;
  onDelete: () => void;
}) {
  return (
    <li
      className="group relative flex flex-col rounded-2xl border border-border/60 bg-gradient-to-br from-card to-card/40 p-4 transition-all hover:border-primary/50 hover:shadow-[0_8px_30px_-10px_var(--primary)]"
    >
      <button
        onClick={onToggleFav}
        className={cn(
          "absolute right-3 top-3 rounded-full p-1.5 transition-colors",
          hook.favorite ? "text-yellow-300" : "text-muted-foreground/40 hover:text-yellow-300"
        )}
        aria-label="Favorite"
      >
        <Star className={cn("h-4 w-4", hook.favorite && "fill-current")} />
      </button>

      <p className="pr-8 text-base font-bold leading-snug">"{hook.text}"</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Tag>{hook.category}</Tag>
        <Tag tone="emotion">{hook.emotion}</Tag>
        <Tag tone="muted">{hook.content_type}</Tag>
        {hook.use_count > 0 && (
          <Tag tone="muted">
            <Flame className="mr-0.5 inline h-2.5 w-2.5" /> {hook.use_count}
          </Tag>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Button
          size="sm"
          onClick={onUse}
          className="h-8 flex-1 rounded-lg text-xs font-semibold"
          style={{ background: "var(--gradient-primary)", color: "var(--primary-foreground)" }}
        >
          <Sparkles className="mr-1 h-3 w-3" /> Script
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={onStoryboard}
          className="h-8 flex-1 rounded-lg text-xs font-semibold"
        >
          <Clapperboard className="mr-1 h-3 w-3" /> Storyboard
        </Button>
        <Button size="icon" variant="secondary" className="h-8 w-8" onClick={onCopy} aria-label="Copy">
          <Copy className="h-3.5 w-3.5" />
        </Button>
        {hook.source === "user" || hook.source === "ai" ? (
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 hover:text-destructive"
            onClick={onDelete}
            aria-label="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>
    </li>
  );
}

function Tag({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "emotion" | "muted" }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
        tone === "default" && "bg-primary/15 text-primary-glow",
        tone === "emotion" && "bg-fuchsia-500/15 text-fuchsia-300",
        tone === "muted" && "bg-muted text-muted-foreground"
      )}
    >
      {children}
    </span>
  );
}

const MODES = [
  { id: "generate", label: "Generate by niche", icon: Sparkles },
  { id: "rewrite", label: "Rewrite", icon: Wand2 },
  { id: "viral", label: "Make viral", icon: Flame },
  { id: "shorten", label: "Shorten", icon: ArrowRight },
  { id: "translate", label: "Translate", icon: Wand2 },
] as const;

type Mode = (typeof MODES)[number]["id"];

function AIHooksDialog({ onSave }: { onSave: (text: string, category: string) => void }) {
  const fn = useServerFn(enhanceHooks);
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = usePersistentState<Mode>("rameal:hooklab:mode", "generate");
  const [hook, setHook] = usePersistentState<string>("rameal:hooklab:hook", "");
  const [niche, setNiche] = usePersistentState<string>("rameal:hooklab:niche", "Korean food content");
  const [language, setLanguage] = usePersistentState<string>("rameal:hooklab:lang", lang === "en" ? "English" : "Bahasa Indonesia");
  const [results, setResults] = usePersistentState<string[]>("rameal:hooklab:results", []);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    setResults([]);
    try {
      const res = await fn({
        data: { mode, hook, niche, language, appLanguage: lang, count: 5 },
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setResults(res.hooks);
    } catch (e) {
      console.error(e);
      toast.error("AI failed");
    } finally {
      setLoading(false);
    }
  }

  const needsHook = mode !== "generate";
  const needsNiche = mode === "generate";
  const needsLang = mode === "translate";
  const category = mode === "generate" ? niche.split(" ")[0] || "AI" : "AI";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className="h-11 rounded-xl"
          style={{ background: "var(--gradient-primary)", color: "var(--primary-foreground)" }}
        >
          <Sparkles className="mr-1.5 h-4 w-4" /> AI hooks
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] max-w-lg gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border/60 px-4 py-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" /> AI hook lab
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 p-4">
          <div className="flex flex-wrap gap-1.5">
            {MODES.map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={cn(
                    "flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                    mode === m.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/60 bg-card text-muted-foreground"
                  )}
                >
                  <Icon className="h-3 w-3" /> {m.label}
                </button>
              );
            })}
          </div>

          {needsNiche && (
            <Input
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              placeholder="e.g. Korean food content"
              className="border-border/60 bg-background/40"
            />
          )}
          {needsHook && (
            <Input
              value={hook}
              onChange={(e) => setHook(e.target.value)}
              placeholder="Paste a hook to transform..."
              className="border-border/60 bg-background/40"
            />
          )}
          {needsLang && (
            <Input
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              placeholder="Target language (e.g. English, Bahasa Indonesia)"
              className="border-border/60 bg-background/40"
            />
          )}

          <Button
            onClick={run}
            disabled={loading}
            className="h-10 w-full rounded-xl text-sm font-semibold"
            style={{ background: "var(--gradient-primary)", color: "var(--primary-foreground)" }}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cooking...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" /> Generate 5
              </>
            )}
          </Button>

          {results.length > 0 && (
            <ul className="space-y-2">
              {results.map((h, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 rounded-xl border border-border/60 bg-card p-3"
                >
                  <p className="flex-1 text-sm font-medium leading-snug">"{h}"</p>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => {
                        navigator.clipboard.writeText(h);
                        toast.success("Copied");
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => onSave(h, category)}
                      aria-label="Save"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
