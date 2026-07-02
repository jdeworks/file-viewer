# STEP CAD Exchange (ISO 10303-21)

> STEP file inspector — file header metadata, schema declaration, entity count, and top entity type histogram.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.step`, `.stp`, `.p21` |
| MIME type | `application/step`, `model/step` |
| Binary / Text | Text |
| Common use | 3D CAD model exchange between software (CATIA, SolidWorks, Fusion 360, FreeCAD) |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| File header | ✅ | `FILE_SCHEMA`, `FILE_DESCRIPTION`, `FILE_NAME` parsed |
| Entity histogram | ✅ | Top 20 entity types by count |
| Schema name | ✅ | Application protocol (AP203, AP214, AP242) shown |
| Section boundaries | ❌ | Sections are parsed internally but not shown as a boundary list |
| Source view | ✅ | Monaco editor (plaintext mode) |
| Diff | ❌ | `diff: false` |
| Preferred mode | Preview | Opens directly in preview |
| Metadata | ⚠️ Partial | Format, schema, and entity count; richer header fields are preview-only |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Source editing | ✅ | Full Monaco editor |
| Save (Companion) | ✅ | Write-back to local file |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Real-World Examples

- [`sample.stp`](../examples/sample.stp) — STEP CAD exchange fixture with schema and entity histogram

## Known Limitations

- No 3D geometric rendering — text/entity inspection only
- The 3D model itself (faces, edges) is not visualized
- Only the top 20 entity types are shown in the histogram

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| 3D rendering via OpenCASCADE.js | Med | Hard | Large WASM library (~15 MB); would be opt-in |
| Export to GLTF | Low | Hard | Requires full STEP geometry decoding |
