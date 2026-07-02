# LMMS Project

> LMMS music project viewer — BPM, time signature, global settings, track counts, and instrument track names.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.mmp`, `.mmpz` |
| MIME type | `application/octet-stream` |
| Binary / Text | Text XML (`.mmp`) or gzip-compressed XML (`.mmpz`) |
| Common use | LMMS open-source music production software |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| BPM | ✅ | From `head` element `bpm` attribute |
| Time signature | ✅ | Numerator / denominator |
| Master volume | ✅ | Global `mastervol` setting |
| Master pitch | ✅ | Global `masterpit` setting |
| Track counts | ✅ | Instrument, beat+bassline, sample, and automation track counts |
| Instrument track names | ✅ | Track names for instrument tracks, up to 20 |
| Pattern count | ❌ | Pattern elements are not counted yet |
| LMMS version | ✅ | `version` attribute from root |
| Gzip decompression | ✅ | Transparent decompression of `.mmpz` |
| Source view | ❌ | Compressed binary |
| Diff | ❌ | Binary format |
| Metadata | ✅ | Side panel reports format, BPM, song name, signature, track counts, and LMMS version |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Editing | ❌ | Binary compressed XML |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known Limitations

- No audio playback
- Beat+bassline step sequencer data is not visualized
- Pattern counts and master pitch are not extracted yet

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Step sequencer grid | Low | Med | Parse BB tracks into a step grid view |
| Pattern count | Low | Easy | Count pattern elements in song tracks |
| Export track list as CSV | Low | Easy | Track name / instrument to CSV |
