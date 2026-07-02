# FBX 3D Animation

> FBX file inspector — binary FBX version and root-node summary, with ASCII FBX routed to raw text.

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
| Format variant | ✅ | Binary FBX detected by magic; ASCII FBX gets a raw-view note |
| FBX version | ✅ | Version number from header |
| Root nodes | ✅ | Top-level binary FBX nodes and property counts listed |
| Creator | ❌ | Creator metadata is not decoded |
| Creation time | ❌ | Embedded timestamp is not decoded |
| Object counts | ❌ | Model/material/texture/animation counts are not decoded |
| Source view | ❌ | Binary FBX has no raw text view; ASCII FBX should be inspected as raw text |
| Diff | ❌ | Binary format |
| Metadata | ✅ | Format, binary version, encoding, file size |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Editing | ❌ | Binary format |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known Limitations

- 3D geometry, scene hierarchy, materials, skinning, and animations are not rendered
- ASCII FBX is detected only enough to show a note; detailed ASCII parsing is not implemented
- Binary parser lists root nodes only, not nested node contents

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Scene hierarchy tree | Low | Hard | Parse node hierarchy from binary blocks |
| ASCII FBX summary | Low | Med | Extract object counts from text FBX files |
| Convert to GLTF | Low | Hard | Requires FBX SDK or three-fbx-loader |
