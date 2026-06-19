# ABC Music Notation

> ABC tune list viewer — parses tune headers (title, composer, key, meter, tempo) and displays structured tune cards.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.abc` |
| MIME type | `text/vnd.abc` |
| Binary / Text | Text |
| Common use | Traditional/folk music notation, songbooks, tune databases |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Tune list | ✅ | Each `X:` tune shown as a card |
| Header fields | ✅ | Title, Composer, Key, Meter, Tempo, Rhythm, Origin, Notes |
| Multi-tune files | ✅ | All tunes in a file shown separately |
| Source view | ✅ | Monaco editor (plaintext mode) |
| Text diff | ✅ | Standard line diff |
| Metadata | ✅ | Tune count, keys used, unique composers |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Source editing | ✅ | Full Monaco editor |
| Save (Companion) | ✅ | Write-back to local file |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Export as MIDI | ❌ | Not yet implemented |

## Known Limitations

- Music notation (staffs, notes) is not rendered — header inspection only
- Playback is not supported

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Sheet music rendering | High | Hard | Requires ABCJS or similar library (~300 KB) |
| MIDI playback | Med | Hard | Requires ABCJS with MIDI synth; significant size |
| Export as PDF score | Low | Hard | Requires rendering first |
