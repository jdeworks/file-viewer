# Media Studio Tracker

Active tracker for the `worktree-media` lane. Use this before `MEDIA_EDITOR_PLAN.md`,
`EDITOR.md`, or `STUDIO_ROADMAP.md`; those files contain useful design history but some
status notes are stale.

## Daily Start Checklist

- Run `git status --short` and preserve any user/worker changes.
- Re-read this tracker and pick one coherent increment.
- Prefer inherited/main-model worker subagents for bounded code changes with disjoint write scopes
  unless the user explicitly asks for a different model.
- Do not push or pull `dev` unless the user asks.
- Use small local checkpoint commits after coherent, validated increments so the lane can be
  reverted if a later autonomous change goes wrong. Do not leave multi-day successful work only
  in the worktree.
- Before local commit: run `./scripts/check.sh --fast` unless the increment is docs-only.
- Before a reviewed merge/push batch: run full `./scripts/check.sh`.
- After a commit, mark the relevant queue item `committed` or record the commit subject/hash here.

## Current Baseline

- Branch: `worktree-media`.
- Validation gate: `./scripts/check.sh --fast` for normal increments; full check before release/batch merge.
- Media runtime rule: zero off-origin requests; ffmpeg.wasm remains vendored and opt-in.
- Product status: the media studio is a functional prototype, not a polished 0.5 surface.
  Many capabilities exist, but the sample audio experience still reads like a debug/control
  stack and the video studio still needs the same workspace-level polish pass. Do not continue
  adding broad new media features until the workspace polish gates below are addressed.
- Source references:
  - `narratu`: EQ presets, master bus, loudness/export filters, mixer lessons.
  - `auto-audiobook`: mixer behavior, silence/artifact lessons, sample-rate/gain lessons.
- Out of scope for this static viewer: backend orchestration, TTS, ASR/NLP filler removal, voice AutoEQ, account/server features, and large ML models.

## Studio North Star

This lane is an audio studio and a video studio, not a collection of optional widgets.
The base pieces are aligned: blob-backed native playback, shared WebAudio graph, ffmpeg
operations, lazy panels, export presets, QC, subtitles, and timeline/mixer primitives.
The remaining work is to compose those pieces into a stable workspace grammar.

Shared rules for audio and video:

- First viewport should communicate the open media, current time, duration/status, and the
  primary timeline/waveform/scrub surface.
- Use task modes instead of nested feature stacks. Audio modes should converge on
  `Listen`, `Tune`, `QC`, `Export`, `Mix`; video modes should converge on
  `Watch`, `Adjust`, `Timeline`, `Subtitles`, `Export`.
- Keep common playback changes cheap and immediate; keep analysis, full-file decode, and
  ffmpeg export lazy and explicit.
- Put intent-level controls before raw parameters. Advanced sliders remain available, but
  presets, status, provenance, and recommended actions should be the default surface.
- Preserve the zero-off-origin guarantee and the static-client constraint.
- Update tests with the UI grammar. Do not keep tests that force the old `media-wv-toggle`
  debug stack to remain visible.

## Functional Prototype Coverage

These are implemented and tested as capabilities, but the audio UI is not yet production-polished:

- Native audio/video playback, blob streaming, resume position, sleep timer, Media Session, playlist, and ID3 title/artist enrichment.
- ffmpeg editor operations: trim, extract audio, mute, screenshot, downscale, volume, speed, WebM, normalize, GIF/WebP, thumbnail strip, remove metadata, subtitle embed, concat, audio replace.
- Audio studio: shared WebAudio graph, dry/wet spectrum, 9-band EQ, HPF/LPF, presets, A/B store/recall, LUFS readout/normalize.
- Processed export: live EQ/dynamics/fades serialized to ffmpeg audio filter chains with export presets and custom overrides.
- Dynamics: live compressor/limiter plus bake-only gate/de-noise.
- ACX QC/export: RMS, sample peak, noise floor, sample rate, channels, head/tail silence, one-click ACX MP3 export.
- Multi-track audio mixer: lanes, gain/mute/solo, fades, test tone/pink noise, WAV/MP3 mixdown.
- Video playback polish: speed buttons, PiP button, frame-step buttons, scoped keyboard shortcuts.
- Video studio: live CSS filters and video audio routed into the shared EQ/spectrum graph.
- Subtitles: SRT/VTT sidecar loader and overlay.
- Video timeline: thumbnail strip, second clip/music drop zone, fade-to-black, xfade/acrossfade/mux-music arg wiring.
- Smoke coverage is split between `tests/areas/media-studio.mjs` for the media workspace and
  `tests/areas/media-3d.mjs` for the remaining 3D/image/MIDI/gamerom area.

## Active Queue

### A0 — Modular Media Mixer Source Of Truth

Status: Stage 5 video/image seek-frame preview started.

The active design target has moved from a narrow audio-only lane redesign to a
general modular media mixer/editor. Use
`docs/types/media/modular-mixer-research/00-scope-and-decisions.md` as the
source of truth for implementation. The package covers the
OpenShot-style timeline/layer direction, auto-audiobook audio lane semantics,
Narratu EQ/master-bus lessons, capability-gated reduced modes, config-only
project import/export/reapply, memory constraints, risks, staged implementation,
acceptance criteria, build runbook, and review checklist.

Implementation must not build on the current file-viewer Mix, Compare, or video
Timeline prototypes as final architecture. They remain prototype coverage only.

Review before build:

- `docs/types/media/modular-mixer-research/00-scope-and-decisions.md`
- `docs/types/media/modular-mixer-research/08-acceptance-and-test-strategy.md`
- `docs/types/media/modular-mixer-research/09-build-runbook.md`
- `docs/types/media/modular-mixer-research/10-review-checklist.md`

The older audio-only requirements file,
`docs/types/media/AUDIO_LANE_REQUIREMENTS.md`, is now supporting detail for the
MP3/WAV one-lane case, not the primary direction.

Stage 1 pure-core implementation has started under `docs/types/media/mixer/`:

- Added pure model, capability, config, hashing, import/export, and EQ schema
  modules.
- Added project/lane/element timing utilities, derived lane descriptors,
  compare overlap state, config-only settings JSON, relink/reapply state, and
  capability status evaluation.
- Added focused unit coverage:
  - `tests/media-mixer-model.test.mjs`
  - `tests/media-mixer-import-export.test.mjs`
  - `tests/media-mixer-capabilities.test.mjs`
- Validation: new mixer unit tests pass; `tests/areas/media-studio.mjs` passes.
  `./scripts/check.sh --fast` currently reaches aggregate smoke but fails in
  the independently reproduced `media-3d` area waiting for
  `#previewHost .media-doc video.media-view`.

Stage 2 renderer skeleton is implemented under `docs/types/media/mixer/`:

- Added `mixer-renderer.js`, `mixer-hit-test.js`, `mixer-interactions.js`,
  `mixer-context-menu.js`, `mixer-ui.js`, and `mixer-styles.css`.
- The shell renders toolbar, mode controls, ruler, red playhead, lane stack,
  lane labels, element blocks, selection outline, and inspector placeholder
  from immutable snapshots.
- Hit-testing distinguishes ruler, lane header, empty lane, element body,
  trim handles, and fade handles.
- Temporary fake-project mounting is available through
  `mountMediaMixerShell()` for Stage 2 only; it does not replace Listen yet.
- Validation passed:
  - `node tests/media-mixer-model.test.mjs`
  - `node tests/media-mixer-import-export.test.mjs`
  - `node tests/media-mixer-capabilities.test.mjs`
  - `node tests/media-mixer-hit-test.test.mjs`
  - `node tests/media-parsers.test.mjs`
  - `node tests/smoke-area.mjs media-studio-mixer-shell media-studio`
- Validation caveat: `./scripts/check.sh --fast` still fails in the same
  independently reproduced aggregate-smoke `media-3d` checkpoint waiting for
  `#previewHost .media-doc video.media-view`. The new mixer shell unit tests,
  the new mixer shell smoke, and the targeted media-studio smoke pass.

The shared renderer has since been extended toward the final Listen/Mix/Compare
surface:

- Audio-capable elements can draw waveform summaries directly inside the shared
  lane element blocks.
- Selecting an element exposes shared inspector controls for start, source in,
  source out, gain, fade in, and fade out, and those controls update the shared
  project model through the mixer interaction dispatcher.
- `tests/areas/media-studio-mixer-shell.mjs` now proves waveform canvas paint
  and selected-element inspector updates on the shared renderer shell.

Stage 3 one-lane MP3/WAV Listen integration is in progress:

- `renderer.js` now imports the default audio Listen surface through
  `docs/types/media/mixer/mixer-audio-listen.js`.
- The default Listen surface now renders directly through the shared modular
  mixer renderer instead of adapting the older `audio-listen-surface.js` DOM.
  The visible lane, ruler, playhead, waveform canvas, selected element, and
  inspector controls come from `mixer-renderer.js` snapshots.
- The mixer-owned Listen controller creates a shared mixer project for the open
  audio source, mirrors offset/in/out/gain/fade/room-tone controls into the
  project element, and exposes config-only settings JSON export/import.
- The Listen surface now has mixer-owned viewport controls for zoom and pan,
  a capability note for reduced/ffmpeg-opt-in behavior, and direct source
  region dragging that updates the same start-offset state as the lane control.
- The older Listen decode path now reports waveform analysis status
  (`pending`, `available`, or `unavailable`) to the mixer adapter. When a
  bounded browser decode produces a waveform summary, that runtime summary is
  attached to the shared project element for renderer handoff; project settings
  export strips runtime summaries and decoded buffers back out.
- Focused smoke coverage in `tests/areas/media-studio-mixer-audio-listen.mjs`
  proves `Sample.wav` and `Sample.mp3` open through the mixer-owned Listen
  context, keep native audio hidden, render the one-lane waveform editor,
  expose waveform analysis status, operate play/pause/stop against the hidden
  decode source, update zoom/pan, move source offset by dragging the waveform
  region, and roundtrip one-lane settings JSON without media bytes or runtime
  waveform analysis arrays.
