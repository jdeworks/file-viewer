# FITS Astronomy Image

> FITS file viewer — primary header keyword summary and full header-card table for astronomy files.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.fits`, `.fit`, `.fts` |
| MIME type | `image/fits` |
| Binary / Text | Binary |
| Common use | Astronomical images, spectra, data cubes from telescopes and observatories |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Header keywords | ✅ | Interesting FITS header cards and a full collapsed card table |
| HDU list | ❌ | Only the first header block is parsed |
| Image rendering | ❌ | Pixel data is not decoded or rendered |
| Stretch controls | ❌ | No image canvas is available yet |
| Colormap | ❌ | No image canvas is available yet |
| Metadata | ✅ | NAXIS dimensions, BITPIX, EXPTIME, OBJECT, INSTRUME |
| Source view | ✅ | Raw text/binary view available through the raw pane |
| Diff | ❌ | Binary format |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Image editing | ❌ | Read-only FITS renderer |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Export rendered image as PNG | ❌ | Not available because pixel data is not rendered |

## Real-World Examples

- [`sample.fits`](../examples/sample.fits) — example FITS image

## Known Limitations

- Data cubes and 2D images are not rendered; only header metadata is shown
- Extension HDUs and binary tables are not parsed
- Only the initial header area is scanned

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| 2D image canvas | High | Med | Decode BITPIX data into a canvas before adding stretch/colormap controls |
| Export canvas as PNG | Med | Easy | After image rendering exists, use `canvas.toBlob('image/png')` |
| Binary table HDU viewer | Med | Med | Parse FITS binary table extension |
| WCS coordinate overlay | Low | Hard | Map pixel coordinates to RA/Dec |
