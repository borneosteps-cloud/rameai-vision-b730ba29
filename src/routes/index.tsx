import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bookmark, Quote, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import logoUrl from "@/assets/logo_orange_only.svg";
import { useLang } from "@/i18n/LanguageProvider";
import { usePersona } from "@/i18n/PersonaProvider";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RAMEAI — Wandy POV creative brain" },
      {
        name: "description",
        content: "Your AI co-writer for honest Reels & TikTok scripts in Wandy POV style.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { lang, t } = useLang();
  const { name } = usePersona();
  const [ideaCount, setIdeaCount] = useState<number | null>(null);
  const [hookCount, setHookCount] = useState<number | null>(null);
  const [hookOfDay, setHookOfDay] = useState<string | null>(null);
  const [recent, setRecent] = useState<{ id: string; title: string; tone: string }[]>([]);

  useEffect(() => {
    (async () => {
      const [{ count: ic }, { count: hc }, { data: hooks }, { data: ideas }] = await Promise.all([
        supabase.from("ideas").select("*", { count: "exact", head: true }).eq("language", lang),
        supabase.from("hooks").select("*", { count: "exact", head: true }).eq("language", lang),
        supabase.from("hooks").select("text").eq("language", lang).limit(50),
        supabase
          .from("ideas")
          .select("id,title,tone")
          .eq("language", lang)
          .order("created_at", { ascending: false })
          .limit(3),
      ]);
      setIdeaCount(ic ?? 0);
      setHookCount(hc ?? 0);
      if (hooks && hooks.length) setHookOfDay(hooks[Math.floor(Math.random() * hooks.length)].text);
      else setHookOfDay(null);
      setRecent(ideas ?? []);
    })();
  }, [lang]);

  return (
    <div className="space-y-5">
      <section
        className="overflow-hidden rounded-3xl border border-border/60 p-6"
        style={{ background: "var(--gradient-primary)" }}
      >
        <div className="text-xs font-semibold uppercase tracking-widest text-primary-foreground/80">
          {t("home.eyebrow", { name })}
        </div>
        <h1 className="mt-2 text-2xl font-bold leading-tight text-primary-foreground">
          {t("home.title")}
        </h1>
        <p className="mt-2 max-w-md text-sm text-primary-foreground/85">
          {t("home.subtitle")}
        </p>
        <Link to="/brainstorm" className="mt-4 inline-block">
          <Button size="lg" variant="secondary" className="rounded-full">
            <img src={logoAsset.url} alt="" className="mr-2 h-4 w-4 object-contain" />
            {lang === "id" ? "Brainstorm" : "Brainstorm"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <Stat label={t("home.stat.ideas")} value={ideaCount} icon={<Bookmark className="h-4 w-4" />} />
        <Stat label={t("home.stat.hooks")} value={hookCount} icon={<Quote className="h-4 w-4" />} />
      </section>

      {hookOfDay && (
        <section className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {t("home.hook_of_day")}
          </div>
          <p className="mt-1 text-lg font-medium leading-snug text-primary-glow">
            "{hookOfDay}"
          </p>
          <Link to="/hooks" className="mt-2 inline-block text-xs text-muted-foreground underline">
            {t("home.browse_hooks")}
          </Link>
        </section>
      )}

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">{t("home.recent")}</h2>
          <Link to="/saved" className="text-xs text-muted-foreground underline">
            {t("home.see_all")}
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
            {t("home.empty")}
          </div>
        ) : (
          <ul className="space-y-2">
            {recent.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-xl border border-border/60 bg-card px-3 py-2.5"
              >
                <span className="truncate text-sm">{r.title}</span>
                <span className="ml-2 shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {r.tone}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | null;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-[11px] uppercase tracking-widest">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-bold">{value ?? "—"}</div>
    </div>
  );
}