- Existing media-studio smoke also proves the direct shared-renderer Listen
  surface still supports waveform click-to-seek, drag selection to ffmpeg Trim,
  chapter markers, MP3/WAV parity, and the surrounding audio workspace modes.
- Validation passed:
  - `node --check docs/types/media/mixer/mixer-audio-listen.js`
  - `node --check docs/types/media/mixer/mixer-renderer.js`
  - `node --check docs/types/media/mixer/mixer-ui.js`
  - `node --check docs/types/media/mixer/mixer-interactions.js`
  - `node --check docs/types/media/mixer/mixer-import-export.js`
  - `node --check docs/types/media/audio-listen-surface.js`
  - `node --check tests/areas/media-studio-mixer-audio-listen.mjs`
  - `node --check tests/areas/media-studio-mixer-shell.mjs`
  - `node tests/media-mixer-model.test.mjs`
  - `node tests/media-mixer-import-export.test.mjs`
  - `node tests/media-mixer-capabilities.test.mjs`
  - `node tests/media-mixer-hit-test.test.mjs`
  - `node tests/media-parsers.test.mjs`
  - `node tests/smoke-area.mjs media-studio-mixer-audio-listen`
  - `node tests/smoke-area.mjs media-studio-mixer-shell`
  - `node tests/smoke-area.mjs media-studio`
  - `./scripts/check.sh --fast`
- Remaining Stage 3 work: tighten direct-rendered Listen styling and continue
  moving compatibility-only selectors out of the required smoke contract as the
  shared mixer tests take over.

Stage 4 multi-lane audio is implemented:

- Audio `Mix` now mounts `docs/types/media/mixer/mixer-audio-multi.js`, a
  shared-model controller rendered through `mixer-renderer.js`, instead of the
  older `docs/types/media/mixer-ui.js` prototype surface.
- The Mix surface opens from the same one-file project shape as Listen, then
  expands into multiple lanes through generated tone and pink-noise/room-tone
  elements. The `.mx-*` selectors remain compatibility aliases only, so existing
  broad smoke coverage can keep proving lifecycle and viewport behavior while
  focused modular tests assert the new `.mmx-*` contract.
- Lane gain, mute, solo, element fades, generated room-tone/pink-noise, master
  gain, lane EQ schema, and master EQ schema are all represented in the shared
  project model. New `updateLane()` and `updateMaster()` helpers make these
  mutations explicit and testable.
- Mix exposes capability/reduced-mode notes from the mixer capability evaluator
  and keeps ffmpeg as an opt-in/final-render concern rather than loading it on
  mount.
- Focused smoke coverage in
  `tests/areas/media-studio-mixer-audio-listen.mjs` proves lazy mount,
  one-lane initial state, shared waveform lane rendering, lane controls
  updating model state, first-class pink-noise/room-tone lane state, separate
  track/master EQ state, and config-only settings export without media bytes or
  runtime analysis arrays.
- The Mix surface now accepts dropped audio files without bubbling the drop to
  the global file opener. A dropped WAV/MP3-style file creates a new audio lane,
  asset, and element at the current cursor/start position, then bounded browser
  decode attaches duration and waveform summary data to that element while
  settings export continues to strip runtime waveform arrays.
- Added `updateAsset()` for explicit shared-model asset metadata mutation when
  dropped-file analysis discovers duration/sample-rate facts after initial
  intake.
- Added `mixer-audio-cache.js`, a Narratu-style runtime cache policy for
  decoded audio buffers with explicit byte budget, LRU eviction, per-project
  release, and deterministic decoded/processed cache keys that include source
  ranges, lane gain/EQ, element gain/fades, placement, room-tone state, and the
  master bus. Mix owns a cache instance, exposes cache budget stats for runtime
  verification, and releases project cache entries on teardown; settings export
  remains config-only.
- Added `mixer-audio-playback.js`, a shared-model WebAudio scheduler for Mix
  preview. It builds a schedule from the project/lane/element timeline, respects
  cursor offset, trim source ranges, lane mute/solo, element gain/fades, lane
  gain, master gain, generated tone, and pink-noise room-tone elements. File
  assets are decoded lazily through the runtime file map and decoded-audio cache;
  generated sources are synthesized directly. The Mix Play/Stop controls now
  drive this scheduler and the red cursor follows the AudioContext clock.
- Added `mixer-audio-export.js`, which derives a browser WAV export plan and
  deterministic provenance from the same shared schedule state. Mixdown now
  uses `OfflineAudioContext` where feasible, reuses the runtime file map and
  decoded-audio cache for file assets, renders generated tone and pink-noise
  room-tone elements, and records provenance for assets, trims, offsets, fades,
  lane/element/master gains, EQ preset ids, room-tone state, render path,
  scheduled/skipped counts, and warnings without serializing media bytes.
- Validation passed:
  - `node --check docs/types/media/mixer/mixer-audio-multi.js`
  - `node --check docs/types/media/mixer/mixer-audio-cache.js`
  - `node --check docs/types/media/mixer/mixer-audio-playback.js`
  - `node --check docs/types/media/mixer/mixer-audio-export.js`
  - `node --check tests/areas/media-studio-mixer-audio-listen.mjs`
  - `node tests/media-mixer-model.test.mjs`
  - `node tests/smoke-area.mjs media-studio-mixer-audio-listen`
  - `node tests/smoke-area.mjs media-studio`
- Stage 4 remaining work: none known for the accepted audio scope. Next A0
  implementation target is Stage 5 video/image elements and seek-frame preview.

Stage 5 video/image elements and seek-frame preview has started:

- Added `mixer-visual-preview.js`, a client-side orientation preview module
  that derives active visual elements from the shared project snapshot at the
  current seek cursor and renders a bounded canvas composition placeholder.
  This is not realtime video playback; it is a seek-frame orientation surface
  for placing images/video-capable elements without forcing heavy decode.
- The shared renderer now shows visual badges for image/video-capable elements,
  renders the seek-frame preview below the timeline, and exposes selected
  visual transform controls for X/Y position, scale, rotation, and opacity.
- The mixer interaction helpers update visual transform state in the same
  shared project model used by audio timing/gain/fade controls.
- Focused smoke coverage in `tests/areas/media-studio-mixer-shell.mjs` now
  proves active visual-element discovery at the cursor, frame-preview rendering,
  visual placeholders, and transform/opacity inspector edits feeding back into
  the seek-frame preview model.
- Added `mixer-media-drop.js`, a reusable audio/image/video drop classifier and
  shared-model intake helper. Mix now accepts visual files as image/video-capable
  lanes in addition to audio lanes, keeps media bytes only in the runtime file
  map, and exposes `addMediaFile()` while preserving the previous `addAudioFile`
  compatibility entry point.
- Focused smoke coverage in
  `tests/areas/media-studio-mixer-audio-listen.mjs` now proves a dropped SVG
  image becomes a shared-model image lane/element with visual controls and an
  active seek-frame preview; pure audio proof helpers were split into
  `tests/areas/media-studio-mixer-audio-proofs.mjs` to keep the browser smoke
  under the line-count threshold.
- Dropped visual files now get bounded native metadata probing. Image drops
  update shared asset dimensions, browser-playable video drops can update
  duration/dimensions, and unsupported video keeps the `needs-proxy` state so
  the preview/capability notes continue to explain the ffmpeg/proxy requirement
  without loading ffmpeg.
- Added `mixer-visual-runtime.js`, a runtime-only frame/thumbnail cache that
  owns object URLs and hidden video samplers. The seek-frame preview now draws
  decoded image sources and sparse browser-playable video frame samples when
  available, while visual clips render sparse thumbnail strips from the same
  runtime-only cache. Project settings export remains config-only and strips
  frame/thumbnail caches.
- Opened video files now enter the shared modular mixer model through
  `mixer-video-source.js` in Timeline mode. Browser-playable sources such as
  `Sample.webm` mount as a one-lane video/audio source project with ruler,
  zoom, red playhead, selection, visual transform controls, config-only
  settings export, and a seek-frame preview sampled from the opened file. The
  older video timeline remains behind its lazy toggle for current trim/transition
  smoke coverage until the modular timeline fully replaces it.
- Focused smoke coverage now proves the dropped SVG image records 64x40
  metadata in the project model, paints the actual image color into the
  seek-frame canvas, samples a dropped browser-playable WebM frame source,
  renders sparse runtime thumbnails for browser-playable video, and shows a
  conversion/proxy warning plus proxy-required thumbnail strip state for
  unsupported dropped AVI while ffmpeg remains unloaded.
- Validation passed for this slice:
  - `node --check docs/types/media/mixer/mixer-visual-preview.js docs/types/media/mixer/mixer-renderer.js docs/types/media/mixer/mixer-ui.js docs/types/media/mixer/mixer-audio-multi-helpers.js tests/areas/media-studio-mixer-shell.mjs`
  - `node --check docs/types/media/mixer/mixer-media-drop.js docs/types/media/mixer/mixer-audio-multi.js tests/areas/media-studio-mixer-audio-listen.mjs`
  - `node --check docs/types/media/mixer/mixer-video-source.js docs/types/media/renderer-mode-panels.js tests/areas/media-studio-video-export-timeline.mjs`
  - `node tests/smoke-area.mjs media-studio-mixer-shell`
  - `node tests/smoke-area.mjs media-studio-mixer-audio-listen`
  - `node tests/media-mixer-model.test.mjs`
  - `node tests/media-mixer-import-export.test.mjs`
  - `node tests/media-mixer-capabilities.test.mjs`
  - `node tests/media-mixer-hit-test.test.mjs`
  - `node tests/media-parsers.test.mjs`
  - `node tests/smoke-area.mjs media-studio`
  - `./scripts/check.sh --fast`
- Stage 5 remaining work: ffmpeg-backed proxy generation/conversion paths and
  replacing the old video timeline with modular multi-lane editing.

