# MIDI Sequence

> MIDI file viewer — format type, track listing with instrument assignments, BPM, time signature, note count, and duration.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.mid`, `.midi` |
| MIME type | `audio/midi` |
| Binary / Text | Binary |
| Common use | Music notation, DAW export, keyboard/synthesizer interchange |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| MIDI format | ✅ | Type 0 / 1 / 2 shown |
| Track count | ✅ | Declared tracks from header |
| PPQN | ✅ | Pulses per quarter note |
| BPM | ✅ | From tempo meta-events (range shown if variable) |
| Time signature | ✅ | From time signature meta-events |
| Duration | ✅ | Estimated total duration in seconds |
| Total notes | ✅ | NoteOn events across all tracks |
| Unique pitches | ✅ | Number of distinct MIDI pitches used |
| Track table | ✅ | Name, channel, GM instrument name, note count |
| GM instrument names | ✅ | Full 128-entry GM patch map |
| Source view | ❌ | Binary format |
| Diff | ❌ | Binary format |
| Metadata | ✅ | Format, tracks, BPM, time sig, total notes |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Editing | ❌ | Binary format — no in-browser MIDI editor |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known Limitations

- No audio playback (Web MIDI API / SoundFont required)
- SysEx and proprietary meta-events are not decoded

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| MIDI playback via WebAudio | Med | Hard | Requires SoundFont (~20 MB) |
| Piano roll visualization | Low | Hard | Render note events as SVG piano roll |
| Export note list as CSV | Low | Easy | Track/channel/pitch/velocity/tick to CSV |
