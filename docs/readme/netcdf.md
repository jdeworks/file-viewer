# NetCDF Scientific Data

> NetCDF viewer — format version (classic/64-bit/HDF5-based), dimensions, variables with shapes and types, and global attributes.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.nc`, `.nc4`, `.netcdf` |
| MIME type | `application/x-netcdf` |
| Binary / Text | Binary |
| Common use | Climate science, oceanography, atmospheric models (NOAA, ECMWF, NASA) |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Format version | ✅ | Classic (v1), 64-bit offset (v2), or netCDF-4/HDF5 |
| Dimension list | ✅ | Name and size per dimension |
| Variable list | ✅ | Name, dtype, dimensions, and shape |
| Global attributes | ✅ | `title`, `institution`, `source`, `history`, etc. |
| Variable attributes | ✅ | `units`, `long_name`, `_FillValue` per variable |
| Record dimensions | ✅ | Unlimited (time) dimensions marked |
| Source view | ❌ | Binary format |
| Diff | ❌ | Binary format |
| Metadata | ✅ | Version, dimension count, variable count |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Editing | ❌ | Binary format |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known Limitations

- Variable data (array values) are not shown — metadata only
- netCDF-4/HDF5 files show limited info (HDF5 parser is simplified)

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| 2D variable preview | Low | Med | Render first 2D slice of gridded data as heatmap |
| CDL text export | Low | Med | Generate CDL (Common Data form Language) description |
