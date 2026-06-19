# Guitar Pro Tab

> Guitar Pro file inspector — track list with tunings, MIDI instruments, time signature, and tempo from GP4/GP5/GPX format files.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.gp4`, `.gp5`, `.gpx`, `.gp` |
| MIME type | `application/x-guitar-pro` |
| Binary / Text | Binary |
| Common use | Guitar tablature, drum patterns, bass lines, full band scores |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Track list | ✅ | Each track with name, instrument, tuning strings |
| MIDI instrument | ✅ | General MIDI program category shown |
| Tempo | ✅ | BPM extracted from file header |
| Time signature | ✅ | Numerator/denominator shown |
| GP4/GP5 binary | ✅ | Hand-rolled binary parser |
| GPX (XML container) | ✅ | XML-based GPX format parsed |
| Source view | ❌ | Binary format — no raw text view |
| Metadata | ✅ | Track count, tempo, time signature, instrument breakdown |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Tab editing | ❌ | Binary format — no in-app editing |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Export as MIDI | ❌ | Not yet implemented |

## Known Limitations

- Tab notation (fret positions, techniques) is not rendered
- Audio playback is not supported
- GP7 format not yet supported

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Tab notation rendering | Med | Hard | ASCII-art or canvas tablature rendering |
| MIDI export | Low | Hard | Full note event reconstruction |
| GP7 support | Low | Med | GP7 is ZIP-based XML; parseable with JSZip |
