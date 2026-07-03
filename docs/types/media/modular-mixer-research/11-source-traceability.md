# Source Traceability Matrix

This matrix links the modular mixer requirements back to their source
inspiration and implementation evidence. Use it when reviewing whether a design
choice is grounded in OpenShot, auto-audiobook, Narratu, or existing
file-viewer behavior.

## Legend

- OpenShot: external non-linear editor reference.
- Auto-audiobook: local audio lane/timeline and audiobook export reference.
- Narratu: local EQ/master-bus/spectrum/cache reference.
- File-viewer: current static-client media studio constraints and prototype
  capabilities.

## Requirement Traceability

| Requirement | Primary Source | Supporting Source | Spec Location |
| --- | --- | --- | --- |
| Modular mixer instead of audio-only Listen redesign | User direction, File-viewer prototype limits | OpenShot timeline model | `00-scope-and-decisions.md`, `02-module-architecture.md` |
| Project bin/assets as first-class objects | OpenShot Project Files | File-viewer examples/intake | `01-feature-research.md`, `03-project-model.md` |
| Tracks/layers with visual stacking | OpenShot tracks/layers | File-viewer video timeline lessons | `01-feature-research.md`, `03-project-model.md`, `04-rendering-interaction.md` |
| One MP3/WAV opens as one lane | User direction | Auto-audiobook lane grammar | `00-scope-and-decisions.md`, `06-implementation-plan.md` |
| Mix expands same model to multiple lanes | User direction | Auto-audiobook speakers/noise/music/SFX | `00-scope-and-decisions.md`, `02-module-architecture.md` |
| Compare uses same model with two selected objects/ranges | User direction | File-viewer compare math, OpenShot selection | `03-project-model.md`, `04-rendering-interaction.md` |
| Video files expose `hasVideo` and optional `hasAudio` | User direction, OpenShot media clips | File-viewer video studio/timeline | `01-feature-research.md`, `03-project-model.md` |
| Images become visual timeline elements | User direction, OpenShot image layers | File-viewer static image preview knowledge | `01-feature-research.md`, `03-project-model.md` |
| Seek-frame composited visual preview | User amendment, OpenShot preview/timeline orientation | File-viewer static client constraints | `02-module-architecture.md`, `04-rendering-interaction.md`, `12-user-workflows.md` |
| Lane descriptor registry | Auto-audiobook fixed semantic lanes | OpenShot tracks/layers | `02-module-architecture.md` |
| Derived room-tone/noise lanes | Auto-audiobook noise derived from gaps | User room-tone requirement | `02-module-architecture.md`, `03-project-model.md` |
| Pink noise/room tone at audiobook-safe levels | Auto-audiobook audio processor/export | File-viewer generator prototype | `01-feature-research.md`, `03-project-model.md` |
| Waveform-first audio rendering | Auto-audiobook MixerTrack | File-viewer waveform prototypes | `04-rendering-interaction.md`, `08-acceptance-and-test-strategy.md` |
| Red playhead/ruler/zoom timeline | OpenShot ruler/playhead/zoom, auto-audiobook ruler | File-viewer timeline prototype | `04-rendering-interaction.md` |
| Dragging, trimming, slicing, context menu | OpenShot clips, auto-audiobook MixerTrack | File-viewer current editor actions | `04-rendering-interaction.md` |
| Right-click menu overrides browser menu | Auto-audiobook MixerTrack portal menu | OpenShot context menu behavior | `04-rendering-interaction.md` |
| Track-specific EQ | Narratu EqPanel/EqEngine | User requirement | `01-feature-research.md`, `03-project-model.md` |
| Global/master EQ | Narratu master bus | Existing file-viewer audio graph/export | `01-feature-research.md`, `03-project-model.md` |
| One shared analyzer, not many always-on analyzers | Narratu SpectrumAnalyzer performance caveat | File-viewer lazy-heavy-panel policy | `01-feature-research.md`, `05-memory-performance.md` |
| Capability-gated reduced UI | User requirement | File-viewer ffmpeg opt-in policy | `02-module-architecture.md`, `04-rendering-interaction.md` |
| ffmpeg opt-in remains lazy | File-viewer runtime policy | OpenShot final export concepts | `02-module-architecture.md`, `05-memory-performance.md` |
| Unsupported media shows conversion/proxy warning | File-viewer transcoder hints | OpenShot broad format support through ffmpeg | `04-rendering-interaction.md`, `08-acceptance-and-test-strategy.md` |
| Config-only project export | User requirement, OpenShot project import/export concept | File-viewer static-client constraints | `03-project-model.md`, `08-acceptance-and-test-strategy.md` |
| Drag/relink imported project media | User requirement | File-viewer local folder/examples intake | `03-project-model.md`, `10-review-checklist.md` |
| Reapply modal choices | User requirement | Project import workflow | `03-project-model.md`, `08-acceptance-and-test-strategy.md` |
| Sample-rate ownership and WAV safety | Auto-audiobook sample-rate lessons | File-viewer WAV samples | `01-feature-research.md`, `05-memory-performance.md` |
| Byte-budgeted decoded audio cache | Narratu audio-buffer-cache | File-viewer browser memory constraints | `05-memory-performance.md` |
| Processed cache keys include settings | Narratu processed-segment-cache | Export determinism requirement | `05-memory-performance.md`, `07-risks.md` |
| Playback and export are separate engines over same state | Auto-audiobook playback/export split | File-viewer export prototypes | `02-module-architecture.md`, `08-acceptance-and-test-strategy.md` |
| Zero off-origin guarantee preserved | File-viewer repo policy | Static-client objective | `00-scope-and-decisions.md`, `08-acceptance-and-test-strategy.md` |
| Old Mix/Compare/Timeline are prototypes only | User requirement, File-viewer architecture audit | Tracker/roadmap updates | `00-scope-and-decisions.md`, `09-build-runbook.md` |

