# Feature Research

## OpenShot Model

OpenShot is the best external product reference for the generalized direction.
The relevant model is a non-linear editor with a project file bin, preview,
timeline toolbar, zoomable ruler/playhead, tracks/layers, clip properties,
effects, transitions, and export.

Important OpenShot features to adapt:

- Project files/bin: imported audio, video, and image files are first-class
  reusable assets.
- Timeline toolbar: add track, undo/redo, snapping, retime, razor/slice,
  markers, previous/next marker, center on playhead.
- Zoom slider: changes timeline scale and supports timeline scrolling.
- Ruler/playhead: shared time ruler and red playhead line.
- Timeline: clips and transitions can be selected, moved, deleted, and trimmed.
- Tracks/layers: higher tracks visually stack above lower tracks; audio can live
  on lower tracks; tracks can be locked.
- Track controls: track name, menu, lock, and keyframe/properties access.
- Effects: video and audio effects can be dragged onto clips; effect properties
  can be animated over time.
- Properties panel: selected clip/effect/transition exposes editable properties.
- Context menus: right-click exposes presets and actions for fades, animation,
  rotation, layout, time, volume, separate audio, slice, waveform/thumbnail
  display, properties, copy/paste, remove clip, remove gaps.
- Keyframes: many clip/effect properties are animated at the current playhead.
- Import/export: full product export renders media; project import/export stores
  edit decisions rather than duplicating source media.

OpenShot documentation references:

- Main window: project files, preview, timeline toolbar, zoom slider, playhead,
  timeline, playback, and tracks are documented in the main-window guide.
- Tracks/layers: OpenShot stacks tracks like image layers; top tracks visually
  overlay lower tracks.
- Effects: effects modify audio/video clip data, have properties, can be
  animated, and can be applied by drag/drop onto clips.
- Clips: selection, slicing, trimming, context-menu presets, volume, time,
  display, copy/paste, remove clip, and remove gap behavior are documented in
  the clips guide.

## Auto-Audiobook Model

Auto-audiobook is the best local reference for the audio lane grammar.

Features to lift:

- Compact mixer container with toolbar, ruler, lanes, horizontal scroll, and
  selection detail panel.
- Shared state for cursor, zoom, scroll, selected segment/region, playback, and
  lane/region settings.
- Semantic lanes: speakers/source, noise, music, SFX.
- Canvas-based waveform rendering per lane.
- Red cursor through all lanes.
- Click-to-seek on ruler/lanes.
- Dragging a segment changes its gap/start timing.
- Dragging a music/SFX region changes its offset.
- Right-click overrides the browser menu and shows lane actions.
- Context menu actions: select segment/region, split region, delete region, set
  cursor here.
- Keyboard nudge for selected timing.
- Noise/room-tone represented as semantic timeline gaps/beds.
- WebAudio playback schedules all regions from cursor time.
- Export renders a deterministic timeline, including pink-noise bed/gaps,
  source/speech placement, region gain/fades/loops, music, and SFX.

Auto-audiobook features to generalize:

- `MixerSegment` becomes an audio/video/image timeline element or clip region.
- `MixerRegion` becomes a general timeline element instance with media
  capabilities.
- `trackType` becomes lane role plus media capability filters.
- The current speakers/noise/music/SFX lanes become presets over the same
  generic lane model.
- Pink-noise gap support becomes a first-class audio bed element type.
- Lane descriptors should declare renderer, accepted source capabilities,
  playback behavior, export behavior, and whether the lane is explicitly
  editable or derived from other state.
- Derived lanes matter: auto-audiobook's noise lane is rendered from speaker
  gaps rather than stored as ordinary regions. The general mixer should support
  both explicit elements and derived render layers.
- Separate immutable raw media duration from effective edited duration. Speaker
  segments keep `rawDurationMs`; effective duration and offsets are derived from
  gap and early-stop settings.
- Preserve separate placement duration and source clip duration. This is
  required for looped music/SFX and for tiled waveform drawing.
- Playback and export are separate engines over the same state. Playback can
  stream/schedule with lookahead; export must be deterministic and complete.
- Sample-rate ownership is explicit. Use decoded/source sample rates where
  applicable, never hardcode 44.1 kHz. Auto-audiobook fixed a real 48 kHz
  decoded-as-44.1 kHz pitch/speed class of bug.

## Narratu Model

Narratu is the local reference for EQ and spectrum presentation.

Features to lift:

- Track/selection-specific EQ panel.
- Master/global EQ panel.
- 9-band EQ:
  - 60 Hz Sub
  - 120 Hz Bass
  - 250 Hz Low-mid
  - 500 Hz Mid
  - 1 kHz Upper-mid
  - 2 kHz Presence
  - 4 kHz Sibilance
  - 8 kHz Air
  - 12 kHz Ultra-high
- HPF/LPF controls.
- A/B bypass.
- Reset.
- Preset categories.
- Recommended presets when metadata supports them.
- Spectrum analyzer.
- Original vs processed comparison chart when analysis exists.
- WebAudio EQ chain: source, HPF, EQ bands, LPF, analyser, destination.
- Master bus schema that can generate live WebAudio nodes and export filters.
- Byte-budgeted decoded audio buffer cache.
- Processed cache keys that include every audio knob so edits invalidate only
  affected items.

Adaptation for file-viewer:

