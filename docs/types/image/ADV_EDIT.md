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
| **Adv. Edit** (composition) | re-editable text and shape objects; sanitized local image/sticker objects with crop/frame controls; gradient/local-pattern fills; per-object filters and base-aware blend modes; layers, groups, transforms, multi-select, keyboard actions, marquee selection, and snapping | **yes — lazy** |
| **ASCII** | ASCII studio | no |

Konva is **vendored** (`docs/vendor/konva/konva.min.js`, MIT, UMD → `window.Konva`) and **lazy-loaded on first entry to Adv Edit** via `loadGlobal`. View/Edit/ASCII on an image with no overlay never fetch it. Flagged **heavy** for the offline precache (opt-in).

## Transitions (warn only when lossy)
- View/Edit → **Adv Edit**: lazy-load Konva; base = background image; restore existing overlay objects. On entry, if the overlay is **empty**, `rebaseline()` re-aligns the stage to the current base (picks up any geometry done while away).
- Adv Edit → Edit/View: overlay **kept** (rendered, non-interactive — `setInteractive(false)`); pixel tools edit the base **under** it. It stays registered to the image across fit/zoom/pan via `relayout()` (a CSS scale on the container; object coords untouched). **Leaving Adv never bakes.**
- **Geometry op in Edit with a non-empty overlay** (rotate/flip/crop/resize/expand): the overlay objects are **transformed by the same matrix** (kept editable, not baked). The op reports a natural-space affine (`geometry-affine.js` `affineForGeometry`) via the `onGeometry` hook; the renderer stashes it and, on the next img load (base re-encoded at its new size), calls `advController.applyGeometry(affine)`, which recomposes each object's transform `(naturalNew→stageNew) ∘ affine ∘ (stageOld→naturalOld) ∘ oldTransform` (Konva `Transform` multiply/decompose).
- A pixel tool painting **onto** an object → pixels go **under** the overlay (text/shapes stay on top + editable); no flatten.
- → **ASCII / export / download**: flatten a **copy** (base+overlay) via the wrapped `onBinaryEdit.getBytes`; editor keeps both models editable. ASCII feeds a 1× flattened copy, while image export can explicitly choose 0.5×, 1×, 2×, or 3× pixels.

**Key principle:** flatten for *output* is non-destructive (throwaway copy, computed on demand in `getBytes`). **Merge to image** is the explicit destructive operation; ordinary geometry transforms keep overlay objects editable.

## Undo/redo — ✅ unified
Konva has **no built-in undo**, so vector snapshots are folded into the existing `editor-core` stack → **one unified Ctrl+Z** across pixel + composition edits. Each history entry is `{blob, url, overlay}`, where `overlay` is the small versioned File Viewer document model rather than `Layer.toJSON()`. In-session snapshots omit repeated bitmap payloads and resolve asset IDs through the mounted controller; downloaded `.fv-overlay.json` documents embed only referenced sanitized bitmap data URLs. `overlayHooks.{snapshot,restore}` bridge that model into the shared history. Raw Layer/Stage JSON is accepted only as legacy migration input, and legacy image nodes without bitmap data are reported and omitted.

## Local assets, filters, and blending

- File and pasted-image inputs are decoded locally, repainted into a bounded PNG canvas (maximum 16 MB input and about 4 megapixels), and then used as a Konva image or pattern. Repainting strips metadata and active SVG content; SVG and remote asset URLs are deliberately unsupported.
- Image objects retain semantic crop percentages plus frame stroke/rounding, so their viewport size and their source crop remain independently editable and portable.
- Solid, linear-gradient, radial-gradient, and repeating local-pattern fills store renderer-independent descriptors. Runtime `HTMLImageElement`/canvas references never enter the document model.
- Grayscale, invert, sepia, blur, brightness, and contrast are per-object Konva filters. Appearance/crop mutations clear and rebuild the affected cache before drawing, including descendant changes on a filtered label or group.
- Normal-only output uses one fast overlay render. If any visible top-level object has a non-normal blend, flatten temporarily isolates each object and composites its canvas onto the accumulated raster with that object's `globalCompositeOperation`. Multiply/screen/etc. therefore see the raster base and all earlier objects, not a transparent intermediate layer.

## Connection points
- **Dirty/`onBinaryEdit`** — vector edits also mark the doc dirty.
- **Export/download/compare** — flatten-copy before encode.
- **Reset/teardown** — dispose the Konva stage + free its canvas; Reset clears the overlay.

## Text objects (first feature)
`Konva.Label` = `Konva.Tag` (background: fill + opacity + corner radius) + `Konva.Text` (content/font/size/fill). So **bg colour + transparency** come free from the Tag. Multiple labels; click to select (Transformer handles); delete; Cancel never removes committed objects.

## Module layout
- `adv-edit.js` — the Adv Edit mode: lazy Konva, stage over `.imgv-stage`, object CRUD + selection + transform, base-aware flattening, geometry registration, and lifecycle.
- `adv-edit-document.js` — bounded versioned renderer-independent schema plus raw-Konva migration input.
- `adv-edit-io.js` — document construction/rebuild, embedded-asset import/export, and Save/Load overlay UI.
- `adv-edit-composition.js` — local bitmap sanitization/registry, crop/frame, fill/pattern, filter cache invalidation, and composition toolbar wiring.
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
