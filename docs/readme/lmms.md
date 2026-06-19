# LMMS Project

> LMMS music project viewer — BPM, time signature, track list, instrument plugins, and beat+bassline patterns.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.mmp`, `.mmpz` |
| MIME type | `application/octet-stream` |
| Binary / Text | Binary (gzip-compressed XML) |
| Common use | LMMS open-source music production software |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| BPM | ✅ | From `head` element `bpm` attribute |
| Time signature | ✅ | Numerator / denominator |
| Master volume / pitch | ✅ | Global settings |
| Track list | ✅ | BB / song / automation / sample tracks |
| Instrument names | ✅ | Plugin names from each track |
| Pattern count | ✅ | Total patterns across tracks |
| LMMS version | ✅ | `version` attribute from root |
| Gzip decompression | ✅ | Transparent decompression of `.mmpz` |
| Source view | ❌ | Compressed binary |
| Diff | ❌ | Binary format |
| Metadata | ✅ | BPM, track count, instrument names, version |

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

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Step sequencer grid | Low | Med | Parse BB tracks into a step grid view |
| Export track list as CSV | Low | Easy | Track name / instrument to CSV |
