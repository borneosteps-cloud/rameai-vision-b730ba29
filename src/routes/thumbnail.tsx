import { createFileRoute } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useEffect, useMemo, useRef, useState } from "react";
import { Upload, Download, AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { FONTS, type FontEntry, loadFont, fontShorthand } from "@/lib/thumbnail/fonts";
import { renderThumbnail, type ThumbnailState } from "@/lib/thumbnail/render";

const ORANGE = "#E85D1B";

const searchSchema = z.object({
  title: fallback(z.string(), "").default(""),
  subtitle: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/thumbnail")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Thumbnail Maker — RAMEAI" },
      { name: "description", content: "Make a 9:16 thumbnail for your Reels and TikTok in seconds." },
    ],
  }),
  component: ThumbnailPage,
});

const EMOJI_GRID = "🔥 😱 💀 🤯 😤 🥹 😭 💸 ✈️ 🇦🇺 🇮🇩 🍜 🏙️ 🌊 💡 👀 ❤️ 🎬 📱 ⚡ 🙏 💪 😅 🤌 🫣 💅 🎯 🚨 ⭐ 🏆 🎉 🫶".split(" ");
const CATEGORIES: Array<FontEntry["category"]> = ["Bold & Viral", "Italic / Elegant", "Handwritten"];

const DISPLAY_W = 360;
const DISPLAY_H = 640;