Stage 6 Compare on the shared model has started:

- Added `mixer-compare.js`, an additive modular Compare surface mounted ahead
  of the current Compare UI for both audio and video. It builds a two-lane
  shared mixer project from the opened media, assigns Compare A/B through
  `project.compare`, computes overlap through `computeCompareOverlap()`, and
  keeps settings export config-only.
- The surface exposes stacked/overlay view controls plus A/B offset and in/out
  range fields backed by the shared compare state. It also accepts a browsed or
  dropped B media file, adds that file as a config-only project asset, retargets
  the existing B lane/element, stores the file only in the runtime file map, and
  refreshes `project.compare.b`. The existing detailed Compare UI remains
  mounted for current analysis, drag, live video overlay, and smoke coverage
  until the modular surface replaces it completely.
- Focused smoke coverage in `tests/areas/media-studio-compare.mjs` now proves
  the modular Compare surface mounts for audio and video with two lanes, two
  elements, A/B targets, positive overlap, config-only settings, and overlay
  mode rendering. It also proves browsing `sample.wav`/`sample.webm` as Compare
  B retargets the shared compare state without serializing media bytes.
- Modular overlay mode now paints a shared-coordinate canvas instead of a text
  placeholder. Audio Compare draws both A/B waveform summaries over the same
  ruler space; visual Compare draws both A/B frame sources or placeholders on a
  single canvas with overlay opacity metadata. Smoke coverage asserts the
  modular overlay canvas kind, A/B bindings, overlap, and nonblank pixel
  variation for both audio and video.
- Added explicit modular Compare analysis hooks. The modular surface now exposes
  an analyze action and result panel backed by the shared compare target/range
  state: audio reports selected-overlap peak-delta analysis from waveform
  summaries, and visual compare reports frame-source/transform coverage for the
  selected overlap without using the legacy Compare analyzer or loading ffmpeg.
- Added modular A/B timing coverage. The modular toolbar now drives A/B offset
  and in/out ranges through `setCompareTarget()`, clears stale modular analysis
  after edits, and smoke coverage proves the controls update both
  `project.compare` and the rendered overlap metadata for audio and video.
- Added modular A/B source selectors. The modular toolbar now lists existing
  mixer elements for each compare side, retargets through `setCompareTarget()`,
  and smoke coverage proves A/B can be chosen from the shared project elements.
- Added modular audio normalization control. Audio Compare now exposes an
  explicit off-by-default normalization toggle stored in `project.compare`,
  feeds that state into modular peak-delta analysis, and keeps the control
  absent for visual/video Compare.
- Deepened modular analysis readouts. `analyzeCompareSelection()` now reports
  shifted-overlap timing from the shared compare targets, including overlap,
  A-only range, B-only range, union duration, and overlap ratio. The modular
  analysis panel renders that timing summary, and focused media-studio smoke
  proves the result without relying on the legacy Compare readout.
- Stage 6 remaining work: continue replacing the legacy detailed diff/readout
  flows where deeper audio/video analysis still depends on old modules, and
  retire the old Compare UI once equivalent coverage has moved to modular
  selectors.

Stage 7 project settings import/export UI has started:

- Added `mixer-project-settings-ui.js`, a reusable modular settings helper that
  decorates mixer toolbars with config-only project settings export/import.
  Import uses `importProjectSettings()` plus runtime local-asset evidence, then
  renders the required reapply choices: `Apply to all elements`, `Ask per
  element`, and `Do not change media objects`.
- Wired the helper into the multi-lane Mix controller, modular video source
  controller, and modular Compare controller. Those controllers now expose
  `importSettings()`, `relinkFiles()`, and last-import state for smoke coverage
  while the UI provides the user-facing settings export/import, missing-media
  browse/drop relink, and reapply panel.
- Missing imported assets can now be relinked by dropping or browsing local
  media in the settings reapply panel. The helper hashes local files when
  possible, falls back to filename/size/mime/last-modified matching, stores
  `File` objects only in the runtime file map keyed by the imported asset id,
  and keeps exported settings free of media bytes and runtime caches.
- Added `mixer-video-export.js`, a pure final-video export planner for modular
  projects. It evaluates the shared capability matrix, keeps final render
  ffmpeg-gated, reports opt-in/loaded status, blocks missing media, and records
  config-only provenance for assets, visual items, audio items, trims, fades,
  transforms, master settings, warnings, and the intended render path.
- The opened video source surface now exposes a `Plan final export` action and
  compact export status panel. With ffmpeg disabled, the surface remains usable
  and shows the Media Transcoding opt-in note instead of loading ffmpeg or
  presenting a broken render action.
- Multi-lane Mix now exposes the same final-video export planning when the
  shared project contains image/video elements. Image-only visual compositions
  are correctly treated as ffmpeg-gated final video renders, and the plan
  records mixed audio plus visual-layer provenance without serializing runtime
  files, frame caches, or thumbnails.
- The modular video export planner now emits a concrete multi-input
  `filter_complex` plan for layered video/image compositions: background
  canvas, trim/source-in timing, timeline offsets, scale, rotation, opacity,
  overlay order, audio trim/delay/fades/gain, amix, and master gain. Static
  image inputs are planned as looped ffmpeg inputs, while disabled ffmpeg still
  returns config-only provenance instead of runnable args.
- Added the lazy final-render bridge for those plans. Opened video source and
  multi-lane Mix now show a `Render final export` action in the same export
  panel; if Media Transcoding is enabled but not loaded, the click path loads
  ffmpeg, rebuilds the plan as renderable, writes only local runtime file
  handles to MEMFS, runs the planned args, downloads the output, and cleans
  MEMFS. If ffmpeg is not enabled, the action remains a clear opt-in affordance
  instead of a broken render.
- Added a browser ffmpeg render-budget guard to the modular video export plan.
  The plan sums unique input asset sizes, records `renderBudget` provenance,
  blocks runnable args when inputs exceed the configured cap, and the runtime
  helper rechecks relinked local `File.size` values before reading bytes into
  MEMFS.
- Added visual fade controls to the shared modular inspector for video/image
  elements. The shared model now normalizes `visual.fadeInMs` and
  `visual.fadeOutMs`, and final video export maps them to ffmpeg alpha fades in
  the per-layer filter chain before overlay composition.
- Added first-pass modular video/image filter effects. Element effects are now
  normalized as config-safe `video-filter` entries with params/keyframes, the
  shared inspector exposes brightness, contrast, saturation, blur, and
  grayscale controls, and final video export maps those params to ffmpeg
  `eq`, `hue`, and `boxblur` filters in the same per-layer chain.
- Added incoming visual transition records to the shared model. Selected visual
  elements now expose transition duration and kind controls in the shared
  inspector, and final video export maps dissolve transitions to alpha fades and
  wipe-left transitions to overlay expressions while recording config-only
  transition provenance.
- Focused smoke coverage in `tests/areas/media-studio-mixer-audio-listen.mjs`
  proves the Mix settings UI imports config-only state, reports matched/missing
  media, exposes all three required reapply choices, applies the ask-per-
  element choice without serializing media bytes, and proves dropped-image
  visual compositions expose ffmpeg-gated video export provenance. `tests/areas/
  media-studio-video-export-timeline.mjs` proves the same settings surface on
  opened video source, including drag/drop relink for a missing imported video
  asset and ffmpeg-gated final export provenance, and `tests/areas/media-studio-
  compare.mjs` proves it on modular Compare for audio and video. Parser unit
  coverage now also proves disabled/enabled video export plans, filter graph
  layering, config-only provenance, the fake-ffmpeg runtime execution contract,
  browser ffmpeg input-budget enforcement, visual alpha-fade export filters,
  normalized video-filter effects, video-filter ffmpeg graph output, and
  incoming visual transition provenance/filter graph output.
- Stage 7 remaining work: expand filter coverage for additional
  transition/effect controls as those controls become user-facing, and continue
  hardening real browser ffmpeg renders against long/complex compositions.

### A1 — Auto-Audiobook-Grade Default Audio Lane

Status: superseded by A0 as the primary implementation direction.

The visible native audio player has been removed, but default `Listen` is still not yet
aligned with `auto-audiobook`. Do not extend the current file-viewer `Mix` or `Compare`
lane implementations for this work; they are only temporary prototype coverage and are not
the target interaction model. Opening a single MP3/WAV must use the `auto-audiobook`
mixer grammar, reduced to the relevant one-track/default case:

- Default audio should be waveform-first: a ruler, waveform canvas, red seek cursor,
  click-to-seek, and play/pause integrated around the waveform.
- Single-track edit controls must match the auto-audiobook region model: start, end,
  duration, volume/gain, loop where applicable, fade in, fade out, and later start/offset.
- Pink-noise/room-tone support follows the auto-audiobook gap/noise model, not the current
  generic generator lane. Noise is part of the audio timeline semantics and should be drawn
  as such.
- `Mix` should be rebuilt as the multi-track expansion of the auto-audiobook semantic lanes
  (`Speakers`/primary audio, `Noise`, `Music`, `SFX` or file-viewer equivalents), not as the
  current arbitrary-lane UI.
- `Compare` should be rebuilt as a two-track specialization of the same auto-audiobook lane
  model: two independently movable waveform lanes stacked vertically, with overlay mode
  drawing the two waveforms over each other so differences are visible.
- Reference source: `repos/auto-audiobook/src/components/AudioMixerView.tsx`,
  `MixerTrack.tsx`, `MixerToolbar.tsx`, `stores/mixer-store.ts`,
  `utils/mixer-playback.ts`, and `engine/audio-processor.ts`.

This remains valid audio-specific input for the default MP3/WAV one-lane slice,
but implementation should start from the modular mixer package in A0.

The latest roadmap items R0-R5 are recorded below as committed or implemented. In particular,
the earlier R4 foundation note is superseded by the implemented R4 section later in this file
and by `STUDIO_ROADMAP.md`.

Progress:

- Default single-track `Listen` slice implemented in this increment:
  - Replaced the separate Listen transport plus standalone waveform with one auto-audiobook-style
    lane surface for MP3/WAV: fixed lane label, integrated transport, ruler, waveform canvas,
    red cursor, click-to-seek, in/out selection, start-later offset, gain, fade in/out, duration
    readout, and pink-noise/room-tone bed toggle.
  - Native audio remains hidden as the decode/playback source.
  - Chapter markers and existing ffmpeg Trim prefill now attach to the lane waveform.
  - Smoke coverage now proves the new lane for both `Sample.wav` and `Sample.mp3`.
  - Validation passed: `node tests/smoke-area.mjs media-studio`, `./scripts/check.sh --fast`.

### P-Start — Checkpoint Current Verified Work

Status: committed.

Before beginning the workspace redesign, checkpoint the already-verified maintenance work:

- Review `git status --short` and make sure every changed file is understood.
- Run `./scripts/check.sh --fast` unless the user explicitly asks to skip.
- Commit the done/uncommitted M1 + M2 work and tracker/doc updates with a short imperative subject.
- Record the commit subject/hash in this tracker.
- Do not push or pull.
- Checkpoint commit: `cb94adcb` — `Checkpoint media studio M1/M2 work`.
- Validation before checkpoint: `./scripts/check.sh --fast` passed.

### P0 — Audio Workspace Polish Gate

Status: committed.

Goal: make `Sample.mp3` / `Sample.wav` feel like a coherent media workspace before adding
more broad media features.

Audit findings:

- Current audio DOM order is `name → native audio → waveform toggle stack → tools → extras`.
- Spectrum, Dynamics, Audiobook QC, and Multi-track mixer are nested inside the waveform wrapper.
- Collapsed state is mostly blank space plus native browser audio controls.
- Expanded state becomes a long vertical pile of unrelated technical panels.
- The waveform is hidden behind a toggle even though it should anchor the media surface.
- Controls are grouped by implementation history, not user workflow.
- Dynamics and EQ expose raw engineering controls before intent-level presets and actions.
- QC/export are hidden behind small toggles instead of being visible task surfaces.
- Existing smoke tests assert parts of this old structure, so the tests must change with the UI.

Reference principles to port:

- From `auto-audiobook`: persistent workbench grammar with toolbar, transport, ruler,
  lane/timeline area, playhead, direct manipulation, and contextual detail panels.
- From `narratu`: intent-oriented EQ/tuning surface with presets, A/B, spectrum, categories,
  mobile-sized controls, comparison/provenance, and advanced controls behind disclosure.

Implementation order:

1. Replace the audio first viewport with a media workspace shell: compact title/status row,
   custom transport surface around the native media element, always-visible waveform/timeline,
   and stable responsive dimensions.
2. Replace the nested toggle stack with task modes/tabs: `Listen`, `Tune`, `QC`, `Export`, `Mix`.
3. Keep CPU-heavy panels lazy, but make the mode affordances visible and coherent.
4. Redesign `Tune`: quick speech/music presets first; spectrum and 9-band EQ remain available;
   compressor/limiter/gate/de-noise move under advanced disclosure.
5. Redesign `QC`: report-card layout with actionable rows, clear export linkage, and no prose-heavy intro.
6. Redesign `Export`: integrate processing-chain/provenance summary and ACX/podcast/custom presets.
7. Redesign `Mix`: adopt lane grammar with fixed left labels, ruler/playhead, and contextual controls.
8. Update `tests/areas/media-3d.mjs` to assert workspace structure, geometry, and mode behavior
   rather than the old `media-wv-toggle` stack.
9. Capture desktop and mobile screenshots during validation; sample audio should no longer look
   blank when collapsed or chaotic when expanded.

Progress:

- `888bf1ff` — `Add audio workspace shell`.
  - Added compact audio workspace header/time row and always-visible waveform surface for audio files.
  - Moved the existing Spectrum/EQ, Dynamics, Audiobook QC, and Multi-track mixer lazy toggles out
    of the waveform wrapper into a dedicated audio mode panel area. Full task-mode tabs are still pending.
  - Updated media smoke assertions away from collapsed-by-default waveform behavior.
  - Validation passed: `node tests/smoke-area.mjs media-3d`, `./scripts/check.sh --fast`.
  - Caveat: waveform canvas still mounts with the existing fallback intrinsic width before layout;
    CSS scales it correctly, but exact post-layout canvas sizing remains a follow-up polish item.
- `77d5c981` — `Add audio task mode tabs`.
  - Added explicit `Listen`, `Tune`, `QC`, `Export`, and `Mix` mode tabs for audio.
  - Listen now owns everyday controls; Tune, QC, and Mix mount only when selected and tear down when
    leaving the mode; Export owns the existing processed-export panel or a clear ffmpeg-disabled hint.
  - Updated media smoke coverage to assert mode structure, default Listen mode, mode-scoped export/QC/mix
    behavior, and teardown/remount of CPU-heavy Tune/QC/Mix surfaces.
  - Validation passed: `node tests/smoke-area.mjs media-3d`, `./scripts/check.sh --fast`.
  - Caveat: `renderer.js` and `tests/areas/media-3d.mjs` are now further over the LOC advisory threshold;
    the next polish pass should extract audio workspace/mode helpers and split media smoke coverage.
- Visual QA after `77d5c981`:
  - Captured desktop and mobile screenshots for `Sample.wav` at `/tmp/media-workspace-shots/`.
  - Geometry check passed: visible waveform, stable task-mode buttons, and no horizontal overflow at
    1280x900 or 390x844.
  - Remaining polish issue: both desktop and mobile still show too much blank space above the audio
    workspace, so P0 should not be marked complete until the first-viewport vertical rhythm is tightened.
- `6e1a33ba` — `Tighten audio workspace first viewport`.
  - Added audio-only top alignment so the workspace no longer inherits the shared vertically centered
    media layout used by video.
  - Added desktop and mobile smoke geometry assertions for visible title/status, native audio control,
    waveform, task tabs, compact top inset, and no horizontal overflow.
  - Captured updated desktop and mobile screenshots at `/tmp/media-workspace-shots/audio-workspace-desktop-tight.png`
    and `/tmp/media-workspace-shots/audio-workspace-mobile-tight.png`; desktop workspace top is 64px from the
    viewport and mobile workspace top is 56px, both with no horizontal overflow.
  - Validation passed: `node tests/smoke-area.mjs media-3d`, `./scripts/check.sh --fast`.
- `77ae2fa4` — `Add audio tune intent controls`.
  - Tune mode now opens with quick intent buttons before raw controls: Flat, Clean speech, Podcast,
    Warmth, Presence/Air, De-ess, and Bass rolloff.
  - Intent buttons apply real shared-graph EQ/HPF/LPF settings without mounting the Spectrum or Dynamics
    heavy DOM; advanced Spectrum & EQ and Dynamics remain lazy and are still torn down when leaving Tune.
  - Spectrum & EQ now hydrates its slider/filter UI from current graph state, so opening it after a quick
    intent reflects the active preset instead of resetting visible controls to flat.
  - Validation passed: `node tests/smoke-area.mjs media-3d`, `./scripts/check.sh --fast`.
- Current audio interaction polish:
  - The always-visible waveform now has a real red seek/playhead overlay and supports click/drag
    scrubbing across the full waveform. Tiny clicks seek; existing drag-region trim selection still
    works when the ffmpeg trim controller is available.
  - Tune `Spectrum & EQ` and `Dynamics` now open as fixed, movable, browser-resizable settings
    panels using the same grammar as the ASCII settings overlays, while staying CPU-lazy and
    tearing down on close/mode change.
  - Spectrum/EQ draws immediately on open, pause, and slider/filter changes, so the EQ curve and
    latest analyser view remain visible and react live even when playback is paused.
  - Smoke coverage asserts waveform scrubbing, fixed/resizable/movable Spectrum, paused EQ repaint,
    fixed/resizable Dynamics, and existing graph-control behavior.
- `72dac4e2` — `Polish audio QC report card`.
  - QC mode now opens as a compact ACX report-card workflow instead of a prose-heavy intro.
  - Added a pre-run checklist for RMS, sample peak, noise floor, sample rate, channels, head silence,
    and tail silence, with Run QC and Export for ACX actions visible before analysis.
  - Post-run rows keep the existing ACX metrics and verdict while adding a compact action/status column
    and preserving fix guidance on non-pass rows.
  - Export linkage is visible in the QC surface as a concise mono 44.1 kHz MP3 192k CBR ACX-chain target.
  - Validation passed: `node tests/smoke-area.mjs media-3d`, `./scripts/check.sh --fast`.
- `07e2df4c` — `Polish audio export workflow`.
  - Export mode now opens with visible Podcast, ACX, and Custom preset cards while preserving the
    existing preset select, advanced override controls, and lazy ffmpeg load-on-export behavior.
  - The summary now shows the selected profile, live processing chain, output target, and generated
    `-af` provenance so Tune/QC changes have a clear path into exported audio.
  - Custom mode keeps manual container, bitrate, sample-rate, channel, and loudness controls behind
    the advanced path instead of front-loading raw export parameters.
  - Validation passed: `node --check docs/types/media/studio-export.js`,
    `node tests/smoke-area.mjs media-3d`, `./scripts/check.sh --fast`.
- `d850b8a5` — `Polish audio mix workspace`.
  - Mix mode now uses an explicit timeline/lane grammar with a ruler, playhead, lane indexes,
    fixed lane controls, selected-lane context, and compact master/output controls.
  - Existing lazy mount/teardown, lane gain/mute/solo/fade behavior, generator lane add, drag-drop
    audio add, and WAV/MP3 mixdown paths are preserved.
  - Smoke coverage now asserts ruler/playhead/context/index affordances plus desktop and mobile
    no-horizontal-overflow behavior while keeping the legacy `.mx-*` contract intact.
  - Validation passed: `node --check docs/types/media/mixer-ui.js`,
    `node tests/smoke-area.mjs media-3d`, `./scripts/check.sh --fast`.
  - Caveat: `mixer-ui.js`, `preview-chrome.css`, and `tests/areas/media-3d.mjs` are all over the
    LOC advisory/hard thresholds; before P1 grows the shared media surface further, split mixer UI
    helpers/styles/tests or extract shared workspace grammar.
