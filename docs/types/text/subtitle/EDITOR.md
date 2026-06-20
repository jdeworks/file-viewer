# Editor Roadmap — Subtitles (SRT / VTT / ASS)

## Current state

Hand-rolled parser (`sublib.js`) handles SubRip (`.srt`) and WebVTT (`.vtt`). Normalises both into a flat cue list `{ index, start, end, text }` with times in seconds. Renders a timecoded cue list via template HTML (`doc.html` / `cue.html`). One export already implemented (`exports.js`): SRT ↔ VTT round-trip conversion via blob download. VTT inline tags (`<b>`, `<i>`, timestamps) are stripped to plain text on display.

ASS/SSA (`.ass`, `.ssa`) not yet parsed. No video sync, no waveform, no timing shift, no cue-level editing.

## Viewer enhancements (no write-back needed)

- **Video sync overlay** — Accept a local video file via a secondary drop zone (or a `<input type="file">` in the toolbar). Create an `<video>` element; as it plays, highlight the active cue in the list and render the cue text as an overlay `<div>` positioned absolutely over the video. No CDN; uses only the browser's native video decoder. — M
- **Waveform alignment view** — Load the audio track from the video using the Web Audio API `AudioContext.decodeAudioData`. Draw a waveform canvas (same approach as `docs/types/media/waveform.js`). Paint cue regions as coloured bands on the waveform so silence gaps and speech alignment are visible at a glance. Scrub on the waveform seeks the video. — M
- **Active cue highlight + auto-scroll** — As the video plays, listen to `timeupdate` events and add an `.active` class to the current cue row. Smooth-scroll the cue list so the active row stays visible. — S
- **ASS/SSA basic parse** — Read `[Events]` section, extract `Dialogue:` lines (Layer, Start, End, Text columns). Strip override tags (`{\an8}`, `{\i1}`, etc.) for display. Show same timecoded cue list. — M

## In-browser editing (download-on-save)

All editing operates on the in-memory parsed cue array and re-serialises to SRT or VTT on save.

- **Inline cue text editor** — Make each cue's text cell a `contenteditable` span (or a single-line `<textarea>`). On blur, update the cue object. A "Save" button re-serialises all cues and downloads. — S
- **Timing adjustment — global shift** — A toolbar input: shift all cue times by ±N seconds (or ±N milliseconds). Apply to every `start` and `end` value; clamp to 0. Download updated file. — S
- **Timing adjustment — per-cue nudge** — In the cue row, show ▲▼ arrow buttons (or number inputs) for start and end time. Each keystroke or click adjusts by a configurable step (default 100 ms). — S
- **Merge adjacent cues** — Select two consecutive cues with checkboxes; click "Merge". The new cue spans `min(start)` to `max(end)` with texts joined by a newline. Re-index. — S
- **Split a cue** — Click a word in the cue text; the cue is split at that word boundary. The first half keeps the original start time, the second half starts at the midpoint. User drags the midpoint to adjust. — M
- **Format conversion** — Already has SRT ↔ VTT. Extend `exports.js` with ASS output once the ASS parser exists: map cues to `Dialogue:` lines with a minimal `[Script Info]` and `[Events]` header. — M
- **Delete cue / add blank cue** — A delete button per row. An "Add cue" button inserts a blank cue after the selected row with start = previous cue's end and end = start + 2 s. — S

## Full write-back editing (companion required)

- **Drag cue boundaries on waveform** — In the waveform alignment view, make each cue region's left/right edge draggable; on mouseup write the new time back to the cue object and save to disk without a download prompt.
- **Auto-sync to speech** — Run a lightweight VAD (voice activity detection) in a Web Worker using the Web Audio API's `AnalyserNode`; auto-suggest new timing windows aligned to audio transients. Present proposed shifts for user approval before writing.
- **Project save (`.json` sidecar)** — Persist all cue edits, video path reference, and waveform zoom state to a JSON sidecar file so a session can be resumed. Companion writes the sidecar next to the subtitle file.

## Shared toolbar / modular note

No new vendor libraries are required for the core editing features — the parser, serialiser, and timing arithmetic are all pure JS. The waveform reuses the pattern from `docs/types/media/waveform.js` and the Web Audio API. The video overlay follows the same sandbox-safe pattern as the existing video player (no off-origin requests). ASS is the only format needing a new parser; it can be added to `sublib.js` as a third branch without touching the existing SRT/VTT paths. If a richer timeline UI becomes necessary, consider [wavesurfer.js](https://wavesurfer.js.org/) (MIT, ~100 KB) for the waveform + region layer.
