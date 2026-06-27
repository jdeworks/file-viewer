# Rendering And Interaction

## Main Workbench

The modular mixer workbench should include:

- project/asset toolbar
- mode controls
- transport
- preview area for video/image-capable projects
- zoomable ruler
- red playhead/cursor
- lane stack
- inspector/properties panel
- optional project bin

For a simple MP3, the workbench can hide the preview/bin and show one waveform
lane plus inspector. For a video/image composition, the preview/bin become more
prominent.

## Lane Rendering

Lane rows:

- fixed left label/control gutter
- timeline canvas/DOM region
- stable height per lane type
- selected lane outline
- lock/mute/solo/visibility controls where applicable

Element rendering:

- audio: waveform block, fades, gain indicator, trim handles
- video: thumbnail strip, audio waveform when `hasAudio`, trim handles
- image: still block, duration handles, transform badge
- generated pink noise: compact waveform/noise texture block
- unsupported: warning block with conversion action

## Ruler And Zoom

Required:

- adaptive tick labels
- click-to-seek
- red playhead line through every lane
- fit timeline
- zoom in/out
- zoom slider
- ctrl/meta wheel zoom around pointer
- horizontal pan
- touch pan and pinch zoom

## Dragging And Editing

Supported gestures:

- drag element body to move start time and optionally lane
- drag left/right edge to trim
- drag fade handles to set fade in/out
- drag visual transform handles in preview for image/video
- box select
- multi-select with modifiers
- alt/ripple select later
- razor/split at clicked position
- snap to playhead, markers, clip edges, and range boundaries

Editing must update model state first, then render from the updated model.

## Context Menu

Right-click must override the browser menu on lanes/elements.

Base auto-audiobook actions:

- select
- split here
- delete/remove
- set cursor here

OpenShot-style extensions:

- fade presets
- animate presets
- rotate/flip
- layout/corner/scale presets
- time/speed/reverse/repeat
- volume presets
- separate audio from video
- display waveform/thumbnail
- properties
- copy/paste settings
- remove gap
- ripple delete

File-viewer-specific extensions:

- analyze selected range
- use as Compare A
- use as Compare B
- use range for QC
- export selected range
- relink missing media
- convert with ffmpeg when enabled

The menu should be capability-aware. Audio-only elements should not show visual
transform actions; image-only elements should not show audio EQ actions.
Actions that require opt-in should remain discoverable as disabled or secondary
actions with notes, not disappear entirely.

## Inspector

Inspector changes with selection:

- lane selected: lane role, label, lock, mute/solo, gain, visibility, EQ.
- audio element selected: offset, in/out, duration, gain, fades, EQ, waveform
  status, sample rate/channels.
- video element selected: offset, in/out, duration, speed, transform, opacity,
  filters, audio controls if `hasAudio`.
- image element selected: offset, duration, transform, opacity, filters.
- generated pink-noise selected: duration, level, fades, room-tone mode.
- master selected: global EQ, output size/fps/sample rate, limiter/export
  preset.

## Compare Mode

Compare is a constrained view of the same model:

- choose A/B from existing elements or dropped assets
- create a second element/lane if needed
- stacked view draws two lanes
- overlay view draws waveforms or video/image previews over each other
- offsets remain editable
- in/out ranges remain editable
- analysis is explicit and scoped

Audio compare:

- waveform overlay
- shifted overlap computation
- optional user-enabled normalization
- difference analysis on selected overlap

Video/image compare:

- stacked frames/thumbnails
- overlay opacity
- pixel-diff analysis on selected frames/range when possible

## Preview

Preview is context-dependent:

- Audio-only: waveform lane is the preview.
- Video/image: preview canvas shows a calculated still frame for the current
  cursor by compositing all active visual lanes.
- Unsupported media: preview shows conversion warning.

Seek-frame preview requirements:

- recalculate on seek, trim, transform, layer order, opacity, and enabled visual
  filter changes
- evaluate which visual elements are active at the cursor
- sample the relevant video frame where browser APIs can provide it
- render image elements at their timeline position and duration
- apply transforms: position, scale, rotation, crop, opacity, and anchor
- layer higher lanes over lower lanes
- show missing/unsupported frame sources with clear placeholders
- avoid realtime multi-lane video playback as an MVP requirement

Near-term preview can be approximate:

- native video frame sampling for the selected/current video where possible
- canvas composition for images/transforms/layers
- audio graph for audio preview
- ffmpeg final export for exact composition

The UI must clearly label when preview is approximate and final export requires
ffmpeg.

## Capability Notes

Every mode should have a compact capability note area when something important
is unavailable:

- Audio-only without ffmpeg: "You can edit timing, fades, gain, EQ, and export
  project settings. Enable Media Transcoding for MP3/video render paths that
  need ffmpeg."
- Video without ffmpeg: "You can arrange clips/images and save the project
  settings. Enable Media Transcoding for final video export and conversion."
- Unsupported native preview: "This file is in the project, but preview needs
  conversion. Enable Media Transcoding to create a browser-playable proxy."

The note should not dominate the UI. The available parts of the mixer should
remain usable.

## Transform And Filters

Visual transform controls:

- x/y position
- scale
- rotation
- opacity
- crop
- fit/fill/stretch presets
- anchor/corner presets

Visual filters:

- brightness
- contrast
- saturation
- blur later
- LUT/look presets later

Audio filters:

- track EQ
- global EQ
- gain
- fades
- compressor/limiter
- de-noise/gate when export path supports it

Filters and transforms should be represented as effects/keyframes in the model,
not hidden DOM-only state.
