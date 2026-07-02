# Molecular Structure (XYZ)

> XYZ molecular coordinate file viewer — atom summaries, molecular formula, bounding box, multi-frame summary, and opt-in 3D structure preview.

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
| Atom summary | ✅ | Per-element counts, names, and formula derived from atom symbols |
| Atom count | ✅ | Total atoms and per-element counts |
| Molecular formula | ✅ | Derived from atom counts |
| Comment line | ✅ | Second line (energy, charge, etc.) shown |
| Multi-frame files | ✅ | First three frames summarized; metadata counts all frames |
| Bounding box | ✅ | Spatial extents of the molecule |
| 3D structure preview | ✅ | Opt-in 3Dmol panel lazy-loads on click and shows the first frame |
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

- The 3D panel renders the first frame only; trajectory animation is not implemented
- The text summary caps frame details to the first three frames

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Multi-frame 3D trajectory playback | Med | Hard | Animate parsed frames in the 3Dmol panel |
| Convert to SDF/PDB | Low | Med | Geometry-only conversion |
