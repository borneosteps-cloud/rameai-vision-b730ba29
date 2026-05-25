import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type Ctx = {
  name: string;
  setName: (n: string) => void;
};

const PersonaContext = createContext<Ctx | undefined>(undefined);

const DEFAULT_NAME = "Wandy POV";

export function PersonaProvider({ children }: { children: React.ReactNode }) {
  const [name, setNameState] = useState<string>(DEFAULT_NAME);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("persona").select("name").limit(1).maybeSingle();
      if (!cancelled && data?.name) setNameState(data.name);
    })();

    const channel = supabase
      .channel("persona-name")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "persona" },
        (payload) => {
          const next = (payload.new as { name?: string } | null)?.name;
          if (next) setNameState(next);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  const setName = useCallback((n: string) => setNameState(n || DEFAULT_NAME), []);

  return <PersonaContext.Provider value={{ name, setName }}>{children}</PersonaContext.Provider>;
}

export function usePersona(): Ctx {
  const ctx = useContext(PersonaContext);
  if (!ctx) throw new Error("usePersona must be used inside <PersonaProvider>");
  return ctx;
}
