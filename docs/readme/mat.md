# MATLAB MAT-file

> MATLAB MAT-file viewer — v5 header metadata plus variable names, classes, sizes, and array dimensions.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.mat` |
| MIME type | `application/x-matlab-data` |
| Binary / Text | Binary |
| Common use | MATLAB workspace saves, Simulink data, scientific computation |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| MAT format version | ✅ | MATLAB v5 header detection and endian marker |
| Variable list | ✅ | Name, class (double/single/int/cell/struct/char), size |
| Array dimensions | ✅ | M×N shape per variable |
| Complex flag | ❌ | Array flags are not surfaced yet |
| Sparse flag | ◐ | Sparse class is listed when present; sparse structure is not decoded |
| Header text | ✅ | MATLAB platform/date from 124-byte header |
| Source view | ❌ | Binary format |
| Diff | ❌ | Binary format |
| Metadata | ✅ | Format version, variable count, class summary |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Editing | ❌ | Binary format |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known Limitations

- Variable values are not shown — structure only
- Level 4 and v7.3/HDF5 `.mat` files are not decoded by this viewer path yet
- Compressed v5 matrix payloads are not inflated, so variables stored inside them may not appear

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| v7.3 / HDF5 handoff | High | Med | Route HDF5-backed `.mat` files to the HDF5 structure viewer |
| Compressed matrix inflate | Med | Med | Decode `miCOMPRESSED` payloads before variable extraction |
| Complex/sparse flags | Low | Easy | Surface v5 array flag bits in the variable table |
| Variable preview (numeric) | Low | Med | Show first row/column of double/single arrays |
| Export variable list as JSON | Low | Easy | Name/class/size to JSON |
