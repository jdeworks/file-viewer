# ESRI Shapefile

> ESRI Shapefile viewer — parses `.shp` headers and records to show geometry type, bounding box, shape count, and record type summary.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.shp` |
| MIME type | `application/x-esri-shapefile` |
| Binary / Text | Binary |
| Common use | GIS data exchange, cartographic datasets, census geography |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Geometry type | ✅ | Point / PolyLine / Polygon / MultiPoint etc. |
| Bounding box | ✅ | Xmin/Ymin/Xmax/Ymax from file header |
| Shape count | ✅ | Records counted by walking the `.shp` record stream, capped at 500 for safety |
| Record type summary | ✅ | Count by record shape type |
| DBF field list | ❌ | DBF is handled by the separate DBF viewer when opened directly |
| DBF record count | ❌ | Not available from `.shp` alone |
| Source view | ❌ | Binary format |
| Diff | ❌ | Binary format |
| Metadata | ⚠️ Partial | Format, geometry type, and bounding box; record counts are preview-only |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Editing | ❌ | Binary format |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Real-World Examples

- [`sample.shp`](../examples/sample.shp) — compact shapefile fixture for geometry header and record parsing
- [`sample.dbf`](../examples/sample.dbf) — companion-style DBF fixture opened by the separate DBF viewer

## Known Limitations

- `.shx`, `.dbf`, and `.prj` companion files are not assembled into a single dataset view
- Attribute data must be opened separately as DBF
- No map drawing or coordinate reprojection is performed

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Map rendering | Med | Med | Convert first N shapes to SVG/canvas |
| Export to GeoJSON | Med | Med | Convert shapefile geometry to GeoJSON |
| Companion bundle support | Med | Hard | Load `.shp` + `.shx` + `.dbf` + `.prj` together |
