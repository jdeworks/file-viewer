# Editor Roadmap — Raster & Vector Images

Covers: PNG, JPG, WebP, BMP, AVIF, GIF, TIFF, HEIF/HEIC, ICO/CUR, SVG, Procreate, Sketch, ORA (OpenRaster), PSD/XCF/KRA.

---

## Current state

`docs/types/image/renderer.js` is the shared raster editor (split across sibling modules — see "Shared toolbar / modular note"). `EDITABLE_MIME` is now **PNG, JPEG, WebP, AVIF, BMP, GIF** (BMP/GIF re-encode to PNG; GIF edits the first frame). JXL decodes to a PNG canvas via `jxl-decode.js` and is editable through that. Other raster types (TIFF, HEIF, ICO, Procreate, Sketch, layered) are **view-only** sub-renderers.

Opens in plain **view mode**; the editing toolbar is hidden until you press **Edit**. ASCII + Edit are stacked toggle buttons anchored left by the zoom controls (`doc.html` `.imgv-mode-col`). The toolbar is grouped into **tabs** (`edit-tabs.js`): Common / Draw / Text / Adjust / Size / Background — each tool's button is in Common AND (linked via `data-link` proxy) its own tab, which holds the fine-tuning.

**Editing tools shipped (the full `EDITABLE_MIME` set):**
- Pencil / eraser free-draw (colour + size); overlay canvas committed on stroke end
- **Fill bucket** (`fill.js`): seed / connected-shade / **Sobel edge-stop region** modes, Euclidean or **perceptual (redmean)** distance, tolerance (default 12), **feathered** edges
- Undo / redo — blob snapshots via `editor-core.js`; **Ctrl+Z / Ctrl+Y** routed through a global keydown router (`edit-undo-key.js`) that reaches the active editor even when focus is on a slider
- Text overlay — drag-to-place ghost, bakes at fractional image coords; font / size / colour
- Rotate 90 L/R, flip H/V (`edit-geometry.js`)
- **Crop** (drag rect) and its opposite, **Expand** — pad N px around the image without resizing, transparent (PNG) or solid fill
- **Resize** — W/H in px or %, aspect-lock, resample quality
- Brightness / contrast / saturation / **hue** sliders — live CSS-filter preview, baked on Apply (`edit-filters.js`)
- **Background removal** (`edit-bg.js`) — sample colour, tolerance flood to transparent, saves PNG; plus a **Checkerboard** transparency-display toggle
- **Compare** original vs current (split / overlay / diff) — `compare-view.js`
- Export format selector — PNG / JPEG / WebP / AVIF (`canvas.toBlob`)
- ASCII art studio (separate toggle, `ascii/` engine)
- `ctx.onBinaryEdit` fires after every destructive op so the host tracks dirty state

**SVG** (`svg/renderer.js`): Monaco editor (left) + sandboxed iframe live preview (right); scripts / `on*` attrs stripped before injection; Copy-SVG. Monaco theme **follows the in-app light/dark toggle** (`body.fv-dark` / `<html data-theme>`), updating live — not the OS `prefers-color-scheme`.

**HEIF** (`heif/renderer.js`): libheif.js (~800 KB) decodes to canvas. Multi-image thumbnail strip with click-to-select. Download-as-PNG only.

**ICO** (`ico/renderer.js`): Pure-JS parser, renders each embedded size (PNG-embedded or BMP-in-ICO) into individual `<canvas>` elements in a grid. Read-only.

**TIFF** (`tiff/renderer.js`): Tries native browser decode first (Safari/macOS). Falls back to metadata table via `parseTiffMetadata`. No cross-browser pixel decode yet.

**Procreate** (`procreate/renderer.js`): Extracts `thumbnail.png` / `QuickLook/Thumbnail.png` from the ZIP archive and renders it on a checkerboard canvas. Structural metadata not surfaced.

**Sketch** (`sketch/renderer.js`): Extracts `previews/preview.png`, parses `meta.json` and `pages/*.json`. Shows preview image + pages/artboards list + fonts. Read-only.

**ORA** (`layered/ora/renderer.js`): Shows `mergedimage.png` as primary view. Parses `stack.xml` for layer list with blend mode labels. Clicking a layer row loads its individual PNG. Read-only toggle visibility is display-only (does not re-composite in ORA renderer).

**PSD/XCF/KRA** (`layered/renderer.js`): Full layer panel with eye-toggle recomposite (PSD via ag-psd, KRA via custom decoder, XCF shows placeholder canvas). Opacity slider per layer. Export-as-PNG toolbar button.

---

## Viewer enhancements (no write-back needed)

- ✅ **SHIPPED — EDITABLE_MIME now includes BMP/GIF** (re-encode to PNG; GIF edits first frame), plus AVIF and JXL-via-PNG.

