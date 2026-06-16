export type FontEntry = {
  family: string;
  badge: string;
  sample: string;
  url: string;
  weight?: number;
  italic?: boolean;
  category: "Bold & Viral" | "Italic / Elegant" | "Handwritten";
};

export const FONTS: FontEntry[] = [
  // Bold & Viral
  { family: "Bebas Neue", badge: "#1 TikTok", sample: "VIRAL", category: "Bold & Viral",
    url: "https://fonts.gstatic.com/s/bebasneue/v14/JTUSjIg69CK48gW7PXooxW5rygbi49c.woff2" },
  { family: "Anton", badge: "Hormozi", sample: "BOLD", category: "Bold & Viral",
    url: "https://fonts.gstatic.com/s/anton/v25/1Ptgg87LROyAm0K08i4gS7lu.woff2" },
  { family: "Oswald", badge: "Pro look", sample: "CLEAN", weight: 700, category: "Bold & Viral",
    url: "https://fonts.gstatic.com/s/oswald/v53/TK3_WkUHHAIjg75cFRf3bXL8LICs13NvgUFoZAaRliE.woff2" },
  { family: "Montserrat", badge: "Lifestyle", sample: "STYLE", weight: 900, category: "Bold & Viral",
    url: "https://fonts.gstatic.com/s/montserrat/v26/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCuM73w5aXp-p7K4KLg.woff2" },
  { family: "Russo One", badge: "Hype", sample: "FIRE", category: "Bold & Viral",
    url: "https://fonts.gstatic.com/s/russoone/v16/Z9XUDmZRWg6M1LvRYsH-yMOInrib9Q.woff2" },
  { family: "Alfa Slab One", badge: "Impact", sample: "HEAVY", category: "Bold & Viral",
    url: "https://fonts.gstatic.com/s/alfaslabone/v19/6NUQ8FmMKwSEKjnm5-4v-4Jh6dVretWvYmE.woff2" },
  // Italic / Elegant
  { family: "Playfair Display", badge: "Italian feel", sample: "Lusso", weight: 900, italic: true, category: "Italic / Elegant",
    url: "https://fonts.gstatic.com/s/playfairdisplay/v37/nuFiD-vYSZviVYUb_rj3ij__anPXDTnCjmHKM4nYO7KN_pqbjA.woff2" },
  { family: "Cormorant Garamond", badge: "Editorial", sample: "Bella", weight: 700, italic: true, category: "Italic / Elegant",
    url: "https://fonts.gstatic.com/s/cormorantgaramond/v21/co3YmX5slCNuHLi8bLeY9MK7whWMhyjornFLsS6V7wx16ChJOlSWncVFVg.woff2" },
  { family: "Cinzel", badge: "Classic", sample: "ROMA", weight: 900, category: "Italic / Elegant",
    url: "https://fonts.gstatic.com/s/cinzel/v23/8vIJ7ww63mVu7gt79mT7PkzYgJ5SIQ.woff2" },
  { family: "Italiana", badge: "Italian", sample: "Milano", category: "Italic / Elegant",
    url: "https://fonts.gstatic.com/s/italiana/v20/QldNNTtMgcHpAN8pD5hmFHnPn8s6.woff2" },
  { family: "IM Fell English", badge: "Old world", sample: "Vintage", italic: true, category: "Italic / Elegant",
    url: "https://fonts.gstatic.com/s/imfellenglish/v16/Ktk1ALSLW8zDe0rthJysWrnLsAz3F6mZVY9Y5w.woff2" },
  { family: "Abril Fatface", badge: "Magazine", sample: "Vogue", category: "Italic / Elegant",
    url: "https://fonts.gstatic.com/s/abrilfatface/v23/zOL54pLDaKK60mme0o_ow4W_D0-_1rlN.woff2" },
  // Handwritten
  { family: "Pacifico", badge: "Story vibe", sample: "Chill", category: "Handwritten",
    url: "https://fonts.gstatic.com/s/pacifico/v22/FwZY7-Qmy14u9lezJ96A4sijpFu_.woff2" },
  { family: "Dancing Script", badge: "Aesthetic", sample: "Flowing", weight: 700, category: "Handwritten",
    url: "https://fonts.gstatic.com/s/dancingscript/v25/If2cXTr6YS-zF4S-kcSWSVi_sxjsohD9F50Ruu7BMSo3ROp6.woff2" },
  { family: "Great Vibes", badge: "Luxury", sample: "Elegante", category: "Handwritten",
    url: "https://fonts.gstatic.com/s/greatvibes/v19/RWmMoKWR9v4ksMfaWd_JN9XFiaQ.woff2" },
  { family: "Permanent Marker", badge: "Bold raw", sample: "Raw", category: "Handwritten",
    url: "https://fonts.gstatic.com/s/permanentmarker/v16/Fh4uPib9Iyv2ucM6pGQMWimMp004La2Cfw.woff2" },
  { family: "Satisfy", badge: "Lifestyle", sample: "Smooth", category: "Handwritten",
    url: "https://fonts.gstatic.com/s/satisfy/v21/rP2Hp2yn6lkG50LoOZSCHBeHFl0.woff2" },
  { family: "Lobster", badge: "Fun", sample: "Retro", category: "Handwritten",
    url: "https://fonts.gstatic.com/s/lobster/v30/neILzCirqoswsqX9zoKmMw.woff2" },
];

const cache = new Map<string, Promise<string>>();

export function loadFont(e: FontEntry): Promise<string> {
  if (typeof window === "undefined") return Promise.resolve(e.family);
  if (!cache.has(e.family)) {
    const p = (async () => {
      const descriptors: FontFaceDescriptors = {};
      if (e.weight) descriptors.weight = String(e.weight);
      if (e.italic) descriptors.style = "italic";
      const ff = new FontFace(e.family, `url(${e.url})`, descriptors);
      await ff.load();
      document.fonts.add(ff);
      return e.family;
    })();
    cache.set(e.family, p);
  }
  return cache.get(e.family)!;
}

export function fontShorthand(e: FontEntry | null, sizePx: number): string {
  const family = e?.family ?? "serif";
  const weight = e?.weight ?? 400;
  const style = e?.italic ? "italic" : "normal";
  return `${style} ${weight} ${sizePx}px "${family}", serif`;
}
