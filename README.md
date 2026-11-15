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

## Why a centerline

The icons are open polylines with round caps and a shared `stroke-width` of 1.5, 2, or 2.5 on a 24 by 24 grid. `simplify-js` drops pen jitter before the path is built. Snap, when it is on, rounds a copy of the samples to the grid and leaves the stored hand alone.

A filled outline bakes the width into the shape. Changing the set weight would mean rebuilding every outline, and small wobbles become blobs at 16px. A centerline keeps one width for the whole set, and that width is still a stroke when the SVG scales to 16, 20, 24, or 32. `perfect-freehand` is not a dependency.

## Next

- Icon font. OTF and WOFF2 are not exported. A glyph needs a filled outline, and WOFF2 needs an encoder this app does not ship. A font export should start from a filled outline inside `compileIcon` and stay behind `exportSet`.
- Drag to reorder the set.
- A width that follows pen pressure, still inside `compileIcon`, using the pressure already stored on each sample.