- **TIFF cross-browser decode** — Integrate `UTIF.js` (~60 KB, MIT, already used in some viewers) or `tiff.js`. Decode to ImageData, push to canvas, hand off to the shared raster editor toolbar. Replace the "metadata only" fallback path in `tiff/renderer.js`. — M, lib: UTIF.js or tiff.js

- **HEIF EXIF panel** — libheif exposes raw EXIF bytes via `get_metadata()`; pipe them through the existing `exif.js` parser already used by the main renderer and show the panel below the canvas. — S (no new lib)

- **ICO multi-size download** — Add a "Download size" button per cell in the ICO grid so individual resolutions can be saved as PNG (already have canvas, just need `canvas.toBlob`). — S

- **ICO animated cursor preview** — For CUR files display the hotspot crosshair overlay on the canvas cell. Already parsed (`hotX`, `hotY` in `entry`). — S

- **Procreate layer count + artboard metadata** — The `.procreate` ZIP contains a binary plist (`Document.archive`). Use `bplist-parser` (browser build ~15 KB) to surface canvas size, layer count, colour profile, and creation date. No pixel decode needed. — M, lib: bplist-parser

- **Sketch artboard thumbnail extraction** — Parse individual `pages/*.json` layer trees; for symbol masters / artboard layers that contain `_images/` entries, extract and display as a scrollable artboard strip. Incremental — only load visible artboards. — M

- **GIF frame strip** — Parse GIF frame count and delay table with a small pure-JS GIF header parser (~1 KB, no lib needed — the spec is compact). Show frame thumbnails and a frame count badge. No play/seek yet (that is an editing feature). — M

- **SVG element tree panel** — Parse the SVG DOM and show a collapsible element tree (tag, id, class) alongside the Monaco editor. Clicking an element selects it in Monaco using `editor.setSelection()`. Read-only tree, no attribute editing yet. — M

---

## In-browser editing (download-on-save)

All raster editing uses `canvas.toBlob()` and a blob URL download. No server required.

### Shared raster toolbar additions

- **Layers panel (Konva.js)** — Replace the single flat canvas model with a Konva Stage + multiple Konva.Layer objects. Each drawing operation, text block, or shape lives on its own layer. Layer panel shows thumbnails (32×32), eye toggle, opacity slider, blend mode selector, drag-to-reorder. Flatten-to-PNG on export. This is the largest single structural change to `renderer.js`. — L, lib: Konva.js (~480 KB minified, CDN-predownloadable)

- **Brush / paint engine upgrade** — Replace the raw canvas mouse listener with a pressure-aware, anti-aliased brush engine. Options: (a) keep native Canvas2D but add midpoint smoothing with `quadraticCurveTo` between pointer samples — very small diff; (b) use Fabric.js `PencilBrush` which supports width-pressure simulation. The current `buildOverlay()` approach plugs directly into either. — M (option a) / L (option b), lib: Fabric.js (~900 KB) or none

- **Shape tools** — Rectangle, ellipse, line, arrow, polygon overlays. Draw as a preview ghost during drag (redraw on each `pointermove`), commit on `pointerup`. Fit naturally alongside the pencil/eraser toggle. Reuses `applyTransform` pattern. Arrow = line + filled arrowhead at endpoint. — M

- ✅ **SHIPPED — Fill bucket** (`fill.js`): seed / connected-shade / Sobel edge-stop region modes, Euclidean or perceptual (redmean) distance, feather. Its BFS+Sobel walk is factored into `computeRegionMask` and reused by the magic-wand selection.

- ✅ **SHIPPED — Magic-wand selection** (`edit-select.js`): 🪄 click a region (reusing the shared fill tolerance/mode/perceptual) to build a pixel **mask** via `computeRegionMask`; shown as a tint + boundary on its own overlay canvas. While a selection is active, the pixel tools (fill / pencil / eraser) are **constrained to it** — the renderer clips each edit with `clipToBase` (restore base pixels outside the mask). Deselect clears it; a dimension-changing geometry op invalidates it.
  - **Still to add:** rectangular / elliptical marquee + lasso (other ways to build the same mask), and selection ops (cut / copy / nudge). The mask plumbing (`getMask`/`clipToBase`) is in place; these are additional mask SOURCES + actions. — M

