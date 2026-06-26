# Media Studio Roadmap

Current roadmap for the audio/video media studio after the `worktree-media` polish lane.
Use this for product direction; use `STUDIO_TRACKER.md` for committed lane history.

## Current State

The media studio now has the intended workspace grammar:

- Audio opens as a coherent workspace with `Listen`, `Tune`, `QC`, `Export`, and `Mix`.
- Video opens as the same family of workspace with `Watch`, `Adjust`, `Timeline`,
  `Subtitles`, and `Export`.
- Heavy work stays lazy: ffmpeg, full-file decode, mixer decode, QC, spectrum, dynamics,
  and timeline work only mount after explicit user action.
- The UI is intent-first: quick Tune/Adjust presets, QC report cards, export preset cards,
  provenance summaries, lane/timeline grammar, and advanced controls behind disclosure.
- Runtime constraints still hold: static client, zero off-origin requests, vendored
  ffmpeg.wasm opt-in, no backend or account workflow.

The completed polish/parity work is recorded in `STUDIO_TRACKER.md`:

- P0 audio workspace polish.
- P1 video workspace polish.
- M1 video trim correctness.
- M2 playback/parser polish.
- M3 ACX/export semantics.
- M4 Narratu / auto-audiobook parity pass.
- M5 ffmpeg failure/recovery.
- M6 mixer lifecycle and audio waveform-to-Trim selection.

## Design North Star

This is an offline media workspace, not a pile of widgets. Keep the first viewport useful:
identity, time/duration, playback, and a primary waveform/timeline/scrub surface should be
visible immediately. Put intent controls before raw engineering controls. Keep repeated
workflows dense, calm, and predictable rather than decorative.

Reference alignment:

- `narratu`: audiobook/mastering EQ vocabulary, speech presets, spectrum/compare grammar,
  master-bus thinking, export-chain provenance.
- `auto-audiobook`: lane/timeline grammar, direct manipulation, source-preserving export
  behavior, silence/room-tone lessons, no hidden gain multipliers.

## Remaining Work

### R0a — Modular Media Mixer Foundation

Status: Stage 5 video/image seek-frame preview started.

The next media-studio foundation is a modular, capability-gated media
mixer/editor, not a narrow replacement of the current audio Listen lane. The
approved source package is
`docs/types/media/modular-mixer-research/`, starting with
`00-scope-and-decisions.md`.

The target module should support reduced and expanded contexts from the same
model:

- MP3/WAV opens as one audio-capable source element on one lane.
- Mix expands the same project into multiple lanes.
- Compare constrains the same model to two selected objects/ranges.
- Video files become timeline elements with `hasVideo` and possibly `hasAudio`.
- Dragged images become visual timeline elements.
- Project settings import/export stores config, file identity, and edit
  decisions without embedding media bytes by default.
- Optional functionality is capability/config gated: available now, available
  after opt-in, or unsupported in the current browser/session.
- ffmpeg remains opt-in and lazy; disabled ffmpeg should produce coherent
  reduced UI with notes about what opt-in unlocks, not broken panels.

Implementation should follow:

- `modular-mixer-research/08-acceptance-and-test-strategy.md`
- `modular-mixer-research/09-build-runbook.md`
- `modular-mixer-research/10-review-checklist.md`

The current file-viewer Mix, Compare, and video Timeline implementations remain
prototype coverage only. Do not evolve them as the final architecture.

Stage 1 implementation added `docs/types/media/mixer/` pure modules and unit
tests for model/timing, capability gating, config-only project settings
import/export, relink/reapply state, hashing, and EQ schema.

Stage 2 implementation added the modular renderer shell, hit-testing,
interaction dispatch, context-menu item model, mount helper, and CSS. It is
validated by `tests/media-mixer-hit-test.test.mjs` and
`tests/areas/media-studio-mixer-shell.mjs`. The shared renderer now also draws
audio waveform summaries inside audio-capable element blocks and exposes
selected-element inspector controls for timing, gain, and fades that update the
shared project model.

