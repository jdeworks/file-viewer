# Hydrogen Drum Machine

> Hydrogen song and drumkit viewer — BPM, instrument list, pattern table with note counts.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.h2song`, `.h2drumkit` |
| MIME type | `text/xml` |
| Binary / Text | Text (XML) |
| Common use | Hydrogen open-source drum machine projects and drumkit definitions |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| File type detection | ✅ | Song vs Drumkit distinguished from root element |
| Song name & author | ✅ | From `<name>` and `<author>` tags |
| License | ✅ | `<license>` field shown |
| BPM | ✅ | `<bpm>` value extracted |
| Version | ✅ | `version` attribute on root element |
| Instrument list | ✅ | All instruments shown as chips (up to 16) |
| Instrument count | ✅ | Total instrument count |
| Pattern table | ✅ | Pattern name + note count (up to 10) |
| Source view | ✅ | Monaco editor (XML syntax highlighting) |
| Text diff | ✅ | Standard line diff |
| Metadata | ✅ | Format, name, author, BPM, instrument/pattern counts |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Source editing | ✅ | Monaco editor with XML highlighting |
| Save (Companion) | ✅ | Write-back to local file |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known Limitations

- No audio playback — pattern inspector only
- Note values (pitch, velocity) within patterns are not shown

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Pattern grid view | Low | Med | Show step-sequencer grid for each pattern |
| Export instrument list as CSV | Low | Easy | Instrument name / sample path table |
