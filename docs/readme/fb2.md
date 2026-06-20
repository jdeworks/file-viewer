# FictionBook 2 (.fb2)

> XML-based ebook format popular in Russia and Eastern Europe — rendered chapters, cover image, and rich metadata.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.fb2`, `.fb2.zip` |
| MIME type | `application/x-fictionbook+xml` |
| Binary / Text | Text (XML); `.fb2.zip` is a ZIP wrapper |
| Created by | Dmitry Gribov |
| Common use | Ebooks; widely used in Russian and Eastern European digital book ecosystems |
| Spec / Docs | [FictionBook wiki](http://www.fictionbook.org/index.php/Eng:FictionBook) |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Rendered ebook content | ✅ | Chapters, paragraphs, epigraphs, footnotes |
| Cover image | ✅ | Extracted from `<coverpage>` element |
| Metadata panel | ✅ | Title, author, genre, annotation, language |
| Table of contents | ✅ | Section / chapter navigation |
| Inline images | ✅ | Base64-encoded images in `<binary>` sections |

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

- [`sample.fb2`](../examples/sample.fb2) — multi-chapter ebook demonstrating TOC navigation and cover image

## Known Limitations

- Font size control not exposed (uses page default)
- No bookmark or reading-position persistence
- Night mode uses global theme; no FB2-specific reader theming

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Font size / line spacing controls | Med | Easy | CSS variable adjustments in reader view |
| Reading position persistence | Med | Med | Store last scroll position in localStorage |
| Night mode reader styling | Low | Easy | High-contrast dark palette for long reading |