Stage 3 is in progress. Default MP3/WAV Listen is routed through
`mixer/mixer-audio-listen.js`, creating a shared mixer project for the open
audio source, adding config-only settings JSON roundtrip coverage, and proving
transport, zoom/pan, capability-note, and direct source-region dragging behavior
in focused smoke coverage. It reports waveform analysis status and hands
available bounded waveform summaries into the shared project element while
stripping runtime analysis from config-only project export. The visible Listen
lane now renders directly from the shared renderer/interaction surface; legacy
Listen class names remain only as compatibility aliases for surrounding tests
and panels while the new mixer contract is expanded.

Stage 4 has started. Audio `Mix` now routes to
`mixer/mixer-audio-multi.js`, a shared-model multi-lane controller rendered
through the modular mixer shell. It starts from the open file as lane 1 and can
add generated tone, pink-noise/room-tone lanes, or dropped audio-file lanes,
with lane gain/mute/solo, element fades, track EQ schema, master EQ schema,
capability notes, and config-only settings export all backed by the mixer
project model. The old `.mx-*` selectors are compatibility aliases while
focused modular smoke coverage asserts the `.mmx-*` surface. A Narratu-style
decoded-audio cache module now provides explicit byte budgets, LRU eviction,
per-project release, and processed cache keys that include the relevant lane,
element, room-tone, EQ, placement, and master-bus settings; Mix exposes those
runtime cache stats without serializing cache state into settings JSON.
WebAudio Mix preview now schedules from the same shared timeline state, using
cursor offsets, trims, mute/solo, lane gain, element gain/fades, master gain,
generated tone, and pink-noise/room-tone elements, with file assets decoded
lazily through the runtime cache. Browser WAV mixdown now derives export
provenance from that same shared schedule state, including assets, offsets,
trims, fades, gains, EQ preset ids, room tone, render path, scheduled/skipped
counts, and warnings without serializing media bytes. Stage 4 audio is complete
for the accepted browser-feasible scope; the next foundation stage is video/image
elements and seek-frame preview.

Stage 5 has started with a shared seek-frame preview slice. The modular mixer
now derives active image/video-capable elements at the current cursor from the
same project snapshot as the timeline, renders a bounded orientation canvas, and
exposes selected-element visual transform controls for position, scale,
rotation, and opacity. This preview is deliberately lighter than realtime video
playback; it gives enough frame-context grammar to place images/video elements
while preserving client-side memory constraints. The first visual intake slice
also classifies dropped audio/image/video files through a reusable helper, so Mix
can create visual shared-model lanes without serializing media bytes. Dropped
visual files now perform bounded native metadata probing: image dimensions and
browser video duration/dimensions can update the shared model, while unsupported
video keeps a coherent `needs-proxy`/Media Transcoding warning. A runtime-only
visual frame cache now draws decoded image sources and sparse browser-playable
video samples into the seek-frame preview without serializing frame data. Opened
browser-playable video now also mounts a one-lane modular source mixer in
Timeline mode, so the same shared model drives the ruler, zoom, red playhead,
selection, visual transforms, sparse runtime thumbnail strips, config-only
settings export, and sampled seek-frame preview before the older
trim/transition timeline is opened. Remaining Stage 5 work is ffmpeg-backed
proxy generation/conversion paths, replacing the old video timeline with
modular multi-lane editing, and then Compare on top of the same selected-object
model.

Stage 6 has started with an additive modular Compare surface for audio and
video. It builds a two-lane shared mixer project from the opened media, stores
A/B targets in `project.compare`, computes overlap through the mixer model, and
exposes stacked/overlay controls with config-only settings export. The modular
surface can now browse or drop a B media file, add it as a project asset,
retarget the existing B lane/element, and refresh `project.compare.b` while
keeping file bytes runtime-only. The existing Compare UI remains mounted for
detailed analysis/live-preview coverage until the modular surface can choose A/B
from arbitrary existing mixer elements and render equivalent waveform/visual
overlay analysis.