- `5552e4c3` — `Finish audio workspace visual polish`.
  - Final visual QA captured `Sample.wav` across Listen, Tune, QC, Export, and Mix at desktop
    and mobile sizes in `/tmp/media-workspace-shots/final-audio-p0-host/`.
  - Geometry evidence: core workspace, waveform, task tabs, and active mode panels are in the
    first viewport; desktop and mobile mode captures all report zero horizontal overflow.
  - Fixed the enabled Export preset-card order so Podcast and ACX lead before Custom, preserving
    the intent-first surface and keeping Custom as the manual path.
  - Normalized Tune heading letter spacing to `0` to match frontend constraints.
  - Validation passed: `node --check docs/types/media/studio-export.js`,
    `node --check docs/types/media/mixer-ui.js`, `node tests/smoke-area.mjs media-3d`,
    `./scripts/check.sh --fast`.

### P1 — Video Workspace Polish Gate

Status: committed.

Goal: make the video branch feel like the same studio family as audio while preserving its
video-specific workflows.

Audit expectations:

- Video already has native playback, speed/frame/PiP controls, subtitles, CSS filters,
  audio EQ routing, ffmpeg editor operations, and a timeline/mux/crossfade prototype.
- The next pass should not invent a separate visual language for video; it should share the
  same media workspace shell, status row, task-mode navigation, and lazy-heavy-work policy.
- Video needs a visible timeline/scrub/thumbnail area when editing is enabled, not a loose
  set of controls below the native player.
- Video audio controls should reuse the shared Tune grammar where possible, while video
  image controls belong under Adjust.

Implementation order:

1. After the audio shell lands, factor any reusable workspace helpers/styles rather than
   duplicating the shell by hand.
2. Introduce video task modes: `Watch`, `Adjust`, `Timeline`, `Subtitles`, `Export`.
3. Move CSS filters into `Adjust` with quick reset/preset affordances and advanced sliders.
4. Move video audio EQ/metering into a clear audio sub-surface under `Adjust` or `Tune`
   language shared with audio.
5. Move trim, thumbnails, second clip/music, fade/xfade/acrossfade/mux into `Timeline`.
6. Keep subtitle sidecar display in `Subtitles`; burn-in/embed belongs in `Export`.
7. Update smoke coverage to assert mode structure and timeline geometry, not just that
   individual old controls exist.
8. Capture desktop and mobile screenshots for a sample video after the redesign.

Progress:

- `8b67ecbf` — `Add video workspace mode shell`.
  - Added the video workspace shell with compact title/time row, top-aligned video surface,
    and explicit `Watch`, `Adjust`, `Timeline`, `Subtitles`, and `Export` task modes.
  - Moved everyday playback tools into Watch, CSS filters plus the movie-audio EQ/meter
    surface into Adjust, subtitle sidecar loading into Subtitles, ffmpeg export/fades plus
    the legacy media editor into Export, and the lazy video timeline toggle into Timeline.
  - Removed the old loose video editor, mixer, timeline, and transcoding-hint stack from
    below the player; video-only heavy panels remain lazy and mode-scoped.
  - Updated media smoke coverage for mode ordering/defaults, desktop/mobile first viewport,
    no horizontal overflow, scoped Adjust/Subtitles/Export controls, and Timeline lazy mount.
  - Captured visual QA screenshots at `/tmp/media-workspace-shots/video-p1-shell/`.
  - Validation passed: `node --check docs/types/media/renderer.js`,
    `node tests/smoke-area.mjs media-3d`, `./scripts/check.sh --fast`.
  - Caveat: P1 still needs the deeper Adjust and Timeline polish passes; this checkpoint only
    establishes the shared video workspace/mode grammar.
- `12cbab33` — `Polish video adjust workspace`.
  - Adjust mode now opens with quick look presets before raw CSS filter sliders: Neutral,
    Brighter, Cinema, High contrast, Soft / Blur, Monochrome, and Custom.
  - Presets apply real `video.style.filter` values, update an active/status line with the
    selected look and changed filter values, and expose a visible Reset action before Advanced.
  - Raw brightness/contrast/color/hue/blur/grayscale/invert sliders remain under an Advanced
    disclosure and still drive the same live filter pipeline.
  - Movie audio is now presented as a dedicated Adjust sub-surface with Spectrum & EQ kept
    CPU-lazy; opening it still mounts the shared 9-band EQ and overlaid-spectrum legend.
  - Captured desktop and mobile Adjust/Cinema screenshots at
    `/tmp/media-workspace-shots/video-p1-adjust/`; both reported zero horizontal overflow.
  - Validation passed: `node --check docs/types/media/video-studio.js`,
    `node tests/smoke-area.mjs media-3d`, `./scripts/check.sh --fast`.
  - Caveat: P1 still needs Timeline workspace polish and a final video all-modes visual pass
    before the Video Workspace Polish Gate should be marked committed.
- `a6d4ad32` — `Polish video timeline workspace`.
  - Timeline mode now opens as a workspace surface with header/status/context, a ruler,
    playhead marker, stable lane track, and separated single-clip versus two-clip action groups.
  - Existing ffmpeg behavior is preserved: thumbnails stay load-on-demand, trim/fade/xfade/
    acrossfade/mux actions keep their operation IDs and params, and two-clip actions remain
    disabled until a secondary clip or music bed is dropped.
  - Timeline status now summarizes selected trim range and second-lane readiness without
    replacing the existing trim label or result download flow.
  - Smoke coverage now asserts the timeline grammar, action grouping, desktop/mobile
    geometry, no horizontal page overflow, and mobile internal timeline scrolling.
  - Captured desktop and mobile open Timeline screenshots at
    `/tmp/media-workspace-shots/video-p1-timeline/`; both reported zero horizontal overflow.
  - Validation passed: `node --check docs/types/media/timeline.js`,
    `node tests/smoke-area.mjs media-3d`, `./scripts/check.sh --fast`.
  - Caveat: P1 still needs a final all-video-mode visual pass before marking the Video
    Workspace Polish Gate committed.
- Final P1 visual QA:
  - Captured `Sample.avi` across Watch, Adjust, Timeline, Subtitles, and Export at desktop
    and mobile sizes in `/tmp/media-workspace-shots/final-video-p1-host/`.
  - Geometry evidence: every mode had active tabs, visible video workspace, visible mode
    panel, compact first-viewport top inset, and zero horizontal overflow at 1280x900 and
    390x844.
  - P1 is now committed; remaining open M-items below are follow-up maintenance/parity work,
    not blockers for the Video Workspace Polish Gate.

### M1 — Video Trim Correctness

Status: committed.

- Make video timeline trim handles clamp so start/end cannot cross.
- Add a visible `Trim selected range` action to the video timeline.
- Call existing `runOperation(ff, 'trim', { start, end, precise: false })` with the selected HH:MM:SS range.
- Do not alter transition behavior.
- Add smoke/pure checks for trim clamping and generated trim params without requiring a heavy encode.
- Changed paths: `timeline.js`, `video-filters.js`, `tests/areas/media-3d.mjs`.
- Validation passed: `node tests/smoke-area.mjs media-3d`, `./scripts/check.sh --fast`.
- Committed in `cb94adcb` — `Checkpoint media studio M1/M2 work`.

### M2 — Playback And Parser Polish

Status: committed.

- Handle `requestPictureInPicture()` promise rejection without unhandled errors.
- Add focused subtitle parser tests for malformed/complex cue timing.
- Add focused ID3 APIC and CHAP parser tests.
- Keep frame-step at the documented 30fps fallback unless reliable fps metadata is introduced.
- Changed paths: `playback-extras.js`, `subtitles.js`, `id3.js`, `tests/media-parsers.test.mjs`, `scripts/check.sh`.
- Targeted validation passed: `node tests/media-parsers.test.mjs`, `node tests/movediff.test.mjs`.
- Full lane validation passed: `./scripts/check.sh --fast`.
- Committed in `cb94adcb` — `Checkpoint media studio M1/M2 work`.

### M3 — ACX And Export Semantics

Status: committed.

- Decide one behavior for `acx-mp3`: either format/loudness preset only, or route to the dedicated ACX chain with silence cut and room-tone padding.
- Update UI wording so sample peak is not described as true peak unless oversampling is implemented.
- Add pure tests for ACX filter args, `evaluateAcx`, and preset resolution outside the large smoke suite.
- Decision: `acx-mp3` now routes through the dedicated ACX export chain, including loudnorm,
  silence trimming, and room-tone padding, instead of behaving as a format-only preset.
- UI copy now describes QC peak checks as sample peak / dBFS, avoiding true-peak wording until
  oversampled true-peak measurement exists.
- Added focused parser-suite coverage for ACX preset resolution, ACX export args, ACX filter-chain
  generation, and `evaluateAcx` sample-peak verdict/fix behavior.
- Changed paths: `export-presets.js`, `studio-export.js`, `qc.js`, `qc-ui.js`,
  `tests/media-parsers.test.mjs`.
- Validation passed: `node --check docs/types/media/export-presets.js docs/types/media/studio-export.js docs/types/media/qc.js docs/types/media/qc-ui.js tests/media-parsers.test.mjs`,
  `node tests/media-parsers.test.mjs`, `node tests/smoke-area.mjs media-3d`, `./scripts/check.sh --fast`.
- Committed in `695db451` — `Route ACX preset through dedicated export chain`.

### M4 — Narratu / Auto-Audiobook Parity Pass

Status: committed.

