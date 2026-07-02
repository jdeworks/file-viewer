# TIFF — Tagged Image File Format

> High-quality archival image format — decoded with the vendored UTIF library, handed into the editable image editor, with structural metadata and format conversion.

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
| Image render | ✅ | Vendored UTIF decoder converts the first image to PNG for the main image editor |
| Multi-page TIFF | ⚠️ | First page/sub-image only |
| Metadata display | ✅ | Format, byte order, dimensions, bits per sample, compression, photometric interpretation, samples per pixel, first IFD offset |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Draw overlay | ✅ | Pencil / eraser / text annotation tools |
| Selection and background tools | ✅ | Uses the shared image editor selection/background-removal tooling |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Convert to PNG | ✅ | Decoded/editor canvas export |
| Convert to JPEG | ✅ | Decoded/editor canvas export |
| Convert to WebP | ✅ | Decoded/editor canvas export |
| Convert to AVIF | ✅ | Decoded/editor canvas export where supported by the browser |

## Known-File Enhancement

No known-file plugin.

## Real-World Examples

- [`sample.tiff`](../examples/sample.tiff) — CC0 flower sample converted to TIFF; vendored UTIF decodes it into the editable image editor

## Known Limitations

- Multi-page TIFFs display only the first page; page navigation is not supported
- GeoTIFF coordinate reference system tags are not parsed yet
- Edits are exported as PNG/JPEG/WebP/AVIF; the app does not re-encode edited TIFF files
- The editor path works on decoded 8-bit RGBA pixels; original bit depth is not preserved in exports

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Multi-page TIFF navigation | High | Med | UTIF is present; add page selection and per-page decode UI |
| GeoTIFF coordinate display | Med | Med | Parse GeoTIFF tags and show CRS + bounding box |
| TIFF re-encode | Low | Hard | Preserve TIFF output and bit depth via encoder/WASM path |
