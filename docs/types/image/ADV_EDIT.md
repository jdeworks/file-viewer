# Advanced (vector) image editing — architecture

The image editor has **two coexisting representations**, kept editable until you choose to flatten:

- **Raster base** — the pixel blob (what crop/resize/rotate/filters/BG/draw mutate; `editor-core.js`).
- **Vector overlay** — re-editable Konva objects (text, later shapes). Non-destructive.

**Displayed image = raster base composited with the vector overlay.** That composite is the seam.

## Four modes (`doc.html` mode-col → renderer)
| Mode | Owns | Konva |
|---|---|---|
| **View** | display + fit/zoom/pan | no |
| **Edit** (pixel) | crop, resize, rotate/flip, filters, BG, expand, pencil/eraser/fill, export format | no |
| **Adv. Edit** (vector) | text **objects** (drag, font/size/colour, **bg colour + opacity**, multiple, re-editable), shapes (rect/circle/ellipse/ring/wedge/arc/line/arrow/**polygon/star**), **per-object blend mode**, layers, groups, transform handles, multi-select, keyboard nudge/delete/duplicate, marquee select, snapping | **yes — lazy** |
| **ASCII** | ASCII studio | no |

Konva is **vendored** (`docs/vendor/konva/konva.min.js`, MIT, UMD → `window.Konva`) and **lazy-loaded on first entry to Adv Edit** via `loadGlobal`. View/Edit/ASCII on an image with no overlay never fetch it. Flagged **heavy** for the offline precache (opt-in).

## Transitions (warn only when lossy)
- View/Edit → **Adv Edit**: lazy-load Konva; base = background image; restore existing overlay objects. On entry, if the overlay is **empty**, `rebaseline()` re-aligns the stage to the current base (picks up any geometry done while away).
- Adv Edit → Edit/View: overlay **kept** (rendered, non-interactive — `setInteractive(false)`); pixel tools edit the base **under** it. It stays registered to the image across fit/zoom/pan via `relayout()` (a CSS scale on the container; object coords untouched). **Leaving Adv never bakes.**
- **Geometry op in Edit with a non-empty overlay** (rotate/flip/crop/resize/expand): the overlay objects are **transformed by the same matrix** (kept editable, not baked). The op reports a natural-space affine (`geometry-affine.js` `affineForGeometry`) via the `onGeometry` hook; the renderer stashes it and, on the next img load (base re-encoded at its new size), calls `advController.applyGeometry(affine)`, which recomposes each object's transform `(naturalNew→stageNew) ∘ affine ∘ (stageOld→naturalOld) ∘ oldTransform` (Konva `Transform` multiply/decompose).
- A pixel tool painting **onto** an object → pixels go **under** the overlay (text/shapes stay on top + editable); no flatten.
- → **ASCII / export / download**: flatten a **copy** (base+overlay) via the wrapped `onBinaryEdit.getBytes`; editor keeps both models editable. ASCII feeds a flattened copy (overlay survives) — no warning needed.

**Key principle:** flatten for *output* is non-destructive (throwaway copy, computed on demand in `getBytes`). The only destructive flatten is the geometry-seam bake (and, later, pixel-painting over a vector object).

## Undo/redo — ✅ unified
Konva has **no built-in undo**; the pattern is *serialize the stage to JSON and snapshot*. Vector snapshots are folded into the existing `editor-core` undo stack → **one unified Ctrl+Z** across pixel + vector. Each history entry is `{blob, url, overlay}` where `overlay` is the stage JSON at that point. `editor-core` captures it via injected `overlayHooks.{snapshot,restore}` (the renderer wires them to `advController.serialize`/`restore`); the overlay pushes onto the SAME stack via injected `pushUndo` (snapped on `dragstart`/`transformstart`/add/delete/layer-op). Restoring `overlay:null` clears the overlay (undoing past the point it existed). Reuses the global keydown router (`edit-undo-key.js`).

## Connection points
- **Dirty/`onBinaryEdit`** — vector edits also mark the doc dirty.
- **Export/download/compare** — flatten-copy before encode.
- **Reset/teardown** — dispose the Konva stage + free its canvas; Reset clears the overlay.

## Text objects (first feature)
`Konva.Label` = `Konva.Tag` (background: fill + opacity + corner radius) + `Konva.Text` (content/font/size/fill). So **bg colour + transparency** come free from the Tag. Multiple labels; click to select (Transformer handles); delete; Cancel never removes committed objects.

## Module layout
- `adv-edit.js` — the Adv Edit mode: lazy Konva, stage over `.imgv-stage`, object CRUD + selection + transform, in-mode snapshot undo, `flatten(baseImg)→canvas`, `serialize()/deserialize()`, `destroy()`.
- `adv-edit-actions.js` — focused helpers for colour normalization, shape-size normalization, keyboard delete/duplicate/nudge/escape routing (`installAdvKeys`), node cloning/naming, and shape geometry reads/writes.
- `adv-edit-controls.js` — `installObjectActions` (delete/duplicate/nudge/group/ungroup on the live selection) and `installShapeControls` (wires every toolbar button + per-shape property input).
- `adv-edit-layers.js` — the Adv Edit layer panel: rows, type icons, rename, lock/unlock, duplicate, visibility, z-order, and row delete.
- `adv-edit-precision.js` — the non-serializing helper layer for grid lines, drag-to-edge/center snap guides (`snapDrag`), and align/distribute commands.
- `adv-edit-points.js` — the non-serializing helper layer for line/arrow endpoint + midpoint-insertion point-editing handles.
- `adv-edit-text.js` — rich text control wiring (bold/italic/underline/strike, align, line height, wrap, padding, stroke/shadow) for selected `Konva.Label` text.
- `adv-edit-toolbar.js` — toolbar defaults and markup for the larger Konva control surface.
- Renderer owns the mode framework + wires flatten into ASCII/export.

## Status

The vector-overlay foundation and editor interaction model described above are implemented. The
single repository backlog for unfinished composition and export work is [TASKS.md](../../../TASKS.md).
