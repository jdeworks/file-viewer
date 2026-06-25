# Adv Edit Roadmap

This roadmap scopes Adv Edit as a serious non-destructive Konva overlay editor for
image and ASCII workflows. It is not a mandate to expose every Konva API. The goal
is a coherent editor surface that preserves undo, export, offline behavior, and the
raster-base/vector-overlay model described in `ADV_EDIT.md`.

## Goal

Make Adv Edit feel like a practical object/layer editor:

- Users can create, select, transform, style, group, order, lock, and delete overlay
  objects without losing editability.
- Vector objects stay registered to the image across View/Edit/ASCII transitions and
  across raster geometry changes.
- Export, download, compare, and ASCII receive a flattened copy while the editor keeps
  the overlay editable.
- The implementation remains small-module, browser-only, vendored, and zero
  off-origin at runtime.

## Current Baseline

- Konva is vendored and lazy-loaded only when Adv Edit is entered.
- Overlay objects serialize through editor-core undo and restore from Konva JSON.
- Text labels, geometric shapes, arrows/lines, multi-select, marquee select, keyboard
  delete/duplicate/nudge, snapping, inline text edit, and shape controls exist.
- ASCII and export paths flatten a copy of the raster base plus overlay.
- Files in `docs/types/image/**` should stay below 500 LOC; split helpers beside the
  feature instead of growing `adv-edit.js`.

## Phase 1: Core Advanced Editor

This is the acceptance surface for the current branch.

- Objects:
  - Text labels using `Konva.Label`, `Konva.Tag`, and `Konva.Text`.
  - Shapes using `Konva.Rect`, `Circle`, `Ellipse`, `Ring`, `Wedge`, `Arc`,
    `RegularPolygon`, and `Star`.
  - Lines and arrows using `Konva.Line` and `Konva.Arrow`.
  - Groups using `Konva.Group`.
- Selection and transforms:
  - Click/tap select, Shift/Ctrl/Meta multi-select, marquee select.
  - `Konva.Transformer` with resize, rotate, multi-node selection, rotation snaps,
    ratio lock, centered scaling, flip toggle, and minimum-size bounds.
  - Delete/Backspace, Escape, arrow nudge, Shift-arrow nudge, Ctrl/Cmd+D duplicate.
- Styling and geometry:
  - Shared fill, stroke, stroke width, dash, opacity, shadow, x/y, size, rotation,
    and blend mode.
  - Shape-specific controls for corner radius, radius, inner radius, angle, polygon
    sides, star points, line cap/join/tension/closed, and arrowhead settings.
- Layers:
  - Visible layer list.
  - Show/hide, delete, bring forward/back, send front/back.
  - Group/ungroup selected objects.

## Phase 2: Editor Polish

These are the next high-value additions that stay within the existing model.

- Layer panel:
  - ✅ Rename layers.
  - ✅ Lock/unlock via `listening(false)` plus visual lock state.
  - ✅ Type icons and clearer selected/multi-selected states.
  - ✅ Duplicate from layer row.
- Precision layout:
  - ✅ Visible snap guide lines while dragging.
  - ✅ Grid toggle and configurable snap-to-grid.
  - ✅ Align left/center/right/top/middle/bottom for multi-selection.
  - ✅ Distribute horizontally/vertically.
- Rich text:
  - ✅ Bold, italic, underline, strike.
  - ✅ Horizontal and vertical alignment.
  - ✅ Line height, wrapping, padding.
  - ✅ Text stroke and shadow.
- Better line/arrow editing:
  - ✅ Endpoint handles.
  - ✅ Midpoint handles for polylines.
  - ✅ Explicit point editing mode that keeps helper handles out of serialization/export.

## Phase 3: Composition Features

These are valuable but should be separate work because they add persistence, import, or
export complexity.

Detailed planning for this phase now lives in `ADV_EDIT_PHASE3.md`.

- Local image/sticker overlays:
  - Add from local file, paste, or drag/drop.
  - Use `Konva.Image` only with local Blob/data URLs to preserve export safety.
  - Add crop/frame controls.
- Gradient and pattern fills:
  - Linear/radial gradient UI for shapes.
  - Pattern fills only from local assets.
- Per-object filters:
  - Blur, brightness/contrast, grayscale, HSL, pixelate, and noise where useful.
  - Use `cache()` and explicit cache invalidation after edits.
- Export controls:
  - Export pixel ratio / retina scale.
  - Optional object-vs-base blend implementation.
- App-level document model:
  - Move from raw Konva JSON as the durable source to a versioned document model.
  - Keep Konva JSON as an implementation detail or migration format.

## Deferred / Out Of Scope For This Branch

- Full bezier/path editor.
- Freehand vector pen with editable anchors.
- `Konva.TextPath` curved text editor.
- Animation, sprites, tweens, or timeline/video composition.
- Remote image assets or CDN resources.
- Framework rewrite to React/Vue/Svelte/Angular.

## Validation

Run at minimum:

```sh
node tests/image-geometry.test.mjs
node tests/smoke-area.mjs media-3d
./scripts/check.sh --fast
```

For layer/group or advanced interaction changes, add or run a focused Playwright probe
when the shared media smoke is too broad to isolate the interaction.

## `/goal` Prompt

```text
/goal Continue the Adv Edit roadmap in /home/jens/repos/file-viewer/.claude/worktrees/ascii-art.

Read AGENTS.md, CLAUDE.md, docs/types/image/ADV_EDIT.md, docs/types/image/ASCII_ADV_GOAL.md, and docs/types/image/ADV_EDIT_ROADMAP.md first. Work only in the image/ascii lane unless generated artifacts must be refreshed.

Objective:
Advance Adv Edit from the current Konva overlay baseline toward a serious object/layer editor without breaking the non-destructive raster-base/vector-overlay model.

Priority order:
1. Phase 2 layer panel polish: rename, lock/unlock, type icons, selected/multi-selected state, duplicate from row.
2. Phase 2 precision tools: visible snap guides, grid toggle, align commands, distribute commands.
3. Phase 2 rich text: bold/italic/underline/strike, align, vertical align, line height, wrap, padding, text stroke/shadow.
4. Phase 2 line/arrow editing: endpoint handles and point editing mode, with helper handles excluded from serialization/export.
5. Only after Phase 2 is stable, plan Phase 3 composition features separately.

Constraints:
- Preserve zero off-origin runtime behavior.
- Keep Konva vendored and lazy-loaded.
- Preserve editor-core undo/redo integration and overlay serialization/restore.
- Preserve View/Edit/ASCII transitions and flatten-copy export behavior.
- Keep authored image-lane source files under 500 LOC by splitting helpers.
- Regenerate docs/types/image/renderer.generated.js and asset files after source changes.

Acceptance criteria:
- Existing ASCII recording/settings behavior remains intact.
- Existing Adv Edit selection, keyboard, shape, transform, group, undo, geometry, and export behavior remains intact.
- New controls are type-aware and do not show unusable controls for the selected object.
- New helper/guide objects do not serialize as user overlay objects and do not flatten into output.
- Add focused smoke or unit coverage for the new interaction surface.
- Run node tests/image-geometry.test.mjs, node tests/smoke-area.mjs media-3d, and ./scripts/check.sh --fast. Fix failures before stopping.
```
