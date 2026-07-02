# Adobe Premiere Pro Project

> Adobe Premiere project viewer — sequence count, clip count, media file count, frame rate, and project metadata.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.prproj` |
| MIME type | `application/octet-stream` |
| Binary / Text | Binary (gzip-compressed XML) |
| Common use | Adobe Premiere Pro video editing projects |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Sequence count | ✅ | Number of `<Sequence>` elements |
| Clip count | ✅ | `<ClipProjectItem>` elements |
| Media source count | ✅ | `<MediaSource>` references |
| Frame rate | ✅ | `<timebase><value>` shown as fps |
| Project name | ✅ | From `<Project>` inner text |
| Version | ✅ | `Version` attribute on `<PremiereData>` |
| Creation date | ✅ | `Created` attribute on `<PremiereData>` |
| Gzip decompression | ✅ | Transparent via browser `DecompressionStream` |
| Source view | ❌ | Disabled in the registered viewer, even though decompressed XML can be parsed |
| Diff | ❌ | Disabled — gzip/binary project format |
| Metadata | ⚠️ Partial | Format, version, sequence count, and clip count |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Source editing | ❌ | Binary gzip — not editable in Monaco |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known Limitations

- Effects, transitions, and colour grading data are not parsed
- Media file paths inside the project are not extracted
- Metadata side panel is narrower than the preview summary
- Very large projects may hit browser memory limits during decompression

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Media path list | Med | Med | Extract file paths from MediaSource elements |
| Export project summary as JSON | Low | Easy | Structured summary of sequences/clips/media |
| Sequence timeline overview | Low | Hard | Parse track layout and render text timeline |
