# TIFF — Tagged Image File Format

> High-quality archival image format — native browser render with metadata display, draw overlay, and format conversion.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.tiff`, `.tif` |
| MIME type | `image/tiff` |
| Binary / Text | Binary |
| Created by | Aldus Corporation (now Adobe) |
| Common use | High-quality photography, print/prepress, GIS rasters, archival document scanning |
| Spec / Docs | [TIFF 6.0 spec](https://www.adobe.io/content/dam/udp/en/open/standards/tiff/TIFF6.pdf) |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Image render | ✅ | Native browser support (Safari, Chrome) |
| Multi-page TIFF | ⚠️ | First page only (browser limitation) |
| Metadata display | ✅ | Width, height, DPI, compression type, color space |

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

- [`sample.tiff`](../examples/sample.tiff) — high-resolution scan demonstrating metadata display and PNG conversion

## Known Limitations

- Multi-page TIFFs display only the first page; page navigation is not supported
- GeoTIFF coordinate reference system metadata is extracted but not visualised on a map
- 16-bit and 32-bit per-channel images are tone-mapped to 8-bit by the browser; full bit depth is not preserved in exports

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Multi-page TIFF navigation | High | Hard | Requires JS TIFF decoder (e.g. UTIF.js) to decode pages independently |
| GeoTIFF coordinate display | Med | Med | Parse GeoTIFF tags and show CRS + bounding box |
| 16-bit export | Low | Hard | Preserve bit depth in PNG export via WASM encoder |
