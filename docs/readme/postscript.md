# PostScript / EPS

> PostScript and EPS metadata viewer — DSC comment header extraction, bounding box, page count, fonts, creator, and format version.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.ps`, `.eps`, `.epsf` |
| MIME type | `application/postscript` |
| Binary / Text | Text |
| Common use | Vector graphics, print-ready artwork, legacy illustration files |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| DSC header extraction | ✅ | `%%Title`, `%%Creator`, `%%CreationDate`, `%%For` shown |
| Bounding box | ✅ | `%%BoundingBox` and `%%HiResBoundingBox` shown with dimensions |
| Page count | ✅ | `%%Pages` extracted |
| Orientation | ✅ | Portrait / Landscape from `%%Orientation` |
| Document fonts | ✅ | `%%DocumentFonts` listed |
| Format type | ✅ | PostScript / EPS / DSC distinguished by first comment |
| Language level | ✅ | PostScript level (1/2/3) shown |
| Source view | ✅ | Monaco editor (plaintext mode) |
| Text diff | ✅ | Standard line diff |
| Metadata | ✅ | Format, pages, bounding box, fonts, creator |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Source editing | ✅ | Full Monaco editor |
| Save (Companion) | ✅ | Write-back to local file |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Convert to PDF | ❌ | Requires Ghostscript — not available in-browser |
| Convert to SVG | ❌ | Not yet implemented |

## Known Limitations

- PostScript execution is not possible in-browser — visual rendering is not available
- Only DSC-compliant files have parseable metadata; raw PS files show minimal info

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Canvas rendering via WASM GS | Low | Hard | Ghostscript compiled to WASM is ~20 MB |
| SVG conversion | Low | Hard | Requires intermediate Ghostscript conversion |
