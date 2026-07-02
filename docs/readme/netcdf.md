# NetCDF Scientific Data

> NetCDF viewer — NetCDF-3 classic/64-bit header parser with dimensions, variables, and attributes; NetCDF-4/HDF5 is detected with a clear limitation note.

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
| Format version | ✅ | NetCDF-3 Classic (`CDF\x01`), NetCDF-3 64-bit Offset (`CDF\x02`), or NetCDF-4/HDF5 detection |
| Dimension list | ✅ | Name and size per dimension |
| Variable list | ✅ | Name, dtype, dimension names/shape, and attribute summary |
| Global attributes | ✅ | `title`, `institution`, `source`, `history`, etc. |
| Variable attributes | ✅ | Parsed and summarized in the variable table |
| Record dimensions | ✅ | Unlimited (time) dimensions marked |
| NetCDF-4 / HDF5 | ⚠️ | Detected as HDF5-backed NetCDF-4, but header contents are not parsed in this viewer |
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
- netCDF-4/HDF5 files show only the format note; they are not handed to an HDF5 structure parser yet

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| NetCDF-4/HDF5 structure | High | Med | Reuse or share the HDF5 parser path for `.nc4` files |
| 2D variable preview | Low | Med | Render first 2D slice of gridded data as heatmap |
| CDL text export | Low | Med | Generate CDL (Common Data form Language) description |
