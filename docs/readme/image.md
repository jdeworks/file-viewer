# Image

> Raster and vector image formats with rich in-browser preview, drawing tools, and multi-format export.

## Format Details
| Field | Value |
|-------|-------|
| Extensions | `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.avif`, `.svg`, `.bmp`, `.ico`, `.heic`, `.heif`, `.tiff`, `.tif`, `.jxl` |
| MIME types | `image/png`, `image/jpeg`, `image/gif`, `image/webp`, `image/avif`, `image/svg+xml`, etc. |
| Binary/Text | Binary (SVG is XML text) |
| Common use | Photos, graphics, icons, diagrams, screenshots |

## Capabilities

### View
| Feature | Status | Details |
|---------|--------|---------|
| Rich preview | ✅ | Fit-to-screen with zoom (fit / 100% / ± buttons) |
| SVG preview | ✅ | DOMPurify-sanitized, rendered in sandboxed iframe |
| EXIF / metadata | ✅ | Date, camera, GPS, dimensions, color space |
| ASCII art mode | ✅ | Convert to ASCII/block/braille art; mono or ANSI color |
| HEIF/HEIC | ✅ | via vendored libheif.wasm |
| TIFF | ⚠️ Partial | First page only via libheif; multi-page not supported |
| JPEG XL | ⚠️ Partial | Detected, metadata shown; browser decoding varies |
| Diff/compare | ❌ | Pixel-level diff not implemented |

### Edit
| Feature | Status | Details |
|---------|--------|---------|
| Text overlay | ✅ | Add watermark/caption with font, size, color picker |
| Draw (pencil/eraser) | ✅ | Brush size + color picker, per-stroke undo |
| Background removal | ✅ | "✂ BG" button — click to sample color, flood-fill to transparent, tolerance slider; always exports as PNG |
| Undo | ✅ | Per-action undo stack for text and draw operations |
| Export format selector | ✅ | Choose PNG / JPEG / WebP / AVIF before editing |
| Crop / resize | ❌ | Not yet implemented |
| Color adjust (brightness/contrast) | ❌ | Not yet implemented |
| Magic wand selection | ❌ | Global color-range select (not just flood-fill) not yet implemented |

### Export
| Feature | Status | Details |
|---------|--------|---------|
| Download original | ✅ | Always available |
| Export as PNG | ✅ | Canvas API, lossless |
| Export as JPEG | ✅ | 92% quality, white background for alpha images |
| Export as WebP | ✅ | 92% quality, Chrome/Firefox/Safari |
| Export as AVIF | ✅ | 80% quality, Chrome 85+ / Safari 16+ |
| Export as SVG (original) | ✅ | Only for SVG files |

## Example Files
- [`sample.png`](../examples/sample.png) — PNG with transparency
- [`sample.jpg`](../examples/sample.jpg) — JPEG photograph
- [`sample.webp`](../examples/sample.webp) — WebP format
- [`example.svg`](../examples/example.svg) — SVG vector graphic
- [`sample.gif`](../examples/sample.gif) — Animated GIF

## Gaps / Planned Improvements
| Feature | Priority | Notes |
|---------|----------|-------|
| Crop tool | High | Canvas crop rectangle + download |
| Resize (px / %) | High | Canvas resize with bilinear filtering |
| Pixel-level diff | Medium | Highlight changed pixels between two images |
| Color adjustments | Medium | Brightness, contrast, saturation via canvas filter API |
| Multi-page TIFF | Medium | Need separate TIFF decoder |
| JPEG XL decode | Low | Waiting for native browser support (Chrome flag exists) |
| Layer support | Low | Multiple draw layers; complex |
