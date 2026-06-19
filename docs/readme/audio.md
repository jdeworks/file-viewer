# Audio

> Native HTML5 audio playback for the most common audio formats — press play and the browser handles the rest.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.mp3`, `.ogg`, `.wav`, `.flac`, `.aac`, `.m4a`, `.opus`, `.wma` |
| MIME type | `audio/mpeg`, `audio/ogg`, `audio/wav`, `audio/flac`, `audio/aac`, `audio/mp4`, `audio/opus` |
| Binary / Text | Binary |
| Common use | Music, podcasts, voice recordings, sound effects |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Playback controls | ✅ | Native `<audio>` element — play, pause, seek, volume |
| Duration display | ✅ | Total length shown in the browser player |
| Format badge | ✅ | Extension shown in the file header |
| Source view | ❌ | Binary format — no raw text view |
| Diff | ❌ | Binary format not diffable |
| Waveform visualization | ❌ | Not implemented |
| ID3 / metadata display | ❌ | Tags not surfaced in UI |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Audio editing | ❌ | Read-only |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Format conversion | ❌ | Not implemented |

## Browser Format Support

Native playback depends on the browser's codec support. The following table reflects typical Chromium / Firefox / Safari support:

| Extension | Chromium | Firefox | Safari |
|-----------|----------|---------|--------|
| `.mp3` | ✅ | ✅ | ✅ |
| `.ogg` | ✅ | ✅ | ❌ |
| `.wav` | ✅ | ✅ | ✅ |
| `.flac` | ✅ | ✅ | ✅ |
| `.aac` | ✅ | ✅ | ✅ |
| `.m4a` | ✅ | ✅ | ✅ |
| `.opus` | ✅ | ✅ | ❌ |
| `.wma` | ❌ | ❌ | ❌ |

WMA files are not supported by any major browser without a plugin.

## Real-World Examples

- [`sample.mp3`](../examples/sample.mp3) — example MP3 audio clip
- [`sample.ogg`](../examples/sample.ogg) — example Ogg Vorbis clip

## Known Limitations

- WMA files will not play in any browser — download and use a local player instead
- Opus and Ogg are unsupported in Safari; use MP3 or AAC for cross-browser compatibility
- No metadata (title, artist, album art) is displayed from embedded ID3/Vorbis tags

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Waveform visualization | High | Med | Web Audio API + Canvas; scrub seek from waveform |
| ID3 / Vorbis tag display | Med | Med | `music-metadata` or `jsmediatags` for tag parsing |
| Metadata editor | Low | Hard | Write-back requires Companion server |
| Format conversion (e.g. WAV → MP3) | Low | Hard | Needs FFmpeg WASM (~30 MB) |
| Playlist / multi-file queue | Low | Med | Sequential playback across dropped files |