Stage 7 has started with a reusable project settings UI helper. Multi-lane Mix,
opened video source, and modular Compare now have toolbar controls for
config-only settings export/import and an import reapply panel with the required
`Apply to all elements`, `Ask per element`, and `Do not change media objects`
choices. The UI uses the pure `importProjectSettings()`/`applyRelinkChoice()`
path and runtime local-asset evidence, so media bytes remain outside the
exported project. Missing imported media can now be relinked from the same
settings panel by browsing or dropping local files; the file objects stay in the
runtime map while the project receives only matched identity/config metadata.
The next Stage 7 work is final ffmpeg-gated video export and shared export
provenance.

### R0a-old — Auto-Audiobook-Grade Default Audio Lane

Status: superseded as the primary direction by the modular mixer foundation
above.

The current audio `Listen` surface is a custom transport over a hidden decode element, but it
is not yet the target default MP3 workflow. Do not build this redesign on the current
file-viewer `Mix` or `Compare` lane implementations; they are prototype surfaces and should
be replaced. The target is the `auto-audiobook` mixer grammar applied to one open track by
default.

Needed:

- Replace the simple Listen transport row with an auto-audiobook-style waveform editor:
  ruler, waveform canvas, red seek cursor, click-to-seek, draggable region/timing, and
  lane controls.
- Move ordinary single-track edits into that default lane: start offset / later start,
  in/out trim range, fade in, fade out, gain, and play/stop.
- Add pink-noise/room-tone behavior using auto-audiobook semantics: gap/noise drawing and
  subtle `-52 dB` style bed/fill behavior, not the current generic generator lane.
- Rebuild `Mix` from the auto-audiobook semantic track model rather than reusing the
  current arbitrary file-viewer mixer lanes.
- Rebuild `Compare` from the same auto-audiobook lane model with exactly two independently
  movable waveform lanes; overlay mode must draw the two waveforms over each other, not
  only place controls next to each other.

Reference alignment:

- `auto-audiobook/src/components/AudioMixerView.tsx`: timeline container, ruler, tracks,
  scroll/zoom and cursor model.
- `auto-audiobook/src/components/MixerTrack.tsx`: track drawing, drag-to-adjust timing,
  cursor, region selection, keyboard nudging, drop handling.
- `auto-audiobook/src/stores/mixer-store.ts`: lane/region state shape with offset,
  duration, fades, volume and selection.
- `auto-audiobook/src/utils/mixer-playback.ts`: scheduled playback from cursor with
  per-region gain/fade.
- `auto-audiobook/src/engine/audio-processor.ts`: fade/early-stop/pink-noise semantics.

This section remains useful as audio-specific input for the one-lane MP3/WAV
slice of the modular mixer.

### R0 — Roadmap Hygiene And Code Shape

Status: committed; enough validation and shared workspace code shape is in place to start
R1 without further growing the previous hotspots.

- Done: split media studio coverage out of `tests/areas/media-3d.mjs` into
  `tests/areas/media-studio.mjs`.
- Done: make `./scripts/check.sh --fast` choose touched smoke areas when ownership is clear
  and fall back to aggregate smoke for shared/global/generated paths.
- Done: make `./scripts/check.sh --fast` choose touched unit tests when ownership is clear
  and fall back to the full existing unit set for shared/global/generated paths.
- Done: extract shared audio/video mode lifecycle from `renderer.js` into
  `workspace-modes.js`.
- Done: split media-specific preview styles from `preview-chrome.css` into
  `preview-media.css`.
- Done: extract media studio smoke viewport/settings helpers into
  `media-studio-helpers.mjs`.
- Keep `STUDIO_TRACKER.md` as the active queue; update this roadmap only when scope changes.

Validation target:

- Focused area smoke for touched surfaces: `media-studio` for media runtime/studio changes,
  `media-3d` for 3D/image/MIDI/gamerom changes, `ebook-git` for ebook/MOBI changes.
