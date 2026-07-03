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

## Status / next
- ✅ Adv Edit text layers (the foundation that forces the model).
- ✅ Visible **layers panel** (the Konva stage IS the model); **shapes** (rect/ellipse/line/arrow).
- ✅ **Persistent overlay** — non-destructive across View/Edit/ASCII; flatten only for output (`emitBinaryEdit`/ASCII) or the geometry-seam bake; `relayout()`/`rebaseline()`/`clear()` keep it registered.
- ✅ **Unified Ctrl+Z** — vector snapshots folded into `editor-core` (`{blob,url,overlay}`); one stack across pixel + vector.
- ✅ **Magic-wand selection** — pixel mask via `fill.js` `computeRegionMask`, constrains the pixel tools (`edit-select.js`, separate from Konva).
- ✅ **Geometry coord-transform** — objects ride rotate/flip/crop/resize/expand by the same affine and stay editable (`applyGeometry`), replacing the bake-first seam.
- ✅ **Broader Konva primitive set** — `Konva.Rect`, `Circle`, `Ellipse`, `Ring`, `Wedge`, `Arc`, `Line`, `Arrow`, `RegularPolygon`, and `Star` join the shape model; same `name:'obj'` plumbing, layers, geometry ride-along, serialization, and flatten path.
- ✅ **Transformer controls** — aspect lock, centered scaling, flip toggle, rotation snaps, and a min-size bound box expose the useful `Konva.Transformer` surface without letting objects collapse to unusable sizes.
- ✅ **Advanced shape styling** — dash presets, line cap/join, shadow blur/colour, opacity, fill/stroke/width, and shared x/y/size/rotation controls map onto `Konva.Shape` and `Konva.Node` APIs.
- ✅ **Shape-specific geometry** — rect corner radius, circle/wedge/polygon radius, ring/arc inner radius and angle, star points/inner radius, and arrow head/start controls expose the relevant per-class APIs.
- ✅ **Group and z-order commands** — multi-selected top-level objects can be grouped/ungrouped with `Konva.Group`; selected objects can be sent to front/back while the Transformer remains on top.
- ✅ **Layer panel polish** — rows show type icons and selected state, names can be edited inline, rows can lock/unlock objects (`listening(false)`/non-draggable), duplicate objects, hide/show, reorder, and delete.
- ✅ **Per-object blend mode** — a Blend `<select>` in the selected-object toolbar sets the node's `globalCompositeOperation` (Normal/Multiply/Screen/Overlay/Darken/Lighten/Dodge/Burn/Hard-light/Soft-light/Difference/Exclusion). Persists on the node (serialized in the overlay JSON, so unified Ctrl+Z covers it) and is honoured by `flattenToCanvas` on export.
  - **CAVEAT — blends objects vs each OTHER, not vs the base image.** `flattenToCanvas` renders the Konva stage to its own canvas (`stage.toCanvas`) and *then* `drawImage`s it over the base. So a blend mode composites an object only against the overlay objects **behind** it within the stage — it does **not** see the raster base. True object-vs-base blending would need a per-object flatten-against-base pass (render base → object with gco → read back), which v1 does not do; the control is labelled/scoped accordingly ("blend with the objects BEHIND it in the overlay").
- ✅ **Keyboard + richer selection** — Delete/Backspace removes selected vector objects, Escape deselects, arrows nudge, Shift+arrows nudge farther, and Ctrl/Cmd+D duplicates. Shift/Ctrl/Meta-click toggles multi-select and empty-stage drag creates a Konva marquee selection.
- ✅ **Shape controls + transform normalization** — selected objects expose shared opacity, x/y, size, rotation, fill/stroke, and blend controls; rects expose corner radius, polygons expose sides, and stars expose points/inner radius. Transformer scaling is normalized back into shape geometry on `transformend`.
- ✅ **Snapping + inline text edit** — dragging snaps selected objects to stage/object edges and centers; double-click/double-tap text labels opens a DOM textarea and commits back into the Konva label.
- ✅ **Precision layout tools** — a helper Konva layer provides non-serializing grid lines and visible snap guides; align/distribute commands batch-move the visible Transformer selection while helper nodes stay out of overlay JSON and flatten-copy export.
- ✅ **Rich text controls** — selected text labels expose bold/italic/underline/strike, horizontal/vertical alignment, line height, wrap, text box width/height, padding, text stroke, and text shadow through Konva `Text` attributes.
- ✅ **Line/arrow point editing** — a separate helper layer provides endpoint handles plus midpoint insertion handles for line/arrow points; helper nodes are not part of overlay serialization and are hidden during flatten-copy export.
- Next (optional polish): true object-vs-base blend, copy/paste clipboard integration, local image stickers, gradient/pattern fills, per-object filters, and a separate Phase 3 composition plan.
