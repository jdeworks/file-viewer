# Audio

> Audio playback and listening workspace for common browser-playable formats, with waveform-style navigation, ID3 metadata, chapters, playlist support, and optional FFmpeg-powered editing/export tools.

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
| Playback controls | ✅ | Native media element plus viewer controls for play, pause, seek, and volume |
| Duration display | ✅ | Current time and total duration shown when browser metadata is available |
| Format badge | ✅ | Extension shown in the file header |
| Listen workspace | ✅ | Waveform/lane surface with seek cursor, trim region, and chapter markers |
| Chapters | ✅ | Embedded ID3 chapters and supported sidecar chapter files are normalized when present |
| Cover art | ✅ | Embedded ID3 cover art is shown when present |
| ID3 / metadata display | ✅ | Title, artist, album, year, track, genre, duration, and container facts where available |
| Playlist navigation | ✅ | Sibling media files in an opened folder can be queued/navigated |
| Sleep timer / resume | ✅ | Playback extras persist position and support long-form listening helpers |
| Transcode hint | ✅ | Unsupported/awkward formats show a conversion hint |
| Source view | ❌ | Binary format — no raw text view |
| Diff | ❌ | Binary format not diffable |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Trim / export panel | ✅ | Available when Media transcoding is enabled in Settings |
| EQ / fades / listen edits | ✅ | In-browser listen surface supports non-destructive settings/export workflows |
| Direct tag editing | ❌ | Embedded metadata write-back is not implemented |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Processed audio export | ✅ | Available when FFmpeg support is enabled |
| Format conversion | ✅ | Optional FFmpeg path; requires first-use WASM download/cache |

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

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Media transcoding | Off | Enables FFmpeg-powered conversion, trim, export, and some editor tools after a large first-use WASM download |

## Real-World Examples

- [`sample.mp3`](../examples/sample.mp3) — example MP3 audio clip
- [`sample.ogg`](../examples/sample.ogg) — example Ogg Vorbis clip
- [`sample.wav`](../examples/sample.wav) — example WAV clip
- [`sample.flac`](../examples/sample.flac) — example FLAC clip
- [`sample.m4a`](../examples/sample.m4a) — example M4A clip
- [`sample.aac`](../examples/sample.aac) — example AAC clip

## Known Limitations

- WMA files will not play in any browser — download and use a local player instead
- Opus and Ogg are unsupported in Safari; use MP3 or AAC for cross-browser compatibility
- FFmpeg-based tools are intentionally opt-in because the WASM payload is large
- Embedded metadata is read-only; title/artist/cover edits are not written back

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Vorbis/MP4 tag parity | Med | Med | ID3 is surfaced; other tag families need broader parsers |
| Metadata editor | Low | Hard | Write-back requires safe container-specific tag writers |
| Smaller transcoding path | Low | Hard | Current FFmpeg option is powerful but heavy |
| Playlist persistence | Low | Med | Preserve queue state across folder reloads |
