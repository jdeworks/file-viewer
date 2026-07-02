# MBTiles Map Tileset

> MBTiles viewer — SQLite-based tile database metadata: name, description, format, bounds, zoom levels, and tile count.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.mbtiles` |
| MIME type | `application/x-sqlite3` |
| Binary / Text | Binary (SQLite database) |
| Common use | Offline map tile distribution (Mapbox, QGIS, MapTiler) |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Name | ✅ | From `metadata` table |
| Description | ✅ | `metadata.description` |
| Format | ✅ | PNG / JPEG / PBF (vector tiles) |
| Bounds | ✅ | Min/max longitude and latitude |
| Center | ✅ | Default center coordinate and zoom |
| Min/max zoom | ✅ | `minzoom` and `maxzoom` |
| Tile count | ✅ | Total tiles in `tiles` table |
| Zoom histogram | ✅ | Tile count grouped by zoom level |
| Version | ✅ | MBTiles spec version |
| Source view | ❌ | Binary SQLite |
| Diff | ❌ | Binary format |
| Metadata | ⚠️ | Side panel reports MBTiles/SQLite container; preview reads name, bounds, zoom range, and tile count |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Editing | ❌ | Binary SQLite |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known Limitations

- Individual tiles are not rendered (no map preview)
- Vector tile (PBF) schema is not decoded
- Metadata is limited to the standard `metadata` table and tile counts

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Tile preview at default zoom | Low | Med | Render a single tile for the center coordinate |
| Vector tile schema | Low | Hard | Parse `.pbf` layer names and feature types |
