# E-book

> In-browser e-book reader for EPUB, comic archives, DjVu, and MOBI — chapter navigation, TOC, reading preferences, and position persistence.

## Format Details

| Format | Extensions | MIME type |
|--------|-----------|-----------|
| EPUB | `.epub` | `application/epub+zip` |
| Comic | `.cbz`, `.cbr`, `.cb7` | `application/vnd.comicbook+zip` |
| DjVu | `.djvu` | `image/vnd.djvu` |
| MOBI | `.mobi`, `.azw` | `application/x-mobipocket-ebook` |
| FB2 | `.fb2` | `application/x-fictionbook+xml` |

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
| Metadata | ✅ | Title, author, language, chapter count |

### View — Comic (CBZ/CBR)
| Capability | Status | Notes |
|------------|--------|-------|
| Page-by-page display | ✅ | Full-width image pages |
| Previous / Next page | ✅ | Keyboard and button navigation |
| Page count | ✅ | Shown in toolbar |

### View — DjVu / MOBI / FB2
| Capability | Status | Notes |
|------------|--------|-------|
| Basic rendering | ⚠️ Partial | Best-effort; some formats have limited support |

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

## Known Limitations

- DRM-protected books cannot be opened
- EPUB 3 media overlays (audio sync) not supported
- CBR (RAR-compressed comics) requires `enableArchiveWasm` setting

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Search within book | Med | Med | Full-text search across all chapters |
| Bookmarks | Low | Med | Save named positions across sessions |
| Annotations / highlights | Low | Hard | Store highlights in local persistence |
| Export chapter as HTML | Low | Easy | Download current chapter as self-contained HTML |