function ThumbnailPage() {
  const { title: initTitle, subtitle: initSubtitle } = Route.useSearch();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [overlayColor, setOverlayColor] = useState("#000000");
  const [overlayOpacity, setOverlayOpacity] = useState(0.35);

  const [titleText, setTitleText] = useState(initTitle || "Input your text here");
  const [titleSize, setTitleSize] = useState(52);
  const [titleColor, setTitleColor] = useState("#ffffff");
  const [titleShadow, setTitleShadow] = useState("#000000");
  const [titleBlur, setTitleBlur] = useState(10);
  const [titleAlign, setTitleAlign] = useState<"left" | "center" | "right">("center");
  const [titleX, setTitleX] = useState(0.5);
  const [titleY, setTitleY] = useState(0.62);

  const [subText, setSubText] = useState(initSubtitle || "type text");
  const [subSize, setSubSize] = useState(24);
  const [subColor, setSubColor] = useState("#ffe066");
  const [subShadow, setSubShadow] = useState("#000000");
  const [subBlur, setSubBlur] = useState(10);
  const [subAlign, setSubAlign] = useState<"left" | "center" | "right">("center");
  const [subX, setSubX] = useState(0.5);
  const [subY, setSubY] = useState(0.74);
  const [subShow, setSubShow] = useState(true);

  const [emoji, setEmoji] = useState("🔥");
  const [emojiSize, setEmojiSize] = useState(64);
  const [emojiX, setEmojiX] = useState(0.5);
  const [emojiY, setEmojiY] = useState(0.5);
  const [emojiShow, setEmojiShow] = useState(false);

  const [dragging, setDragging] = useState<null | "title" | "subtitle" | "emoji">(null);

  const [fontFamily, setFontFamily] = useState<string>("Bebas Neue");
  const [fontStatus, setFontStatus] = useState<string>("idle");

  const activeFont = useMemo(() => FONTS.find((f) => f.family === fontFamily) ?? null, [fontFamily]);

  // Preload default font
  useEffect(() => {
    const def = FONTS[0];
    setFontStatus("loading");
    loadFont(def).then((name) => setFontStatus(`Font: ${name}`)).catch(() => setFontStatus("idle"));
  }, []);

  const state: ThumbnailState = useMemo(
    () => ({
      bgImage,
      overlayColor,
      overlayOpacity,
      title: {
        text: titleText, sizePx: titleSize, color: titleColor,
        shadowColor: titleShadow, shadowBlur: titleBlur, align: titleAlign, xPct: titleX, yPct: titleY,
      },
      subtitle: {
        text: subText, sizePx: subSize, color: subColor,
        shadowColor: subShadow, shadowBlur: subBlur, align: subAlign, xPct: subX, yPct: subY, show: subShow,
      },
      emoji: { text: emoji, sizePx: emojiSize, xPct: emojiX, yPct: emojiY, show: emojiShow },
      font: activeFont,
    }),
    [bgImage, overlayColor, overlayOpacity, titleText, titleSize, titleColor, titleShadow, titleBlur, titleAlign, titleX, titleY,
     subText, subSize, subColor, subShadow, subBlur, subAlign, subX, subY, subShow,
     emoji, emojiSize, emojiX, emojiY, emojiShow, activeFont],
  );

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    renderThumbnail(ctx, state, DISPLAY_W, DISPLAY_H, 1);
  }, [state, fontStatus]);

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => setBgImage(img);
    img.src = url;
  }

  function handleSelectFont(f: FontEntry) {
    setFontStatus("Loading font...");
    loadFont(f)
      .then((name) => {
        setFontFamily(name);
        setFontStatus(`Font: ${name}`);
      })
      .catch(() => setFontStatus("Font load failed"));
  }

  function handleDownload() {
    const scale = 3;
    const w = DISPLAY_W * scale;
    const h = DISPLAY_H * scale;
    const off = document.createElement("canvas");
    off.width = w;
    off.height = h;
    const ctx = off.getContext("2d");
    if (!ctx) return;
    renderThumbnail(ctx, state, w, h, scale);
    const url = off.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "rameai-thumbnail.png";
    a.click();
  }

  function getCanvasPoint(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * DISPLAY_W;
    const y = ((e.clientY - rect.top) / rect.height) * DISPLAY_H;
    return { x, y };
  }

  function hitTest(x: number, y: number): "title" | "subtitle" | "emoji" | null {
    if (emojiShow && emoji.trim()) {
      const ex = emojiX * DISPLAY_W;
      const ey = emojiY * DISPLAY_H;
      const r = emojiSize * 0.6;
      if (Math.abs(x - ex) < r && Math.abs(y - ey) < r) return "emoji";
    }
    if (subShow && subText.trim()) {
      const sy = subY * DISPLAY_H;
      if (Math.abs(y - sy) < subSize * 0.9) return "subtitle";
    }
    if (titleText.trim()) {
      const ty = titleY * DISPLAY_H;
      if (Math.abs(y - ty) < titleSize * 0.9) return "title";
    }
    return null;
  }

  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const { x, y } = getCanvasPoint(e);
    const hit = hitTest(x, y);
    if (!hit) return;
    let cx = 0, cy = 0;
    if (hit === "title") { cx = titleX * DISPLAY_W; cy = titleY * DISPLAY_H; }
    else if (hit === "subtitle") { cx = subX * DISPLAY_W; cy = subY * DISPLAY_H; }
    else { cx = emojiX * DISPLAY_W; cy = emojiY * DISPLAY_H; }
    dragOffset.current = { x: cx - x, y: cy - y };
    setDragging(hit);
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!dragging) return;
    const { x, y } = getCanvasPoint(e);
    const nx = x + dragOffset.current.x;
    const ny = y + dragOffset.current.y;
    const xPct = Math.max(0, Math.min(1, nx / DISPLAY_W));
    const yPct = Math.max(0.02, Math.min(0.98, ny / DISPLAY_H));
    if (dragging === "title") { setTitleX(xPct); setTitleY(yPct); }
    else if (dragging === "subtitle") { setSubX(xPct); setSubY(yPct); }
    else if (dragging === "emoji") { setEmojiX(xPct); setEmojiY(yPct); }
  }

  function handlePointerEnd(e: React.PointerEvent<HTMLCanvasElement>) {
    if (dragging) setDragging(null);
    try { (e.target as HTMLCanvasElement).releasePointerCapture(e.pointerId); } catch {}
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold leading-tight">Thumbnail Maker</h1>
        <p className="text-sm text-muted-foreground">Design a 9:16 thumbnail. Export at 1080×1920.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-[auto_1fr]">
        {/* Canvas column */}
        <div className="space-y-3">
          <div className="flex justify-center">
            <canvas
              ref={canvasRef}
              width={DISPLAY_W}
              height={DISPLAY_H}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerEnd}
              onPointerCancel={handlePointerEnd}
              className="touch-none rounded-2xl border border-border/60 shadow-[var(--shadow-glow)]"
              style={{ width: DISPLAY_W, height: DISPLAY_H, maxWidth: "100%", cursor: dragging ? "grabbing" : "grab" }}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="contents">
              <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
              <Button asChild variant="secondary" className="w-full">
                <span><Upload className="mr-2 h-4 w-4" /> Upload</span>
              </Button>
            </label>
            <Button onClick={handleDownload} className="w-full">
              <Download className="mr-2 h-4 w-4" /> Download
            </Button>
          </div>
          <p className="text-center text-[11px] text-muted-foreground">{fontStatus}</p>
        </div>

        {/* Controls column */}
        <div className="space-y-4">
          {/* Background dim */}
          <section className="rounded-2xl border border-border/60 bg-card p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Background dim</div>
            <Row label={`Opacity ${Math.round(overlayOpacity * 100)}%`}>
              <Slider min={0} max={85} step={1} value={[overlayOpacity * 100]}
                onValueChange={(v) => setOverlayOpacity(v[0] / 100)} />
            </Row>
            <Row label="Overlay color">
              <ColorInput value={overlayColor} onChange={setOverlayColor} />
            </Row>
          </section>

          {/* Layer tabs */}
          <Tabs defaultValue="title">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="title" className="data-[state=active]:bg-[#E85D1B] data-[state=active]:text-white">Title</TabsTrigger>
              <TabsTrigger value="subtitle" className="data-[state=active]:bg-[#E85D1B] data-[state=active]:text-white">Subtitle</TabsTrigger>
              <TabsTrigger value="emoji" className="data-[state=active]:bg-[#E85D1B] data-[state=active]:text-white">Emoji</TabsTrigger>
            </TabsList>

            <TabsContent value="title" className="space-y-3 rounded-2xl border border-border/60 bg-card p-4">
              <Input value={titleText} onChange={(e) => setTitleText(e.target.value)} placeholder="Title text" />
              <Row label={`Font size ${titleSize}px`}>
                <Slider min={16} max={110} step={1} value={[titleSize]} onValueChange={(v) => setTitleSize(v[0])} />
              </Row>
              <Row label="Text color"><ColorInput value={titleColor} onChange={setTitleColor} /></Row>
              <Row label="Shadow color"><ColorInput value={titleShadow} onChange={setTitleShadow} /></Row>
              <Row label={`Shadow blur ${titleBlur}`}>
                <Slider min={0} max={24} step={1} value={[titleBlur]} onValueChange={(v) => setTitleBlur(v[0])} />
              </Row>
              <AlignRow value={titleAlign} onChange={setTitleAlign} />
              <p className="text-[11px] text-muted-foreground">Drag the title on the canvas to reposition.</p>
            </TabsContent>

            <TabsContent value="subtitle" className="space-y-3 rounded-2xl border border-border/60 bg-card p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Show subtitle</span>
                <Switch checked={subShow} onCheckedChange={setSubShow} />
              </div>
              <Input value={subText} onChange={(e) => setSubText(e.target.value)} placeholder="Subtitle text" />
              <Row label={`Font size ${subSize}px`}>
                <Slider min={10} max={60} step={1} value={[subSize]} onValueChange={(v) => setSubSize(v[0])} />
              </Row>
              <Row label="Text color"><ColorInput value={subColor} onChange={setSubColor} /></Row>
              <Row label="Shadow color"><ColorInput value={subShadow} onChange={setSubShadow} /></Row>
              <Row label={`Shadow blur ${subBlur}`}>
                <Slider min={0} max={24} step={1} value={[subBlur]} onValueChange={(v) => setSubBlur(v[0])} />
              </Row>
              <AlignRow value={subAlign} onChange={setSubAlign} />
              <p className="text-[11px] text-muted-foreground">Drag the subtitle on the canvas to reposition.</p>
            </TabsContent>

            <TabsContent value="emoji" className="space-y-3 rounded-2xl border border-border/60 bg-card p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Show emoji</span>
                <Switch checked={emojiShow} onCheckedChange={setEmojiShow} />
              </div>
              <Input value={emoji} onChange={(e) => setEmoji(e.target.value)} placeholder="Emoji" />
              <Row label={`Size ${emojiSize}px`}>
                <Slider min={20} max={130} step={1} value={[emojiSize]} onValueChange={(v) => setEmojiSize(v[0])} />
              </Row>
              <p className="text-[11px] text-muted-foreground">Drag the emoji on the canvas to reposition.</p>
              <div className="grid grid-cols-7 gap-1.5">
                {EMOJI_GRID.map((e) => {
                  const selected = e === emoji;
                  return (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setEmoji(e)}
                      className={cn(
                        "grid aspect-square place-items-center rounded-md border bg-secondary text-xl transition-colors",
                        selected ? "border-[1.5px]" : "border-border/60 hover:bg-secondary/80",
                      )}
                      style={selected ? { borderColor: ORANGE } : undefined}
                    >
                      {e}
                    </button>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>

          {/* Font picker */}
          <section className="rounded-2xl border border-border/60 bg-card p-4">
            <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Fonts</div>
            {CATEGORIES.map((cat) => (
              <div key={cat} className="mb-3 last:mb-0">
                <div className="mb-1.5 text-[11px] font-medium text-muted-foreground">{cat}</div>
                <div className="grid grid-cols-2 gap-[5px]">
                  {FONTS.filter((f) => f.category === cat).map((f) => {
                    const selected = f.family === fontFamily;
                    return (
                      <button
                        key={f.family}
                        type="button"
                        onClick={() => handleSelectFont(f)}
                        className={cn(
                          "rounded-md border bg-secondary p-3 text-left transition-colors hover:bg-secondary/80",
                          selected ? "border-[1.5px]" : "border-[0.5px] border-border/60",
                        )}
                        style={selected ? { borderColor: ORANGE } : undefined}
                      >
                        <div
                          className="truncate text-2xl leading-tight"
                          style={{ font: fontShorthand(f, 28) }}
                        >
                          {f.sample}
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-1">
                          <span className="truncate text-[11px] text-muted-foreground">{f.family}</span>
                          <span className="shrink-0 rounded-full bg-background/60 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-primary-glow">
                            {f.badge}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-2 last:mb-0">
      <div className="mb-1 text-[11px] uppercase tracking-widest text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-12 cursor-pointer rounded-md border border-border/60 bg-transparent"
      />
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="font-mono text-xs" />
    </div>
  );
}

function AlignRow({
  value,
  onChange,
}: {
  value: "left" | "center" | "right";
  onChange: (v: "left" | "center" | "right") => void;
}) {
  const opts: Array<{ v: "left" | "center" | "right"; Icon: typeof AlignLeft }> = [
    { v: "left", Icon: AlignLeft },
    { v: "center", Icon: AlignCenter },
    { v: "right", Icon: AlignRight },
  ];
  return (
    <div className="grid grid-cols-3 gap-1">
      {opts.map(({ v, Icon }) => (
        <Button
          key={v}
          type="button"
          variant={value === v ? "default" : "secondary"}
          size="sm"
          onClick={() => onChange(v)}
          className={value === v ? "bg-[#E85D1B] hover:bg-[#E85D1B]/90" : ""}
        >
          <Icon className="h-4 w-4" />
        </Button>
      ))}
    </div>
  );
}
