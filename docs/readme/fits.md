# FITS Astronomy Image

> FITS file viewer — HDU list, header keyword table, image rendering with stretch and colormap controls.

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
| Header keywords | ✅ | All FITS header cards shown (BITPIX, NAXIS, EXPTIME, OBJECT, etc.) |
| HDU list | ✅ | Primary and extension HDUs listed |
| Image rendering | ✅ | 2D image data rendered to canvas |
| Stretch controls | ✅ | Linear / sqrt / log / histogram-equalization stretch |
| Colormap | ✅ | Grayscale / heat / cool / rainbow colormaps |
| Metadata | ✅ | NAXIS dimensions, BITPIX, EXPTIME, OBJECT, INSTRUME |
| Source view | ✅ | Monaco editor (plaintext for text-header portion) |
| Diff | ❌ | Binary format |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Image editing | ❌ | Read-only FITS renderer |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Export rendered image as PNG | ❌ | Not yet wired |

## Real-World Examples

- [`sample.fits`](../examples/sample.fits) — example FITS image

## Known Limitations

- Data cubes (NAXIS=3) show only the first 2D slice
- Non-image HDUs (binary tables) are not rendered

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Export canvas as PNG | Med | Easy | `canvas.toBlob('image/png')` |
| Binary table HDU viewer | Med | Med | Parse FITS binary table extension |
| WCS coordinate overlay | Low | Hard | Map pixel coordinates to RA/Dec |
