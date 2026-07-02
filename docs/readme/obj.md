# OBJ — Wavefront Object

> The most widely supported 3D format — canvas 3D render with face, region, and OBJ group/material color editing plus STL/PLY export.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.obj` |
| MIME type | `model/obj` |
| Binary / Text | Text |
| Created by | Wavefront Technologies |
| Common use | 3D model interchange; broadest compatibility of any 3D format; CAD, game assets, print |
| Spec / Docs | [OBJ format reference](http://www.martinreddy.net/gfx/3d/OBJ.spec) |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Canvas 3D render | ✅ | Drag to orbit; reset view available |
| Group/material display | ✅ | `g` and `usemtl` names become selectable color groups |
| MTL auto-load | ❌ | `mtllib` is counted but companion `.mtl` files are not loaded |
| Auto-center and fit | ✅ | Mesh scaled and centered in viewport |
| Source view | ✅ | Monaco editor for the OBJ text source |
| Text diff | ✅ | Standard line diff for OBJ source |
| Metadata | ✅ | Vertex, normal, UV, face, group, and material counts |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Color picker | ✅ | Click a region, single face, or group/material → floating color input |
| Geometry editing | ❌ | Vertex positions not editable |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original OBJ | ✅ | Always available |
| Export as STL / PLY | ✅ | Export menu converts the parsed mesh |
| Export edited OBJ + MTL | ✅ | Preview toolbar writes generated colored OBJ and MTL files |
| Export colored PLY | ✅ | Preview toolbar bakes selected colors per triangle |

## Known-File Enhancement

No known-file plugin — all OBJ files use the same 3D viewer.

## Real-World Examples

- [`sample.obj`](../examples/sample.obj) — mesh sample for group/material selection and color editing

## Known Limitations

- Companion `.mtl` files, material properties, and texture images are not loaded
- Texture (UV map) rendering is not supported; `vt` coordinates are counted but ignored for rendering
- Large meshes (>500k triangles) may have slow load and low frame rate
- No support for OBJ smooth-shading groups (`s` directive)

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Texture / UV rendering | High | Hard | Requires loading image files referenced in MTL |
| MTL material loading | High | Med | Resolve companion `.mtl` assets and apply material colors |
| Large mesh performance | Med | Med | LOD or mesh decimation for files >500k triangles |
| Smooth-shading group support | Low | Med | Parse `s` directive and compute vertex normals per group |