- `./scripts/check.sh --fast` still passes and prints changed paths plus the chosen smoke scope.
- Timing output should show where any remaining aggregate fast-gate cost lives.

### R1 — Complete The Mastering Chain

Status: committed; export cleanup/leveling, estimated true-peak QC, and staged chain
compare are in place.

Goal: make Export/QC feel like a real offline audiobook/podcast mastering path, not just a
collection of useful presets.

Needed:

- Done: estimated true-peak QC via deterministic 4x oversampling, clearly labeled as an
  estimate rather than a certified broadcast meter.
- Done: de-hum and de-noise export preset based on ffmpeg filters (`afftdn`,
  notch/highpass).
- Done: de-plosive helper path, labeled as heuristic low-frequency containment.
- Done: adaptive leveling approximation via client-side ffmpeg (`dynaudnorm`) in the
  cleanup export chain.
- Done: stronger master-bus preview/export comparison: raw -> tuned -> dynamics ->
  master bus.
- Done: QC/export copy distinguishes RMS, integrated LUFS, sample peak, estimated true
  peak, and ffmpeg `loudnorm` LUFS/TP targets.

Do not add:

- Server-side ML denoise.
- Speaker AutoEQ.
- ASR/NLP filler or cough removal.
- TTS/manuscript generation.

Those require backend/model work and remain out of scope for this static viewer.

### R2 — Chapterized Audiobook Export

Status: implemented; core chapter export plus sidecar/CTOC polish are in place.

Needed:

- Done: normalize existing ID3 CHAP starts into sorted chapter ranges with deterministic
  ACX-safe filenames.
- Done: show chapter markers on the audio waveform without triggering extra decode work.
- Done: export per-chapter ACX-formatted MP3 files and package them as a vendored JSZip ZIP,
  loaded only when the chapter export action is clicked.
- Done: synthesize ACX head/tail padding per chapter through the existing ACX filter chain.
- Done: parse practical chapter sidecars: WebVTT chapter cues, ffmetadata `[CHAPTER]`
  sections, and simple timestamp text/Markdown lines.
- Done: discover likely same-folder chapter sidecars lazily, cap reads defensively, and prefer
  sidecar chapters over embedded ID3 CHAP frames.
- Done: preserve ID3 CHAP element IDs and use CTOC child order/title fallback when present.

This builds on the existing ACX QC/export chain rather than replacing it.

### R3 — Narratu-Grade Compare Polish

Status: implemented; no remaining R3 work identified.

Needed:

- Done: make comparison visually explain the processing chain:
  raw -> quick intent/EQ -> dynamics -> export master bus.
- Done: keep compare controls in Tune/Export, not as a separate competing workflow.
- Done: preserve the current intent-first surface; raw charts remain behind disclosure.
- Done: use only generic speech/mastering vocabulary; no character/story-specific presets
  were added.

### R4 — Audio/Video Overlap Diff Compare

Status: implemented; this is separate from the R1/R3 processing-chain compare.

Goal: compare two source media files, or two partial ranges, when their timelines do not
line up perfectly because one file has an added/missing section.

Needed:

- Done: dedicated Compare mode surfaces exist for both audio and video with
  side-by-side/top-bottom/overlay layout controls.
- Done: lane offsets can be typed or nudged by draggable offset handles, and the pure
  range math computes shifted overlap/missing sections.
- Done: in/out inputs and visible range handles exist per lane so users can define short
  compare windows without full-file decode.
- Done for this slice: audio view has stacked lane strips, explicit user-chosen normalization toggle
  (off by default), translucent overlap/missing placeholders, and an explicit
  `Analyze selected audio` action. Common PCM WAV compares now read capped *shifted
  overlap* source windows with `Blob.slice`; compressed/unsupported audio keeps the capped
  browser-decode fallback and now summarizes only the shifted-overlap subsection. Added ffmpeg-backed
  selected-overlap extraction for longer compressed files when enabled, with an explicit input-byte cap
  so giant files are not silently read.
