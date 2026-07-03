# Module Architecture

## Goal

Create a reusable modular mixer/editor package inside `docs/types/media/` that
can power:

- one-lane MP3/WAV Listen
- multi-track audio mix
- video timeline editing
- image overlays
- two-object Compare
- Tune/QC/Export workflows
- import/export of edit settings

The module should be general enough to support audio/video/image elements, but
small enough to run safely in a static client.

## Proposed Folder

Future implementation target:

```text
docs/types/media/mixer/
  index.js
  mixer-model.js
  mixer-store.js
  mixer-capabilities.js
  mixer-config.js
  mixer-hash.js
  mixer-import-export.js
  mixer-renderer.js
  mixer-hit-test.js
  mixer-interactions.js
  mixer-playback.js
  mixer-export.js
  mixer-analysis.js
  mixer-waveform.js
  mixer-thumbnails.js
  mixer-frame-compositor.js
  mixer-eq.js
  mixer-qc.js
  mixer-context-menu.js
  mixer-ui.js
  mixer-styles.css
```

The exact file count can change, but these responsibilities should stay
separate.

## Core Boundaries

### Model

Pure data and pure utilities:

- project
- assets
- lanes
- elements
- effects
- keyframes
- selection
- compare state
- timeline math
- capability checks
- serialization

This layer must not touch DOM, AudioContext, canvas, ffmpeg, or File APIs except
through explicit passed-in metadata.

### Asset Registry

Owns source files and derived metadata:

- local `File` references for this session
- object URLs
- file fingerprints/hashes
- detected capabilities
- media duration
- audio sample rate/channels
- video dimensions/frame rate when known
- native preview support
- ffmpeg-required flags
- missing/relinked asset state

Project settings export stores only asset identity and edit decisions. On import,
the registry reconciles those identities with local files.

### Analysis

Lazy derived data:

- audio waveform buckets
- audio RMS/peak/noise/loudness summaries
- video thumbnails
- video frame samples for compare
- seek-frame composition from active visual lanes
- image dimensions
- sample-rate data

Analysis should be cancellable or generation-token guarded so stale work cannot
write into a newer project state.

### Renderer

Canvas/DOM rendering:

- ruler
- playhead
- lane headers
- element blocks
- waveforms
- thumbnails
- trim handles
- fades
- transforms
- selection outlines
- compare overlays
- loading/error/needs-ffmpeg states

Renderer receives immutable snapshots and viewport state. It returns hit-test
regions or delegates to `mixer-hit-test.js`.

### Interactions

Pointer/keyboard/menu behavior:

- click select
- click seek
- drag element
- drag trim handles
- drag fade handles
- box select
- multi-select
- snap
- split/razor
- context menu
- keyboard nudges
- zoom/pan
- touch pan/pinch

Interaction code dispatches model actions. It should not directly mutate
project data.

### Playback

Preview scheduling:

- audio graph for audio-capable elements
- per-lane gain/mute/solo
- per-element gain/fades
- per-lane EQ
- master EQ
- video preview sync where feasible
- image/visual preview composition
- seek-frame composition at the current cursor
- seek while playing
- stop/release

The long-term target is a shared timeline clock. One-lane audio, seek-frame
visual preview, and later playback previews should all derive cursor state from
the same clock.

The required visual preview is a calculated still frame at the current cursor,
not realtime multi-track video playback. On seek, the compositor should evaluate
all active visual lanes at that time, apply element timing, layer order,
transforms, opacity, and supported filters, then render one orientation frame.
This is needed so users can place images and transforms accurately. Realtime
video playback through all lanes is explicitly heavier and can be deferred.

### Export

Final render/mix:

- audio mixdown via WebAudio/OfflineAudioContext where feasible
- ffmpeg export for video, muxing, format conversion, filters, transitions, and
  heavyweight media operations
- browser APIs where safe and available
- deterministic provenance
- warnings for unsupported operations when ffmpeg is disabled

### UI Shell

Mode-dependent composition:

- toolbar
- project bin/assets
- preview
- timeline/lane stack
- properties/inspector
- tune/QC/export panels

The shell can mount a reduced mixer for a simple MP3, or the full mixer for a
video/image/audio session.

## Integration With Current File-Viewer

Initial integration point:

- `docs/types/media/renderer-mode-panels.js` should lazy-mount the modular
  mixer through the existing controller contract:
  `mountX(panel, intake, mediaElement?, options) -> { destroy() }`.
- `docs/types/media/renderer.js` can still create the initial media workspace
  and pass the opened file/media metadata through, but it should not own mixer
  internals.
