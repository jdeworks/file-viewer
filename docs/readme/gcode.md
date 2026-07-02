# G-code (3D Print)

> 3D print G-code viewer with slicer detection, print time estimate, filament usage, layer stats, and temperature settings.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.gcode`, `.gc`, `.nc`, `.ngc` |
| MIME type | `text/plain` |
| Binary / Text | Text |
| Common use | 3D printer job files, CNC machine instructions, slicer output |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Slicer detection | ✅ | PrusaSlicer, Cura, OrcaSlicer, BambuStudio, Simplify3D, Slic3r detected from comments |
| Print time estimate | ✅ | Extracted from slicer comment headers |
| Filament usage | ✅ | mm and weight from slicer comments |
| Layer count / height | ✅ | Layer statistics from slicer metadata |
| Nozzle / bed temperature | ✅ | `M104`/`M109`/`M140`/`M190` commands parsed |
| Print volume | ✅ | X/Y/Z extents estimated from G0/G1 moves |
| Syntax highlighting | ✅ | G-code commands colorized (G-commands, M-commands, comments) |
| Source view | ✅ | Monaco editor (plaintext mode) |
| Diff | ❌ | `diff: false` — large binary-like numeric files |
| Metadata | ✅ | Layer count, print time, filament, temps, slicer |

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

- [`sample.gcode`](../examples/sample.gcode) — example 3D print G-code from PrusaSlicer

## Known Limitations

- 3D toolpath preview (path visualization on a canvas) is not implemented
- CNC G-code (non-FFF) may not extract accurate metadata (different comment format)

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| 3D toolpath preview | Med | Hard | Render extrusion moves on a canvas; WebGL or SVG |
| Layer-by-layer progress | Low | Med | Slider to show print up to a given layer |
