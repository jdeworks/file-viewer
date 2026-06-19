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
| Compressed MXL | ✅ | MXL files extracted and parsed |
| Source view | ✅ | Monaco editor with XML syntax highlighting |
| Diff | ❌ | `diff: false` |
| Metadata | ✅ | Title, composer, part count, key, time, measures |

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

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Sheet music rendering | High | Hard | Requires OpenSheetMusicDisplay or VexFlow (~500 KB) |
| MIDI playback | Med | Hard | Requires MusicXML-to-MIDI converter + MIDI synth |
| Export to PDF | Low | Hard | Requires rendering first |
