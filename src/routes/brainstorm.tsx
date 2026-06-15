import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Brain, Send, Loader2, Eraser, Copy, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useLang } from "@/i18n/LanguageProvider";
import { usePersona } from "@/i18n/PersonaProvider";
import { usePersistentState } from "@/hooks/usePersistentState";
import { brainstormChat, extractBrainstormTopics } from "@/lib/brainstorm.functions";

type ChatMessage = { role: "user" | "assistant"; content: string; ts: number };
type Topic = { title: string; tone: "Honest" | "Comedy" | "Twist" | "Shock" | "Informative"; hook: string };

const SESSION_KEY = "rameai-brainstorm-session";
const TOPICS_KEY = "rameai-brainstorm-topics";

export const Route = createFileRoute("/brainstorm")({
  head: () => ({
    meta: [
      { title: "Brainstorm · RAMEAI" },
      { name: "description", content: "Chat with RAMEAI to find the story inside what you're experiencing." },
    ],
  }),
  component: BrainstormPage,
});

function BrainstormPage() {
  const { lang } = useLang();
  const { name } = usePersona();
  const navigate = useNavigate();
  const chatFn = useServerFn(brainstormChat);
  const topicsFn = useServerFn(extractBrainstormTopics);

  const [messages, setMessages] = usePersistentState<ChatMessage[]>(SESSION_KEY, []);
  const [topics, setTopics] = usePersistentState<Topic[]>(TOPICS_KEY, []);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [showSheet, setShowSheet] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const aiTurnsRef = useRef(0);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const STARTERS = lang === "id"
    ? [
        "Gue lagi di [tempat]...",
        "Gue baru ngalamin sesuatu yang nggak terduga...",
        "Gue notice ada yang beda soal...",
        "Orang selalu nanya gue soal...",
        "Gue nemu hidden gem di...",
      ]
    : [
        "I'm currently at [place]...",
        "I just experienced something unexpected...",
        "I noticed something different about...",
        "People always ask me about...",
        "I found a hidden gem in...",
      ];

  const greeting = lang === "id"
    ? `Cerita ke gue: lo lagi di mana, lihat apa, kejadian apa — gue bantu nemuin story-nya. ✨`
    : `Tell me where you are, what you saw, what happened — I'll find the story. ✨`;

  async function maybeExtractTopics(history: ChatMessage[]) {
    const aiCount = history.filter((m) => m.role === "assistant").length;
    if (aiCount === 0 || aiCount === aiTurnsRef.current) return;
    aiTurnsRef.current = aiCount;
    if (aiCount % 2 !== 0) return;
    setExtracting(true);
    try {
      const res = await topicsFn({
        data: {
          messages: history.map((m) => ({ role: m.role, content: m.content })),
          language: lang,
        },
      });
      if (res.ok) setTopics(res.topics);
    } catch (e) {
      console.error(e);
    } finally {
      setExtracting(false);
    }
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    if (text.length > 500) {
      toast.error("Max 500 characters");
      return;
    }
    const userMsg: ChatMessage = { role: "user", content: text, ts: Date.now() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await chatFn({
        data: {
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          language: lang,
        },
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const aiMsg: ChatMessage = { role: "assistant", content: res.reply, ts: Date.now() };
      const after = [...next, aiMsg];
      setMessages(after);
      void maybeExtractTopics(after);
    } catch (e) {
      console.error(e);
      toast.error("Brainstorm failed");
    } finally {
      setLoading(false);
    }
  }

  function clearChat() {
    setMessages([]);
    setTopics([]);
    aiTurnsRef.current = 0;
    toast.success(lang === "id" ? "Brainstorm direset" : "Brainstorm cleared");
  }

  function copyTopic(title: string) {
    navigator.clipboard.writeText(title).then(() => toast.success("Copied"));
  }

  function useTopic(t: Topic) {
    const toneParam = (["Honest", "Comedy", "Twist", "Informative"] as const).includes(t.tone as never)
      ? (t.tone as "Honest" | "Comedy" | "Twist" | "Informative")
      : "Honest";
    navigate({
      to: "/generate",
      search: { topic: t.title, autorun: 1, intent: "script" },
    });
    // Best-effort: stash tone for the generate page (it persists tone in localStorage).
    try {
      window.localStorage.setItem("rameal:gen:tone", JSON.stringify(toneParam));
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            {lang === "id" ? "Brainstorm" : "Brainstorm"} <Brain className="h-6 w-6 text-primary" />
          </h1>
          <p className="text-sm text-muted-foreground">
            {lang === "id"
              ? `Cerita ke ${name}-brain — kita nemuin story-nya bareng.`
              : `Talk to the ${name} brain — we'll find the story together.`}
          </p>
        </div>
        {messages.length > 0 && (
          <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground hover:text-destructive" onClick={clearChat}>
            <Eraser className="mr-1 h-3 w-3" /> Clear
          </Button>
        )}
      </header>

      <div className="grid gap-4 md:grid-cols-5">
        {/* Chat column */}
        <section className="md:col-span-3 flex flex-col rounded-2xl border border-border/60 bg-card overflow-hidden min-h-[320px]">
          <div
            ref={scrollRef}
            className="flex-1 space-y-3 overflow-y-auto p-4 max-h-[35vh] md:max-h-[45vh]"
          >
            {messages.length === 0 && (
              <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                <div className="max-w-xs">
                  <Brain className="mx-auto mb-2 h-8 w-8 text-primary/70" />
                  {greeting}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <Bubble key={i} msg={m} />
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-muted/40 px-4 py-3">
                  <span className="inline-flex gap-1">
                    <Dot delay="0ms" />
                    <Dot delay="150ms" />
                    <Dot delay="300ms" />
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Starter chips */}
          {messages.length === 0 && (
            <div className="border-t border-border/60 p-3">
              <div className="flex flex-wrap gap-1.5">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="rounded-full border border-border/60 bg-background/40 px-3 py-1 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-border/60 p-3">
            <div className="flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, 500))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={4}
                placeholder={
                  lang === "id"
                    ? "contoh: Gue lagi di Kam Fung Bakery, Wan Chai, Hong Kong..."
                    : "e.g. I'm at Kam Fung Bakery in Wan Chai, Hong Kong right now..."
                }
                className="resize-none border-border/60 bg-background/40 h-[28vh] min-h-[28vh] max-h-[28vh] text-base md:h-auto md:resize-y md:min-h-[120px] md:max-h-[260px]"
              />
              <Button
                onClick={send}
                disabled={loading || !input.trim()}
                className="h-11 w-11 shrink-0 rounded-xl p-0"
                style={{ background: "var(--gradient-primary)", color: "var(--primary-foreground)" }}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
              <span>Enter to send · Shift+Enter newline</span>
              <span>{input.length}/500</span>
            </div>
          </div>
        </section>

        {/* Topics column — desktop */}
        <aside className="hidden md:col-span-2 md:block">
          <TopicsPanel
            topics={topics}
            extracting={extracting}
            lang={lang}
            onCopy={copyTopic}
            onUse={useTopic}
          />
        </aside>
      </div>

      {/* Floating "See topics" — mobile */}
      {topics.length > 0 && (
        <button
          onClick={() => setShowSheet(true)}
          className="fixed bottom-20 right-4 z-40 inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold shadow-lg md:hidden"
          style={{ background: "var(--gradient-primary)", color: "var(--primary-foreground)" }}
        >
          <Sparkles className="h-4 w-4" />
          {lang === "id" ? "Lihat Topics" : "See Topics"} ({topics.length})
        </button>
      )}

      {/* Mobile bottom sheet */}
      {showSheet && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowSheet(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-3xl border-t border-border/60 bg-background p-4 pb-8">
            <div className="mb-3 flex items-center justify-between">
              <div className="mx-auto h-1 w-10 rounded-full bg-muted" />
              <button onClick={() => setShowSheet(false)} className="absolute right-4 top-4 text-muted-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <TopicsPanel
              topics={topics}
              extracting={extracting}
              lang={lang}
              onCopy={copyTopic}
              onUse={(t) => {
                setShowSheet(false);
                useTopic(t);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Bubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  const time = new Date(msg.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <div className={cn("flex flex-col gap-1", isUser ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[85%] whitespace-pre-wrap break-words px-4 py-2.5 text-sm leading-relaxed",
          isUser ? "text-white" : "bg-muted/50 text-foreground"
        )}
        style={{
          borderRadius: 18,
          ...(isUser ? { background: "#E85D1B" } : {}),
        }}
      >
        {msg.content}
      </div>
      <span className="px-1 text-[10px] text-muted-foreground">{time}</span>
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="inline-block h-2 w-2 animate-bounce rounded-full bg-muted-foreground"
      style={{ animationDelay: delay }}
    />
  );
}

function TopicsPanel({
  topics,
  extracting,
  lang,
  onCopy,
  onUse,
}: {
  topics: Topic[];
  extracting: boolean;
  lang: "en" | "id";
  onCopy: (s: string) => void;
  onUse: (t: Topic) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-base font-semibold flex items-center gap-1.5">
          {lang === "id" ? "Siap di-Generate" : "Ready to Generate"} 🎯
        </h2>
        <p className="text-xs text-muted-foreground">
          {lang === "id" ? "Topics dari brainstorm lo" : "Topics extracted from your brainstorm"}
        </p>
      </div>

      {extracting && topics.length === 0 && (
        <div className="rounded-2xl border border-border/60 bg-card p-4 text-sm text-muted-foreground">
          <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
          {lang === "id" ? "Nyari topics..." : "Extracting topics..."}
        </div>
      )}

      {!extracting && topics.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/40 p-4 text-xs text-muted-foreground">
          {lang === "id"
            ? "Mulai chat — topics bakal muncul di sini setelah beberapa balasan."
            : "Start chatting — topics will appear here after a few replies."}
        </div>
      )}

      {topics.map((t, i) => (
        <TopicCard key={i} topic={t} onCopy={onCopy} onUse={onUse} />
      ))}
    </div>
  );
}

function TopicCard({
  topic,
  onCopy,
  onUse,
}: {
  topic: Topic;
  onCopy: (s: string) => void;
  onUse: (t: Topic) => void;
}) {
  return (
    <div
      className="relative rounded-2xl p-[1px]"
      style={{
        background: "linear-gradient(120deg, rgba(232,93,27,0.6), rgba(232,93,27,0.05), rgba(232,93,27,0.6))",
        backgroundSize: "200% 200%",
        animation: "rameaiGradientShift 6s linear infinite",
      }}
    >
      <div className="rounded-2xl bg-card p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold leading-snug">{topic.title}</h3>
          <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
            {topic.tone}
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{topic.hook}</p>
        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="outline" className="h-8 flex-1 text-xs" onClick={() => onCopy(topic.title)}>
            <Copy className="mr-1 h-3 w-3" /> Copy
          </Button>
          <Button
            size="sm"
            className="h-8 flex-1 text-xs"
            style={{ background: "var(--gradient-primary)", color: "var(--primary-foreground)" }}
            onClick={() => onUse(topic)}
          >
            <Sparkles className="mr-1 h-3 w-3" /> Generate →
          </Button>
        </div>
      </div>
      <style>{`@keyframes rameaiGradientShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}`}</style>
    </div>
  );
}
