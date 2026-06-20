# STL — Stereolithography

> The universal 3D print format — WebGL render with orbit controls, color picker, and PLY/OBJ export.

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
| WebGL 3D render | ✅ | Orbit / zoom / pan controls |
| Auto-center and fit | ✅ | Mesh centred and scaled to fill viewport |
| Group color display | ✅ | Single material group (STL has no material data) |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Color picker | ✅ | Assign display color to the mesh |
| Geometry editing | ❌ | Vertex positions not editable |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original STL | ✅ | Always available |
| Export as PLY | ✅ | Per-triangle color baked from chosen display color |
| Export as OBJ | ✅ | With accompanying `.mtl` for color |

## Known-File Enhancement

No known-file plugin — all STL files use the same 3D viewer.

## Real-World Examples

- [`sample.stl`](../examples/sample.stl) — 3D printable part demonstrating orbit controls and PLY export

## Known Limitations

- STL has no color or material data; assigned color is display-only
- No repair tools for non-manifold geometry (open edges, intersecting faces)
- No scale / unit display (STL has no unit metadata)
- No layer-by-layer slicer preview

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Scale / unit display | Med | Easy | Allow user to specify units (mm/in) and show dimensions |
| Non-manifold detection | Med | Med | Highlight open edges or intersecting triangles |
| Slicer layer preview | Low | Hard | Requires a JS slicing engine (e.g. three-mesh-bvh) |
