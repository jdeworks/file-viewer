# PLY — Polygon File Format

> Stanford's 3D scan format — WebGL render with vertex color display, color editing, and per-vertex color PLY export.

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
| WebGL 3D render | ✅ | Orbit / zoom / pan controls |
| Vertex color display | ✅ | Per-vertex RGB colors rendered if present in file |
| Per-group color assignment | ✅ | Assign flat color to mesh groups |
| Auto-center and fit | ✅ | Geometry centred and scaled to viewport |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Per-material color picker | ✅ | Click face group → floating color wheel |
| Geometry editing | ❌ | Vertex positions not editable |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Export edited PLY | ✅ | Per-vertex / per-triangle colors baked into output PLY |

## Known-File Enhancement

No known-file plugin — all PLY files use the same 3D viewer.

## Real-World Examples

- [`sample.ply`](../examples/sample.ply) — coloured 3D scan demonstrating vertex color display

## Known Limitations

- Point cloud rendering (no triangle faces) is rendered as a mesh; pure point clouds show poorly
- Large files (>1M vertices) may have slow load and low frame rate
- Normal vector visualisation (surface normals as line segments) is not available

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Point cloud rendering mode | High | Med | Render as `gl.POINTS` when no face indices present |
| Large file performance | Med | Med | Stream/chunk loading or WASM-accelerated parsing |
| Normal visualisation | Low | Med | Draw normals as thin lines from each vertex |
