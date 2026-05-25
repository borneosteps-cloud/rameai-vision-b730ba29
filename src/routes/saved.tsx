import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { IdeaCard, type Idea } from "@/components/IdeaCard";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/saved")({
  head: () => ({
    meta: [
      { title: "Saved ideas · RAMEAI" },
      { name: "description", content: "Your saved Wandy POV scripts and captions." },
    ],
  }),
  component: SavedPage,
});

type Row = Idea & { id: string; created_at: string; tone: string; language?: "en" | "id" };

function SavedPage() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("ideas")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Couldn't load saved ideas");
    setItems((data as Row[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function remove(id: string) {
    const { error } = await supabase.from("ideas").delete().eq("id", id);
    if (error) return toast.error("Delete failed");
    setItems((prev) => prev.filter((i) => i.id !== id));
    toast.success("Deleted");
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Saved</h1>
        <p className="text-sm text-muted-foreground">{items.length} ideas in your vault.</p>
      </header>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl border border-border/60 bg-card/50" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center">
          <p className="text-sm text-muted-foreground">Belum ada saved ideas.</p>
          <Link to="/generate" className="mt-3 inline-block">
            <Button size="sm">Generate your first</Button>
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((i) => (
            <li key={i.id} className="space-y-2">
              <IdeaCard idea={i} context={{ topic: "", tone: i.tone, viralBoost: false, language: i.language ?? "id" }} />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => remove(i.id)}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
