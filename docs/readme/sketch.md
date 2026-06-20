# Sketch Design File

> UI/UX design files from the Sketch macOS app — artboard tree, page metadata, and flattened page previews.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.sketch` |
| MIME type | `application/octet-stream` |
| Binary / Text | Binary (ZIP + JSON layers) |
| Created by | Sketch B.V. |
| Common use | UI/UX design, macOS design tool; artboards, symbols, and component libraries |
| Spec / Docs | [Sketch file format](https://developer.sketch.com/file-format/) |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Page and artboard tree | ✅ | Hierarchical list of pages and artboard names |
| Flattened page previews | ✅ | Rendered preview images embedded in the file |
| Metadata | ✅ | Sketch version, page count, artboard count |
| Exact visual rendering | ⚠️ Partial | Limited by font availability in browser |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Any editing | ❌ | Design editing requires the Sketch app |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known-File Enhancement

No known-file plugin — all `.sketch` files use the same metadata + preview viewer.

## Real-World Examples

- [`sample.sketch`](../examples/sample.sketch) — multi-page design demonstrating artboard tree and page preview

## Known Limitations

- Per-artboard image export is not available; only whole-page previews are shown
- Symbol library contents are listed but not rendered individually
- Font rendering differences arise when system fonts differ from the design machine
- Sketch file format changes between versions; very old or very new files may parse with warnings

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Per-artboard image export | High | Med | Artboard bounds are in the JSON; crop from page preview |
| Symbol library inspection | Med | Med | Symbols are stored in a dedicated page; list and preview |
| Design token extraction | Med | Med | Colors and text styles are in the JSON layer tree |
