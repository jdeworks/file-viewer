# MusicXML Score

> MusicXML score inspector — title, composer, parts, key, time signature, and measure count from both MusicXML and compressed MXL files.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.musicxml`, `.mxl`, `.xml` |
| MIME type | `application/vnd.recordare.musicxml+xml` |
| Binary / Text | Text (XML) or compressed (MXL) |
| Common use | Music notation exchange between Sibelius, Finale, MuseScore, and other notation software |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Score metadata | ✅ | Title, movement, composer, lyricist shown |
| Part list | ✅ | Each instrument/voice shown with abbreviation |
| Key and time signature | ✅ | Key decoded (C major, G major, etc.); time signature |
| Measure count | ✅ | Total measures per part |
| Compressed MXL | ✅ | MXL ZIP container is opened and the referenced XML score is parsed for preview |
| Source view | ◐ | Monaco XML source for text `.musicxml`/MusicXML-flavored `.xml`; compressed `.mxl` is binary |
| Diff | ❌ | `diff: false` |
| Metadata | ✅ | Text MusicXML side panel shows title, composer, lyricist, instruments, measures, key/time/tempo, and copyright |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Source editing | ✅ | Full Monaco editor |
| Save (Companion) | ✅ | Write-back to local file |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known Limitations

- Score rendering (staff notation) is not implemented
- Audio playback is not supported
- Side-panel metadata does not currently extract compressed `.mxl` before parsing

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Sheet music rendering | High | Hard | Requires OpenSheetMusicDisplay or VexFlow (~500 KB) |
| MXL metadata extraction | Med | Easy | Reuse the renderer's ZIP extraction path in metadata |
| MIDI playback | Med | Hard | Requires MusicXML-to-MIDI converter + MIDI synth |
| Export to PDF | Low | Hard | Requires rendering first |
