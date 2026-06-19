# Ableton Live Set

> Ableton Live Set viewer — BPM, time signature, track listing with clip and plugin inventory.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.als` |
| MIME type | `application/octet-stream` |
| Binary / Text | Binary (gzip-compressed XML) |
| Common use | Ableton Live music production sessions |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| BPM | ✅ | From `Tempo Manual` or `Tempo Value` tag |
| Time signature | ✅ | Numerator / denominator shown |
| Track listing | ✅ | Audio, MIDI, Return, and Master tracks |
| Track types | ✅ | Colour-coded by Audio / MIDI / Return / Master |
| Clip inventory | ✅ | Clip names per track (up to 8 each) |
| Plugin list | ✅ | Unique plugin names across all tracks |
| Track/clip counts | ✅ | Summary stat cards at top |
| Gzip decompression | ✅ | Transparent; uses browser `DecompressionStream` |
| Source view | ❌ | Disabled (`rawView: false`) — binary gzip |
| Diff | ❌ | Disabled — binary format |
| Metadata | ✅ | BPM, time sig, track counts, clip count, plugins |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Source editing | ❌ | Binary gzip — not editable in Monaco |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known Limitations

- No audio waveform or MIDI piano-roll visualization
- Automation lanes and send/return routing are not shown
- Very large sessions may fail decompression due to browser memory limits

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Export track list as CSV | Low | Easy | Enumerate tracks/clips to CSV download |
| MIDI note preview | Low | Hard | Parse MIDI clips and draw mini piano roll |
