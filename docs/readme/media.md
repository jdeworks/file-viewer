# Audio / Video

> Browser-native media playback with waveform/listening surfaces, ID3 metadata, chapter support, and opt-in ffmpeg.wasm editing/transcoding.

## Format Details
| Field | Value |
|-------|-------|
| Extensions | `.mp3`, `.mp4`, `.wav`, `.ogg`, `.flac`, `.aac`, `.webm`, `.mkv`, `.mov`, `.m4a`, `.m4b`, `.m4v`, `.opus`, `.avi`, `.wmv`, `.flv`, `.wma` |
| MIME types | `audio/*`, `video/*` |
| Binary/Text | Binary |
| Common use | Music, podcasts, video files, screen recordings |

## Capabilities

### View
| Feature | Status | Details |
|---------|--------|---------|
| Audio playback | ✅ | Native browser `<audio>` with listening workspace, resume position, sleep timer, speed presets, and Media Session controls |
| Video playback | ✅ | Native browser `<video>` with watch/edit/export workspace |
| Waveform visualization | ✅ | Canvas-based listening and mixer surfaces for audio |
| ID3 tag display | ✅ | Title, artist, album, year, genre, track number |
| Album art | ✅ | Embedded cover art extracted and displayed |
| Playlist (folder mode) | ✅ | Auto-playlist when folder is loaded |
| Chapters | ✅ | Embedded ID3 chapters and small sidecar chapter files for audio |
| Non-native formats | ⚠️ Partial | ffmpeg.wasm can transcode AVI, WMV, FLV, WMA, and related formats when Advanced setting is enabled (~23 MB WASM) |
| Metadata | ✅ | Duration/dimensions via browser probe, MP3/WAV/MP4 byte metadata, and ID3 tags |
| Diff/compare | ❌ | Not applicable for binary media |

### Edit
| Feature | Status | Details |
|---------|--------|---------|
| Visual editor (Basic) | ✅ | Trim, volume, speed, downscale, screenshot, extract audio, mute, WebM conversion |
| Advanced editor | ✅ | Loudness normalize, GIF/WebP export, thumbnail strip, remove metadata, embed subtitles, concatenate, replace audio |
| Audio studio | ✅ | QC/loudness tools, chapter exports, EQ/fades, and mixer/listen surfaces |
| In-place conversion | ✅ | Chained ffmpeg.wasm operations update the preview while keeping the original file untouched |

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
| Project/settings export | ✅ | Media mixer settings export without embedding local media bytes |

## Example Files
- [`sample.mp3`](../examples/sample.mp3) — MP3 audio
- [`sample.mp4`](../examples/sample.mp4) — MP4 video

## Gaps / Planned Improvements
| Feature | Priority | Notes |
|---------|----------|-------|
| Subtitle/caption display | Medium | SRT/VTT files alongside video |
| MP4 chapter navigation | Medium | Chapter sidecar support exists for audio; video chapters are still limited |
| Thumbnail timeline | Low | Video scrub thumbnail strip |
| Batch transcode | Low | Multiple files at once |
