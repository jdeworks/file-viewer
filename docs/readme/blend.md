# Blender 3D Scene

> Blender .blend file inspector — format version, pointer size, endianness, and a block-code summary from file block headers.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.blend`, `.blend1`, `.blend2` |
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
| Block count | ✅ | Total parsed file blocks |
| Block-code summary | ✅ | Top block codes such as `OB`, `ME`, `MA`, `CA`, and `DNA1` with known descriptions |
| Object counts | ❌ | Blocks are counted by code; scene objects are not decoded from DNA structs |
| Source view | ❌ | Binary format |
| Diff | ❌ | Binary format |
| Metadata | ✅ | Version, pointer size, and endianness |

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
- Block summary is structural; it does not parse Blender DNA into a scene graph
- Post-Blender-4.0 files may use a different internal layout

## Real-World Examples

- [`sample.blend`](../examples/sample.blend) — compact Blender scene header/block sample

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Scene tree view | Low | Hard | Full DNA struct parsing to show scene graph |
| GLTF export (server-side) | Low | Hard | Requires Blender headless conversion |
