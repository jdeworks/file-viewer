# STL — Stereolithography

> The universal 3D print format — canvas mesh render with orbit controls, region/face/group coloring, and PLY/OBJ export.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.stl` |
| MIME type | `model/stl` |
| Binary / Text | Both — ASCII and binary variants |
| Created by | 3D Systems |
| Common use | 3D printing, CAD model exchange, prototyping; the most common 3D print format |
| Spec / Docs | [STL format reference](https://www.fabbers.com/tech/STL_Format) |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| 3D mesh render | ✅ | Canvas renderer with drag-to-orbit controls |
| Auto-center and fit | ✅ | Mesh centred and scaled to fill viewport |
| Mesh metadata | ✅ | Format, solid name, vertices, triangles, and dimensions |
| Selection coloring | ✅ | Region, face, and group color modes with reset |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Color picker | ✅ | Assign global color or selection-specific colors |
| Geometry editing | ❌ | Vertex positions not editable |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original STL | ✅ | Always available |
| Export as PLY | ✅ | Export menu downloads PLY; preview toolbar downloads colored PLY |
| Export as OBJ | ✅ | Export menu downloads OBJ; preview toolbar downloads colored OBJ plus `.mtl` |

## Known-File Enhancement

No known-file plugin — all STL files use the same 3D viewer.

## Real-World Examples

- [`sample.stl`](../examples/sample.stl) — compact binary STL demonstrating canvas rendering, coloring, and OBJ/PLY export

## Known Limitations

- STL has no color or material data; assigned color is display-only
- No repair tools for non-manifold geometry (open edges, intersecting faces)
- No scale / unit display (STL has no unit metadata)
- No layer-by-layer slicer preview
- Exported colors reflect viewer color selections, not source STL material data

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Scale / unit display | Med | Easy | Allow user to specify units (mm/in) and show dimensions |
| Non-manifold detection | Med | Med | Highlight open edges or intersecting triangles |
| Slicer layer preview | Low | Hard | Requires a JS slicing engine (e.g. three-mesh-bvh) |
