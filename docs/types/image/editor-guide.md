# Image editor guide

A quick reference for the editor's tools — what each does and the gotchas worth knowing.
Everything runs **offline in your browser**; nothing is uploaded. Edits stay in memory until
you **Download** (or **Save**, where available) — closing the tab discards unsaved work.

> Tip: this guide is just a Markdown file (`editor-guide.md`) rendered to HTML — extend it
> freely.

## Modes at a glance

The editor has two layered modes, switched from the toolbar:

- **Pixel editing** (default) — paints directly onto the image's pixels: brush, eraser, fill,
  selection, filters, crop/resize. Destructive (baked into the bitmap), but every step is undoable.
- **Adv Edit** (the **Objects**/vector overlay) — adds *re-editable* text, shapes, and **pasted
  image panes** that float above the image and can be moved/rotated/resized without baking, until
  you flatten on export.

`Ctrl+Z` / `Ctrl+Y` undo/redo across **both** modes — one unified history.

## Selection

Build a selection (a pixel **mask**) to confine the brush/eraser/fill to one region, or to move
those pixels around.

- **🪄 Magic wand** — click a region of similar colour. The *tolerance*, *mode*, and *perceptual*
  options (shared with the Fill bucket) control how far it spreads.
- **▭ Rectangle / ◯ Ellipse marquee** — drag a box / oval.
- **Lasso** — draw a freehand outline; it closes automatically.
- The selection shows an **animated "marching ants"** border so you can see exactly what's inside
  (and whether to **Invert**).

### Working with a selection

- **Constrain tools** — while a selection is active, Fill / Brush / Eraser only "take" *inside* it.
- **⇄ Invert** — select the complement (everything *outside* the current mask).
- **✂ Cut** — delete the selected pixels (leaves transparency).
- **✥ Move** — a **floating** selection (Paint-style): the first move lifts the pixels onto a
  floating piece that **stays selected**. Reposition it as many times as you like; it commits a
  **single** undo step only when you **Deselect** or **leave the Move tool**.
- **Arrow keys** — nudge the selected pixels 1px. **Shift + arrows** move just the *outline*
  (pixels stay put), so you can reframe the selection over a new area and then recolour it.

### Selection gotchas

- A **resize / crop / rotate** changes the image dimensions and therefore **clears** the selection
  — make your selection *after* those geometry edits.
- Move leaves a **transparent hole** where the pixels were lifted from (it's a cut-and-place, not a
  copy). To keep the originals, use **Copy/Paste** instead (see below).
- Arrow nudges are **1px at native resolution** — on a large image that can look tiny on screen.

## Drawing tools

- **Brush / Eraser** — size slider in the Draw tab. Eraser writes transparency (PNG output).
- **Fill bucket** — flood-fills from the click point; *tolerance* sets how close colours must be,
  and the mode/perceptual options match the magic wand.
- **Clone stamp** — **Alt-click** sets the source point, then drag to paint copied pixels (aligned
  clone). A cyan marker pins the current source.
- Gotcha: a draw tool and the selection are **mutually exclusive inputs** — picking a brush turns
  off the wand's click-to-select, but your **mask stays active** and keeps constraining the brush.

## Adjustments

- **Filters** — brightness / contrast / saturation / hue, live preview, baked on **Apply**.
- **Levels** — black / white / gamma.
- **Curves** — drag a tone curve (per-channel: RGB / R / G / B). Click empty space to add a handle,
  double-click to remove.
- Gotcha: live previews swap the displayed image; nothing is committed until you press **Apply**
  (or **Cancel** to revert).

## Adv Edit (text, shapes, panes)

- Add **text**, **shapes** (rect, ellipse, line, arrow, polygon, star, …), and **pasted image
  panes**. Each is a re-editable object with its own fill/stroke, blend mode, and layer.
- Select an object to move/rotate/resize it (corner handles + rotation); **Delete** removes it,
  **Ctrl+D** duplicates, arrows nudge (**Shift** = ×10).
- Gotcha: per-object **blend** modes blend against the objects *behind* them in the overlay, **not**
  the raster image underneath — the overlay flattens first, then draws over the base.
- Objects **flatten onto the image on export/download** — until then they stay independent.

## Extract text (OCR)

- In Adv Edit, **Extract text (OCR)** reads text from the current image. A one-time **~11 MB**
  recognizer downloads on first use (then cached, fully offline). "Digits only" tunes it for
  numbers. Copy or download the result as `.txt`.
- Animated **GIFs**: the player's **Extract text (OCR)** turns each frame into a timestamped
  transcript you can download as `.srt` / `.vtt` / `.txt` / `.json`.

## Saving your work

- **Download** is always available and writes the current edited image. The button is **never**
  removed.
- Export format (PNG / JPEG / WebP / AVIF) is chosen in the toolbar. PNG/WebP keep transparency;
  JPEG flattens it onto white.
- Gotcha: edits live **only in this tab** until you download. There's no autosave.