- Compare useful generic EQ presets against `narratu/apps/web/src/utils/eq-presets.ts`.
- Add generic presets only; avoid story/character-specific presets unless clearly labeled as examples.
- Consider a master-bus preset based on `narratu/packages/engine/src/audio/ffmpeg-filters.ts`.
- Preserve auto-audiobook lessons: no hidden gain multipliers, preserve source sample rate unless a preset overrides it, and show export setting provenance clearly.
- Added generic Narratu-derived EQ presets only: ACX Standard, Findaway Voices, Intimate Audiobook,
  Audacity Low Rolloff, Deep Male Narrator, Proximity Fix, Boomy Voice Cleanup, Female Clarity,
  Thin Voice Body Fix, BBC Broadcast, NPR Spoken Word, RODE Podcast, Radio Drama, and
  YouTube/Streaming. No `char-*` presets were added.
- Added an opt-in export-only master bus profile based on Narratu's default master bus:
  65 Hz HPF, 120/3200/8000 Hz bus shaping, and 2:1 glue compressor. The live graph stays unchanged.
- Added `Podcast MP3 + Master Bus` as an explicit preset and shared pure resolution helper so the
  same chain settings feed export summary and actual ffmpeg execution.
- Preserved source-match behavior for custom exports: sample rate and channel count remain `null`
  unless a user or preset explicitly chooses them.
- Export summaries now distinguish explicit output targets from source-matching channels/sample rate
  and include master-bus provenance when selected.
- Changed paths: `spectrum-draw.js`, `audio-filters.js`, `export-presets.js`, `studio-export.js`,
  `renderer.js`, `tests/media-parsers.test.mjs`.
- Validation passed: `node --check docs/types/media/spectrum-draw.js docs/types/media/renderer.js docs/types/media/audio-filters.js docs/types/media/studio-export.js docs/types/media/export-presets.js tests/media-parsers.test.mjs`,
  `node tests/media-parsers.test.mjs`, `node tests/smoke-area.mjs media-3d`, `./scripts/check.sh --fast`.
- Committed in `53f34891` — `Add media master bus parity presets`.

### M5 — ffmpeg Failure And Recovery

Status: committed.

- Verify cancel/reload after `ff.exit()`.
- Cover failed ffmpeg operations and unsupported codec messages.
- Keep heavy ffmpeg execution out of the fast gate unless the fixture is tiny and deterministic.
- Added shared ffmpeg recovery/error helpers in `transcoder.js`: cancellation now clears the cached
  ffmpeg instance before calling `exit()`, so later exports/transcodes reload instead of reusing a
  terminated wrapper.
- Routed editor, export, timeline, and ACX QC ffmpeg failures through shared classification so
  cancellation remains `Operation cancelled.` and unsupported/decode failures get friendly first-line
  messages while preserving raw detail where the UI supports it.
- Added pure/fake-instance tests for cancel cache reset, cancellation formatting, unsupported codec
  classification, and decode-style classification. No heavy ffmpeg execution was added to the gate.
- Changed paths: `transcoder.js`, `editor.js`, `studio-export.js`, `timeline.js`, `qc-ui.js`,
  `tests/media-parsers.test.mjs`.
- Validation passed: `node --check docs/types/media/transcoder.js docs/types/media/editor.js docs/types/media/studio-export.js docs/types/media/timeline.js docs/types/media/qc-ui.js tests/media-parsers.test.mjs`,
  `node tests/media-parsers.test.mjs`, `node tests/smoke-area.mjs media-3d`, `./scripts/check.sh --fast`.
- Committed in `2c587df3` — `Recover ffmpeg after cancelled media jobs`.

### M6 — Mixer Lifecycle And Audio Trim

Status: committed.

- Tighten mixer audio resource teardown.
- Add audio waveform region selection only after video trim is correct.
- If audio region selection lands, it should prefill the existing editor Trim operation, not create a second trim system.
- Mixer teardown now tracks/disconnects per-lane gain nodes, guards pending decode/drop work after
  panel destroy, clears lane/blob state, and releases the shared mixer `AudioContext` on mode close.
- Audio waveform selection is optional and only enabled when the ffmpeg editor controller exists.
  Dragging a waveform region draws a concise overlay/status and forwards start/end seconds to the
  existing Media Editor Trim operation via `prefillTrim`; no second trim/export path was introduced.
- Smoke coverage asserts both mixer context release after leaving Mix and waveform selection
  pre-filling the existing Trim HH:MM:SS inputs without running a heavy ffmpeg trim.
- Changed paths: `preview-chrome.css`, `editor.js`, `mixer-engine.js`, `mixer-ui.js`,
  `renderer.js`, `waveform.js`, `tests/areas/media-3d.mjs`, `docs/asset-manifest.json`, `docs/sw.js`.
- Validation passed: `node --check docs/types/media/mixer-engine.js docs/types/media/mixer-ui.js docs/types/media/waveform.js docs/types/media/editor.js docs/types/media/renderer.js tests/areas/media-3d.mjs`,
  `node tests/smoke-area.mjs media-3d`, `./scripts/check.sh --fast`.
- Committed in `3e35165e` — `Tighten media mixer teardown and audio trim selection`.

### R0 — Validation Scope And Media Smoke Split

Status: committed.

- Split Audio/Video workspace smoke coverage out of `tests/areas/media-3d.mjs` into
  `tests/areas/media-studio.mjs`, so future media studio work no longer inflates the 3D/image/MIDI
  smoke area.
- Registered `media-studio` in both aggregate smoke and `tests/smoke-area.mjs`.
- Updated `./scripts/check.sh --fast` to inspect staged, unstaged, and untracked paths after
  generator phases, run touched smoke areas when ownership is clear, and fall back to aggregate
  smoke for shared app/runtime/test-runner/generated paths.
- Scope examples: media runtime/studio changes select `media-studio`, 3D/image/MIDI/gamerom
  changes select `media-3d`, ebook/MOBI changes select `ebook-git`, and `docs/core/**`,
  smoke runners, manifests, service worker, packages, vendor, or unknown paths select aggregate.
- Current aggregate timing evidence from `./scripts/check.sh --fast`: `media-3d` 18.086s,
  `media-studio` 8.869s, `ebook-git` 72.152s, `examples-catalog` 119.379s, smoke total 326s.
- Changed paths: `scripts/check.sh`, `tests/areas/media-3d.mjs`,
  `tests/areas/media-studio.mjs`, `tests/smoke.mjs`, `tests/smoke-area.mjs`.
- Validation passed: `bash -n scripts/check.sh`,
  `node --check tests/areas/media-3d.mjs tests/areas/media-studio.mjs tests/smoke.mjs tests/smoke-area.mjs`,
  `node tests/smoke-area.mjs media-studio`, `node tests/smoke-area.mjs media-3d`,
  `./scripts/check.sh --fast`.
- Committed in `2a9b5133` — `Split media studio smoke coverage`.
- Extracted shared audio/video mode tab and lazy-mount lifecycle from `renderer.js` into
  `workspace-modes.js`, preserving sticky Listen/Watch/Export modes and inactive teardown for
  Tune/QC/Mix/Adjust/Timeline/Subtitles.
- Split media preview chrome out of `preview-chrome.css` into `preview-media.css`, linked after
  `preview-chrome.css` in both normal and `noscript` stylesheet paths, and refreshed the offline
  asset manifest/service worker stamp for the new asset.
- Extracted media studio smoke geometry/settings helpers into `media-studio-helpers.mjs`, keeping
  assertion labels and tested workspace grammar intact while reducing future growth in
  `tests/areas/media-studio.mjs`.
- Post-R0 line-count evidence: `renderer.js` 774 lines, `preview-chrome.css` 761 lines,
  `preview-media.css` 694 lines, `tests/areas/media-studio.mjs` 982 lines,
  `media-studio-helpers.mjs` 215 lines, `tests/areas/media-3d.mjs` 915 lines.
- Changed paths: `docs/types/media/renderer.js`, `docs/types/media/workspace-modes.js`,
  `docs/assets/preview-chrome.css`, `docs/assets/preview-media.css`, `docs/index.html`,
  `tests/areas/media-studio.mjs`, `tests/areas/media-studio-helpers.mjs`,
  `docs/asset-manifest.json`, `docs/sw.js`.
- Validation passed: `node --check docs/types/media/renderer.js docs/types/media/workspace-modes.js tests/areas/media-studio.mjs tests/areas/media-studio-helpers.mjs tests/smoke.mjs tests/smoke-area.mjs`,
  `node scripts/gen-asset-manifest.mjs >/dev/null`, `git diff --check`,
  `node tests/smoke-area.mjs media-studio`, `node tests/smoke-area.mjs media-3d`,
  `./scripts/check.sh --fast`.
- Fast aggregate timing evidence after code-shape split: `media-3d` 18.822s,
  `media-studio` 9.382s, `ebook-git` 71.771s, `examples-catalog` 151.002s, smoke total 361s.
- Committed in `ede82ebf` — `Extract media workspace helpers`.
- Follow-up fast selector update: `./scripts/check.sh --fast` now also selects unit tests by
  changed-path ownership. Media-only changes run `tests/media-parsers.test.mjs`; ebook/MOBI
  changes run the mixed `tests/movediff.test.mjs`; image changes run image unit tests; metagame
  changes run the non-exhaustive metagame unit tests. Shared/global/generated/vendor/test-runner
  paths still fall back to the full existing unit set.
- Follow-up selector tightening: generated cache artifacts `docs/asset-manifest.json` and
  `docs/sw.js` are neutral when paired with another clearly owned path, and
  `docs/assets/preview-media.css` is now media-owned. Media runtime/style changes with only those
  generated cache files should select `tests/media-parsers.test.mjs` and `media-studio` instead of
  aggregate smoke. Cache-only, unknown, shared app shell, package/vendor, and test-runner changes
  remain conservative full/aggregate fallbacks.
- Validation for the fast selector update passed: `bash -n scripts/check.sh`, `git diff --check -- scripts/check.sh`,
  `./scripts/check.sh --fast`. Because `scripts/check.sh` itself changed, the fast run correctly
  selected the conservative full existing unit set and aggregate smoke.
