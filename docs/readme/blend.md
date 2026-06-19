# Blender 3D Scene

> Blender .blend file inspector — format version, endianness, object/mesh/material/light/camera counts from file block headers.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.blend` |
| MIME type | `application/x-blender` |
| Binary / Text | Binary |
| Common use | Blender 3D modelling, animation, and rendering projects |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Blender version | ✅ | Encoded in file header (e.g. `2.93`, `4.0`) |
| Pointer size | ✅ | 32-bit or 64-bit file format |
| Endianness | ✅ | Little or big endian detected |
| Block count | ✅ | Total DNA/file blocks |
| Object counts | ✅ | Meshes, lights, cameras, materials, armatures |
| Source view | ❌ | Binary format |
| Diff | ❌ | Binary format |
| Metadata | ✅ | Version, pointer size, endianness, object types |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Editing | ❌ | Binary format |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known Limitations

- 3D scene is not rendered
- Post-Blender-4.0 files may use a different internal layout

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Scene tree view | Low | Hard | Full DNA struct parsing to show scene graph |
| GLTF export (server-side) | Low | Hard | Requires Blender headless conversion |
