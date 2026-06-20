# glTF — GL Transmission Format

> The "JPEG of 3D" — WebGL render with orbit controls, per-material color editing, animation playback, and PLY export.

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
| WebGL 3D render | ✅ | Orbit / zoom / pan controls |
| Per-material group display | ✅ | Each mesh group shown in its assigned material color |
| Animation playback | ✅ | Plays embedded animations if present |
| Auto-center and fit | ✅ | Scene scaled and centred automatically |

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

- PBR material properties (metalness, roughness, emissive) are not fully previewed — flat color approximation only
- Texture maps are not displayed even if embedded in the GLB
- Morph target (blend shape) animation is not supported

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| PBR material preview | High | Hard | Requires PBR shader with IBL environment map |
| Texture / UV rendering | High | Hard | Textures bundled in GLB need unpacking |
| Morph target animation | Med | Hard | Blend shapes need per-vertex weight interpolation |
| Scene hierarchy inspector | Low | Med | Tree of nodes/meshes in sidebar |
