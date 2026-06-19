# Molecular Structure (XYZ)

> XYZ molecular coordinate file viewer — atom list, molecular formula, and bounding box summary.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.xyz` |
| MIME type | `chemical/x-xyz` |
| Binary / Text | Text |
| Common use | Molecular geometry for computational chemistry (ORCA, Gaussian, GAMESS, ASE) |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Atom list | ✅ | Element symbol and XYZ coordinates per atom |
| Atom count | ✅ | Total atoms and per-element counts |
| Molecular formula | ✅ | Derived from atom counts |
| Comment line | ✅ | Second line (energy, charge, etc.) shown |
| Multi-frame files | ✅ | Trajectory files with multiple geometries supported |
| Bounding box | ✅ | Spatial extents of the molecule |
| Source view | ✅ | Monaco editor (plaintext mode) |
| Text diff | ✅ | Standard line diff |
| Preferred mode | Preview | Opens directly in preview |
| Metadata | ✅ | Atom count, element types, bounding box, frame count |

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

- 3D molecular visualization (ball-and-stick model) is not implemented

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| 3D molecular visualization | Med | Hard | Requires 3Dmol.js or NGL Viewer (~2 MB) |
| Convert to SDF/PDB | Low | Med | Geometry-only conversion |
