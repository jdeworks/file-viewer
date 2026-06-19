# Layered Image

> Layer tree inspector and flattened canvas preview for PSD, XCF, ORA, and KRA files — all decoded client-side with no server upload.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.psd`, `.xcf`, `.ora`, `.kra` |
| MIME type | `image/vnd.adobe.photoshop`, `image/x-xcf`, `image/openraster`, `application/x-krita` |
| Binary / Text | Binary |
| Common use | Photo editing projects, digital art, graphic design files |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Layer tree | ✅ | Hierarchical list with layer names, visibility, opacity, blend mode |
| Flattened canvas preview | ✅ | Visible layers composited onto a canvas |
| Layer visibility toggle | ✅ | Click eye icon to show/hide layers and recomposite |
| Group / folder layers | ✅ | Nested layer groups shown with indent |
| PSD decoding | ✅ | Via vendored ag-psd library |
| XCF decoding | ✅ | Via hand-rolled XCF decoder |
| ORA decoding | ✅ | Via JSZip + stack.xml parsing |
| KRA decoding | ✅ | Via hand-rolled KRA decoder |
| Source view | ❌ | Binary format — no raw text view |
| Diff | ❌ | Binary format not diffable |
| Metadata | ✅ | Canvas size, layer count, color mode |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Drawing / painting | ❌ | Canvas preview is read-only |
| Layer reorder | ❌ | Layer tree is display-only |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Export flattened as PNG | ❌ | Canvas could be exported; not yet wired |

## Real-World Examples

- [`sample.psd`](../examples/sample.psd) — example Photoshop document with layers
- [`sample.xcf`](../examples/sample.xcf) — example GIMP project file

## Known Limitations

- Smart objects and adjustment layers in PSD are rendered as raster (no live filters)
- Very large canvases (>8192×8192) may exceed browser canvas limits
- Text layers rendered as pixels — live text is not re-rendered from font

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Export flattened as PNG | Med | Easy | `canvas.toBlob('image/png')` after composition |
| Export individual layer as PNG | Med | Med | Render single layer to canvas and download |
| Blend mode accuracy | Med | Hard | PSD blend modes beyond Normal/Multiply/Screen |
| Text layer metadata | Low | Med | Show font, size, text content from text layers |
