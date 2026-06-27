# Review Summary

This is the short review version of the modular media mixer research package.
Use it to decide whether the package is ready to approve, needs amendments, or
should be redirected before implementation.

## Proposed Direction

Build a new modular media mixer package under `docs/types/media/mixer/`.

The mixer is a general timeline/editor core that can run in reduced or expanded
contexts:

- simple MP3/WAV: one audio-capable source element on one lane
- Mix: multiple lanes from the same project model
- Compare: two selected elements/ranges from the same model
- Video: elements with `hasVideo` and optionally `hasAudio`
- Image: visual elements with timeline duration and transforms
- Seek-frame preview: calculated current-frame composition from active visual
  lanes for orientation and placement
- Import/export: config-only project settings plus optional final media render

## What This Replaces

The current file-viewer Mix, Compare, and video Timeline implementations should
be treated as prototypes. They can provide lessons and tests, but should not be
evolved as the final architecture.

The previous audio-only lane redesign is now a subset of the modular mixer
direction.

## Non-Negotiables

- One shared project/lane/element model.
- Lane descriptors for source, room tone, music, SFX, video, image, generated,
  and derived lanes.
- Capability/config gating:
  - available now
  - available after opt-in
  - unsupported in this browser/session
- ffmpeg remains opt-in and lazy.
- Reduced mode must look intentional, not broken.
- Project settings export stores config and file identity, not media bytes.
- Imported project files can relink dragged media and ask:
  - Apply to all elements.
  - Ask per element.
  - Do not change media objects.
- Memory safety is part of the product requirements.

## Reference Alignment

- OpenShot provides the timeline/editor model: project bin, tracks/layers,
  ruler/playhead, zoom, clips, context menus, effects, transitions, keyframes,
  project files, and final export.
- Auto-audiobook provides the audio lane model: ruler, waveform lanes, red
  cursor, semantic lanes, derived room tone/noise, dragging, context menu,
  scheduled playback, deterministic export, sample-rate lessons.
- Narratu provides the audio processing model: 9-band EQ, track EQ, master bus,
  A/B, spectrum/comparison UI, decoded audio cache, processed cache keys, export
  filter generation.
- File-viewer provides constraints and integration: static client, zero
  off-origin requests, ffmpeg opt-in, lazy panels, existing samples, and smoke
  test structure.

## First MVP

The first implementation should not attempt the whole editor. It should prove:

- pure model and serialization
- capability matrix
- config-only project settings export/import
- missing-media/relink/reapply state
- one-lane MP3/WAV mixer Listen
- waveform-first lane, cursor, ruler, zoom, pan
- select, drag, trim, gain, fades
- room-tone/pink-noise represented in the model
- track/master EQ schema established
- sample MP3/WAV smoke tests
- memory-safe/lazy analysis behavior

## Explicit Deferrals

- Realtime multi-track video playback.
- Exact preview parity with ffmpeg final export.
- Keyframe UI for every property.
- Advanced masks.
- OpenShot-style dock layout.
- Project archives containing source media.
- Server-side processing.

## Approval Decision

Approve the package if the direction, MVP boundary, capability policy,
project import/relink behavior, and memory posture are acceptable.

Amend the package if any recommended default in `10-review-checklist.md` should
change before implementation.

Reject or redirect the package if the desired product is still primarily an
audio-only lane redesign rather than a modular media mixer/editor.

## Files To Read For Final Review

Minimum:

- `00-scope-and-decisions.md`
- `10-review-checklist.md`
- `13-package-audit.md`

Recommended:

- `08-acceptance-and-test-strategy.md`
- `09-build-runbook.md`
- `11-source-traceability.md`
- `12-user-workflows.md`
