# iconoodle

Draw an icon set by hand in the browser and download it. The set stays in `localStorage`, so a reload keeps the drawings.

## Run

```bash
npm install
npm run dev
```

The dev server listens on http://127.0.0.1:43123.

Design notes for later work live in `.cursor/skills/`. They are Emil Kowalski's skills, MIT licensed, copied from [emilkowalski/skills](https://github.com/emilkowalski/skills).

`npm run build` typechecks and builds the static app. `npm run verify` checks the document, the stroke path, and the downloads without a browser.

## Drawing

The first screen is one icon. Draw it, then Next (or Enter, or the right arrow) saves the stroke you already committed and opens the next slot. Back and the left arrow return to the previous icon. The count above the name reads like `7 of 24`. The grid, the consistency checker, the size preview, and the mockups live on Set.

## Architecture

`src/document.ts` owns the set. Each icon stores the pen samples, its export name, and a concept that stays put when you change the tracing library. Weight, snap, cleanup, and the library sit on the set. `edit` is the only writer. Undo keeps earlier copies of the set in memory and does not write them to storage.

`src/compile.ts` is the only function that turns samples into a picture. The slot grid, the artboard, the preview strip, and the downloads all call `compileIcon`.

`src/export.ts` packs that picture as SVG files, a sprite, React components, style variants, and a Figma sheet. `src/App.tsx` is the drawing surface, the shortcuts, and the file save.

`src/themes.ts` is the list of starter concepts for each product type. The first screen, and New set, ask you to pick a library and then one of those themes. UI basics on Lucide is the same set the app used to open with.

## The rest of the set

`src/check.ts` compares each drawn icon with the median of the set. It flags optical size, keyline padding, and visual weight. The current icon shows a short line under the artboard. The full grid of flags is on Set.

Straight, Circle, and Close run when a stroke is committed. They live on the set, next to snap, and they do not rewrite the stored samples. Straight collapses a wobble that stays within 0.6 units of a line. Circle replaces a stroke that already fits a circle or a wide arc. Close joins ends that are already within 1.4 units. The pen you are still drawing is left alone.

Variants downloads the set nine times: round, square, and butt, at 1.5, 2, and 2.5. SVG has no square or butt join, so square uses a miter join and butt uses a bevel join. Copy SVG puts the selected icon on the clipboard. Figma sheet is one SVG with a named group per icon, spaced on a grid so the paste lands as separate layers.

Share copies a read-only link. The set is compressed with `lz-string` into the URL hash. Opening it shows a gallery and does not write over the set in this browser. There is no server.

## Tracing libraries

Pick Lucide, Heroicons, Phosphor, Tabler, or Material Symbols when you start a set. You can switch later from Set. Switching changes the faint outline only. Export names stay as they were when the set was created, so a drawing you already named is not renamed out from under you. Each library is loaded when you choose it, and each glyph is its own chunk.

| Library | License | Holder |
| --- | --- | --- |
| [Lucide](https://lucide.dev) | [ISC](https://github.com/lucide-icons/lucide/blob/main/LICENSE) | Lucide Contributors |
| [Heroicons](https://heroicons.com) | [MIT](https://github.com/tailwindlabs/heroicons/blob/master/LICENSE) | Tailwind Labs |
| [Phosphor](https://phosphoricons.com) | [MIT](https://github.com/phosphor-icons/core/blob/main/LICENSE) | Phosphor Icons |
| [Tabler](https://tabler.io/icons) | [MIT](https://github.com/tabler/tabler-icons/blob/main/LICENSE) | Paweł Kuna |
| [Material Symbols](https://fonts.google.com/icons) | [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0) | Google |

`compileIcon` never reads the guide, so the downloads contain only the strokes you drew. A slot with no match in the chosen library has no outline. The footer names the library you are tracing.

## Why a centerline

The icons are open polylines with round caps and a shared `stroke-width` of 1.5, 2, or 2.5 on a 24 by 24 grid. `simplify-js` drops pen jitter before the path is built. Snap, when it is on, rounds a copy of the samples to the grid and leaves the stored hand alone.

A filled outline bakes the width into the shape. Changing the set weight would mean rebuilding every outline, and small wobbles become blobs at 16px. A centerline keeps one width for the whole set, and that width is still a stroke when the SVG scales to 16, 20, 24, or 32. `perfect-freehand` is not a dependency.

## Next

- Icon font. OTF and WOFF2 are not exported. A glyph needs a filled outline, and WOFF2 needs an encoder this app does not ship. A font export should start from a filled outline inside `compileIcon` and stay behind `exportSet`.
- Drag to reorder the set.
- A width that follows pen pressure, still inside `compileIcon`, using the pressure already stored on each sample.
