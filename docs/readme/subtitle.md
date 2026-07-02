# Subtitles

> Timecoded cue list for SRT and WebVTT subtitle files — index, timestamps, and text displayed clearly.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.srt`, `.vtt` |
| MIME type | `text/vtt`, `application/x-subrip` |
| Binary / Text | Text |
| Common use | Video subtitles, closed captions, translated audio tracks |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Cue list | ✅ | Index, start → end timestamps, and cue text per entry |
| Multi-line cues | ✅ | Line breaks preserved in cue text |
| Both SRT and WebVTT | ✅ | Shared parser handles both formats |
| Total duration | ✅ | End time of last cue shown in header |
| Cue count | ✅ | Total cues shown in header |
| Source view | ✅ | Monaco editor (plaintext mode) |
| Text diff | ✅ | Standard line diff |
| Metadata | ✅ | Format, cue count, first cue, duration, spoken time |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Source editing | ✅ | Full Monaco editor |
| Save (Companion) | ✅ | Write-back to local file |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Convert SRT ↔ VTT | ✅ | Export menu serializes the parsed cue list as the other format |

## Real-World Examples

- [`sample.srt`](../examples/sample.srt) — example SubRip subtitle file

## Known Limitations

- Styling tags in VTT (e.g. `<b>`, `<i>`, `<c.color>`) are stripped for the plain cue preview
- ASS/SSA advanced subtitle format not supported
- MicroDVD/SubViewer `.sub` files are not detected by this type

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Inline video sync | Low | Hard | Play video alongside; jump to cue on click |
| Tag rendering | Low | Easy | Preserve or render `<b>`/`<i>` in VTT cues instead of stripping them |
| `.sub` support | Low | Med | Add MicroDVD/SubViewer parsing and detection |
