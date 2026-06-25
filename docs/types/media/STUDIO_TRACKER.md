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
- Smoke coverage exists in `tests/areas/media-3d.mjs` for most capability behavior, but it currently pins the old toggle-stack UI in places.

## Active Queue

### R4 — Audio/Video Overlap Diff Compare Foundation

Status: in progress / partial.

Current foundation slice:

- Added pure compare math for clamping ranges, applying lane offsets, computing overlap
  windows, classifying missing/overlap sections, and producing user-facing shifted-range copy.
- Added lazy Compare modes for both audio and video, separate from the R1/R3 mastering-chain
  compare surfaces.
- Added side-by-side/top-bottom/overlay layout controls, overlay opacity, explicit audio
  normalization toggle off by default, A/B lanes with offset readouts, range inputs/handles,
  second-file drop/browse affordance, and placeholder overlap/missing visuals.
- Preserved static-client constraints: no backend, no ASR/NLP, no ffmpeg load, no eager
  waveform/frame decode, no hidden gain or resampling.
- Evidence to keep current before marking complete: unit coverage in `tests/media-parsers.test.mjs`
  and smoke coverage in `tests/areas/media-studio.mjs`.

Remaining before R4 can be called complete:

- Real audio waveform/difference rendering for selected ranges, with raw vs user-normalized
  modes clearly separated.
- Real video frame strips/overlay preview gated behind explicit decode actions.
- Content-difference reporting inside overlapping ranges; current copy only covers shifted,
  missing, and overlapping timeline regions.
- Committed in `05aabcf5` — `Add media overlap compare foundation`.

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

Status: partial. Foundation is committed in `05aabcf5` / `6e6d489e`; the first audio
analysis slice is committed in `fbe6c057`; the first video analysis slice is committed
in `937ab522`; selected-range WAV compare is committed in `34a2d601`. R4 still needs
polish and general compressed-audio longer-file strategy work.

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
  - Renders real lane frame strips, an overlay preview respecting overlay opacity, and a visual
    diff strip with average visual difference plus high-diff frame/pixel/column counts.
  - Smoke uses `docs/examples/sample.webm` as the second small video fixture and verifies painted
    frame/overlay/diff canvases and measured copy.
- Changed paths for this slice: `compare-audio.js`, `compare-ui.js`,
  `tests/media-parsers.test.mjs`, `tests/areas/media-studio.mjs`, `STUDIO_ROADMAP.md`,
  `STUDIO_TRACKER.md`, plus generated cache files if validation refreshes them.
- Remaining R4 work: richer audio/video alignment polish and any longer-file strategy beyond
  capped browser decode.

### R5 — Video Export Depth

Status: partial. Subtitle burn-in UI/op is committed in `c70853ec`; user-facing music-bed
ducking controls are implemented in the current slice. R5 remains open for crop/rotate/
LUT-style export presets and variable speed ramp only if it can stay clear and compact.

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

## Tracking Rules

- Mark each item `open`, `in progress`, `blocked`, `done`, or `committed`.
- When a worker completes a slice, record the changed paths, tests run, and any caveats here before starting the next slice.
- Keep generated files and asset manifest current when files under `docs/` are added or removed.
