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

Status: needed for "fully implemented" ACX/audiobook workflow.

Needed:

- Read chapter markers from ID3 CHAP/CTOC and practical sidecar formats where available.
- Show chapter markers on the audio waveform/timeline.
- Export per-chapter ACX-formatted MP3 files.
- Preserve or synthesize head/tail room tone per chapter.
- Package chapter exports as a zip without off-origin dependencies.

This builds on the existing ACX QC/export chain rather than replacing it.

### R3 — Narratu-Grade Compare Polish

Status: polish/depth, after R1.

Needed:

- Make comparison visually explain the processing chain:
  raw -> quick intent/EQ -> dynamics -> export master bus.
- Keep compare controls in Tune/Export, not as a separate competing workflow.
- Preserve the current intent-first surface; raw charts remain behind disclosure.
- Port only generic speech/mastering presets. Avoid story/character-specific presets unless
  clearly labeled as examples.

### R4 — Audio/Video Overlap Diff Compare

Status: needed; this is separate from the R1/R3 processing-chain compare.

Goal: compare two source media files, or two partial ranges, when their timelines do not
line up perfectly because one file has an added/missing section.

Needed:

- A dedicated compare surface for both audio and video with side-by-side/top-bottom and
  overlay modes.
- Draggable timeline lanes so each input can be nudged by offset before comparing.
- In/out range handles per lane so short sections can be compared without decoding or
  rendering full files unnecessarily.
- Audio view: stacked waveforms plus translucent overlap/difference energy, with gain-normalized
  and raw modes clearly separated.
- Video view: aligned frame strips and overlay/scrub preview, with opacity control and
  frame/time offset readout.
- Partial-difference reporting that distinguishes "content changed" from "content shifted".
- Static-client implementation only: no backend alignment service, no ASR/NLP matching, no
  hidden resampling/gain unless the user chooses a compare normalization mode.

Validation target:

- Pure offset/range math for shifted media segments.
- Smoke coverage for draggable lane offsets, side-by-side/top-bottom layout, overlay opacity,
  and no horizontal overflow on desktop/mobile.
- Heavy decode/rendering stays lazy and scoped to selected ranges.

### R5 — Video Export Depth

Status: useful after audio/mastering depth is stable.

Needed:

- Subtitle burn-in UI under Video Export.
- Crop/rotate/LUT-style export presets if they fit the same Adjust/Export grammar.
- Audio ducking controls for music-bed mux workflows.
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
