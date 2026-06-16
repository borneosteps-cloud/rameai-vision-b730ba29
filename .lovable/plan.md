# Thumbnail Maker

A new `/thumbnail` route lets users compose a 9:16 thumbnail (background photo + dim overlay + title/subtitle/emoji layers + Google Font picker) and export it at phone-quality 1080×1920. Idea cards on the home page get a "Make Thumbnail →" action that deep-links into the page with the hook/foreshadow pre-filled.

## Files

**New**
- `src/routes/thumbnail.tsx` — the page (validateSearch for `title`/`subtitle`), two-column on `md+`, stacked on mobile.
- `src/components/thumbnail/ThumbnailCanvas.tsx` — 360×640 display canvas + `renderTo(ctx, scale)` helper reused for export.
- `src/components/thumbnail/ThumbnailControls.tsx` — upload, dim section, layer tabs (Title/Subtitle/Emoji), font grid, download.
- `src/lib/thumbnail/fonts.ts` — font catalog (3 categories, 18 entries: family, badge, sample, woff2 URL) + `loadFont(entry)` using FontFace API with an in-memory cache keyed by family.
- `src/lib/thumbnail/render.ts` — pure draw function: clear → cover-fit image (or `#16213e` placeholder + hint) → overlay rect → title (shadow + word-wrap, 48px side padding) → subtitle → emoji (explicit emoji font stack, no shadow). Takes a `scale` so the same code handles preview and 3× export.

**Edited**
- `src/components/AppShell.tsx` — add `{ to: "/thumbnail", labelKey: "nav.thumbnail", icon: ImageIcon }` to `NAV`; bottom-nav grid becomes `grid-cols-7`.
- `src/i18n/dict.ts` — add `nav.thumbnail` ("Thumbnail" / "Thumbnail").
- `src/components/IdeaCard.tsx` — add a "Make Thumbnail →" `<Link to="/thumbnail" search={{ title: idea.hook, subtitle: idea.foreshadow }}>` button next to the existing copy row.

`routeTree.gen.ts` is auto-generated; not touched.

## Page behavior

State (all `useState` inside the route component):
- `bgImage: HTMLImageElement | null`, `overlayColor` (#000), `overlayOpacity` (0.35)
- `title`, `titleSize` (52), `titleColor` (#fff), `titleShadow` (#000), `titleBlur` (10), `titleAlign` ("center"), `titleY` (0.62)
- `subtitle`, `subtitleSize` (24), `subtitleColor` (#ffe066), `subtitleShadow`, `subtitleBlur`, `subtitleAlign`, `subtitleY` (0.74), `subtitleShow` (true)
- `emoji` ("🔥"), `emojiSize` (64), `emojiX` (0.5), `emojiY` (0.5), `emojiShow` (true)
- `fontFamily` (registered name of loaded font, default `Bebas Neue`), `fontStatus` ("idle" | "loading" | family name)

On mount: read `title`/`subtitle` from `Route.useSearch()` and seed state; preload the default font.

A `useEffect` watching every state field calls `render(ctx, state, 1)` on the 360×640 canvas.

Download: create offscreen 1080×1920 canvas, call the same `render(ctx, state, 3)`, `toDataURL("image/png")`, trigger `<a download="rameai-thumbnail.png">`.

## Font loading

```ts
const cache = new Map<string, Promise<string>>();
export function loadFont(e: FontEntry) {
  if (!cache.has(e.family)) {
    const p = (async () => {
      const ff = new FontFace(e.family, `url(${e.url})`);
      await ff.load();
      document.fonts.add(ff);
      return e.family;
    })();
    cache.set(e.family, p);
  }
  return cache.get(e.family)!;
}
```
Clicking a font card sets `fontStatus = "loading"`, awaits `loadFont`, then sets `fontFamily` + `fontStatus = family` and triggers re-render. Canvas uses `ctx.font = \`italic 700 ${size}px "${fontFamily}", serif\`` (italic/weight only when the font entry declares them; stored on each catalog entry).

## Emoji rendering

`ctx.font = \`${emojiSize}px "Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif\`` with no shadow, drawn at (`emojiX * w`, `emojiY * h`), `textAlign="center"`, `textBaseline="middle"`. Emoji picker is a 7-col grid; selected emoji shows orange (#E85D1B) border.

## Styling

Reuses existing shadcn primitives (`Button`, `Input`, `Slider`, `Tabs`, `Switch`, native `<input type="color">` wrapped to match). Font cards: `grid grid-cols-2 gap-[5px]`, `rounded-md border-[0.5px] border-border/60 bg-secondary p-3`, selected → `border-[1.5px] border-[#E85D1B]`. Layer tabs use the existing pill `TabsList`/`TabsTrigger` style with `data-[state=active]:bg-[#E85D1B] data-[state=active]:text-white`. Upload + Download sit side by side, full width, below the canvas on mobile.

## Search params

```ts
const schema = z.object({
  title: fallback(z.string(), "").default(""),
  subtitle: fallback(z.string(), "").default(""),
});
export const Route = createFileRoute("/thumbnail")({
  validateSearch: zodValidator(schema),
  component: ThumbnailPage,
});
```

## Out of scope

No backend changes, no saving thumbnails to the library, no multi-image layers, no draggable layer positioning beyond the X/Y sliders.
