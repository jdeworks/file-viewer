# Procreate Artwork (.procreate)

> iPad illustration files — composite image preview with metadata, draw overlay, background removal, and format export.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.procreate` |
| MIME type | `application/octet-stream` |
| Binary / Text | Binary (gzip-compressed plist + layer images) |
| Created by | Savage Interactive |
| Common use | Digital artwork and illustrations created on iPad with Apple Pencil |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Flattened composite image | ✅ | All layers merged into a single preview |
| Canvas metadata | ✅ | Canvas size, layer count, creation date |
| Individual layer access | ⚠️ | Layers not extracted (proprietary format) |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Draw overlay | ✅ | Pencil / eraser / text annotation on composite |
| Magic background removal | ✅ | AI-powered subject isolation |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Export as PNG | ✅ | Composite image via canvas |
| Export as JPEG | ✅ | Via canvas |
| Export as WebP | ✅ | Via canvas |
| Export as AVIF | ✅ | Via canvas (Chrome/Edge) |

## Known-File Enhancement

No known-file plugin — all `.procreate` files use the same composite viewer.

## Real-World Examples

- [`sample.procreate`](../examples/sample.procreate) — iPad illustration demonstrating composite display and export

## Known Limitations

- Individual layers are not accessible; only the merged composite is shown
- Layer blend modes are already baked into the composite (not re-composited in browser)
- Time-lapse video embedded in `.procreate` files is not played back

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Individual layer extraction | High | Hard | Procreate plist structure partially documented; layer images are LZO-compressed |
| Time-lapse playback | Med | Hard | Video frames stored in companion `.procreate` data; needs extraction |
| Blend mode re-compositing | Low | Hard | Requires full layer stack parser |
