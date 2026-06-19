# Audio / Video

> Browser-native media playback with waveform visualization, ID3 tag display, and ffmpeg.wasm transcoding for non-native formats.

## Format Details
| Field | Value |
|-------|-------|
| Extensions | `.mp3`, `.mp4`, `.wav`, `.ogg`, `.flac`, `.aac`, `.webm`, `.mkv`, `.avi`, `.mov`, `.m4a`, `.m4v`, `.opus`, `.avi`, `.wmv` (transcoded) |
| MIME types | `audio/*`, `video/*` |
| Binary/Text | Binary |
| Common use | Music, podcasts, video files, screen recordings |

## Capabilities

### View
| Feature | Status | Details |
|---------|--------|---------|
| Audio playback | ✅ | Native browser `<audio>` with custom controls |
| Video playback | ✅ | Native browser `<video>` with custom controls |
| Waveform visualization | ✅ | Canvas-based amplitude waveform |
| ID3 tag display | ✅ | Title, artist, album, year, genre, track number |
| Album art | ✅ | Embedded cover art extracted and displayed |
| Playlist (folder mode) | ✅ | Auto-playlist when folder is loaded |
| Non-native formats | ⚠️ Partial | ffmpeg.wasm transcodes AVI, WMV, FLV etc. (Advanced setting required; ~23 MB WASM download) |
| Metadata | ✅ | Duration, sample rate, bit rate, channels, codec |
| Diff/compare | ❌ | Not applicable for binary media |

### Edit
| Feature | Status | Details |
|---------|--------|---------|
| Visual editor (Basic) | ✅ | Trim, volume adjust, fade in/out, reverse, speed, pitch |
| Advanced editor | ✅ | Equalizer (10-band), noise reduction, tempo, concat, split by silence |
| Video-specific ops | ✅ | Extract audio, mute, extract frame as PNG, resize, rotate, crop |
| In-place conversion | ✅ | Re-encode with custom codec/quality via ffmpeg.wasm |

### Export
| Feature | Status | Details |
|---------|--------|---------|
| Download original | ✅ | Always available |
| Transcode to MP3 | ✅ | Via ffmpeg.wasm Advanced setting |
| Transcode to MP4 | ✅ | Via ffmpeg.wasm Advanced setting |
| Transcode to WAV | ✅ | Via ffmpeg.wasm Advanced setting |
| Transcode to OGG | ✅ | Via ffmpeg.wasm Advanced setting |
| Extract audio from video | ✅ | Advanced editor operation |
| Extract frame as PNG | ✅ | Video editor: specific timestamp |

## Example Files
- [`sample.mp3`](../examples/sample.mp3) — MP3 audio
- [`sample.mp4`](../examples/sample.mp4) — MP4 video

## Gaps / Planned Improvements
| Feature | Priority | Notes |
|---------|----------|-------|
| Subtitle/caption display | Medium | SRT/VTT files alongside video |
| Chapter markers | Medium | MP4 chapter navigation |
| Speed control UI | Medium | Playback rate without re-encoding |
| Thumbnail timeline | Low | Video scrub thumbnail strip |
| Batch transcode | Low | Multiple files at once |