- Timing evidence from that conservative run: unit tests 1s, aggregate smoke 304s,
  `media-3d` 16.924s, `media-studio` 7.702s, `ebook-git` 69.793s,
  `examples-catalog` 112.129s.

### R1 — Cleanup Mastering Preset

Status: committed.

- Added a pure export-only mastering cleanup chain in `audio-filters.js`:
  de-hum highpass + 60/120 Hz notch filters, `afftdn` de-noise, heuristic de-plosive
  low-frequency containment, and conservative `dynaudnorm` leveling.
- Added `Podcast Cleanup MP3`, a visible Export preset that preserves source sample rate and
  channel count while applying cleanup, MP3 192k encoding, and `loudnorm` target −16 LUFS /
  TP target −1.5 dBTP.
- Export summaries now describe `loudnorm target` and `loudnorm TP target` so the UI does not
  imply QC has measured true peak; QC still names its current metric `Sample peak`.
- Smoke coverage now asserts the cleanup card appears before Custom, shows source-preserving
  output copy, and includes the cleanup `-af` provenance with `afftdn` and `dynaudnorm`.
- Changed paths: `audio-filters.js`, `export-presets.js`, `studio-export.js`,
  `tests/media-parsers.test.mjs`, `tests/areas/media-studio.mjs`,
  `docs/asset-manifest.json`, `docs/sw.js`.
- Validation passed: `node --check docs/types/media/audio-filters.js docs/types/media/export-presets.js docs/types/media/studio-export.js tests/media-parsers.test.mjs tests/areas/media-studio.mjs`,
  `node tests/media-parsers.test.mjs`, `node tests/smoke-area.mjs media-studio`,
  `./scripts/check.sh --fast`.
- Fast aggregate timing evidence: `media-3d` 18.373s, `media-studio` 10.252s,
  `ebook-git` 73.422s, `examples-catalog` 129.536s, smoke total 345s.
- Committed in `995aa90b` — `Add media cleanup mastering preset`.
- Remaining R1 work: none currently identified.

### R2 — Chapterized Audiobook Export

Status: committed.

- Added pure chapter normalization and deterministic safe ACX chapter filenames in
  `chapters.js`.
- Moved audio chapter discovery earlier in `renderer.js`, feeding the Listen chapter list,
  waveform markers, and Export panel from one normalized chapter set.
- Added lightweight DOM chapter markers to `waveform.js`; marker positioning waits for media
  duration and does not decode the full file.
- Added an Export mode `Chapter ACX ZIP` action for chapterized audio when ffmpeg is enabled.
  The click path lazily loads ffmpeg and vendored JSZip, encodes each chapter through the
  existing ACX chain, and downloads one ZIP.
- Added focused unit/smoke coverage for chapter normalization, filenames, ACX chapter args,
  waveform markers, and the chapter ZIP action.
- Tightened `./scripts/check.sh --fast` smoke selection so `tests/media-parsers.test.mjs`
  maps to `media-studio` instead of forcing aggregate smoke for media-only batches.
- Changed paths: `chapters.js`, `id3.js`, `audio-filters.js`, `transcoder.js`,
  `renderer.js`, `waveform.js`, `studio-export.js`, `preview-media.css`,
  `tests/media-parsers.test.mjs`, `tests/areas/media-studio.mjs`, `scripts/check.sh`,
  `docs/asset-manifest.json`, `docs/sw.js`.
- Validation passed: `node --check` on changed JS/MJS files,
  `node tests/media-parsers.test.mjs`, `node tests/smoke-area.mjs media-studio`,
  `bash -n scripts/check.sh`, `git diff --check`.
- `./scripts/check.sh --fast` was intentionally interrupted after the old selector chose
  aggregate smoke because `tests/media-parsers.test.mjs` had no smoke owner; the selector fix
  above addresses that path. Because `scripts/check.sh` itself is now changed, a fresh fast run
  would conservatively select aggregate by design.
- Committed in `3b80f930` — `Add chapterized ACX audiobook export`.
- Follow-up patch:
  - Added pure sidecar chapter parsing for WebVTT cues, ffmetadata `[CHAPTER]` sections,
    and simple timestamp text/Markdown lines.
  - Added same-folder sidecar discovery for explicit same-basename files and generic
    chapter-ish names, with renderer reads capped at 1 MiB.
  - Sidecar chapters now override embedded ID3 CHAP chapters; embedded chapters remain the
    fallback and still provide cover art from the same head slice.
  - ID3 parsing now preserves CHAP element IDs, parses CTOC child IDs/title, and orders chapters
    by CTOC child order when useful.
  - Added a compact Listen-mode chapter source note and focused parser/smoke coverage.
  - Changed paths: `chapters.js`, `id3.js`, `renderer.js`, `preview-media.css`,
    `tests/media-parsers.test.mjs`, `tests/areas/media-studio.mjs`,
    `docs/asset-manifest.json`, `docs/sw.js`.
  - Validation passed: `node --check` on changed JS/MJS files,
    `node tests/media-parsers.test.mjs`, `node tests/smoke-area.mjs media-studio`,
    `git diff --check`, `./scripts/check.sh --fast`.
  - Fast selector evidence: selected `tests/media-parsers.test.mjs` and `media-studio`;
    no aggregate smoke, ebook/MOBI, known-file, binary, or exhaustive Sokoban suites ran.
  - Committed in `bca47f26` — `Add media chapter sidecar support`.
- Remaining R2 work: none currently identified.

### R1 — Estimated True Peak And Metric Copy

Status: committed.

- Added `estimatedTruePeak()` in `qc.js`: deterministic browser-only 4x cubic oversampling
  over the mono mix. It is explicitly labeled as an estimate, not a certified BS.1770
  broadcast true-peak meter.
- `analyzeMetrics()` now returns separate `peak` sample peak and `truePeak` estimated
  true-peak values.
- ACX QC now renders distinct rows for RMS loudness, Integrated LUFS, Sample peak level,
  Estimated true peak, Noise floor, Sample rate, Channels, Head silence, and Tail silence.
- QC/export copy now separates ACX RMS acceptance, export `loudnorm` LUFS target, sample
  peak dBFS, estimated true peak dBTP, and ffmpeg TP target language.
- Changed paths: `qc.js`, `qc-ui.js`, `tests/media-parsers.test.mjs`,
  `tests/areas/media-studio.mjs`, `docs/asset-manifest.json`, `docs/sw.js`.
- Validation passed: `node --check docs/types/media/qc.js docs/types/media/qc-ui.js tests/media-parsers.test.mjs tests/areas/media-studio.mjs`,
  `node tests/media-parsers.test.mjs`, `node tests/smoke-area.mjs media-studio`,
  `./scripts/check.sh --fast`.
- Fast aggregate timing evidence: `media-3d` 17.526s, `media-studio` 8.275s,
  `ebook-git` 70.704s, `examples-catalog` 118.170s, smoke total 316s.
- Committed in `3725ea8f` — `Add estimated true peak QC metric`.
- Follow-up R1 work: raw -> tuned -> dynamics -> master-bus compare polish committed below.

### R1 — Staged Mastering Chain Compare

Status: committed.

- Added a pure `mastering-stages.js` helper that summarizes `Raw source`, `Tune/EQ`,
  `Dynamics`, and `Master bus` stages from existing graph/export settings without extra decode
  or ffmpeg work.
- Tune Spectrum/EQ now shows a compact stage strip under the overlaid original/processed legend,
  updating when EQ, filters, LUFS normalization, or dynamics settings change.
- Export now shows the same stage strip with concrete preset/master-bus details for Podcast,
  Cleanup, ACX, and Custom paths. The Custom/loudness-off path does not show a phantom TP target.
- Smoke coverage asserts the stage labels in Tune/Export and verifies ACX/Cleanup master-bus
  details plus the Custom no-phantom-TP case.
- Changed paths: `mastering-stages.js`, `audio-graph.js`, `spectrum-panel.js`,
  `studio-export.js`, `preview-media.css`, `tests/areas/media-studio.mjs`,
  `docs/asset-manifest.json`, `docs/sw.js`, plus roadmap/tracker updates and `scripts/check.sh`
  selector tightening.
- Validation passed: `node --check docs/types/media/mastering-stages.js docs/types/media/audio-graph.js docs/types/media/spectrum-panel.js docs/types/media/studio-export.js tests/areas/media-studio.mjs`,
  `git diff --check`, `node tests/smoke-area.mjs media-studio` (worker), `./scripts/check.sh --fast`.
- Conservative fast-gate timing for this mixed script/media batch: unit tests 1s, aggregate smoke
  299s, `media-3d` 16.812s, `media-studio` 7.473s, `ebook-git` 69.739s,
  `examples-catalog` 109.871s. The aggregate path was selected only because `scripts/check.sh`
  itself changed.
- Committed in `0c24adc1` — `Add media mastering stage compare`.

### R3 — Narratu-Grade Compare Polish

Status: implemented; no remaining R3 work identified.

- Enriched the existing Tune/Export staged compare, instead of creating a separate compare
  workflow, so the visible chain now reads as `Processing chain` with `Active path:
  Raw source -> Tune/EQ -> Dynamics -> Master bus`.
- Added pure stage metadata in `mastering-stages.js`: stage number, status badge
  (`Always`, `Active`, `Bypassed`, `Export`), purpose copy, and the existing detail summary.
- Kept the surface intent-first: Tune still shows the strip only inside the Spectrum disclosure,
  Export shows it inside the existing export panel, and no new decode/ffmpeg work was added.
- Smoke coverage now asserts the R3 explanation in both Tune and Export, including status badges,
  path summary, and generic speech/mastering purpose text.
- Changed paths: `mastering-stages.js`, `preview-media.css`, `tests/areas/media-studio.mjs`,
  `STUDIO_ROADMAP.md`, `STUDIO_TRACKER.md`, `docs/asset-manifest.json`, `docs/sw.js`.
