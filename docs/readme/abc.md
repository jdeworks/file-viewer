# ABC Music Notation

> ABC tune viewer — parses tune headers, renders sheet music with ABCJS, and can export rendered scores as PNG.

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
| Header fields | ✅ | Index, Title, Composer, Key, Meter, Tempo, Rhythm shown as card header/pills |
| Multi-tune files | ✅ | All tunes in a file shown separately |
| Sheet music rendering | ✅ | Lazy-loads ABCJS and renders visible tunes as SVG |
| Large tune sets | ✅ | Shows the first 30 tunes to keep the preview responsive |
| Source view | ✅ | Monaco editor (plaintext mode) |
| Text diff | ✅ | Standard line diff |
| Metadata | ✅ | Tune count plus first title, composer, key, and meter |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Source editing | ✅ | Full Monaco editor |
| Save (Companion) | ✅ | Write-back to local file |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Export rendered score as PNG | ✅ | Per-tune PNG button after notation renders |
| Export as MIDI | ❌ | Not yet implemented |

## Real-World Examples

- [`sample.abc`](../examples/sample.abc) — sample ABC tune file

## Known Limitations

- Score rendering depends on the bundled ABCJS vendor file loading successfully
- Only the first 30 tunes are rendered in very large ABC files
- Playback is not supported

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| MIDI playback | Med | Hard | Requires ABCJS with MIDI synth; significant size |
| Export as PDF score | Low | Hard | Can build on the rendered SVG path |
