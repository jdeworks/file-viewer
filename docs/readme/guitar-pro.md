# Guitar Pro Tab

> Guitar Pro file inspector — lightweight title/artist/album summary for GP3/GP4/GP5 binaries and GPX ZIP containers.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.gp3`, `.gp4`, `.gp5`, `.gpx`, `.gp` |
| MIME type | `application/x-guitar-pro` |
| Binary / Text | Binary |
| Common use | Guitar tablature, drum patterns, bass lines, full band scores |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Track list | ⚠️ | GPX parser lists up to 10 track names; GP3/GP4/GP5 track lists are not decoded |
| MIDI instrument | ❌ | MIDI programs are not extracted from current parser output |
| Tempo | ⚠️ | Extracted from GPX score XML when present; not decoded from GP3/GP4/GP5 binaries |
| Time signature | ❌ | Not currently extracted |
| GP3/GP4/GP5 binary | ⚠️ | Header string and title/artist/album fields only |
| GPX (ZIP/XML container) | ✅ | Reads `Content/score.gpif` / `score.gpif` and extracts summary fields |
| Source view | ❌ | Binary format — no raw text view |
| Metadata | ⚠️ | Side panel reports detected Guitar Pro format |

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
- GP7/GPX-style ZIPs are parsed only when a `score.gpif` file is present
- GP3/GP4/GP5 parser is intentionally shallow and does not reconstruct measures or notes

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Tab notation rendering | Med | Hard | ASCII-art or canvas tablature rendering |
| GP3/GP4/GP5 track parsing | Med | Hard | Decode track names, tunings, channels, measures, and notes |
| MIDI export | Low | Hard | Full note event reconstruction |
| GP7 support | Low | Med | GP7 is ZIP-based XML; parseable with JSZip |
