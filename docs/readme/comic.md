# Comic Book Archive

> Page-by-page comic reader for CBZ/CBR archives — keyboard navigation, fit modes, and thumbnail strip.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.cbz`, `.cbr`, `.cb7`, `.cbt` |
| MIME type | `application/vnd.comicbook+zip` (CBZ); `application/vnd.comicbook-rar` (CBR) |
| Binary / Text | Binary (archive of ordered images) |
| Created by | Community standard |
| Common use | Digital comics, manga, scanned book pages |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Page-by-page navigation | ✅ | Arrow keys, Space, on-screen buttons |
| Thumbnail strip | ✅ | Page thumbnails for quick jump |
| Fit-to-width / fit-to-height | ✅ | Toggle between fit modes |
| CBZ (ZIP) support | ✅ | Fully supported |
| CBR (RAR) support | ⚠️ Partial | Requires unrar.js; may not load in all browsers |
| CB7 / CBT support | ⚠️ Partial | 7-zip and tar archives; best-effort extraction |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Any editing | ❌ | Read-only comic reader |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Download individual page | ✅ | Current page saved as image |

## Known-File Enhancement

No known-file plugin — all comic archives use the same reader.

## Real-World Examples

- [`sample.cbz`](../examples/sample.cbz) — ZIP-based comic demonstrating page navigation and thumbnail strip

## Known Limitations

- CBR (RAR) decompression depends on unrar.js availability; large RAR files may fail
- No double-page spread mode for wide landscape pages
- Reading direction is always left-to-right (no RTL mode for manga)

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| CBR full support | High | Hard | Native RAR decompression requires WASM unrar |
| Right-to-left (manga) mode | Med | Easy | Flip page order and navigation direction |
| Double-page spread view | Med | Med | Show two pages side-by-side |
| Bookmarks / reading position save | Low | Med | Persist last-read page in localStorage |