- Validation passed: `node --check docs/types/media/mastering-stages.js tests/areas/media-studio.mjs`,
  `node tests/smoke-area.mjs media-studio`, `./scripts/check.sh --fast`.
- Committed in `6eb968f7` — `Polish media mastering compare`.

### R4 — Audio/Video Overlap Diff Compare

Status: implemented.

Committed history: foundation in `05aabcf5` / `6e6d489e`; first audio analysis slice in
`fbe6c057`; first video analysis slice in `937ab522`; selected-range WAV compare in
`34a2d601`; shifted-overlap measurement in `5352a78b`; ffmpeg-backed selected-overlap
extraction in `0ce96afe`; ffmpeg core entrypoint compatibility in `e9baba6f`.

- This is distinct from R1/R3 processing-chain compare. R1/R3 explain how one source changes
  through Tune/Dynamics/Master Bus; R4 compares two source media files or two partial ranges.
- Required grammar: side-by-side/top-bottom and overlay modes for audio and video, with draggable
  per-input lane offsets so shifted content can be lined up before judging actual differences.
- Required partial workflow: per-lane in/out handles, scoped decode/rendering, offset readout,
  overlay opacity, and difference visualization that separates shifted content from changed content.
- Keep implementation static-client only. Do not add backend alignment, ASR/NLP matching, or hidden
  gain/resampling; any normalization must be an explicit compare mode.
- Current audio evidence:
  - Added an explicit `Analyze selected audio` action that decodes only after click, with file-size
    and selected-duration caps.
  - Added a selected-range PCM WAV path for common RIFF/WAVE PCM sources: the compare action
    parses early chunks, reads only capped selected source windows via `Blob.slice`, and extracts
    first-channel samples for the existing waveform/diff summary path.
  - Keeps the existing full-file `decodeAudioData` fallback for compressed or unsupported audio.
  - Renders per-lane selected-range waveform canvases from downsampled peak/RMS columns.
  - Renders an aligned overlap difference strip and reports average diff energy plus high-diff
    columns; the normalize toggle is labeled compare-only and does not affect playback/export.
  - Keeps audio analysis decode-on-demand and capped.
- Current video evidence:
  - Added an explicit `Analyze selected video` action with no audio normalize controls.
  - Uses opened File/Blob lane A plus dropped/browsed lane B, clears stale analysis when
    ranges/offsets or the secondary file change, and caps file size, selected overlap duration,
    and sampled frame count.
  - Uses browser-native `HTMLVideoElement` plus canvas `drawImage`; no ffmpeg, backend, or ML path.
  - Renders real lane frame strips, an overlay preview with explicit A/B foreground selection
    plus independent A/B opacity controls, and a visual diff strip with average visual difference
    plus high-diff frame/pixel/column counts.
  - Video compare also shows a live A/B video preview stack as soon as lane B is dropped/browsed,
    so users can inspect side-by-side, top-bottom, or true overlay before running measured analysis.
  - The live preview now has a shared Play/Stop transport, synchronized A/B video playback, a red
    timeline playhead, and draggable independent lane clip boxes for aligning short additions
    before checking actual pixel differences.
  - Video sample times now come from shifted-overlap source ranges so measured content checks are
    aligned to real overlapped source windows.
  - Secondary compare drop zones accept sidebar tree drags without opening the dragged item as the
    main file, so folder workflows can fill lane B directly.
  - Smoke uses `docs/examples/sample.webm` as the second small video fixture and verifies painted
    frame/overlay/diff canvases, measured copy, sidebar lane-B drops, and A/B overlay controls.
- Current R4 polish: shifted-overlap source windows are now the only measured region for both
  audio/video; when WAV compare can use direct `Blob.slice`, it reads shifted-overlap windows,
  and decode fallback summarizes only overlap subsections. For compressed longer files, ffmpeg-on
  sessions now extract the shifted-overlap range to WAV in MEMFS first and then reuse the same
  selected-range pipeline; this path is capped and does not silently read giant inputs.
  A real browser-side smoke verified `sample.mp3` extraction to a parseable WAV after the
  ffmpeg `mainName: 'main'` loader compatibility fix. Latest video compare polish adds the
  synchronized preview transport, lane clip dragging, and live overlay coverage.
- Changed paths for this slice: `compare-ui.js`, `compare-ui-video.js`,
  `compare-ui-render.js`, `preview-media.css`, `tests/areas/media-studio-compare.mjs`,
  `STUDIO_TRACKER.md`, plus generated cache files if validation refreshes them.
- R4 is bounded by explicit selected ranges, byte caps, and opt-in ffmpeg extraction for longer
  compressed audio; no backend/ASR/ML alignment or uncapped full-file analysis is planned.

### R5 — Video Export Depth

Status: committed for the compact roadmap scope. Subtitle burn-in UI/op is committed in
`c70853ec`; user-facing music-bed ducking controls are committed in `ff2b4fbe`; compact
crop/rotate/look export transforms are committed in `e7fad475`. Variable speed ramp is
deferred as full-NLE scope creep unless a later goal finds a compact, clear grammar for it.

- Added a Video Export-only subtitle burn-in control with `.srt/.vtt` input, concise status,
  and a separate `Burn in subtitles` action.
- The sidecar read path only reads subtitle text for status; ffmpeg is still loaded lazily only
  when the burn-in action is clicked.
- Added a distinct `subtitleBurn` ffmpeg operation that writes the subtitle sidecar to MEMFS and
  uses a pure `buildSubtitleBurnArgs()` helper to render subtitles into pixels with video
  re-encoding. Existing display subtitles and MP4 `mov_text` embedding remain separate.
- Smoke/unit evidence covers audio export absence, Video Export burn-in controls, SRT status
  update, and pure args containing a subtitles filter plus H.264/AAC re-encode semantics without
  running heavy ffmpeg.
- Changed paths for this slice: `studio-export.js`, `transcoder.js`, `video-filters.js`,
  `tests/media-parsers.test.mjs`, `tests/areas/media-studio.mjs`, `STUDIO_ROADMAP.md`,
  `STUDIO_TRACKER.md`, plus generated cache files if validation refreshes them.
- Added compact Video Timeline music-bed controls with a 35% default, visible readout, and copy
  stating the bed sits under unchanged original video audio.
- `Mux music under video` now passes the selected gain to the existing `muxmusic` operation;
  ffmpeg remains lazy and only runs after the action click.
- Smoke/unit evidence covers the timeline control, default/change readout, selected mux gain,
  default gain, rounding, clamping, `amix=duration=first`, and video stream copy semantics.
- Changed paths for this slice: `timeline.js`, `preview-media.css`,
  `tests/media-parsers.test.mjs`, `tests/areas/media-studio.mjs`, `STUDIO_ROADMAP.md`,
  `STUDIO_TRACKER.md`, plus generated cache files if validation refreshes them.
- Added Video Export-only transform/look selects for none, square crop, vertical crop,
  90-degree rotation, source look, cinema, high contrast, and monochrome.
- `webvideo` now composes a pure `buildVideoExportFilterChain()` helper into `-vf`, preserving
  scale-only output for the MP4 720p default and emitting no `-vf` when a preset has no filters.
- Export summary now names active transform/look selections and shows the generated `-vf`
  provenance while keeping ffmpeg lazy until Export video is clicked.
- Smoke/unit evidence covers hidden controls on audio export, visible controls on video export,
  summary/provenance updates, default scale-only chain, crop+scale order, rotate+look+scale order,
  and the no-filter case without running heavy ffmpeg.
- Changed paths for this slice: `studio-export.js`, `transcoder.js`, `video-filters.js`,
  `preview-media.css`, `tests/media-parsers.test.mjs`, `tests/areas/media-studio.mjs`,
  `STUDIO_ROADMAP.md`, `STUDIO_TRACKER.md`, plus generated cache files if validation refreshes them.

### Media Studio LOC Housekeeping

Status: committed.

- Split the largest touched media studio files and remaining over-threshold media JS modules into
  focused helpers without changing user-facing behavior or public entrypoints.
- `compare-ui.js` is now a mount/orchestration module under the hard advisory threshold, with
  extracted compare constants, controls, media analysis, canvas drawing, analysis actions, and
  render helpers.
- `studio-export.js` is now under the hard advisory threshold, with extracted video controls,
  preset cards, progress/result rendering, summary formatting, and chapter ZIP helpers.
- `renderer.js`, `mixer-ui.js`, and `transcoder.js` are now under the hard advisory threshold
  after extracting renderer workspace/mode helpers, mixer control/lane/export helpers, and
  ffmpeg intake/operation helpers.
- `tests/areas/media-studio.mjs` is now a small sequencer over focused smoke-area helpers for
  listen/chapters, tune/dynamics, mixer/playlist, export, QC, chain checks, compare, video
  studio, and video export/timeline.
- Current line-count evidence for touched files: `compare-ui.js` 468 lines,
  `compare-ui-video.js` 180 lines, `compare-ui-render.js` 269 lines,
  `waveform.js` 381 lines, `renderer-mode-panels.js` 319 lines,
  `spectrum-panel.js` 253 lines, `panel-toggle.js` 92 lines,
  `studio-export.js` 477 lines, `renderer.js` 416 lines, `mixer-ui.js` 403 lines,
  `transcoder.js` 229 lines, `tests/areas/media-studio.mjs` 21 lines; extracted helpers are all
  below the hard advisory threshold. `preview-media.css` remains an existing stylesheet split
  candidate above the hard advisory threshold.
- Validation evidence for this cleanup: `node --check` on touched media modules and media-studio
  smoke modules, `node tests/media-parsers.test.mjs`, `node tests/smoke-area.mjs media-studio`,
  and `./scripts/check.sh --fast`.

## Tracking Rules

- Mark each item `open`, `in progress`, `blocked`, `done`, or `committed`.
- When a worker completes a slice, record the changed paths, tests run, and any caveats here before starting the next slice.
- Keep generated files and asset manifest current when files under `docs/` are added or removed.
