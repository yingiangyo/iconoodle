# iconhand

Draw an icon set by hand in the browser and download it. The set stays in `localStorage`, so a reload keeps the drawings.

## Run

```bash
npm install
npm run dev
```

The dev server listens on http://127.0.0.1:43123.

`npm run build` typechecks and builds the static app. `npm run verify` checks the document, the stroke path, and the three downloads without a browser.

## Architecture

`src/document.ts` owns the set. Each icon stores the pen samples. Weight and snap sit on the set, not on the strokes. `edit` is the only writer. Undo keeps earlier copies of the set in memory and does not write them to storage.

`src/compile.ts` is the only function that turns samples into a picture. The slot grid, the artboard, the preview strip, and the downloads all call `compileIcon`.

`src/export.ts` packs that picture three ways. `src/App.tsx` is the drawing surface, the shortcuts, and the file save.

`src/themes.ts` is the list of starter names for each product type. The first screen, and New set, ask you to pick one. UI basics is the same set the app used to open with.

## The rest of the set

`src/check.ts` compares each drawn icon with the median of the set. It flags optical size, keyline padding, and visual weight, and the same flags show on the slot and under the artboard.

Straight, Circle, and Close run when a stroke is committed. They live on the set, next to snap, and they do not rewrite the stored samples. Straight collapses a wobble that stays within 0.6 units of a line. Circle replaces a stroke that already fits a circle or a wide arc. Close joins ends that are already within 1.4 units. The pen you are still drawing is left alone.

Variants downloads the set nine times: round, square, and butt, at 1.5, 2, and 2.5. SVG has no square or butt join, so square uses a miter join and butt uses a bevel join. Copy SVG puts the selected icon on the clipboard. Figma sheet is one SVG with a named group per icon, spaced on a grid so the paste lands as separate layers.

Share copies a read-only link. The set is compressed with `lz-string` into the URL hash. Opening it shows a gallery and does not write over the set in this browser. There is no server.

## Tracing guides

`src/guides.ts` maps a slot name to a Lucide icon. `src/Guide.tsx` loads that icon only when the slot is on screen, one chunk per glyph, so the rest of the library stays out of the first download. The guide is a faint outline behind the 24 by 24 grid. Guide, or H, hides it. Empty slots show the same outline. The preview strip does not, because that strip is the export.

`compileIcon` never reads the guide, so the SVG files, the sprite, and the React components contain only the strokes you drew. `close` traces Lucide's `x`. `edit` traces `pencil`. A renamed slot with no Lucide match has no guide.

Lucide is © Lucide Contributors and is used under the [ISC license](https://github.com/lucide-icons/lucide/blob/main/LICENSE). The app footer repeats that.

## Why a centerline

The icons are open polylines with round caps and a shared `stroke-width` of 1.5, 2, or 2.5 on a 24 by 24 grid. `simplify-js` drops pen jitter before the path is built. Snap, when it is on, rounds a copy of the samples to the grid and leaves the stored hand alone.

A filled outline bakes the width into the shape. Changing the set weight would mean rebuilding every outline, and small wobbles become blobs at 16px. A centerline keeps one width for the whole set, and that width is still a stroke when the SVG scales to 16, 20, 24, or 32. `perfect-freehand` is not a dependency.

## Next

- Icon font. OTF and WOFF2 are not exported. A glyph needs a filled outline, and WOFF2 needs an encoder this app does not ship. A font export should start from a filled outline inside `compileIcon` and stay behind `exportSet`.
- Drag to reorder the set.
- A width that follows pen pressure, still inside `compileIcon`, using the pressure already stored on each sample.
- A second tracing source. Material Symbols (Apache 2.0) would be another map beside `src/guides.ts`, still kept out of `compileIcon`.
