# Media Editor Plan (ffmpeg.wasm)

Built on top of the existing ffmpeg.wasm v0.11.6 single-threaded integration in
`docs/types/media/`. The transcoder already loads, runs, and reports progress.
Phase 1 (download button) is already shipped.

## Context

- ffmpeg.wasm vendored at `docs/vendor/ffmpeg/` — v0.11.6, single-threaded (`core-st`)
- No SharedArrayBuffer/COOP/COEP headers needed — critical for sandboxed iframe compat
- API: `createFFmpeg()` → `ff.load()` → `ff.run(...args)` → `ff.FS('readFile', out)`
- All output served via `URL.createObjectURL(blob)` + `<a download>` — no backend needed
- Memory limit: ~300–500MB input files practical (WASM heap); stream-copy ops are near-instant
- Encode speed: ~4–10× slower than native for re-encode; `-c copy` = instant regardless of size

## Phase 1 — Download button ✅ DONE

Added `<a download>` after transcode success. One-line change to `renderer.js`.

## Phase 2 — MVP Editor Panel

**Target files:** `docs/types/media/renderer.js`, `docs/types/media/transcoder.js`

Expand the existing `txPanel` div into a full operation panel. No new files needed.

### Operations to add

| Operation | ffmpeg args | UI needed |
|---|---|---|
| Extract audio → MP3 | `-i input -vn -c:a libmp3lame -q:a 2 output.mp3` | Format picker |
| Extract audio → OGG | `-i input -vn -c:a libvorbis -q:a 4 output.ogg` | Format picker |
| Mute video track | `-i input -c:v copy -an output.mp4` | Button only |
| Frame screenshot | `-ss {timestamp} -frames:v 1 thumb.png` | Timestamp input |
| Downscale resolution | `-i input -vf scale={W}:{H} -c:a copy output.mp4` | Resolution picker (720p/480p/360p) |
| Volume adjust | `-i input -af volume={N} -c:v copy output.mp4` | Slider (0.1×–3×) |
| **Trim (stream copy)** | `-ss {start} -to {end} -i input -c copy output.mp4` | Two timestamp inputs — highest value |
| Trim (frame-accurate) | `-i input -ss {start} -to {end} -c:v libx264 -preset ultrafast output.mp4` | Same UI, checkbox "precise" |
| Speed 0.5× | `-i input -filter:v "setpts=2.0*PTS" -filter:a "atempo=0.5" output.mp4` | Speed picker |
| Speed 2× | `-i input -filter:v "setpts=0.5*PTS" -filter:a "atempo=2.0" output.mp4` | Speed picker |
| Convert → WebM | `-i input -c:v libvpx-vp9 -crf 33 -b:v 0 -c:a libopus output.webm` | Format picker |

### UI structure

```
┌─ Media Editor ─────────────────────────────────────────┐
│  Operation:  [Convert ▾]  [Extract Audio ▾]  [Trim]   │
│              [Mute]  [Screenshot]  [Speed]             │
│                                                         │
│  (contextual inputs appear below based on operation)   │
│  Trim: Start [00:00:00] → End [00:00:00]  □ precise   │
│  Format: ( ) MP4  ( ) WebM                            │
│                                                         │
│  [▶ Run]  [✕ Cancel]                                  │
│  ████████████░░░░░░░  67%  Encoding...                │
│                                                         │
│  ✓ Done — 12.4 MB                                     │
│  [⬇ Download output.mp4]                              │
└────────────────────────────────────────────────────────┘
```

### Cancel behaviour

`ff.exit()` terminates the WASM instance. Set `ffmpegInstance = null` and offer
a "Reload ffmpeg" button (re-calls `ff.load()` from cached WASM). The current
transcoder already creates a fresh instance per operation — verify this pattern
is preserved.

### Progress

Replace current text progress with `<progress max="1" value={ratio}>` + percentage
label. The existing `ff.setProgress({ratio})` callback already provides the ratio.

### Timestamp inputs

Use `<input type="text" pattern="[0-9]{2}:[0-9]{2}:[0-9]{2}" placeholder="HH:MM:SS">`
rather than `type="time"` — `type="time"` in some browsers drops seconds or adds AM/PM.
Validate before passing to ffmpeg args. Also offer "use current position" button that
reads `videoEl.currentTime` and formats it.

### Output filename convention

`{originalBasename}_{operation}.{ext}` — e.g. `myvideo_trim.mp4`, `myvideo_audio.mp3`

## Phase 3 — Advanced Operations

**Prerequisite:** Phase 2 shipped and stable.

### Multi-file operations

These require a second file to be loaded into ffmpeg MEMFS alongside the primary:

| Operation | Description | ffmpeg approach |
|---|---|---|
| **Subtitle embed** | Drag a .srt/.vtt onto the editor panel | `-i video -i sub.srt -c copy -c:s mov_text out.mp4` |
| **Concatenate** | Combine two videos (same codec/res recommended) | Write `concat.txt` to MEMFS; `-f concat -safe 0 -i concat.txt -c copy out.mp4` |
| **Audio replace** | Swap video's audio track with a separate audio file | `-i video -i audio -c:v copy -map 0:v -map 1:a out.mp4` |

### Additional single-file operations

| Operation | ffmpeg args | Notes |
|---|---|---|
| Loudness normalize (EBU R128) | `-i input -af loudnorm -c:v copy output.mp4` | Two-pass for accuracy; single-pass adequate for preview |
| GIF export | `-i input -ss {start} -to {end} -vf "fps=10,scale=480:-1" output.gif` | Warn: GIFs are large; suggest WebP instead |
| WebP export (animated) | `-i input -ss {start} -to {end} -vf "fps=10,scale=480:-1" output.webp` | Better than GIF |
| Thumbnail strip | `-i input -vf "fps=1/10,scale=160:-1,tile=5x2" thumb_strip.png` | Overview grid |
| Remove metadata | `-i input -map_metadata -1 -c:v copy -c:a copy clean.mp4` | Privacy/size |

### Multi-file UI

Add a secondary drop zone in the editor panel that appears when an operation
requires a second file. The dropped file gets written to ffmpeg MEMFS alongside
`input.{ext}` as `secondary.{ext}`.

### Dual-view integration

When dual-view is active (two files open), the editor could offer to use the
second open file as the secondary input without requiring a re-drop.

## Notes

- libmp3lame presence in this WASM build: **verify with a test encode before shipping**
  audio extraction. Run `ff.run('-formats')` and check stdout for `mp3`.
- VP9 encoding is slow in WASM; WebM output may take 3–5× longer than H.264.
- `atempo` filter is capped at 0.5–2.0× range; for outside that range, chain:
  `atempo=2.0,atempo=2.0` for 4× speed.
- The `scale` filter with odd dimensions can cause libx264 errors; use
  `scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2`
  for safe 16:9 output or just `scale=trunc(iw/2)*2:trunc(ih/2)*2` to force even dims.
