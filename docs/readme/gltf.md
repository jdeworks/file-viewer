# glTF — GL Transmission Format

> The "JPEG of 3D" — offline mesh render with orbit controls, material-color groups, metadata, and PLY export.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.gltf`, `.glb` |
| MIME type | `model/gltf+json` (`.gltf`); `model/gltf-binary` (`.glb`) |
| Binary / Text | Both — `.gltf` is JSON + external assets; `.glb` is a self-contained binary bundle |
| Created by | Khronos Group |
| Common use | 3D model interchange, web/AR/VR scenes, game assets |
| Spec / Docs | [Khronos glTF spec](https://www.khronos.org/gltf/) |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| 3D render | ✅ | Shared mesh viewer with orbit / zoom / pan controls |
| Per-material group display | ✅ | Each mesh group shown in its assigned material color |
| Animation metadata | ⚠️ | Animation count is reported, but animation playback is not implemented |
| Auto-center and fit | ✅ | Scene scaled and centred automatically |
| Embedded buffers | ✅ | GLB binary buffers and `.gltf` data URI buffers |
| External buffers | ❌ | External `.bin` assets are not fetched |
| Source view | ❌ | The 3D preview owns both `.glb` and `.gltf` |
| Diff | ❌ | Disabled for 3D model previews |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Per-material color picker | ✅ | Click face group → floating color wheel |
| Geometry editing | ❌ | Mesh topology not editable |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Export as PLY | ✅ | Per-triangle colors baked in |

## Known-File Enhancement

No known-file plugin — all glTF/GLB files use the same 3D viewer.

## Real-World Examples

- [`sample.glb`](../examples/sample.glb) — self-contained GLB demonstrating animation playback and material colors

## Known Limitations

- PBR material properties (metalness, roughness, emissive) are not fully previewed — base color factor is used as a flat color
- Texture maps are not displayed even if embedded in the GLB
- External buffers/images referenced by `.gltf` are not loaded
- Morph target (blend shape) animation is not supported

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| PBR material preview | High | Hard | Requires PBR shader with IBL environment map |
| Texture / UV rendering | High | Hard | Textures bundled in GLB need unpacking |
| Morph target animation | Med | Hard | Blend shapes need per-vertex weight interpolation |
| Scene hierarchy inspector | Low | Med | Tree of nodes/meshes in sidebar |
