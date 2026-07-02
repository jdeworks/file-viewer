# Procreate Artwork (.procreate)

> iPad illustration files — ZIP thumbnail preview with basic archive metadata.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.procreate` |
| MIME type | `application/octet-stream` |
| Binary / Text | Binary (ZIP archive) |
| Created by | Savage Interactive |
| Common use | Digital artwork and illustrations created on iPad with Apple Pencil |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Thumbnail preview | ✅ | Reads `thumbnail.png`, `QuickLook/Thumbnail.png`, or matching archive thumbnail |
| Archive metadata | ✅ | Entry count, thumbnail presence, `Document.archive` presence |
| Flattened composite image | ❌ | Full canvas composite is not decoded |
| Canvas metadata | ❌ | Canvas size/layer count/creation date are not parsed |
| Individual layer access | ❌ | Layers not extracted |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Draw overlay | ❌ | Procreate preview is read-only |
| Magic background removal | ❌ | Not available for Procreate thumbnails |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Export as PNG/JPEG/WebP/AVIF | ❌ | No image export actions are registered for Procreate previews |

## Known-File Enhancement

No known-file plugin — all `.procreate` files use the same thumbnail preview.

## Real-World Examples

- [`sample.procreate`](../examples/sample.procreate) — Procreate archive demonstrating thumbnail preview and metadata

## Known Limitations

- Individual layers and full merged canvas are not accessible; only the stored thumbnail is shown
- Layer blend modes are not re-composited in browser
- Time-lapse video embedded in `.procreate` files is not played back

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Composite image extraction | High | Hard | Decode Procreate document/layer data and render a full canvas |
| Individual layer extraction | High | Hard | Procreate plist structure partially documented; layer images are LZO-compressed |
| Time-lapse playback | Med | Hard | Video frames stored in companion `.procreate` data; needs extraction |
| Blend mode re-compositing | Low | Hard | Requires full layer stack parser |
