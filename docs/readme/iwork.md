# Apple iWork (.pages / .numbers / .keynote)

> Apple's productivity suite formats — embedded thumbnail plus best-effort text extraction from IWA data; full rendering blocked by a closed protobuf format.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.pages`, `.numbers`, `.keynote` |
| MIME type | `application/x-iwork-pages-sffpages` (Pages); `application/x-iwork-numbers-sffnumbers` (Numbers); `application/x-iwork-keynote-sffkey` (Keynote) |
| Binary / Text | Binary (ZIP + Apple protobuf) |
| Created by | Apple |
| Common use | Pages (word processing), Numbers (spreadsheets), Keynote (presentations) on macOS/iOS |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Embedded thumbnail | ✅ | Shows `preview.jpg`, `preview-web.jpg`, `QuickLook/Thumbnail.jpg`, or `preview.png` when present |
| Text extraction | ⚠️ | Best-effort Snappy/IWA protobuf string extraction; formatting, images, tables, and layout are not preserved |
| Metadata extraction | ⚠️ | Type, size, format, and approximate word count when IWA text can be decoded |
| Content rendering | ⚠️ Partial | Thumbnail plus extracted text only; no full layout |
| Full document render | ❌ | Requires Apple's closed protobuf spec |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Any editing | ❌ | Protobuf binary; no editor provided |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known-File Enhancement

No known-file plugin — all iWork files use the same metadata extractor.

## Real-World Examples

- [`sample.pages`](../examples/sample.pages) — Pages document demonstrating metadata extraction

## Known Limitations

- Full content rendering is not possible without Apple's proprietary protobuf schemas
- Text extraction is heuristic and can miss or include noisy strings
- Embedded preview images are limited to known thumbnail paths
- Full layout, tables, charts, images, and slide/page geometry are not reconstructed

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Broader thumbnail discovery | Med | Easy | Search more Quick Look and preview paths |
| Community protobuf parsing | Med | Hard | Open-source schemas cover only a subset of iWork features |
