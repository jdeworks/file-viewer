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
| SVG preview | ✅ | DOMParser/XMLSerializer sanitizer strips scripts and event handlers before sandboxed iframe rendering |
| EXIF / metadata | ✅ | Date, camera, GPS, dimensions, color space |
| ASCII art mode | ✅ | Convert to ASCII/block/braille art; mono or ANSI color |
| Animated GIF | ✅ | Multi-frame GIFs get play/pause, scrubber, and frame-split tools |
| HEIF/HEIC | ✅ | Dedicated HEIF renderer uses vendored libheif.js |
| TIFF | ✅ | Dedicated TIFF renderer decodes supported files with vendored UTIF and hands the result to the image editor |
| JPEG XL | ⚠️ Partial | Lazy JavaScript decoder attempts preview; download still works when decode fails |
| In-editor compare | ✅ | Edited raster images can compare original vs current with split, overlay, and diff-highlight modes |
| Type-level diff | ❌ | Global two-file image diff is not implemented |

### Edit
| Feature | Status | Details |
|---------|--------|---------|
| Text overlay | ✅ | Add watermark/caption with font, size, color picker |
| Draw (pencil/eraser) | ✅ | Brush size + color picker, per-stroke undo |
| Background removal | ✅ | "✂ BG" button — click to sample color, flood-fill to transparent, tolerance slider; always exports as PNG |
| Undo | ✅ | Per-action undo stack for text and draw operations |
| Export format selector | ✅ | Choose PNG / JPEG / WebP / AVIF before editing |
| Crop / resize | ✅ | Crop, resize, expand canvas, rotate, and flip tools are available for editable raster images |
| Color adjust | ✅ | Brightness, contrast, saturation, hue, levels, curves, presets, and convolution filters |
| Magic wand selection | ✅ | Selection tools include wand/marquee/ellipse/lasso plus cut/invert/move actions |

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
| Pixel-level diff | Medium | Highlight changed pixels between two images |
| Batch export / presets | Medium | Save repeatable image-edit presets or export multiple formats at once |
| Multi-page TIFF polish | Medium | Dedicated TIFF path exists; broader TIFF feature coverage remains open |
| JPEG XL decode | Low | Waiting for native browser support (Chrome flag exists) |
| Layer support | Low | Multiple draw layers; complex |