- Done: video view has aligned lanes, overlay opacity state, offset/overlap readouts,
  and an explicit `Analyze selected video` action that lazily samples capped shifted
  overlap source frames into real lane strips, overlay preview, visual diff strip, and
  measured visual difference copy.
- Done for this polish slice: shifted overlap is now the measured window for both
  audio and video analysis (selected/WAV and decoded fallback), so copy can state that
  measured differences are from the shifted-overlap window. Remaining longer-file behavior
  is now handled via ffmpeg-backed selected-overlap extraction when enabled, otherwise via
  the existing capped browser-decode fallback.
- Static-client implementation only: no backend alignment service, no ASR/NLP matching, no
  hidden resampling/gain unless the user chooses a compare normalization mode.

Validation target:

- Done for foundation: pure offset/range math for shifted media segments.
- Done for foundation: smoke coverage for lazy Compare mount, layout controls, lane offset
  changes, range inputs/handles, overlay opacity, explicit audio normalization state, video
  grammar, and no horizontal overflow on desktop/mobile.
- Done for audio slice: pure waveform/difference math coverage plus media-studio smoke for
  explicit audio analysis, painted lane/diff canvases, measured difference readout,
  and compare-only normalization labeling.
- Done for audio polish: PCM WAV header/range helper coverage plus media-studio smoke proving
  `sample.wav` uses the selected-range WAV path.
- Done for video slice: pure video sample/difference math coverage plus media-studio smoke
  for explicit video analysis, second WebM fixture loading, painted frame/overlay/diff
  canvases, measured visual difference copy, overlay opacity readout updates, and absence
  of audio-only controls.
- Heavy decode/rendering stays lazy and scoped to selected ranges.

### R5 — Video Export Depth

Status: done for the compact roadmap scope; subtitle burn-in, music-bed ducking, and compact
export transforms are implemented.

Needed:

- Done: Subtitle burn-in UI under Video Export with lazy ffmpeg execution on the burn-in
  action, separate from display-only sidecars and mov_text embedding.
- Done: User-facing music-bed ducking controls in Video Timeline; mux keeps original video
  audio unchanged and applies the selected gain only to the music bed.
- Done: Compact Video Export transform/look presets for crop, rotate, and LUT-style looks
  using ffmpeg-native `-vf` filters composed with the existing web-video scale preset.
- Deferred: variable speed ramp unless it can be exposed clearly without turning the static
  viewer into a full NLE.

## Success Criteria

The media roadmap is fully implemented when:

- Audio and video preserve the current workspace grammar and remain visually coherent on
  desktop and mobile.
- Common playback remains cheap and immediate.
- Heavy analysis/export remains lazy and explicit.
- Narratu/auto-audiobook lessons are visible in the product: speech-first presets,
  provenance, no hidden source changes, mixer/timeline grammar, QC-backed export.
- Audio/video compare can align shifted inputs, inspect partial ranges, and show both
  side-by-side/top-bottom and overlay differences without forcing full-file work.
- ACX/podcast export can be trusted from QC through final generated files, including
  chapter workflows.
- The fast gate is either actually fast or split clearly enough that developers know which
  targeted smoke to run.

## Constraints

- Zero off-origin runtime requests.
- Static client only; no backend for this roadmap.
- Vendored heavy libraries must stay opt-in.
- Preserve source sample rate/channels unless a preset or user explicitly overrides them.
- No hidden gain multipliers.
- Keep file/module growth controlled; split before extending oversized media files further.

## Historical References

- `EDITOR.md`: original audio/video editor roadmap. Some bullets are now shipped or stale.
- `STUDIO_AUDIOBOOK_QC.md`: audiobook QC/mastering details; still useful for ACX-specific
  work, but status notes may lag behind `STUDIO_TRACKER.md`.
- `STUDIO_TRACKER.md`: authoritative committed history for the completed polish lane.
