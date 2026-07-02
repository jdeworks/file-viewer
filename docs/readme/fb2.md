# FictionBook 2 (.fb2)

> XML-based ebook format popular in Russia and Eastern Europe — sanitized reader view with inline images, source editing, and XML metadata.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.fb2` |
| MIME type | `application/x-fictionbook+xml` |
| Binary / Text | Text (XML) |
| Created by | Dmitry Gribov |
| Common use | Ebooks; widely used in Russian and Eastern European digital book ecosystems |
| Spec / Docs | [FictionBook wiki](http://www.fictionbook.org/index.php/Eng:FictionBook) |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Rendered ebook content | ✅ | Sections, titles, paragraphs, epigraphs, poems, tables, and inline formatting |
| Inline images | ✅ | Base64-encoded `<binary>` images are converted to inlined data URLs |
| Reader controls | ✅ | CSS-only size, font, theme, line-height, and page-width controls |
| Sanitization | ✅ | DOMPurify strips scripts/styles/event handlers before preview |
| Source view / diff | ✅ | XML source and text diff are available |
| Metadata panel | ✅ | Title, author, language, section count, image count, genres, date, sequence |
| Table of contents | ❌ | No navigation sidebar or generated TOC |
| Cover image extraction | ⚠️ | Cover images render when referenced in the body; no dedicated cover panel |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Raw XML editing | ✅ | Full Monaco editor on source XML |
| Save (Companion) | ✅ | Write-back to local file |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known-File Enhancement

No known-file plugin — all FB2 files use the same ebook renderer.

## Real-World Examples

- [`sample.fb2`](../examples/sample.fb2) — FictionBook XML ebook sample

## Known Limitations

- `.fb2.zip` is not handled by this type; open it as an archive
- No bookmark or reading-position persistence
- No generated table of contents or chapter navigation sidebar

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| TOC / section navigation | Med | Med | Build a sidebar from nested `<section><title>` nodes |
| Reading position persistence | Med | Med | Store last scroll position in localStorage |
| Dedicated cover panel | Low | Easy | Surface `<coverpage>` image before the body |
