# ICO — Windows Icon

> Multi-resolution icon container — all embedded sizes displayed as a grid, with per-size PNG export and draw overlay.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.ico` |
| MIME type | `image/vnd.microsoft.icon` |
| Binary / Text | Binary |
| Created by | Microsoft |
| Common use | Windows application icons, browser favicons, multi-resolution icon sets |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| All embedded sizes as grid | ✅ | Each size (16×16, 32×32, 48×48, 256×256, etc.) shown |
| Main preview (largest size) | ✅ | Largest embedded image selected automatically |
| Alpha / transparency display | ✅ | Checkerboard background shows transparent areas |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Draw overlay | ✅ | Pencil / eraser / text on selected size |
| Magic background removal | ✅ | AI-powered subject isolation |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Export selected size as PNG | ✅ | Canvas export of chosen size |
| Export selected size as WebP / JPEG | ✅ | Via canvas export |
| Export all sizes as individual files | ❌ | Not yet implemented |
| ICO re-pack after edit | ❌ | Cannot write back to ICO format |

## Known-File Enhancement

No known-file plugin.

## Real-World Examples

- [`favicon.ico`](../examples/favicon.ico) — multi-size favicon demonstrating size grid display

## Known Limitations

- Editing one size does not propagate to other sizes in the ICO container
- ICO re-pack is not supported; edits must be exported as PNG
- Animated cursor (`.cur`) format is not supported

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Export all sizes as ZIP | Med | Med | Batch-export each embedded image |
| ICO re-pack after edit | Med | Hard | Requires ICO binary writer |
| Animated cursor (.cur) support | Low | Med | CUR format is structurally similar to ICO |