- The mixer creates the project with the opened file as the first asset.
- Audio files open in the mixer in one-lane Listen context.
- Video files open in the mixer with preview plus one video/audio element.
- Compare mode uses the same mixer project and constrains selection to two
  elements/ranges.

Current modules to reuse or mine:

- `waveform-data.js`: waveform summaries.
- `waveform.js`: existing drawing lessons.
- `audio-graph.js`: current shared EQ graph, if compatible.
- `mixer-engine.js`: realtime/offline audio mix lessons (file has since been
  deleted as part of Stage 8 prototype retirement; lessons were mined into
  `mixer/mixer-audio-playback.js` and `mixer/mixer-audio-export.js`).
- `timeline.js`: ffmpeg-backed video timeline lessons (file has since been
  deleted as part of Stage 8 prototype retirement; lessons were mined into
  `mixer/mixer-video-source.js`).
- `compare-math.js`: shifted overlap math.
- `transcoder.js`: ffmpeg load/run/cancel/error handling.
- `export-presets.js`: export presets.
- `qc.js`, `loudness.js`: QC/loudness.
- `transcoder-ops.js`: operation mapping for ffmpeg plans.
- `video-filters.js`: pure ffmpeg filter builders.

Current modules not to extend as final UX:

- existing audio mixer UI
- existing compare UI
- existing video timeline UI

They remain prototype and compatibility references only.

## Lane Descriptor Registry

The module should not hardcode all lane behavior in one renderer. It should use
lane descriptors:

```js
{
  role: 'source-audio',
  accepts: { audio: true, video: false, image: false },
  derived: false,
  defaultHeight: 80,
  renderLane(snapshot, viewport, ctx) {},
  hitTest(pointer, snapshot, viewport) {},
  canPlay: true,
  canExport: true,
  inspectorSections: ['timing', 'audio', 'eq'],
}
```

Derived lane descriptor example:

```js
{
  role: 'room-tone',
  derived: true,
  derivesFrom: ['source-audio', 'speech'],
  renderLane() {},
  canPlay: true,
  canExport: true,
}
```

This keeps auto-audiobook's speaker/noise/music/SFX behavior portable while
allowing video/image lanes later.

## Capability-Based Activation

The same module should expose different surfaces based on context,
configuration, and optional libraries. The module should have a single
capability object such as:

```js
{
  webAudio: true,
  nativeAudioDecode: true,
  nativeVideoPreview: true,
  ffmpegEnabled: false,
  ffmpegLoaded: false,
  canExportAudioMixBrowser: true,
  canExportVideoMix: false,
  maxAnalysisBytes,
  maxFfmpegInputBytes,
}
```

UI components read this configuration and render one of three states:

- available now
- available after opt-in
- unsupported in this browser/session

This keeps the editor modular: everything available is directly usable, and
everything requiring opt-in is visible with a note explaining what enabling it
allows.

- No ffmpeg:
  - native preview where browser supports it
  - one-lane audio edit settings
  - waveform analysis within caps
  - project settings export/import
  - browser-safe audio mix preview/export where possible
  - disabled final video export controls with clear opt-in notes

- ffmpeg enabled:
  - conversion for unsupported preview/export formats
  - video export
  - mux/demux
  - filters/transforms
  - subtitle burn-in
  - selected-range extraction
  - final composition render

- AudioContext unavailable:
  - show project/timeline visually
  - disable waveform/EQ/mix preview with clear warning
  - allow edit-decision import/export

- Large file:
  - metadata first
  - progressive/capped analysis
  - proxy thumbnails
  - explicit heavy operations

## Reduced Feature Presentation

Reduced capability mode should still look like the product:

- The timeline, lanes, selection, inspector, and project settings import/export
  remain visible.
- Controls that need opt-in remain in place but disabled or marked "Enable".
- The note should name both sides:
  - what is still possible now
  - what enabling the optional library unlocks
- Example: with ffmpeg disabled on a video project, the user can still place
  clips/images, adjust timing/transforms, save the project JSON, and preview
  native-supported media. The export button explains that enabling Media
  Transcoding unlocks final rendered video export.

## UI Modes Over One Module

Modes should filter the same model, not create separate models:

- `Listen`: one source element, audio controls, waveform-first.
- `Mix`: show all lanes/elements and add/import controls.
- `Compare`: select two elements/ranges; stacked/overlay rendering.
- `Tune`: selected element/lane/master audio/video filters.
- `QC`: selected target analysis.
- `Export`: settings/provenance/final render.

The toolbar and timeline stay stable while modes change.
