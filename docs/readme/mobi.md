# MOBI / AZW — Kindle Ebook

> Kindle's native ebook format — rendered chapters and images for non-DRM files; metadata-only for DRM-protected content.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.mobi`, `.prc`, `.azw` |
| MIME type | `application/x-mobipocket-ebook` |
| Binary / Text | Binary |
| Created by | Mobipocket SA (acquired by Amazon); `.azw` is Amazon's DRM wrapper |
| Common use | Kindle ebooks; sideloaded personal documents |
| Spec / Docs | [MobileRead MOBI wiki](https://wiki.mobileread.com/wiki/MOBI) |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Rendered ebook content | ✅ | Chapters, text flow, inline images (non-DRM files) |
| Cover image | ✅ | Extracted from metadata record |
| Metadata panel | ✅ | Title, author, publisher, language, ASIN |
| DRM-protected files | ⚠️ | Metadata shown; content blocked (encrypted) |

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

- [`sample.mobi`](../examples/sample.mobi) — non-DRM MOBI file demonstrating chapter rendering and cover display

## Known Limitations

- DRM-protected `.azw` files (purchased from Amazon) cannot be decrypted client-side
- KFX format (newer Kindle format used since 2016) is not supported
- Very long books may have slow initial parse time

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| KFX format support | High | Hard | KFX uses a different container; requires KFX parser |
| DRM decryption | ❌ Not planned | N/A | Not legally permissible client-side |
| Chapter TOC navigation | Med | Med | MOBI NCX/HTML TOC can be parsed for navigation |
