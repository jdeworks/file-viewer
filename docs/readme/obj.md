# OBJ — Wavefront Object

> The most widely supported 3D format — WebGL render with per-material color editing, MTL auto-load, and OBJ/PLY export.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.obj`, `.mtl` |
| MIME type | `model/obj` |
| Binary / Text | Text |
| Created by | Wavefront Technologies |
| Common use | 3D model interchange; broadest compatibility of any 3D format; CAD, game assets, print |
| Spec / Docs | [OBJ format reference](http://www.martinreddy.net/gfx/3d/OBJ.spec) |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| WebGL 3D render | ✅ | Orbit / zoom / pan controls |
| Per-material group display | ✅ | Groups rendered in assigned material colors |
| MTL auto-load | ✅ | Companion `.mtl` file loaded automatically if alongside OBJ |
| Auto-center and fit | ✅ | Mesh scaled and centred in viewport |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Per-material color picker | ✅ | Click face group → floating color wheel |
| Geometry editing | ❌ | Vertex positions not editable |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original OBJ | ✅ | Always available |
| Export edited OBJ + MTL | ✅ | Updated material colors written to generated `.mtl` |
| Export as PLY | ✅ | Per-triangle colors baked in |

## Known-File Enhancement

No known-file plugin — all OBJ files use the same 3D viewer.

## Real-World Examples

- [`sample.obj`](../examples/sample.obj) — multi-material mesh demonstrating MTL loading and color editing

## Known Limitations

- Texture (UV map) rendering is not supported; only flat material colors are shown
- Large meshes (>500k triangles) may have slow load and low frame rate
- No support for OBJ smooth-shading groups (`s` directive)

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Texture / UV rendering | High | Hard | Requires loading image files referenced in MTL |
| Large mesh performance | Med | Med | LOD or mesh decimation for files >500k triangles |
| Smooth-shading group support | Low | Med | Parse `s` directive and compute vertex normals per group |
