# LRF — Sony Reader Format (BBeB)

> Sony's proprietary ebook format (Broadband eBook) — client-side reader with page navigation, extracted text/images, metadata, and clear DRM refusal.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.lrf`, `.lrx` |
| MIME type | `application/x-sony-bbeb` |
| Binary / Text | Binary |
| Created by | Sony |
| Common use | Sony Reader (PRS series) ebook files; largely superseded by EPUB |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Header metadata | ✅ | Title, author, book ID extracted from binary header |
| Page rendering | ✅ | BBeB object stream parsed into sanitized reader pages when unencrypted |
| Image rendering | ✅ | In-book image streams become blob URLs; no off-origin requests |
| Reader controls | ✅ | Page list, previous/next, keyboard navigation, font size, font family, theme |
| DRM refusal | ✅ | `.lrx` / DRM-protected books show a clear unsupported message |
| Metadata | ✅ | Version, screen size, title, author, publisher, language, pages, images, file size |

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

- DRM-protected `.lrx` files cannot be read
- Unsupported or malformed BBeB object streams may show a clear error instead of pages
- Layout fidelity is approximate; text/images are extracted into the shared ebook reader chrome
- LRF files are rarely encountered today; the format has been abandoned since ~2010

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Conversion recommendation | Med | Easy | Show a notice suggesting conversion to EPUB via Calibre |
| Layout fidelity | Low | Hard | Preserve more original Sony Reader positioning and typography |
| Broader BBeB coverage | Low | Hard | Handle more object/stream variants from real-world files |
