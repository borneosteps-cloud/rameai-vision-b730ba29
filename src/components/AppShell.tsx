import { Link, useLocation } from "@tanstack/react-router";
import { Sparkles, Bookmark, Quote, User2, LayoutDashboard, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLang } from "@/i18n/LanguageProvider";
import { usePersona } from "@/i18n/PersonaProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const NAV = [
  { to: "/", labelKey: "nav.home", icon: LayoutDashboard },
  { to: "/generate", labelKey: "nav.generate", icon: Sparkles },
  { to: "/brainstorm", labelKey: "nav.brainstorm", icon: Brain },
  { to: "/saved", labelKey: "nav.saved", icon: Bookmark },
  { to: "/hooks", labelKey: "nav.hooks", icon: Quote },
  { to: "/persona", labelKey: "nav.persona", icon: User2 },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const { t } = useLang();
  const { name } = usePersona();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div
              className="grid h-8 w-8 place-items-center rounded-xl text-primary-foreground"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight">RAMEAI</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {t("nav.brand_tagline", { name })}
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <nav className="hidden gap-1 md:flex">
              {NAV.map((n) => {
                const active = pathname === n.to;
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t(n.labelKey)}
                  </Link>
                );
              })}
            </nav>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-28 pt-4 md:pb-10">{children}</main>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/95 backdrop-blur md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto grid max-w-3xl grid-cols-6">
          {NAV.map((n) => {
            const active = pathname === n.to;
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_8px_currentColor]")} />
                {t(n.labelKey)}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
