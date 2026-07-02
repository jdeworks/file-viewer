# Apple iWork (.pages / .numbers / .key)

> Apple's productivity suite formats — metadata extraction only; full rendering blocked by a closed protobuf format.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.pages`, `.numbers`, `.key` |
| MIME type | `application/x-iwork-pages-sffpages` (Pages); `application/x-iwork-numbers-sffnumbers` (Numbers); `application/x-iwork-keynote-sffkey` (Keynote) |
| Binary / Text | Binary (ZIP + Apple protobuf) |
| Created by | Apple |
| Common use | Pages (word processing), Numbers (spreadsheets), Keynote (presentations) on macOS/iOS |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Metadata extraction | ✅ | Title, author, page/slide count |
| Content rendering | ⚠️ Partial | Community-parsed subset; no full layout |
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
- No text extraction for search or copy
- Embedded preview images (Quick Look thumbnails) inside the ZIP are not surfaced

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Quick Look thumbnail preview | High | Easy | iWork ZIPs often contain a `preview.jpg` — extract and show it |
| Community protobuf parsing | Med | Hard | Open-source schemas cover only a subset of iWork features |
