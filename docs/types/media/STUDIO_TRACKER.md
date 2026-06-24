# Media Studio Tracker

Active tracker for the `worktree-media` lane. Use this before `MEDIA_EDITOR_PLAN.md`,
`EDITOR.md`, or `STUDIO_ROADMAP.md`; those files contain useful design history but some
status notes are stale.

## Daily Start Checklist

- Run `git status --short` and preserve any user/worker changes.
- Re-read this tracker and pick one coherent increment.
- Prefer `gpt-5.3-codex-spark` worker subagents for bounded code changes with disjoint write scopes.
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

### P-Start — Checkpoint Current Verified Work

Status: open.

Before beginning the workspace redesign, checkpoint the already-verified maintenance work:

- Review `git status --short` and make sure every changed file is understood.
- Run `./scripts/check.sh --fast` unless the user explicitly asks to skip.
- Commit the done/uncommitted M1 + M2 work and tracker/doc updates with a short imperative subject.
- Record the commit subject/hash in this tracker.
- Do not push or pull.

### P0 — Audio Workspace Polish Gate

Status: open.

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

### P1 — Video Workspace Polish Gate

Status: open.

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

### M1 — Video Trim Correctness

Status: done, uncommitted.

- Make video timeline trim handles clamp so start/end cannot cross.
- Add a visible `Trim selected range` action to the video timeline.
- Call existing `runOperation(ff, 'trim', { start, end, precise: false })` with the selected HH:MM:SS range.
- Do not alter transition behavior.
- Add smoke/pure checks for trim clamping and generated trim params without requiring a heavy encode.
- Changed paths: `timeline.js`, `video-filters.js`, `tests/areas/media-3d.mjs`.
- Validation passed: `node tests/smoke-area.mjs media-3d`, `./scripts/check.sh --fast`.

### M2 — Playback And Parser Polish

Status: done, uncommitted.

- Handle `requestPictureInPicture()` promise rejection without unhandled errors.
- Add focused subtitle parser tests for malformed/complex cue timing.
- Add focused ID3 APIC and CHAP parser tests.
- Keep frame-step at the documented 30fps fallback unless reliable fps metadata is introduced.
- Changed paths: `playback-extras.js`, `subtitles.js`, `id3.js`, `tests/media-parsers.test.mjs`, `scripts/check.sh`.
- Targeted validation passed: `node tests/media-parsers.test.mjs`, `node tests/movediff.test.mjs`.
- Full lane validation passed: `./scripts/check.sh --fast`.

### M3 — ACX And Export Semantics

Status: open.

- Decide one behavior for `acx-mp3`: either format/loudness preset only, or route to the dedicated ACX chain with silence cut and room-tone padding.
- Update UI wording so sample peak is not described as true peak unless oversampling is implemented.
- Add pure tests for ACX filter args, `evaluateAcx`, and preset resolution outside the large smoke suite.

### M4 — Narratu / Auto-Audiobook Parity Pass

Status: open.

- Compare useful generic EQ presets against `narratu/apps/web/src/utils/eq-presets.ts`.
- Add generic presets only; avoid story/character-specific presets unless clearly labeled as examples.
- Consider a master-bus preset based on `narratu/packages/engine/src/audio/ffmpeg-filters.ts`.
- Preserve auto-audiobook lessons: no hidden gain multipliers, preserve source sample rate unless a preset overrides it, and show export setting provenance clearly.

### M5 — ffmpeg Failure And Recovery

Status: open.

- Verify cancel/reload after `ff.exit()`.
- Cover failed ffmpeg operations and unsupported codec messages.
- Keep heavy ffmpeg execution out of the fast gate unless the fixture is tiny and deterministic.

### M6 — Mixer Lifecycle And Audio Trim

Status: open.

- Tighten mixer audio resource teardown.
- Add audio waveform region selection only after video trim is correct.
- If audio region selection lands, it should prefill the existing editor Trim operation, not create a second trim system.

## Tracking Rules

- Mark each item `open`, `in progress`, `blocked`, `done`, or `committed`.
- When a worker completes a slice, record the changed paths, tests run, and any caveats here before starting the next slice.
- Keep generated files and asset manifest current when files under `docs/` are added or removed.
