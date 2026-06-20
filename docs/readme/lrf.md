# LRF — Sony Reader Format (BBeB)

> Sony's proprietary ebook format (Broadband eBook) — basic metadata display only; no page rendering available.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.lrf` |
| MIME type | `application/x-sony-bbeb` |
| Binary / Text | Binary |
| Created by | Sony |
| Common use | Sony Reader (PRS series) ebook files; largely superseded by EPUB |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Header metadata | ✅ | Title, author, book ID extracted from binary header |
| Page rendering | ❌ | No BBeB parser available in JS/WASM |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Any editing | ❌ | Binary format; no editor |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known-File Enhancement

No known-file plugin.

## Real-World Examples

- [`sample.lrf`](../examples/sample.lrf) — Sony Reader ebook demonstrating header metadata extraction

## Known Limitations

- Only header-level metadata (title, author, book ID) can be read; no content rendering
- BBeB is a complex binary format with no maintained JS decoder
- LRF files are rarely encountered today; the format has been abandoned since ~2010

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Conversion recommendation | Med | Easy | Show a notice suggesting conversion to EPUB via Calibre |
| BBeB content parser | Low | Hard | No maintained JS implementation; would require porting a C library |
