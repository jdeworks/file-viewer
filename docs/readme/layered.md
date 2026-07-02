# Layered Image

> Layer tree inspector and canvas/preview surface for PSD, XCF, ORA, and KRA files — all decoded client-side with no server upload.

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
| Flattened canvas preview | ⚠️ | PSD/KRA composite visible layers; ORA shows merged image/layer PNGs; XCF currently shows a placeholder canvas |
| Layer visibility toggle | ✅ | Click eye icon to show/hide layers and recomposite |
| Group / folder layers | ✅ | Nested layer groups shown with indent |
| PSD decoding | ✅ | Via vendored ag-psd library |
| XCF decoding | ⚠️ | Hand-rolled decoder extracts dimensions/layer structure; pixel compositing is not implemented |
| ORA decoding | ✅ | Via JSZip + stack.xml parsing |
| KRA decoding | ✅ | Via hand-rolled KRA decoder |
| Source view | ❌ | Binary format — no raw text view |
| Diff | ❌ | Binary format not diffable |
| Metadata | ⚠️ | PSD metadata reports canvas size, channels, depth, and color mode; other formats are preview-driven |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Drawing / painting | ❌ | Canvas preview is read-only |
| Layer reorder | ❌ | Layer tree is display-only |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Export flattened as PNG | ✅ | PNG button exports the current composite/merged image where available |

## Real-World Examples

- [`sample.psd`](../examples/sample.psd) — example Photoshop document with layers
- [`sample.xcf`](../examples/sample.xcf) — example GIMP project file

## Known Limitations

- Smart objects and adjustment layers in PSD are rendered as raster (no live filters)
- XCF pixel data is not composited yet; the preview is a layer-structure placeholder
- Very large canvases (>8192×8192) may exceed browser canvas limits
- Text layers rendered as pixels — live text is not re-rendered from font

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Export individual layer as PNG | Med | Med | Render single layer to canvas and download |
| XCF pixel compositing | Med | Hard | Decode and composite GIMP layer pixels instead of placeholder |
| Blend mode accuracy | Med | Hard | PSD blend modes beyond Normal/Multiply/Screen |
| Text layer metadata | Low | Med | Show font, size, text content from text layers |
