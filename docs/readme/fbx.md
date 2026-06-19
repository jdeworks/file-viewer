# FBX 3D Animation

> FBX file inspector — format version (text/binary), creator, timestamp, scene statistics from header.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.fbx` |
| MIME type | `application/octet-stream` |
| Binary / Text | Binary or Text (both variants exist) |
| Common use | 3D model and animation exchange between Maya, 3ds Max, Unity, Unreal Engine |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Format variant | ✅ | Binary FBX vs. ASCII FBX detected |
| FBX version | ✅ | Version number from header |
| Creator | ✅ | Application that saved the file |
| Creation time | ✅ | Embedded timestamp |
| Object counts | ✅ | Model, material, texture, animation layer counts |
| Source view | ❌ | Binary format (text FBX: limited) |
| Diff | ❌ | Binary format |
| Metadata | ✅ | Version, creator, object type counts |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Editing | ❌ | Binary format |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known Limitations

- 3D geometry is not rendered
- ASCII FBX (text format) shows more detail than binary

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Scene hierarchy tree | Low | Hard | Parse node hierarchy from binary blocks |
| Convert to GLTF | Low | Hard | Requires FBX SDK or three-fbx-loader |
