# AutoCAD Drawing (DXF)

> DXF drawing inspector — lightweight 2D canvas preview, entity type breakdown, layer list, block names, header variables, units, and sections from AutoCAD exchange files.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.dxf` |
| MIME type | `image/vnd.dxf`, `application/dxf` |
| Binary / Text | Text |
| Common use | 2D/3D CAD drawings, architecture/engineering plans, laser cutter paths |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Entity type counts | ✅ | LINE, CIRCLE, ARC, POLYLINE, TEXT, INSERT, etc. counted |
| 2D canvas rendering | ✅ | Draws supported model-space primitives with fit, zoom, and drag-pan controls |
| Layer list | ✅ | All named layers extracted |
| Block names | ✅ | Block definitions listed |
| Header variables | ✅ | Key `$HEADER` variables shown (units, limits, version) |
| DXF version | ✅ | AC1027 / R2013 style version shown |
| Drawing units | ✅ | `$INSUNITS` decoded to unit name |
| Drawing extents | ⚠️ | Header extents are shown when present; canvas bounds are computed from drawable entities |
| Source view | ✅ | Monaco editor (plaintext mode) |
| Diff | ❌ | `diff: false` — group-code format not suitable |
| Preferred mode | Preview | Opens directly in preview |
| Metadata | ✅ | Version, units, and total entity count |

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

- Canvas rendering is lightweight and does not expand block geometry; `INSERT` references are markers
- LWPOLYLINE bulge arcs are approximated as straight segments
- Binary DXF format is not supported (only ASCII DXF)

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Fuller geometry support | High | Hard | Expand blocks, preserve polyline bulges, improve spline/entity fidelity |
| Export to SVG | Med | Hard | Convert supported entity geometry to SVG paths |
| Binary DXF support | Low | Hard | Requires binary group-code parser |
