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
| **Adv. Edit** (vector) | text **objects** (drag, font/size/colour, **bg colour + opacity**, multiple, re-editable), shapes, layers, transform handles | **yes — lazy** |
| **ASCII** | ASCII studio | no |

Konva is **vendored** (`docs/vendor/konva/konva.min.js`, MIT, UMD → `window.Konva`) and **lazy-loaded on first entry to Adv Edit** via `loadGlobal`. View/Edit/ASCII on an image with no overlay never fetch it. Flagged **heavy** for the offline precache (opt-in).

## Transitions (warn only when lossy)
- View/Edit → **Adv Edit**: lazy-load Konva; base = background image; restore existing overlay objects.
- Adv Edit → Edit/View: overlay **kept** (rendered, non-interactive); pixel tools edit the base under it.
- **Geometry op in Edit with a non-empty overlay**: transform overlay object coords by the same matrix (own the math) so they stay aligned + editable. *(v1: warn + flatten if not yet implemented.)*
- A pixel tool painting **onto** an object → flatten that object (**warn**, loses its editability).
- → **ASCII / export / compare / download**: flatten a **copy** (base+overlay); editor keeps both models editable. **Warn on ASCII if overlay non-empty.**

**Key principle:** flatten for *output* is non-destructive (throwaway copy). The only destructive flatten is pixel-painting over a vector object.

## Undo/redo
Konva has **no built-in undo**; the pattern is *serialize the stage to JSON and snapshot*. We fold vector snapshots into the existing `editor-core` undo stack → **one unified Ctrl+Z** across pixel + vector (each entry `{rasterBlob, overlayJSON}`). Reuses the global keydown router (`edit-undo-key.js`).

## Connection points
- **Dirty/`onBinaryEdit`** — vector edits also mark the doc dirty.
- **Export/download/compare** — flatten-copy before encode.
- **Reset/teardown** — dispose the Konva stage + free its canvas; Reset clears the overlay.

## Text objects (first feature)
`Konva.Label` = `Konva.Tag` (background: fill + opacity + corner radius) + `Konva.Text` (content/font/size/fill). So **bg colour + transparency** come free from the Tag. Multiple labels; click to select (Transformer handles); delete; Cancel never removes committed objects.

## Module layout
- `adv-edit.js` — the Adv Edit mode: lazy Konva, stage over `.imgv-stage`, object CRUD + selection + transform, the per-selection edit toolbar, in-mode snapshot undo, `flatten(baseImg)→canvas`, `serialize()/deserialize()`, `destroy()`.
- Renderer owns the mode framework + wires flatten into ASCII/export.

## Status / next
- v1: Adv Edit text layers (this is the foundation that forces the model).
- Next: visible **layers panel** (the Konva stage IS the model), **shapes** (rect/ellipse/line/arrow), cross-mode **geometry coord-transform**, **selection/magic-wand** (pixel mask via `fill.js`, separate from Konva).