- Every audio-capable lane can have an EQ chain.
- Every audio-capable element can have clip gain and fades.
- Master/global EQ applies after lane mixing.
- Spectrum can inspect selected element, selected lane, compare A/B, or master.
- Only one spectrum analyzer should be active by default. Per-track always-on
  analyzers would be too expensive in a browser.
- EQ constants should be centralized once, then used to generate preview nodes,
  offline render steps, and ffmpeg filter strings.

## Current File-Viewer Prototype

Useful existing capabilities:

- Static client-only media preview.
- Blob-backed playback.
- ffmpeg.wasm opt-in.
- Existing export presets and ACX/podcast chains.
- Current audio graph, EQ, dynamics, spectrum, QC, compare, mixer, and video
  timeline prototype code.
- Existing smoke infrastructure and sample media.
- Existing zero-off-origin policy.

Current limitations to replace:

- Audio mixer, video timeline, compare, export, EQ, QC, and Listen maintain
  separate UI/state models.
- Existing audio mixer is lane-like but audio-only and not OpenShot/general
  enough.
- Existing video timeline is a narrow 2-lane ffmpeg panel, not a general mixer.
- Compare has separate timing/analysis paths.
- The native media element still shapes the architecture too much.
- Project import/export of edit decisions is not a first-class feature.
- There are currently two audio graph worlds: media playback/EQ and mixer
  playback. The new module needs one timeline/audio graph plan to avoid
  `createMediaElementSource` reuse constraints and inconsistent preview/export
  behavior.

## Required Feature Inventory

### Assets

- Add current open file as first asset automatically.
- Drag/drop more files into project bin or directly onto timeline.
- Accept audio, video, image, and eventually subtitle/metadata sidecars.
- Detect media capabilities:
  - `hasAudio`
  - `hasVideo`
  - `hasImage`
  - `hasText`
  - playable natively
  - requires ffmpeg conversion for preview
  - requires ffmpeg for export
- Show warnings for unsupported/needs-conversion cases.

### Timeline

- Infinite or project-duration-based horizontal timeline.
- Ruler.
- Red playhead/cursor.
- Zoom.
- Pan/scroll.
- Markers.
- Snapping.
- Razor/split.
- Trim handles.
- Multi-select.
- Copy/paste.
- Delete and ripple delete.
- Remove gap.
- Track/lane lock.
- Track/lane mute/solo where audio-capable.

### Lanes And Elements

- Lanes are ordered layers.
- Higher visual lanes composite above lower visual lanes.
- Audio lanes mix additively into the master bus.
- Elements can contain audio, video, image, or generated content.
- Images placed on the timeline become visual elements with duration.
- Video elements expose both visual and audio controls.
- Audio-only elements expose waveform and audio controls.
- Generated elements include pink noise, tone, color matte, silence, and maybe
  title/text later.

### Editing

- Move element by dragging.
- Trim start/end.
- Slip source range inside element.
- Split at playhead or clicked position.
- Fade in/out.
- Crossfade/transition from overlaps.
- Clip gain/volume.
- Transform visual elements:
  - position
  - scale
  - rotation
  - opacity
  - crop
  - anchor
- Animate properties with keyframes.
- Apply effects/filters to elements, lanes, or master.

### Audio

- Waveform for every audio-capable visible element.
- Track-specific EQ.
- Global/master EQ.
- Pink-noise lane/bed.
- Room-tone/gap semantics.
- Gain, mute, solo.
- Fade in/out.
- Sample-rate handling for WAV and export.
- Loudness/QC analysis.
- Spectrum analysis for selected element/lane/master.

### Video/Image

- Thumbnail strips or sparse thumbnails for video elements.
- Image preview strip or still block for image elements.
- Overlays and transforms.
- Keyframed animation.
- Video filters.
- Warning when preview/export requires ffmpeg conversion.
- Proxy strategy for heavy video files.

### Compare

- Compare is not a separate product. It is a mode over the mixer:
  - choose two elements/lanes/ranges
  - stacked view
  - overlay view
  - independent offsets
  - selected overlap analysis
  - no hidden normalization unless user chooses it

### Import/Export

- Project settings export:
  - JSON file
  - app/schema version
  - source file references
  - file identity hashes/fingerprints
  - lane/element/effect/keyframe settings
  - no media bytes by default
- Project settings import:
  - match current local files by hash/name/size/mtime where possible
  - show missing media list
  - allow user to relink missing files
  - when dragged files match missing assets, show a reapply modal:
    - apply to all matching elements
    - ask per element
    - do not change media objects
- Final media export:
  - browser-native path when possible
  - ffmpeg path when enabled/required
  - clear capability warnings
  - deterministic export provenance

### Capability Gating

The mixer must not look broken when optional functionality is unavailable. It
should be configured from a capability matrix:

- always available:
  - project model
  - local asset registry
  - timeline editing state
  - project settings import/export
  - basic drag/move/trim metadata edits
  - native preview for browser-supported formats
- available when WebAudio works:
  - audio playback graph
  - waveform analysis within caps
  - track/master EQ preview
  - audio mix preview
- available when browser decode supports the source:
  - waveform for compressed audio
  - selected audio analysis
- available when ffmpeg is opted in:
  - unsupported format conversion
  - video composition export
  - mux/demux
  - selected-range extraction for difficult compressed files
  - filter baking that browser APIs cannot produce

Unavailable capabilities should render as intentional disabled actions with
short notes such as "Enable Media Transcoding to export this video mix" rather
than empty panels or failed controls.
