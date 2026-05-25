import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLang } from "@/i18n/LanguageProvider";
import { usePersona } from "@/i18n/PersonaProvider";

export const Route = createFileRoute("/persona")({
  head: () => ({
    meta: [
      { title: "Persona · RAMEAI" },
      { name: "description", content: "Edit the Wandy POV persona that drives every generation." },
    ],
  }),
  component: PersonaPage,
});

type Persona = {
  id: string;
  name: string;
  identity_md: string;
  style_md: string;
  do_md: string;
  dont_md: string;
};

function PersonaPage() {
  const { t } = useLang();
  const { setName } = usePersona();
  const [p, setP] = useState<Persona | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("persona").select("*").limit(1).maybeSingle();
      if (error) {
        toast.error("Failed to load persona");
        console.error(error);
        return;
      }
      if (data) {
        setP(data as Persona);
        return;
      }
      // Seed a default persona row so the editor always has something to work with.
      const { data: created, error: insertErr } = await supabase
        .from("persona")
        .insert({
          name: "Wandy POV",
          identity_md:
            "Honest Indonesian travel & lifestyle creator based in Sydney. Compares Australia ↔ Indonesia with sharp, observational POV.",
          style_md:
            "Casual Bahasa Indonesia with natural English mix. Short, punchy, spoken rhythm. Curiosity-driven hooks, expectation vs reality, light sarcasm.",
          do_md:
            "Use specific details (prices in $AUD/Rp, names, behaviors). Lead with a strong hook. Compare cultures honestly. Keep it human and relatable.",
          dont_md:
            "No corporate writing. No fake hype. No generic travel clichés. No hate or targeted attacks.",
        })
        .select("*")
        .single();
      if (insertErr) {
        toast.error("Could not initialize persona");
        console.error(insertErr);
        return;
      }
      setP(created as Persona);
    })();
  }, []);

  async function save() {
    if (!p) return;
    setSaving(true);
    const { error } = await supabase
      .from("persona")
      .update({
        name: p.name,
        identity_md: p.identity_md,
        style_md: p.style_md,
        do_md: p.do_md,
        dont_md: p.dont_md,
        updated_at: new Date().toISOString(),
      })
      .eq("id", p.id);
    setSaving(false);
    if (error) return toast.error("Save failed");
    setName(p.name);
    toast.success("Persona updated");
  }

  if (!p) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{t("persona.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("persona.subtitle")}
        </p>
      </header>

      <section className="rounded-2xl border border-border/60 bg-card p-4">
        <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {t("settings.language")}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{t("settings.language_hint")}</p>
        <div className="mt-3"><LanguageSwitcher variant="full" /></div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border/60 bg-card p-4">
        <Field label="Creator name">
          <Input
            value={p.name}
            onChange={(e) => setP({ ...p, name: e.target.value })}
            className="border-border/60 bg-background/40"
          />
        </Field>
        <Field label="Identity">
          <Textarea
            rows={4}
            value={p.identity_md}
            onChange={(e) => setP({ ...p, identity_md: e.target.value })}
            className="resize-none border-border/60 bg-background/40"
          />
        </Field>
        <Field label="Style & voice">
          <Textarea
            rows={4}
            value={p.style_md}
            onChange={(e) => setP({ ...p, style_md: e.target.value })}
            className="resize-none border-border/60 bg-background/40"
          />
        </Field>
        <Field label="Do">
          <Textarea
            rows={4}
            value={p.do_md}
            onChange={(e) => setP({ ...p, do_md: e.target.value })}
            className="resize-none border-border/60 bg-background/40"
          />
        </Field>
        <Field label="Don't">
          <Textarea
            rows={3}
            value={p.dont_md}
            onChange={(e) => setP({ ...p, dont_md: e.target.value })}
            className="resize-none border-border/60 bg-background/40"
          />
        </Field>

        <Button
          onClick={save}
          disabled={saving}
          className="h-11 w-full rounded-xl"
          style={{ background: "var(--gradient-primary)", color: "var(--primary-foreground)" }}
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save persona
        </Button>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
