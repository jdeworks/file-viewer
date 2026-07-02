# PLY — Polygon File Format

> Stanford's 3D scan format — ASCII/binary triangle mesh parsing, canvas 3D preview, color editing, and STL/OBJ conversion.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.ply` |
| MIME type | `model/ply` |
| Binary / Text | Both — ASCII and little/big-endian binary variants |
| Created by | Stanford University (Greg Turk, Marc Levoy) |
| Common use | 3D scans, point clouds, lidar output, academic 3D datasets |
| Spec / Docs | [PLY format description](http://paulbourke.net/dataformats/ply/) |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Canvas 3D render | ✅ | Drag to orbit; reset view available |
| ASCII / binary parsing | ✅ | ASCII, binary little-endian, and binary big-endian headers supported |
| Polygon triangulation | ✅ | Face index lists are fan-triangulated |
| Vertex color display | ❌ | Color properties are skipped during parsing |
| Per-group color assignment | ⚠️ Partial | Shared mesh color picker supports region/face/default group coloring |
| Auto-center and fit | ✅ | Geometry centered and scaled to viewport |
| Source view | ❌ | Mesh data is preview-only, including ASCII PLY |
| Diff | ❌ | Mesh diff is not implemented |
| Metadata | ✅ | Format, vertices, faces, triangles, elements, comments, and dimensions |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Color picker | ✅ | Click a region, single face, or default group → floating color input |
| Geometry editing | ❌ | Vertex positions not editable |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Export as STL / OBJ | ✅ | Export menu converts the parsed mesh to the other mesh formats |
| Export colored PLY / OBJ | ✅ | Preview toolbar can download generated colored PLY or OBJ+MTL |

## Known-File Enhancement

No known-file plugin — all PLY files use the same 3D viewer.

## Real-World Examples

- [`sample.ply`](../examples/sample.ply) — ASCII mesh sample demonstrating PLY parsing and preview

## Known Limitations

- Point cloud rendering (no triangle faces) is rendered as a mesh; pure point clouds show poorly
- Vertex colors, normals, and other extra properties are skipped, though binary property sizes are accounted for
- Large files (>1M vertices) may have slow load and low frame rate
- Normal vector visualisation (surface normals as line segments) is not available

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Point cloud rendering mode | High | Med | Render as `gl.POINTS` when no face indices present |
| Vertex color support | High | Med | Preserve RGB properties and pass them into the mesh viewer |
| Large file performance | Med | Med | Stream/chunk loading or WASM-accelerated parsing |
| Normal visualisation | Low | Med | Draw normals as thin lines from each vertex |
