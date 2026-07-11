# Comic Book Archive

> Comic archive reader for CBZ plus opt-in RAR/7z/Tar comics — extracts ordered image pages on demand with a bounded blob cache and a two-page spread toggle.

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
| Page rendering | ✅ | The first 3 pages load immediately; later pages are extracted as they approach the scroll viewport |
| Page count | ✅ | Header shows total page count |
| Two-page spread | ✅ | Spread toggle lays pages out in book mode on wider screens |
| CBZ (ZIP) support | ✅ | ZIP directory is indexed up front; page payloads are decompressed individually on demand |
| CBR (RAR) support | ⚠️ Partial | Requires Archive support / libarchive WASM opt-in |
| CB7 support | ⚠️ Partial | Requires Archive support / libarchive WASM opt-in |
| CBT support | ⚠️ Partial | Requires Archive support / libarchive WASM opt-in (libarchive.js handles tar natively) |

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

- [`sample.cbz`](../examples/sample.cbz) — ZIP-based comic demonstrating page navigation

## Known Limitations

- CBR/CB7/CBT decompression depends on the opt-in archive WASM path; large archives may fail
- The reader displays at most 2,000 pages, blocks individual expanded page files above 64 MB, runs at most 2 page extractions concurrently, and keeps at most 8 page blob URLs / 192 MB active at once. The header discloses when a limit applies.
- Distant pages can be released and extracted again when revisited; this bounds memory at the cost of occasional repeat decompression
- No thumbnail strip or jump-to-page control yet
- Reading direction is always left-to-right (no RTL mode for manga)

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| CBR/CBT full support without opt-in | High | Hard | RAR/tar support depends on the archive WASM path |
| Right-to-left (manga) mode | Med | Easy | Flip page order and navigation direction |
| Thumbnail / page picker | Med | Med | Generate small previews and jump controls |
| Bookmarks / reading position save | Low | Med | Persist last-read page in localStorage |
