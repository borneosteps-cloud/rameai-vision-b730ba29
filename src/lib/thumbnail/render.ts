import type { FontEntry } from "./fonts";
import { fontShorthand } from "./fonts";

export type TextLayer = {
  text: string;
  sizePx: number;
  color: string;
  shadowColor: string;
  shadowBlur: number;
  align: "left" | "center" | "right";
  xPct: number; // 0..1 horizontal offset from default anchor
  yPct: number; // 0..1
};

export type EmojiLayer = {
  text: string;
  sizePx: number;
  xPct: number;
  yPct: number;
  show: boolean;
};

export type ThumbnailState = {
  bgImage: HTMLImageElement | null;
  overlayColor: string;
  overlayOpacity: number; // 0..1
  title: TextLayer;
  subtitle: TextLayer & { show: boolean };
  emoji: EmojiLayer;
  font: FontEntry | null;
};

const EMOJI_STACK = `"Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) {
  const ir = img.width / img.height;
  const cr = w / h;
  let sw = img.width, sh = img.height, sx = 0, sy = 0;
  if (ir > cr) {
    sw = img.height * cr;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / cr;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines: string[] = [];
  let cur = words[0];
  for (let i = 1; i < words.length; i++) {
    const trial = cur + " " + words[i];
    if (ctx.measureText(trial).width > maxWidth) {
      lines.push(cur);
      cur = words[i];
    } else cur = trial;
  }
  lines.push(cur);
  return lines;
}

function drawTextLayer(
  ctx: CanvasRenderingContext2D,
  layer: TextLayer,
  font: FontEntry | null,
  w: number,
  h: number,
  scale: number,
) {
  if (!layer.text.trim()) return;
  const padding = 48 * scale;
  ctx.font = fontShorthand(font, layer.sizePx * scale);
  ctx.textAlign = layer.align;
  ctx.textBaseline = "middle";
  ctx.fillStyle = layer.color;
  ctx.shadowColor = layer.shadowColor;
  ctx.shadowBlur = layer.shadowBlur * scale;
  const maxW = w - padding * 2;
  const lines = wrapLines(ctx, layer.text, maxW);
  const lineH = layer.sizePx * scale * 1.15;
  const totalH = lineH * lines.length;
  const startY = layer.yPct * h - totalH / 2 + lineH / 2;
  const baseX = layer.align === "left" ? padding : layer.align === "right" ? w - padding : w / 2;
  const x = baseX + (layer.xPct - 0.5) * w;
  lines.forEach((ln, i) => ctx.fillText(ln, x, startY + i * lineH));
  ctx.shadowBlur = 0;
}

export function renderThumbnail(
  ctx: CanvasRenderingContext2D,
  s: ThumbnailState,
  w: number,
  h: number,
  scale = 1,
) {
  ctx.clearRect(0, 0, w, h);
  if (s.bgImage) {
    drawCover(ctx, s.bgImage, w, h);
  } else {
    ctx.fillStyle = "#16213e";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = `${16 * scale}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Upload your photo as background", w / 2, h / 2);
  }
  // overlay
  ctx.fillStyle = s.overlayColor;
  ctx.globalAlpha = s.overlayOpacity;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 1;

  drawTextLayer(ctx, s.title, s.font, w, h, scale);
  if (s.subtitle.show) drawTextLayer(ctx, s.subtitle, s.font, w, h, scale);

  if (s.emoji.show && s.emoji.text.trim()) {
    ctx.font = `${s.emoji.sizePx * scale}px ${EMOJI_STACK}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowBlur = 0;
    ctx.fillText(s.emoji.text, s.emoji.xPct * w, s.emoji.yPct * h);
  }
}
