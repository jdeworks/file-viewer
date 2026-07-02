# MOBI / AZW — Kindle Ebook

> Kindle's native ebook format — rendered chapters and images for non-DRM files; metadata-only for DRM-protected content.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.mobi`, `.prc`, `.azw`, `.azw3` |
| MIME type | `application/x-mobipocket-ebook` |
| Binary / Text | Binary |
| Created by | Mobipocket SA (acquired by Amazon); `.azw` is Amazon's DRM wrapper |
| Common use | Kindle ebooks; sideloaded personal documents |
| Spec / Docs | [MobileRead MOBI wiki](https://wiki.mobileread.com/wiki/MOBI) |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Rendered ebook content | ✅ | PalmDOC MOBI text records rendered as sanitized HTML for non-DRM files |
| Inline images | ✅ | MOBI `recindex` images rewritten to local data URLs when image records are present |
| Reader controls | ✅ | Size, font, theme, line spacing, and margin controls |
| Metadata panel | ✅ | PalmDB name, title, record count, compression, DRM flag, MOBI version, text records/length, image records |
| DRM-protected files | ⚠️ | Friendly refusal; encrypted content is not decrypted |
| AZW3 / KF8 files | ⚠️ | Detected but not rendered; the reader shows an unsupported-format message |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Any editing | ❌ | Binary format; no editor |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known-File Enhancement

No known-file plugin — all MOBI/AZW files use the same ebook renderer.

## Real-World Examples

- [`sample.mobi`](../examples/sample.mobi) — non-DRM MOBI file demonstrating reader rendering

## Known Limitations

- DRM-protected `.azw` files (purchased from Amazon) cannot be decrypted client-side
- AZW3 / KF8 and KFX formats are not supported by the current PalmDOC text path
- Author/publisher/language/ASIN EXTH metadata is not extracted yet
- Very long books may have slow initial parse time

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| AZW3 / KF8 support | High | Hard | KF8 uses an EPUB-like structure inside the Palm container |
| KFX format support | High | Hard | KFX uses a different container; requires KFX parser |
| EXTH metadata extraction | Med | Med | Author, publisher, language, ASIN, and cover record IDs |
| DRM decryption | ❌ Not planned | N/A | Not legally permissible client-side |
| Chapter TOC navigation | Med | Med | MOBI NCX/HTML TOC can be parsed for navigation |
