# HEIF / HEIC — High Efficiency Image Format

> Apple's default photo format — rendered natively in Safari/Chrome, with draw overlay, background removal, and format conversion.

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
| Image render | ✅ | Native browser support (Safari, Chrome 85+) |
| Firefox fallback | ⚠️ | Firefox lacks native HEIF; fallback message shown |
| Metadata extraction | ✅ | Width, height, EXIF data where available |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Draw overlay | ✅ | Pencil / eraser / text annotation tools |
| Magic background removal | ✅ | AI-powered subject isolation |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Convert to PNG | ✅ | Via canvas export |
| Convert to JPEG | ✅ | Via canvas export |
| Convert to WebP | ✅ | Via canvas export |
| Convert to AVIF | ✅ | Via canvas export (Chrome/Edge) |

## Known-File Enhancement

No known-file plugin.

## Real-World Examples

- [`sample.heic`](../examples/sample.heic) — iPhone photo demonstrating native render and PNG conversion

## Known Limitations

- Firefox users cannot view HEIF without a browser extension; a clear fallback message is shown
- HEIF image sequences (burst photos, live photos) are not navigable — only the primary image is shown
- HDR tone-mapping is handled by the browser; extended dynamic range is not explicitly communicated

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Firefox HEIF decode | High | Hard | Requires WASM HEIF decoder (e.g. libheif) |
| Burst / sequence navigation | Med | Hard | HEIF sequences require parsing multi-image containers |
| HDR metadata display | Low | Med | Surface HDR color space and peak luminance |
