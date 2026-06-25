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

Status: in progress / foundation slice implemented; this is separate from the R1/R3
processing-chain compare.

Goal: compare two source media files, or two partial ranges, when their timelines do not
line up perfectly because one file has an added/missing section.

Needed:

- Partial: dedicated Compare mode surfaces exist for both audio and video with
  side-by-side/top-bottom/overlay layout controls.
- Partial: lane offsets can be typed or nudged by draggable offset handles, and the pure
  range math computes shifted overlap/missing sections.
- Partial: in/out inputs and visible range handles exist per lane so users can define short
  compare windows without full-file decode.
- Partial: audio view has stacked lane strips, explicit user-chosen normalization toggle
  (off by default), translucent overlap/missing placeholders, and an explicit
  `Analyze selected audio` action. Common PCM WAV compares now read capped selected
  source windows with `Blob.slice`; compressed/unsupported audio keeps the capped
  browser-decode fallback. Broader audio compare polish remains pending.
- Partial: video view has aligned lanes, overlay opacity state, offset/overlap readouts,
  and an explicit `Analyze selected video` action that lazily samples capped selected
  overlap frames into real lane strips, overlay preview, visual diff strip, and measured
  visual difference copy.
- Partial: UI copy distinguishes shifted/missing ranges from measured overlap differences
  after audio and video analysis.
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

Status: in progress; subtitle burn-in and music-bed ducking control slices are implemented.

Needed:

- Done: Subtitle burn-in UI under Video Export with lazy ffmpeg execution on the burn-in
  action, separate from display-only sidecars and mov_text embedding.
- Done: User-facing music-bed ducking controls in Video Timeline; mux keeps original video
  audio unchanged and applies the selected gain only to the music bed.
- Crop/rotate/LUT-style export presets if they fit the same Adjust/Export grammar.
- Variable speed ramp only if it can be exposed clearly without turning the static viewer
  into a full NLE.

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
