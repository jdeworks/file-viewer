# Video

> Native HTML5 video playback for web-compatible formats; non-native formats (AVI, MKV) are listed but cannot play in the browser without transcoding.

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
| MP4 playback | ✅ | H.264 + AAC; most common encoding |
| WebM playback | ✅ | VP8/VP9/AV1 + Vorbis/Opus |
| Ogv playback | ✅ | Theora + Vorbis |
| MOV playback | ⚠️ | Works in Safari and Chromium; not Firefox |
| AVI playback | ❌ | Not natively supported by any browser |
| MKV playback | ❌ | Not natively supported by any browser |
| Source view | ❌ | Binary format — no raw text view |
| Diff | ❌ | Binary format not diffable |
| Thumbnail extraction | ❌ | Not implemented |
| Subtitle / caption display | ❌ | Not implemented |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Video editing | ❌ | Read-only |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Format conversion | ❌ | Not implemented |

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

- AVI and MKV files cannot play in the browser — download and use a local player (VLC, mpv)
- MOV files with Apple ProRes or HEVC codec may fail even in Chromium
- No subtitle or chapter support
- Seeking in large MP4 files can be slow if the `moov` atom is not at the start of the file

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Non-native format support (AVI, MKV) | High | Hard | FFmpeg WASM transcoding to WebM on-the-fly (~30 MB) |
| Thumbnail / poster frame extraction | Med | Med | Seek to frame 0 and capture via Canvas |
| Subtitle display (.srt / .vtt) | Med | Med | Drop a matching `.vtt` alongside the video |
| Clip trimming | Low | Hard | Canvas + MediaRecorder for simple in/out trim |
| Playback speed control | Low | Easy | `video.playbackRate` — expose as a UI slider |
| Chapter navigation | Low | Med | Parse embedded chapter metadata from MP4 |
