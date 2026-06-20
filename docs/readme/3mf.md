# 3MF — 3D Manufacturing Format

> A modern 3D print format that carries colors, materials, and metadata inside a ZIP container — richer than STL.

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
| WebGL 3D render | ✅ | Orbit / zoom / pan controls |
| Per-group color display | ✅ | Material groups rendered in assigned colors |
| Auto-center and fit | ✅ | Mesh auto-scaled to fill viewport |
| Metadata extraction | ✅ | Title, designer, description from 3MF XML |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Per-material color picker | ✅ | Click face group → floating color wheel |
| Geometry editing | ❌ | Mesh vertices not editable |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Export as PLY | ✅ | Per-triangle colors baked in |
| Re-export as 3MF | ❌ | Color edits cannot be saved back to 3MF |

## Known-File Enhancement

No known-file plugin — 3MF files are treated generically by filename.

## Real-World Examples

- [`sample.3mf`](../examples/sample.3mf) — multi-material 3D print demonstrating per-group color display

## Known Limitations

- Re-export as 3MF is not supported; color edits can only be exported via PLY
- Texture maps referenced inside the 3MF package are not displayed
- Embedded thumbnail preview from the 3MF package is not surfaced separately

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Re-export as 3MF with edited colors | High | Hard | Requires rebuilding the ZIP + XML structure |
| Texture / UV map rendering | Med | Hard | Textures are bundled inside the ZIP package |
| Metadata panel in sidebar | Low | Easy | Title, designer, description already parsed |
