# Defragmenter Confidence Gap Burndown

This note tracks the remaining implementation risks after the Stage 1-10 vertical slice landed. Treat these as follow-up hardening items, not blockers to the existing architecture proof.

## Highest Confidence Gaps

1. Stage 5 audio calibration is currently deterministic and simulated from the stage UI. Harden it so normal viewer/media playback can also drive `5.counter_wave_calibrated`.

2. Stage 6 protocol clue is represented as virtual text through the viewer bridge. Harden the clue path so the codex file behaves closer to a real viewer artifact while still recording `6.protocol_ch9_read` canonically.

3. Stage 7 EXIF contradiction is available through an in-stage button. Harden it so opening or inspecting the Entity F artifact through viewer-style metadata can record `7.exif_contradiction_found`.

4. Stage 8 drag/drop proves internal debris movement and an accessible fallback. Harden cross-input behavior and make the internal archive path more explicit, including keyboard-only salvage.

5. Stage 10 memory route is complete mechanically, but pacing and content density need review against the capstone design. Harden with route summaries and clearer post-choice state.

## Secondary Gaps

- Stage 4 generated blueprint is structurally sound, but it should expose clearer generated-file metadata and avoid depending only on the stage button for discoverability.
- Stage 6/7 smoke coverage should prove the viewer artifact opens with expected text/metadata, not only that the action is set.
- Stage 8 should test both fallback archive and drag/drop handler seams.
- BTS files are concise. Expand only if design review requires fuller behind-the-scenes material.

## Better Approach

Keep the existing v3 platform and vertical-slice contracts intact. Harden each risky stage by adding viewer-style artifact handlers and tests around canonical actions, rather than replacing stage logic or adding parallel save paths.

Implementation order:

1. Add viewer-action seams for Stage 5, Stage 6, and Stage 7 where they are currently stage-button-only.
2. Add focused unit tests for those seams.
3. Expand smoke assertions to prove the opened artifacts are real viewer intakes where feasible.
4. Improve Stage 8 keyboard/archive coverage.
5. Revisit Stage 10 content/pacing after the action architecture is hardened.

## Status

- 2026-06-17: Created from post-implementation confidence review. No hardening items completed yet.
- 2026-06-17: Hardened Stage 5 with media playback action recording for `transmission_hum.mp3`.
- 2026-06-17: Hardened Stage 6 with viewer-open recording for `protocols_of_the_entity.epub`.
- 2026-06-17: Hardened Stage 7 with a viewer metadata artifact for Entity F and canonical `GPSInfo` recording.
- 2026-06-17: Hardened Stage 8 with keyboard activation on the archive target.
- 2026-06-17: Hardened Stage 10 with a post-choice route summary for resolved/integrated memory count.

## Remaining Review Items

- Stage 5 now has a real same-origin `transmission_hum.mp3` fixture discoverable from examples.
- Stage 6 now has an authored `protocols_of_the_entity.epub` fixture and opens it through the EPUB viewer.
- Stage 7 now has real same-origin PNG fixtures plus a metadata sidecar. Real embedded EXIF remains intentionally out of scope because the current app EXIF reader handles JPEG APP1, not PNG text chunks.
- Stage 10 now has richer memory prose, choice-specific reflections, assembly status, and post-choice route summaries. Further changes are design/editorial review rather than implementation blockers.
