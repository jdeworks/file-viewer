# MATLAB MAT-file

> MATLAB MAT-file viewer — variable names, classes, sizes, and array dimensions from the file header.

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
| MAT format version | ✅ | Level 4 / Level 5 / Level 7.3 (HDF5-based) |
| Variable list | ✅ | Name, class (double/single/int/cell/struct/char), size |
| Array dimensions | ✅ | M×N shape per variable |
| Complex flag | ✅ | Complex arrays marked |
| Sparse flag | ✅ | Sparse arrays identified |
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
- MAT-file v7.3 (HDF5-based) uses the HDF5 viewer path

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Variable preview (numeric) | Low | Med | Show first row/column of double/single arrays |
| Export variable list as JSON | Low | Easy | Name/class/size to JSON |
