# Implementation Plan

This is the historical staged plan used for the completed mixer build. It is not
an active work queue; unfinished media work is tracked only in
[`TASKS.md`](../../../../TASKS.md).

Use `08-acceptance-and-test-strategy.md` as the evidence checklist for each
stage. The brief tests listed here are reminders, not the full completion
standard.

## Stage 0: Finalize Requirements

- Review this research package.
- Record the accepted answers to the risks in `07-risks.md`.
- Decide initial folder and naming.
- Decide whether to replace or temporarily run beside current media surfaces.

Exit criteria:

- approved architecture
- approved MVP scope
- approved risk posture

## Stage 1: Pure Model And Serialization

Build pure modules:

- project model
- asset model
- lane descriptor registry
- capability/config model
- lane model
- element model
- timing utilities
- selection
- compare state
- import/export JSON
- file identity hashing helpers
- EQ/master-bus schema

No DOM, canvas, AudioContext, or ffmpeg.

Tests:

- create project from audio file metadata
- create project from video file metadata
- add image element
- create explicit and derived lanes
- move/trim/split element
- compare overlap math
- export settings JSON
- import settings JSON
- missing asset detection
- EQ schema roundtrip
- capability matrix reports available, opt-in, and unsupported actions

## Stage 2: Renderer Skeleton

Build workbench renderer:

- toolbar shell
- ruler
- playhead
- lane stack
- element blocks
- selection outline
- drag hit regions
- inspector placeholder

Use fake/test data first.

Tests:

- one audio lane visible
- multiple lanes visible
- zoom changes scale
- click-to-seek updates cursor
- select lane/element updates inspector

## Stage 3: Audio One-Lane MVP

Use the new mixer for MP3/WAV Listen:

- one source asset
- one lane
- waveform analysis
- cursor
- play/pause/stop
- trim
- offset
- gain
- fades
- pink-noise/room-tone element option
- track EQ placeholder or initial implementation

Tests:

- sample MP3/WAV open in mixer
- no visible native audio player
- waveform lane visible
- dragging/trimming updates state
- settings export/import roundtrip

## Stage 4: Multi-Lane Audio

Add:

- multiple audio lanes
- drag/drop audio assets
- pink-noise lane
- mute/solo
- track EQ
- master EQ
- decoded audio byte-budget cache
- WebAudio scheduled playback
- audio mixdown where feasible

Tests:

- add second audio lane
- move regions independently
- pink noise lane audible/configured
- track EQ and master EQ state separate
- export provenance includes lane settings

## Stage 5: Video/Image Elements

Add:

- video asset as element with `hasVideo` and optional `hasAudio`
- image asset as visual element
- seek-frame compositor for the current cursor
- thumbnail/preview placeholders for unavailable frame sources
- visual transforms
- opacity/fades
- ffmpeg-required warnings
- preview approximation labels

Tests:

- video opens as mixer project
- image dropped into lane becomes element
- seek-frame preview composites active visual lanes at the cursor
- image transform changes are visible in the calculated preview frame
- visual transform state updates
- unsupported video shows conversion warning

## Stage 6: Compare Mode

Add:

- choose A/B elements
- stacked view
- overlay view
- independent offsets
- selected overlap analysis hooks

Tests:

- audio A/B stacked and overlay
- video/image A/B stacked and overlay placeholders
- offsets change overlap
- project model remains shared

## Stage 7: Export

Add:

- project settings export/import UI
- drag-to-relink imported project assets
- reapply modal: apply to all elements, ask per element, do not change media
  objects
- final audio mix export
- ffmpeg-backed video export path
- provenance
- capability warnings

Tests:

- settings file export/import
- missing asset relink flow
- reapply modal choices update project state correctly
- audio-only final export where feasible
- ffmpeg-disabled warning for video final export

## Stage 8: Retire Prototype Surfaces

After the mixer covers equivalent workflows:

- remove old audio mixer UI
- remove old compare UI
- replace old video timeline UI
- simplify renderer mode panels
- update smoke selectors to new grammar

## Suggested MVP Boundary

The first shippable slice should be:

- module folder exists
- pure project model
- JSON settings export/import
- one-lane MP3/WAV mixer Listen
- waveform, cursor, zoom, drag, trim, gain, fades
- pink-noise lane/element represented
- no visible native audio player
- memory-safe analysis caps

Then expand to full OpenShot-like behavior.
