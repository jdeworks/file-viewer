# AutoCAD Drawing (DXF)

> DXF drawing inspector — entity type breakdown, layer list, header variables, units, and drawing extents from AutoCAD exchange files.

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
| Layer list | ✅ | All named layers extracted |
| Block names | ✅ | Block definitions listed |
| Header variables | ✅ | Key `$HEADER` variables shown (units, limits, version) |
| DXF version | ✅ | AC1027 / R2013 style version shown |
| Drawing units | ✅ | `$INSUNITS` decoded to unit name |
| Drawing extents | ✅ | `$EXTMIN`/`$EXTMAX` limits shown |
| Source view | ✅ | Monaco editor (plaintext mode) |
| Diff | ❌ | `diff: false` — group-code format not suitable |
| Preferred mode | Preview | Opens directly in preview |
| Metadata | ✅ | Entity counts, layer count, block count, units |

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

- No graphical canvas rendering — text inspection only
- Binary DXF format is not supported (only ASCII DXF)

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| 2D canvas rendering | High | Hard | Draw lines/arcs on SVG or canvas |
| Export to SVG | Med | Hard | Requires full entity-to-SVG path conversion |
| Binary DXF support | Low | Hard | Requires binary group-code parser |
