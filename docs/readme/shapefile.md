# ESRI Shapefile

> ESRI Shapefile viewer — geometry type, bounding box, shape count, and attribute field list from DBF header.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.shp`, `.shx`, `.dbf`, `.prj` |
| MIME type | `application/x-esri-shapefile` |
| Binary / Text | Binary (.shp, .shx, .dbf) / Text (.prj) |
| Common use | GIS data exchange, cartographic datasets, census geography |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Geometry type | ✅ | Point / PolyLine / Polygon / MultiPoint etc. |
| Bounding box | ✅ | Xmin/Ymin/Xmax/Ymax from file header |
| Shape count | ✅ | Total records from .shp index |
| DBF field list | ✅ | Column names, types, and widths from .dbf header |
| DBF record count | ✅ | Number of attribute table rows |
| Source view | ❌ | Binary format |
| Diff | ❌ | Binary format |
| Metadata | ✅ | Geometry type, bounding box, shape/record counts |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Editing | ❌ | Binary format |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known Limitations

- `.shx` index and `.prj` projection file must be viewed separately
- Only the `.shp` file is parsed; attribute data in `.dbf` shown structurally only

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Map rendering | Low | Med | Convert first N shapes to SVG |
| Export to GeoJSON | Low | Med | Convert shapefile geometry to GeoJSON |
| DBF attribute preview | Low | Easy | Show first 10 rows of attribute table |
