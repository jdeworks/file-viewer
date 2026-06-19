# CIF Crystallographic Data

> CIF / mmCIF viewer — unit cell parameters, space group, compound info, R-factor, and atom count per data block.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.cif`, `.mmcif` |
| MIME type | `text/plain` |
| Binary / Text | Text |
| Common use | Crystal structure data from X-ray diffraction, neutron diffraction, electron crystallography |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Data blocks | ✅ | Multiple `data_` blocks listed and summarised |
| Compound name | ✅ | `_chemical_name_common` / systematic name |
| Molecular formula | ✅ | `_chemical_formula_sum` / moiety |
| Molecular weight | ✅ | `_chemical_formula_weight` |
| Unit cell parameters | ✅ | a/b/c (Å), α/β/γ (°), volume |
| Space group | ✅ | H-M notation and International Tables number |
| Z value | ✅ | Formula units per cell |
| Experimental method | ✅ | Diffractometer, radiation type |
| R-factor | ✅ | `_refine_ls_R_factor_gt` and `_all` |
| PDB / CSD codes | ✅ | Database cross-references shown |
| mmCIF / PDBx detection | ✅ | Distinguished from CIF 1.1 by entity/pdbx tags |
| Loop table count | ✅ | Number of `loop_` blocks per data block |
| Atom records | ✅ | Approximate atom count from coordinate lines |
| Source view | ✅ | Monaco editor (plaintext mode) |
| Text diff | ✅ | Standard line diff |
| Metadata | ✅ | Formula, space group, format, block count |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Source editing | ✅ | Monaco editor |
| Save (Companion) | ✅ | Write-back to local file |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known Limitations

- CIF 2.0 syntax (square-bracket delimiters) may not parse correctly
- Loop table contents are not rendered — only loop counts
- No 3D crystal structure visualization

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Loop table viewer | Med | Med | Render key loop_ tables as paginated tables |
| 3D structure via NGL Viewer | Low | Hard | Render molecular structure (~2 MB WASM) |
| Export metadata as JSON | Low | Easy | Key-value pairs to JSON download |
