# ASCII + Advanced Image Editing Goal

This lane owns `docs/types/image/**` and `docs/tools/ascii-studio/**`. Keep work scoped there unless a generated artifact must be refreshed.

## Goal

Make the image ASCII and Adv Edit workflow behave like a serious in-browser editor:

- Webcam recording records the visible ASCII canvas, not the original camera feed.
- The image-mode buttons `ASCII`, `Edit`, and `Adv` sit next to each other.
- ASCII settings for still images and camera/video are floating panels opened by the settings button, draggable by their header, and resizable by the user.
- Adv Edit owns pointer interaction while active, supports keyboard editing, and exposes more of Konva's practical shape-editing surface.

## Implementation Contract

- Preserve the non-destructive model in `ADV_EDIT.md`: raster base and Konva overlay remain separately editable; flatten only for output, ASCII input, and `ctx.onBinaryEdit.getBytes()`.
- Keep Konva vendored and lazy-loaded from `docs/vendor/konva/konva.min.js`; do not add runtime off-origin requests.
- Keep files below the 500 LOC hard cap. Split helper logic beside `adv-edit.js`.
- Regenerate `docs/types/image/renderer.generated.js` after changing bundled image renderer source.
- Validate with the image-focused unit tests plus the `media-3d` smoke area.

## Implemented Surface

- ASCII webcam `Record` uses `.cam-out.captureStream(targetFps)` and merges microphone tracks only when Audio is enabled.
- `.imgv-mode-col` is a horizontal mode-button group.
- ASCII still-image settings and camera settings use a shared fixed-position floating-panel helper with a drag handle and browser resize handle.
- Adv mode is included in the image view controller's edit-mode guard, preventing normal canvas pan during Konva interaction.
- Adv keyboard interactions:
  - `Delete` / `Backspace`: delete selected objects.
  - `Escape`: deselect.
  - Arrow keys: nudge by 1 px.
  - `Shift` + arrow: nudge by 10 px.
  - `Ctrl/Cmd+D`: duplicate selection.
- Adv selection and transform:
  - Shift/Ctrl/Meta click toggles multi-select.
  - Empty-stage drag creates a marquee selection.
  - One Konva `Transformer` attaches to the selected node list.
  - Shape transforms normalize scale back into geometry on `transformend`.
  - Dragging snaps object edges/centers to stage and object edges/centers.
- Adv controls:
  - Shared: fill, stroke, stroke width, dash, shadow, opacity, x/y, width/height where meaningful, rotation, blend mode.
  - Transformer: ratio lock, centered scaling, flip toggle, rotation snaps, and minimum transform bounds.
  - Text: text, font, size, fill, label background and opacity.
  - Shapes: rect, circle, ellipse, ring, wedge, arc, line, arrow, polygon, and star.
  - Shape-specific geometry: rect corner radius, circle/wedge/polygon radius, ring/arc angle and inner radius, line cap/join/tension/closed, arrow head/start, polygon sides, star point count and inner radius.
  - Layer operations: rename, lock/unlock, duplicate, hide/show, group/ungroup selected objects, selected-row state, type icons, and send selected objects to front/back.
  - Precision layout: grid toggle, visible snap guides, align commands, and horizontal/vertical distribute commands using a non-serializing helper layer.
  - Rich text: bold/italic/underline/strike, horizontal and vertical align, line height, wrapping, padding, text stroke, and text shadow.
  - Line/arrow point editing: endpoint handles, midpoint insertion handles, and helper nodes kept out of serialization/export.
  - Double-click/double-tap text labels for an inline textarea editor.

## Konva References

- API index: https://konvajs.org/api/Konva.html
- Node APIs: https://konvajs.org/api/Konva.Node.html
- Transformer APIs: https://konvajs.org/api/Konva.Transformer.html
- Selection and transform: https://konvajs.org/docs/select_and_transform/Basic_demo.html
- Keyboard events: https://konvajs.org/docs/events/Keyboard_Events.html
- Object snapping: https://konvajs.org/docs/sandbox/Objects_Snapping.html
- Editable text: https://konvajs.org/docs/sandbox/Editable_Text.html
- High quality export: https://konvajs.org/docs/data_and_serialization/High-Quality-Export.html

## `/goal` Prompt

Use this prompt from the ascii-art worktree if more autonomous polish is needed:

```text
/goal Implement and refine the image ASCII + Adv Edit optimization in /home/jens/repos/file-viewer/.claude/worktrees/ascii-art.

Read AGENTS.md, CLAUDE.md, docs/types/image/ADV_EDIT.md, and docs/types/image/ASCII_ADV_GOAL.md first. Work only in the image/ascii lane. Preserve zero off-origin runtime behavior and the non-destructive raster+Konva overlay model.

Acceptance criteria:
- ASCII webcam Record captures the rendered ASCII canvas stream; optional microphone audio is merged only when Audio is enabled.
- ASCII/Edit/Adv mode buttons are same-row and remain stable with the edit toolbar collapsed or expanded.
- ASCII image and camera settings open from their settings buttons as draggable, resizable floating panels instead of sidebars or overlapping fixed overlays.
- Adv Edit prevents image panning while active.
- Adv Edit supports Delete/Backspace, Escape, arrow nudge, Shift-arrow nudge, Ctrl/Cmd+D duplicate, multi-select, marquee select, snapping, inline text edit, and shape-specific controls.
- The overlay still serializes/restores through editor-core undo, survives View/Edit/ASCII transitions, and flattens correctly for output.
- Keep every edited source file under 500 LOC.
- Regenerate docs/types/image/renderer.generated.js and any required asset files.
- Run node tests/image-geometry.test.mjs, node tests/smoke-area.mjs media-3d, and ./scripts/check.sh --fast. Fix failures before stopping.
```