## Source Details

### OpenShot

Observed features from the OpenShot user guide:

- Main window: project files, preview, timeline toolbar, zoom slider,
  playhead/ruler, timeline, playback, and tracks.
- Tracks/layers: higher tracks visually layer above lower tracks.
- Timeline toolbar: add track, undo/redo, snap, retime, razor, markers, center
  on playhead.
- Clips: selection, trimming, slicing, context-menu presets, volume, time,
  display, copy/paste, remove clip, remove gap.
- Effects: audio/video effects modify clip data, have editable properties, and
  can be animated with keyframes.
- Import/export: project files store edit decisions; final export renders media.

Primary URLs:

- `https://www.openshot.org/static/files/user-guide/main_window.html`
- `https://www.openshot.org/static/files/user-guide/clips.html`
- `https://cdn.openshot.org/static/files/user-guide/effects.html`

### Auto-Audiobook

Observed implementation lessons:

- `AudioMixerView.tsx`: compact mixer shell with toolbar, ruler, lane stack,
  scroll/zoom, and selection detail.
- `MixerTrack.tsx`: canvas waveform drawing, pointer hit-testing,
  drag-to-adjust timing, right-click menu, music/SFX drops, selection.
- `MixerToolbar.tsx`: transport, cursor time, zoom controls.
- `mixer-store.ts`: segment/region state with offsets, durations, fades, volume,
  loop, selection, cursor, zoom, scroll.
- `mixer-playback.ts`: scheduled WebAudio playback from cursor with region gain
  updates.
- `mixer-export.ts`: deterministic offline mix/export over the same timeline
  state.
- `audio-processor.ts`: pink noise, fade, early-stop, sample-rate lessons.

Primary local paths:

- `/home/jens/repos/auto-audiobook/src/components/AudioMixerView.tsx`
- `/home/jens/repos/auto-audiobook/src/components/MixerTrack.tsx`
- `/home/jens/repos/auto-audiobook/src/components/MixerToolbar.tsx`
- `/home/jens/repos/auto-audiobook/src/stores/mixer-store.ts`
- `/home/jens/repos/auto-audiobook/src/utils/mixer-playback.ts`
- `/home/jens/repos/auto-audiobook/src/utils/mixer-export.ts`
- `/home/jens/repos/auto-audiobook/src/engine/audio-processor.ts`

### Narratu

Observed implementation lessons:

- `EqPanel.tsx`: 9-band EQ, HPF/LPF, presets, A/B bypass, spectrum.
- `eq-engine.ts`: live WebAudio EQ chain.
- `eq-presets.ts`: speech/audiobook/broadcast/utility preset data.
- `SpectrumAnalyzer.tsx`: log-frequency analyzer with EQ curve overlay.
- `EqComparisonChart.tsx`: before/after spectrum and stat deltas.
- `audio-buffer-cache.ts`: decoded buffer LRU cache with byte budget.
- `processed-segment-cache.ts`: setting-hashed processed cache.
- `ffmpeg-filters.ts`: export/server filter chain generation and master-bus
  ordering.

Primary local paths:

- `/home/jens/repos/narratu/apps/web/src/components/workspace/EqPanel.tsx`
- `/home/jens/repos/narratu/apps/web/src/utils/eq-engine.ts`
- `/home/jens/repos/narratu/apps/web/src/utils/eq-presets.ts`
- `/home/jens/repos/narratu/apps/web/src/components/workspace/SpectrumAnalyzer.tsx`
- `/home/jens/repos/narratu/apps/web/src/components/workspace/EqComparisonChart.tsx`
- `/home/jens/repos/narratu/apps/web/src/utils/audio-buffer-cache.ts`
- `/home/jens/repos/narratu/apps/web/src/utils/processed-segment-cache.ts`
- `/home/jens/repos/narratu/packages/engine/src/audio/ffmpeg-filters.ts`

### File-Viewer

Observed implementation lessons:

- `renderer.js`: media intake, blob-backed native preview, workspace creation,
  playlist/chapters/export wiring.
- `renderer-mode-panels.js` and `workspace-modes.js`: lazy mode mount/destroy.
- `mixer-engine.js` (retired/deleted in Stage 8 prototype retirement): audio-only
  mix lessons and memory risks it surfaced while it existed.
- `timeline.js` (retired/deleted in Stage 8 prototype retirement): 2-lane video
  timeline lessons and limits it surfaced while it existed.
- `compare-ui.js` (retired/deleted in Stage 8 prototype retirement) plus compare
  helpers: shifted overlap and compare workflow lessons.
- `studio-export.js`, `transcoder.js`, `transcoder-ops.js`, `video-filters.js`:
  export presets, ffmpeg lazy-load, operation planning, error handling.
- Existing tests under `tests/areas/media-studio*.mjs`: smoke coverage patterns
  that should migrate to the new mixer grammar.

Primary local paths:

- `docs/types/media/renderer.js`
- `docs/types/media/renderer-mode-panels.js`
- `docs/types/media/workspace-modes.js`
- `docs/types/media/mixer-engine.js` (retired/deleted in Stage 8 prototype
  retirement — see `STUDIO_TRACKER.md`)
- `docs/types/media/timeline.js` (retired/deleted in Stage 8 prototype
  retirement — see `STUDIO_TRACKER.md`)
- `docs/types/media/compare-ui.js` (retired/deleted in Stage 8 prototype
  retirement — see `STUDIO_TRACKER.md`)
- `docs/types/media/studio-export.js`
- `docs/types/media/transcoder.js`
- `docs/types/media/transcoder-ops.js`
- `docs/types/media/video-filters.js`
- `tests/areas/media-studio.mjs`
