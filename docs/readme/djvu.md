# DjVu Document

> Scanned document format common in academic and digitised libraries — rendered page-by-page via DjVu.js.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.djvu`, `.djv` |
| MIME type | `image/vnd.djvu` |
| Binary / Text | Binary |
| Created by | AT&T Labs / LizardTech |
| Common use | Scanned documents, digitised books, academic papers |
| Spec / Docs | [DjVu.org](http://djvu.org/) |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Page rendering | ✅ | Rendered via DjVu.js (WASM/JS decoder) |
| Multi-page navigation | ✅ | Previous / next page controls |
| WASM warm-up | ⚠️ | First page may be slow while decoder initialises |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Any editing | ❌ | No editing capabilities |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known-File Enhancement

No known-file plugin.

## Real-World Examples

- [`sample.djvu`](../examples/sample.djvu) — multi-page scanned document demonstrating page navigation

## Known Limitations

- Large documents are slow on first open due to WASM decoder warm-up
- No text layer / OCR extraction — hidden text in DjVu is not exposed
- No thumbnail strip or page-jump input field

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Page-jump input | High | Easy | Number field to jump to a specific page |
| Thumbnail strip | Med | Med | Decode page thumbnails in background |
| Text layer extraction | Med | Hard | DjVu text chunks exist but require parser extension |
| Zoom control | Low | Easy | Scale page rendering up/down |