- **Color adjustments panel** — brightness/contrast/saturation/**hue** sliders shipped (`edit-filters.js`); **Levels** (black/white/gamma) ✅ SHIPPED (`levels.js` LUT + live preview, in the Adjust tab). Still to add:
  - Curves (interactive cubic Bezier per channel) — build a 256-entry LUT from four control points, apply via `putImageData`. UI: small `<canvas>` with draggable handles, no lib needed. The LUT-apply plumbing (`levels.js` `applyLevels`) generalizes.
  - ✅ SHIPPED — Sepia / greyscale / invert one-click presets (`edit-filters.js`, `ctx.filter` bake, Adjust tab).
  — M per item, no lib required

- **Blend modes on composited layers** — When the Konva layers panel is present, expose a blend-mode `<select>` per layer using the 26 CSS mix-blend-mode values (`multiply`, `screen`, `overlay`, `color-dodge`, `hard-light`, etc.). Konva maps these to Canvas2D `globalCompositeOperation`. The export flatten step uses `drawImage` with each layer's blend mode active. — M (depends on Konva layers task above)

- **Clone stamp / heal** — Sample a source region (alt-click), paint it at the destination. The copy-on-paint blit is a `drawImage` from a scratch canvas patch. No lib. — M

- **Perspective crop** — Four-corner drag UI, then `ctx.transform()` with the computed homography matrix. A minimal 3×3 homography solver is ~40 lines of JS. — L (no lib, but math-heavy)

- **SVG path node editor** — Parse `<path d="...">` into a segment list (M, L, C, Q, Z). Render control points as draggable SVG `<circle>` overlays on top of the preview iframe (since the iframe is sandboxed, overlay must be a sibling `<svg>` in the host). Drag updates the `d` attribute in Monaco in real time. Requires: a path-data parser (~500 lines JS, e.g. `svg-path-parser` or hand-rolled) and a hit-test for segment type. — L, lib: svg-path-parser (~8 KB)

- **SVG attribute inspector** — Clicking an element in the SVG preview (via `postMessage` from inside the iframe or by selecting in the Monaco editor) opens a sidebar with all computed attributes as editable `<input>` fields. Changing a value rewrites the attribute in the Monaco model (which triggers the 300 ms live preview debounce). — M

- **ICO editor / composer** — Load PNG files (drag-drop or file picker) and compile a new ICO blob. The ICO binary format is fully parseable in JS (~150 lines). Allow selecting which sizes to include (16, 32, 48, 64, 128, 256). Export via blob URL download. — M (no lib)

- **ORA layer visibility re-composite** — The ORA renderer currently shows `mergedimage.png` only. Add a "Re-composite" button: read each `data/layerN.png` blob, decode via `createImageBitmap`, blit in Z-order with each layer's `opacity` and `composite-op` (mapped to Canvas2D `globalCompositeOperation`), export result as PNG. This mirrors what PSD/KRA already do in `layered/renderer.js`. — M

- **ORA re-export** — After toggling layer visibility or adjusting opacity, reassemble the ZIP in-memory using JSZip (already bundled), replace `mergedimage.png` with the re-composited canvas blob, keep all other entries intact, and offer as a download. This is the only format where round-trip export is straightforward because the source layers are lossless PNGs inside a ZIP. — M, lib: JSZip (already vendored)

---

## Full write-back editing (companion required)

Companion = Tauri + Axum local server (planned, not yet built). Save = HTTP PUT to local file path.

- **Auto-save on edit** — When `ctx.onBinaryEdit` fires with `dirty: true`, POST the bytes to the companion's write endpoint instead of (or in addition to) triggering the download flow. Debounce 1–2 s. — S (once companion exists)

- **TIFF round-trip save** — Decode TIFF via UTIF.js, edit on shared canvas, re-encode with `UTIF.encodeImage()`. UTIF supports lossless output. Multi-page TIFFs need a page selector in the toolbar and per-page encode on save. — M, lib: UTIF.js

- **SVG save-in-place** — The SVG editor already has the full text in Monaco. Companion write-back is a direct `PUT` of `model.getValue()`. The only addition is a Save button that calls the companion API. — S

- **Sketch live annotation export** — Write an annotation layer as a new `pages/annotations.json` inside the Sketch ZIP (JSZip repack) and save with companion. Full vector editing is out of scope — Sketch for Mac owns that. — L (spec unclear)

- **PSD layer save** — ag-psd exposes `writePsd()`. After the user edits layer visibility/opacity in the panel, call `writePsd(psd)` to get a new ArrayBuffer and write via companion. Pixel-level layer edits require re-injecting `imageData` into the ag-psd layer objects — non-trivial. — L, lib: ag-psd (already vendored)

---

## Shared toolbar / modular note

**All raster types must share one toolbar.** The current `renderer.js` already enforces this via `EDITABLE_MIME`: the toolbar is built once and its presence is gated by that set. The correct extension path is:

1. Add TIFF (after UTIF decode), BMP, GIF to `EDITABLE_MIME`. Each sub-renderer should decode to a canvas/blob and re-enter the main `renderer.js` flow rather than rendering independently.
2. The SVG editor (`svg/renderer.js`) is intentionally separate — it edits text, not pixels. Keep it separate but share CSS custom properties and the export helper in `exports.js`.
3. ICO, Procreate, Sketch remain sub-renderers with their own toolbar slices. ICO editing (composer) can be a self-contained panel within `ico/renderer.js`.
4. If Konva.js layers are added, they go into a new `docs/types/image/layers.js` module imported lazily by `renderer.js`. This keeps the initial bundle small for users who never open the layers panel.
5. The `ctx.onBinaryEdit` callback is the extension point for companion write-back — it is already wired in every destructive operation. No changes to the toolbar needed when companion ships.
