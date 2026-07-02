# 3MF — 3D Manufacturing Format

> A modern 3D print format that carries objects, materials, metadata, and thumbnails inside a ZIP container — richer than STL.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.3mf` |
| MIME type | `model/3mf` |
| Binary / Text | Binary (ZIP container with XML inside) |
| Created by | 3MF Consortium (Microsoft, Autodesk, HP, et al.) |
| Common use | 3D printing files with color and material information |
| Spec / Docs | [3mf.io](https://3mf.io/specification/) |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Package parse | ✅ | Reads the `3D/3dmodel.model` XML from the ZIP container |
| Object table | ✅ | Lists object IDs, names, and object types |
| Material list | ✅ | Shows base material names and display colors |
| Embedded thumbnail | ✅ | Displays a bundled thumbnail PNG when present |
| Metadata extraction | ✅ | Title, designer, unit, objects, materials, and thumbnail presence |
| Mesh render | ❌ | Current 3MF view is structured package metadata, not the shared mesh canvas |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Source editing | ❌ | Binary ZIP container |
| Geometry editing | ❌ | Mesh vertices not editable |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Export as PLY | ❌ | 3MF mesh extraction is not wired to the mesh exporter |
| Re-export as 3MF | ❌ | Color edits cannot be saved back to 3MF |

## Known-File Enhancement

No known-file plugin — 3MF files are treated generically by filename.

## Real-World Examples

- [`sample.3mf`](../examples/sample.3mf) — multi-material 3D print demonstrating per-group color display

## Known Limitations

- Re-export as 3MF is not supported
- Mesh geometry is not rendered yet; the current preview focuses on package contents and metadata
- Texture maps referenced inside the 3MF package are not displayed

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Mesh rendering | High | Hard | Parse vertices/triangles and feed the shared mesh viewer |
| Export as PLY / OBJ / STL | High | Med | Depends on mesh extraction from the 3MF XML |
| Re-export as 3MF with edited colors | High | Hard | Requires rebuilding the ZIP + XML structure |
| Texture / UV map rendering | Med | Hard | Textures are bundled inside the ZIP package |
