# ICO — Windows Icon

> Multi-resolution icon/cursor container — embedded sizes displayed as a grid with per-entry metadata.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.ico`, `.cur` |
| MIME type | `image/vnd.microsoft.icon` |
| Binary / Text | Binary |
| Created by | Microsoft |
| Common use | Windows application icons, browser favicons, cursors, multi-resolution icon sets |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| All embedded sizes as grid | ✅ | Each size (16×16, 32×32, 48×48, 256×256, etc.) shown |
| PNG-in-ICO entries | ✅ | Embedded PNG images decoded directly |
| BMP-in-ICO entries | ✅ | BMP headers reconstructed for browser decode |
| CUR hot spot metadata | ✅ | Cursor hot spot shown for `.cur` files |
| Main preview (largest size) | ❌ | No separate selected-size preview; all entries are shown in the grid |
| Alpha / transparency display | ⚠️ | Depends on decoded PNG/BMP entry transparency |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Draw overlay | ❌ | ICO/CUR renderer is preview-only |
| Magic background removal | ❌ | ICO/CUR renderer is preview-only |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Export selected size as PNG | ❌ | Not currently exposed |
| Export selected size as WebP / JPEG | ❌ | Not currently exposed |
| Export all sizes as individual files | ❌ | Not yet implemented |
| ICO re-pack after edit | ❌ | Cannot write back to ICO format |

## Known-File Enhancement

No known-file plugin.

## Real-World Examples

- [`sample.ico`](../examples/sample.ico) — multi-size icon demonstrating size grid display

## Known Limitations

- Editing and per-size export are not currently wired for ICO/CUR
- ICO re-pack is not supported
- Animated cursor behavior is not played; `.cur` files are inspected as static cursor containers

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Export selected size as PNG | Med | Easy | Add a download button for each decoded canvas |
| Export all sizes as ZIP | Med | Med | Batch-export each embedded image |
| ICO re-pack after edit | Med | Hard | Requires ICO binary writer |
| Cursor playback / richer CUR support | Low | Med | Current support shows hot spot metadata only |
