# STEP CAD Exchange (ISO 10303-21)

> STEP file inspector — entity type histogram, schema declaration, file header metadata, and section statistics.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.step`, `.stp`, `.p21` |
| MIME type | `application/step` |
| Binary / Text | Text |
| Common use | 3D CAD model exchange between software (CATIA, SolidWorks, Fusion 360, FreeCAD) |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| File header | ✅ | `FILE_SCHEMA`, `FILE_DESCRIPTION`, `FILE_NAME` parsed |
| Entity histogram | ✅ | Count per entity type (ADVANCED_FACE, EDGE_CURVE, etc.) |
| Schema name | ✅ | Application protocol (AP203, AP214, AP242) shown |
| Section boundaries | ✅ | HEADER / DATA / END-SEC shown |
| Source view | ✅ | Monaco editor (plaintext mode) |
| Diff | ❌ | `diff: false` |
| Preferred mode | Preview | Opens directly in preview |
| Metadata | ✅ | Schema, entity count, file description, software |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Source editing | ✅ | Full Monaco editor |
| Save (Companion) | ✅ | Write-back to local file |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known Limitations

- No 3D geometric rendering — text/entity inspection only
- The 3D model itself (faces, edges) is not visualized

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| 3D rendering via OpenCASCADE.js | Med | Hard | Large WASM library (~15 MB); would be opt-in |
| Export to GLTF | Low | Hard | Requires full STEP geometry decoding |
