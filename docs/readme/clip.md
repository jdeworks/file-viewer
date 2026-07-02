# Clip Studio Paint

> Clip Studio Paint viewer — canvas dimensions, layer count, creation/modification dates, and canvas preview thumbnail.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.clip` |
| MIME type | `application/octet-stream` |
| Binary / Text | Binary (SQLite database) |
| Common use | Digital illustration and manga/comic art (Clip Studio Paint) |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Canvas dimensions | ✅ | Width × height in pixels |
| Layer count | ✅ | Total layers from Layer table |
| Creation date | ✅ | From Canvas table |
| Modification date | ✅ | From Canvas table |
| Preview thumbnail | ✅ | PNG/JPEG thumbnail from CanvasPreview table |
| Table list | ✅ | Internal SQLite tables shown |
| Source view | ❌ | Binary SQLite format |
| Diff | ❌ | Binary format |
| Metadata | ✅ | Canvas size, layer count, dates |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Editing | ❌ | Proprietary binary format |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known Limitations

- Layer pixel data is proprietary and not decoded
- Layer names, blending modes, and opacity are not shown

## Real-World Examples

- [`sample.clip`](../examples/sample.clip) — Clip Studio Paint sample with structure and thumbnail data

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Layer name list | Med | Med | Query Layer table for name and visibility columns |
| Blending modes | Low | Med | Decode mode integers from Layer table |
