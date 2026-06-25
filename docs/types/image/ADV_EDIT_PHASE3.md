# Adv Edit Phase 3 Plan

Phase 3 is composition work. It should start only after the Phase 2 editor polish
is stable and verified. The implementation must keep the non-destructive
raster-base/vector-overlay model from `ADV_EDIT.md`: vector objects stay editable,
and export/ASCII receive a flattened copy.

## Goals

- Add richer composition objects without introducing remote assets or runtime
  off-origin requests.
- Keep object state undoable through editor-core overlay snapshots.
- Keep helper UI out of overlay serialization and flatten-copy export.
- Keep image-lane source files under the repository LOC cap by adding focused
  helper modules.

## Candidate Work

1. Local image and sticker overlays
   - Add images from local file input, paste, or drag/drop.
   - Use `Konva.Image` with Blob/data URLs only.
   - Add crop/frame controls that remain editable before flattening.

2. Gradient and pattern fills
   - Add linear/radial gradient controls for shapes.
   - Add pattern fills only from local user-provided assets.
   - Persist fills as explicit object attributes or a versioned overlay document.

3. Per-object filters
   - Support useful Konva filters such as blur, brightness/contrast, grayscale,
     HSL, pixelate, and noise.
   - Use `cache()` deliberately and invalidate caches after geometry/style edits.
   - Keep export parity by ensuring cached objects flatten correctly.

4. Export and blend controls
   - Add export pixel ratio / retina scale.
   - Evaluate true object-vs-base blending separately from the current
     overlay-object-relative blend mode.

5. Versioned document model
   - Move durable overlay state from raw Konva JSON toward a small versioned
     document format.
   - Keep raw Konva JSON as an implementation detail or migration input.

## Validation

- Extend `media-3d` smoke coverage for any new visible interaction.
- Keep zero off-origin runtime assertions green.
- Run:

```sh
node tests/image-geometry.test.mjs
node tests/smoke-area.mjs media-3d
./scripts/check.sh --fast
```

Do not start Phase 3 implementation until a follow-up goal explicitly selects
which candidate work to build first.
