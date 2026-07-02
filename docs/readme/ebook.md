# E-book

> In-browser e-book and scanned-document readers for EPUB, FB2, MOBI/AZW, Sony LRF, comics, and DjVu — with format-specific navigation, reading preferences, and sanitized local rendering.

## Format Details

| Format | Extensions | MIME type |
|--------|-----------|-----------|
| EPUB | `.epub` | `application/epub+zip` |
| Comic | `.cbz`, `.cbr`, `.cb7`, `.cbt` | `application/vnd.comicbook+zip` |
| DjVu | `.djvu`, `.djv` | `image/vnd.djvu` |
| MOBI | `.mobi`, `.azw` | `application/x-mobipocket-ebook` |
| FB2 | `.fb2` | `application/x-fictionbook+xml` |
| Sony LRF | `.lrf`, `.lrx` | `application/x-sony-bbeb` |

## Capabilities Matrix

### View — EPUB
| Capability | Status | Notes |
|------------|--------|-------|
| Chapter rendering | ✅ | One spine item at a time; XHTML sanitized via DOMPurify |
| Embedded images | ✅ | All resources rewritten to `blob:` URLs — zero off-origin requests |
| Table of contents | ✅ | NCX / Navigation document parsed; sidebar TOC |
| Previous / Next navigation | ✅ | Toolbar buttons + keyboard arrows |
| Reading position persistence | ✅ | Chapter + scroll position saved per book via fingerprint |
| Font size controls | ✅ | A+ / A− buttons |
| Font family | ✅ | Serif / Sans toggle |
| Theme | ✅ | Light / Sepia / Dark |
| Column layout | ✅ | 1 or 2 columns |
| Metadata | ✅ | Title, author, chapters, TOC count, language, publisher/date/identifier/rights when present |

### View — Comic (CBZ/CBR/CB7)
| Capability | Status | Notes |
|------------|--------|-------|
| Continuous page display | ✅ | Lazy-loaded full-width image pages in vertical scroll |
| Spread mode | ✅ | Optional two-page spread layout on wide screens |
| Page count | ✅ | Shown in toolbar and metadata |
| CBR / CB7 / CBT | ⚠️ | Opens through archive WASM only when `enableArchiveWasm` is enabled |

### View — DjVu / MOBI / FB2 / LRF
| Capability | Status | Notes |
|------------|--------|-------|
| DjVu rendering | ✅ | DjVu.js page rendering with previous/next, zoom, arrow-key navigation, and text-layer toggle when available |
| MOBI / AZW rendering | ⚠️ | Parses unencrypted PalmDOC-style MOBI/AZW, rewrites embedded images, and shows a clear note for DRM or HUFF/CDIC compression |
| FB2 rendering | ✅ | XML book body converted to sanitized reading HTML with embedded binary images inlined as data URLs |
| Sony LRF rendering | ⚠️ | Unprotected `.lrf` books render page-by-page with EPUB-style controls; DRM `.lrx` is refused |
| Reader preferences | ✅ | Font size/family/theme for EPUB/LRF and size/font/theme/line/margin controls for MOBI/FB2 |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Book editing | ❌ | Read-only viewer |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Extract chapter as HTML | ❌ | Not yet implemented |

## Real-World Examples

- [`sample.epub`](../examples/sample.epub) — example EPUB book
- [`sample.fb2`](../examples/sample.fb2) — FictionBook XML book
- [`sample.mobi`](../examples/sample.mobi) — MOBI/Kindle-style book
- [`sample.lrf`](../examples/sample.lrf) — Sony LRF book
- [`sample.djvu`](../examples/sample.djvu) — scanned DjVu document
- [`sample.cbz`](../examples/sample.cbz) — comic archive

## Known Limitations

- DRM-protected books cannot be opened
- EPUB 3 media overlays (audio sync) not supported
- CBR (RAR-compressed comics) requires `enableArchiveWasm` setting
- MOBI HUFF/CDIC compression and protected books are reported but not decoded
- Comic archives do not expose individual page downloads yet

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Search within book | Med | Med | Full-text search across all chapters |
| Bookmarks | Low | Med | Save named positions across sessions |
| Annotations / highlights | Low | Hard | Store highlights in local persistence |
| Export chapter as HTML | Low | Easy | Download current chapter as self-contained HTML |
| Page export for comics/DjVu | Low | Med | Save selected rendered pages as images |
