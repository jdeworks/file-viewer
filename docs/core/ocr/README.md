# OCR — shared engine + lane integration contract

A source-agnostic OCR capability (text extraction) wrapping the vendored, **offline** tesseract.js.
Built and tested in the general lane (`docs/core/ocr/`); the **image** and **media** lanes wire it into
their viewers from their own worktrees (this dir is not lane-owned and must stay UI-free).

## What ships
- `docs/vendor/tesseract/` — vendored offline (lib + worker + SIMD & fallback wasm cores + English
  `eng.traineddata.gz`, ~11 MB). Flagged **heavy** (`FORCE_HEAVY` in `scripts/gen-asset-manifest.mjs`):
  the offline precache modal leaves it unchecked and it lazy-loads only on the first `recognize()`.
  Re-vendor with `bash scripts/vendor.sh` (pins via `package.json` devDeps → `VERSIONS.json`).
- `docs/core/ocr/{engine,frames,subtitles,index}.js` — the engine. Import from `index.js`.

## API (`import … from '../../core/ocr/index.js'`)
- `recognize(source, opts?) → { text, confidence, words:[{text,confidence,bbox}] }`
  `source` = canvas | ImageData | Blob | HTMLImageElement | url. `opts`: `{ digits?, whitelist?, onProgress? }`
  (`digits:true` applies the numbers preset for timestamps/scoreboards/counters).
- `ocrVideo(video, opts?) → cues[]` where a cue is `{ start, end, text, confidence }` (seconds).
  `opts`: `{ intervalSec=2, digits?, whitelist?, maxWidth?, signal?, onProgress({index,total,time}) }`.
  Samples frames at `intervalSec` (live is too slow), seek→`seeked`→`drawImage`, OCRs each, **merges
  consecutive identical text** into one cue. Cancel via an `AbortSignal`.
- `ocrFrames(frames, opts?) → cues[]` — source-agnostic version for **already-decoded** frames:
  `frames = [{ time:seconds, source:canvas|ImageData|Blob|img }]`. Use it for **GIF frames** (the image
  lane's "Split frames" decoder yields per-frame images with real delays → real timestamps) or any
  other pre-extracted sequence. Same cue output + merge as `ocrVideo`.
- `sampleTimes(durationSec, intervalSec) → number[]` · `mergeCues(raw, intervalSec) → cues[]` (pure).
- Serializers over cues: `toSRT`, `toVTT`, `toText`, `toJSON`; `FORMATS` map (`srt|vtt|txt|json` →
  `{ext,mime,label,fn}`); `download(filename, text, mime)`.
- `bundleInfo` `{ id:'vendor:tesseract', approxMB:11, lang:'eng' }`, `isLoaded()`, `terminate()`.

## Opt-in / hint (required of every consumer)
tesseract is heavy. Before the **first** `recognize()`/`ocrVideo()`, show a one-time hint/confirm noting
the ~`bundleInfo.approxMB` MB download (mirror `docs/types/emulator/ruffle/renderer.js`’s confirm gate).
Only after the user confirms, call the API. Show a progress/“Recognizing…” state (use `onProgress`).
Everything stays same-origin (zero off-origin); call `terminate()` when the viewer closes if desired.

## Image lane (in `docs/types/image/**`, image/ascii worktree)
Provide an image source and a toolbar action:
1. Add an "Extract text (OCR)" button in `adv-edit-toolbar.js`; wire it in `adv-edit.js` (~the action
   block near line 254).
2. On click → hint/confirm → get a canvas of the current image (the editor already has one; or
   `drawImage` the `<img>` to a canvas as in `edit-filters.js`) → `recognize(canvas)` →
   show/copy/download the text.
3. **Animated GIF:** the GIF viewer's "Split frames" already decomposes into per-frame images. Map
   those to `[{ time, source }]` (time = cumulative frame delay) and call `ocrFrames(frames)` →
   serialize with `FORMATS` for a timestamped transcript, exactly like video.

## Media lane (in `docs/types/media/**`, media worktree)
Provide the `<video>` element, an interval picker, and a format picker:
1. In `studio-export.js` `buildExportPanel(...)`, add an "OCR → subtitles" control: an interval select
   (0.5 / 1 / 2 / 5 / 10 s) and a format select built from `FORMATS`.
2. On run → hint/confirm → `ocrVideo(videoEl, { intervalSec, onProgress, signal })` → serialize with
   `FORMATS[fmt].fn(cues)` → `download('<name>.' + FORMATS[fmt].ext, …, FORMATS[fmt].mime)`
   (or the existing media download path). Surface progress + a cancel button (`AbortController`).

Note: the media lane already has a subtitle **parser** (`docs/types/media/subtitles.js`) using the same
`{start,end,text}` cue shape — this module supplies the matching **writers**.
