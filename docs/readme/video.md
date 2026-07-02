# Video

> Native video playback plus a media workspace: browser-compatible formats play directly, non-native formats show conversion guidance, and optional FFmpeg tools add editing/export paths.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.mp4`, `.webm`, `.ogv`, `.mov`, `.avi`, `.mkv` |
| MIME type | `video/mp4`, `video/webm`, `video/ogg`, `video/quicktime`, `video/x-msvideo`, `video/x-matroska` |
| Binary / Text | Binary |
| Common use | Screen recordings, films, tutorials, clips |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Playback controls | ✅ | Native `<video>` element — play, pause, seek, volume, fullscreen |
| Task-mode workspace | ✅ | Watch, Adjust, Subtitles, Timeline, Export, and Compare-style panels where applicable |
| Playback speed / frame step | ✅ | Preset playback rates plus ±1 frame controls |
| Picture-in-picture | ✅ | Button appears when the browser supports PiP |
| MP4 playback | ✅ | H.264 + AAC; most common encoding |
| WebM playback | ✅ | VP8/VP9/AV1 + Vorbis/Opus |
| Ogv playback | ✅ | Theora + Vorbis |
| MOV playback | ⚠️ | Works in Safari and Chromium; not Firefox |
| AVI playback | ⚠️ | Usually not native; viewer shows an opt-in transcoding hint |
| MKV playback | ⚠️ | Codec/container dependent; viewer shows a conversion hint when needed |
| Source view | ❌ | Binary format — no raw text view |
| Diff | ❌ | Binary format not diffable |
| Subtitle / caption display | ✅ | `.srt` / `.vtt` sidecar drop/browse control parses cues for overlay display |
| Video adjustments | ✅ | CSS filter/look controls and movie-audio Spectrum/EQ panel |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Native playback editing | ⚠️ | Timeline/adjust/subtitle UI is local; final re-encode paths require opt-in FFmpeg |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Format conversion / processed export | ⚠️ | Available through the opt-in Media Transcoding setting; FFmpeg loads lazily only after user action |
| Subtitle burn-in | ⚠️ | Export panel accepts `.srt`/`.vtt` and builds an FFmpeg burn-in job when transcoding is enabled |

## Browser Format Support

| Extension | Chromium | Firefox | Safari |
|-----------|----------|---------|--------|
| `.mp4` (H.264) | ✅ | ✅ | ✅ |
| `.webm` (VP8/VP9) | ✅ | ✅ | ✅ |
| `.ogv` | ✅ | ✅ | ❌ |
| `.mov` | ✅ | ❌ | ✅ |
| `.avi` | ❌ | ❌ | ❌ |
| `.mkv` | ❌ | ❌ | ❌ |

## Real-World Examples

- [`sample.mp4`](../examples/sample.mp4) — example MP4 video clip
- [`sample.webm`](../examples/sample.webm) — example WebM clip

## Known Limitations

- AVI and some MKV/MOV files cannot play natively; enable Media Transcoding or use a local player (VLC, mpv)
- MOV files with Apple ProRes or HEVC codec may fail even in Chromium
- Subtitle sidecars are display/export inputs; embedded subtitle/chapter extraction is not a full container parser
- Seeking in large MP4 files can be slow if the `moov` atom is not at the start of the file

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Transcoding UX polish | High | Hard | Keep FFmpeg opt-in, lazy, cancellable, and clearly statused |
| Poster frame extraction | Med | Med | Capture a selected frame as an image/poster asset |
| Embedded subtitle/chapter parsing | Med | Hard | Parse tracks from MP4/MKV containers rather than sidecar-only |
| Chapter navigation | Low | Med | Parse embedded chapter metadata from MP4 |
