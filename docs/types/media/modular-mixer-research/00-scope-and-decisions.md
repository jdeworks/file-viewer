# Scope And Decisions

This is the working source-of-truth document for the modular media mixer
research package. It turns the research folder into a build handoff: what is in
scope, what is deferred, and what must be true before implementation starts.

## Direction

Build a modular, capability-gated media mixer/editor first. Then use the same
module in reduced contexts:

- MP3/WAV opens as one audio-capable source element on one lane.
- Mix expands the same project into multiple lanes.
- Compare constrains the same model to two selected objects/ranges.
- Video files open as media elements with `hasVideo` and possibly `hasAudio`.
- Images dragged in become visual timeline elements.
- Project settings import/export works without ffmpeg or full media export.

The previous audio-only lane redesign is now a subset of this broader mixer
direction.

## Non-Negotiable Decisions

- Create a new modular mixer package. Do not evolve the old file-viewer Mix,
  Compare, or video Timeline prototypes as the final architecture.
- Use a shared project/lane/element model for audio, video, image, generated,
  and compare workflows.
- Use lane descriptors so roles such as source, room tone, music, SFX, video,
  image, and derived lanes can each define accepted media, rendering,
  interaction, playback, export, and inspector behavior.
- Store file identity and edit decisions in project settings exports. Do not
  embed full media bytes by default.
- Support dragging/relinking media files back into an imported project and ask
  how to reapply settings:
  - Apply to all elements.
  - Ask per element.
  - Do not change media objects.
- Make optional capabilities configuration-driven. The UI must distinguish:
  - available now
  - available after opt-in
  - unsupported in this browser/session
- ffmpeg-gated features must not look broken when ffmpeg is disabled. The editor
  should still show the reduced capabilities and explain what opt-in unlocks.
- Memory safety is a product requirement, not a later optimization.

## Initial MVP

The first implementation slice should prove the architecture without trying to
ship a full browser NLE:

- New `docs/types/media/mixer/` module.
- Pure project model with assets, lanes, elements, selection, compare state,
  capability state, EQ schema, and import/export JSON.
- One-lane MP3/WAV Listen powered by the new model.
- Waveform-first lane rendering.
- Cursor, ruler, zoom, pan, select, drag, trim, gain, fades.
- Pink-noise/room-tone represented in the model.
- Track EQ and master EQ schema established, even if full UI arrives one stage
  later.
- Settings JSON export/import with missing-media and relink state.
- Capability notes for ffmpeg-disabled and unsupported preview/export cases.
- A seek-frame visual compositor model for video/image projects, even if full
  UI implementation waits until the video/image stage.
- Tests for pure model, import/export, capability matrix, and one-lane sample
  audio smoke.

## Explicit Deferrals

These are in the architecture but should not block the first MVP:

- Realtime multi-track video playback.
- Exact browser preview parity with ffmpeg final export.
- Keyframe UI for every property.
- Advanced visual masks.
- Full OpenShot-style dock layout.
- Packaged project archives containing source media.
- Server-side processing or remote services.

## Required Reference Alignment

OpenShot:

- project bin
- tracks/layers
- timeline toolbar
- ruler/playhead
- zoom
- clip selection, trimming, slicing, context menus
- clip properties, effects, transitions, keyframes
- project settings versus final rendered export

Auto-audiobook:

- lane/ruler/cursor grammar
- derived noise/room-tone lane behavior
- region placement model
- dragging/selection/context menu
- scheduled playback
- deterministic export over the same edit state
- sample-rate ownership and WAV handling

Narratu:

- 9-band track EQ
- master bus
- A/B bypass
- spectrum/comparison presentation
- byte-budgeted decoded audio cache
- processing setting cache keys
- pure export/render filter generation

File-viewer:

- static client
- zero off-origin runtime requests
- lazy ffmpeg opt-in
- lazy mode mount/destroy through existing media workspace controller patterns
- existing tests should migrate to the new grammar rather than preserve old
  prototype selectors.

## Review Gate Before Build

Before coding the new mixer, review and either accept or amend:

- `01-feature-research.md`
- `02-module-architecture.md`
- `03-project-model.md`
- `04-rendering-interaction.md`
- `05-memory-performance.md`
- `06-implementation-plan.md`
- `07-risks.md`
- `08-acceptance-and-test-strategy.md`
- `09-build-runbook.md`
- `10-review-checklist.md`
- `11-source-traceability.md`
- `12-user-workflows.md`

The MVP boundary, capability policy, project import/relink behavior, and memory
caps were accepted before implementation. `10-review-checklist.md` preserves
that approval record. All unfinished repository work now belongs in
[`TASKS.md`](../../../../TASKS.md).
