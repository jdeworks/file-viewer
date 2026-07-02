# Sketch Design File

> UI/UX design files from the Sketch macOS app — embedded preview image plus page, artboard, font, and version metadata.

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
| Embedded preview | ✅ | Shows `previews/preview.png` or `previews/preview@2x.png` when present |
| Metadata | ✅ | Sketch version/build, file size, page count, artboard count, and fonts |
| Exact visual rendering | ❌ | Browser does not render Sketch vector/layer content |

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

- [`sample.sketch`](../examples/sample.sketch) — Sketch archive demonstrating embedded preview and page/artboard metadata

## Known Limitations

- Per-artboard image export is not available; only the stored preview image is shown
- Symbol library contents are listed when present but not rendered individually
- The viewer does not reconstruct text, vectors, layout, masks, or effects from Sketch JSON
- Sketch file format changes between versions; very old or very new files may parse with warnings

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Per-artboard image export | High | Med | Artboard bounds are in the JSON; crop from stored preview when available |
| Symbol library inspection | Med | Med | Symbols are stored in a dedicated page; list and preview |
| Design token extraction | Med | Med | Colors and text styles are in the JSON layer tree |
