# HEIF / HEIC — High Efficiency Image Format

> Apple's default photo format — decoded locally with vendored libheif, primary image preview, multi-image thumbnails, and PNG export.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.heif`, `.heic` |
| MIME type | `image/heif` |
| Binary / Text | Binary |
| Created by | MPEG / Nokia |
| Common use | iPhone photos (`.heic`); efficient compression (~half the size of JPEG at equivalent quality); HDR support |
| Spec / Docs | [ISO/IEC 23008-12](https://www.iso.org/standard/66067.html) |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Image render | ✅ | Decoded in-browser with vendored `libheif.js` |
| Multi-image files | ✅ | Thumbnail strip for additional images when present |
| Metadata extraction | ⚠️ | Brand/container metadata plus decoded width/height in preview; EXIF/GPS not extracted |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Draw overlay | ❌ | Not wired for this HEIF-specific renderer |
| Magic background removal | ❌ | Not wired for this HEIF-specific renderer |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Download as PNG | ✅ | Primary decoded canvas only |
| Convert to JPEG | ❌ | Not exposed in current HEIF renderer |
| Convert to WebP | ❌ | Not exposed in current HEIF renderer |
| Convert to AVIF | ❌ | Not exposed in current HEIF renderer |

## Known-File Enhancement

No known-file plugin.

## Real-World Examples

- [`sample.heic`](../examples/sample.heic) — iPhone photo demonstrating native render and PNG conversion

## Known Limitations

- HEIF decode depends on the vendored libheif runtime loading successfully
- HDR tone-mapping is handled by the browser; extended dynamic range is not explicitly communicated
- EXIF/GPS metadata is not extracted

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| JPEG/WebP export | Med | Easy | Reuse canvas export with explicit format buttons |
| HDR metadata display | Low | Med | Surface HDR color space and peak luminance |
| EXIF/GPS metadata | Low | Med | Parse metadata boxes from the HEIF container |
