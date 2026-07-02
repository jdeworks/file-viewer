# Comic Book Archive

> Comic archive reader for CBZ plus opt-in RAR/7z comics — renders ordered image pages as lazy blob images with a two-page spread toggle.

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
| Page rendering | ✅ | Ordered image pages rendered vertically with lazy-loaded blob URLs |
| Page count | ✅ | Header shows total page count |
| Two-page spread | ✅ | Spread toggle lays pages out in book mode on wider screens |
| CBZ (ZIP) support | ✅ | Fully supported |
| CBR (RAR) support | ⚠️ Partial | Requires Archive support / libarchive WASM opt-in |
| CB7 support | ⚠️ Partial | Requires Archive support / libarchive WASM opt-in |
| CBT support | ❌ | Tar comics are not currently opened by the comic reader path |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Any editing | ❌ | Read-only comic reader |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Download individual page | ❌ | Not wired in the current reader |

## Known-File Enhancement

No known-file plugin — all comic archives use the same reader.

## Real-World Examples

- [`sample.cbz`](../examples/sample.cbz) — ZIP-based comic demonstrating page navigation and thumbnail strip

## Known Limitations

- CBR/CB7 decompression depends on the opt-in archive WASM path; large archives may fail
- No thumbnail strip or jump-to-page control yet
- Reading direction is always left-to-right (no RTL mode for manga)

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| CBR full support | High | Hard | RAR support depends on the archive WASM path |
| Right-to-left (manga) mode | Med | Easy | Flip page order and navigation direction |
| Thumbnail / page picker | Med | Med | Generate small previews and jump controls |
| Bookmarks / reading position save | Low | Med | Persist last-read page in localStorage |
