# GeoJSON / TopoJSON

> GeoJSON and TopoJSON viewer — feature counts by geometry type, named feature list, property keys, and bounding box.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.geojson`, `.json`, `.topojson` |
| MIME type | `application/geo+json`, `application/json` |
| Binary / Text | Text (JSON) |
| Common use | Web maps, spatial data exchange, cartography |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Feature count | ✅ | Total features in FeatureCollection |
| Geometry type breakdown | ✅ | Point / LineString / Polygon / Multi* counts |
| Named feature list | ✅ | Up to 8 features with a `name` property |
| Property keys | ✅ | All unique property names shown as chips |
| Bounding box | ✅ | `bbox` array displayed when present |
| TopoJSON support | ✅ | Object list and geometry count for Topology type |
| Format detection | ✅ | GeoJSON Feature vs FeatureCollection vs TopoJSON |
| Source view | ✅ | Monaco editor (JSON syntax) |
| Text diff | ✅ | Standard line diff |
| Metadata | ✅ | Feature count, geometry types, property count |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Source editing | ✅ | Monaco editor with JSON syntax highlighting |
| Save (Companion) | ✅ | Write-back to local file |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known Limitations

- No interactive map rendering — coordinate inspection only
- Feature properties are not tabulated

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Interactive map (Leaflet.js) | Med | Med | Requires vendoring Leaflet (~150 KB) |
| Property table | Med | Easy | Show all features × properties as a table |
| Export bounding box as CSV | Low | Easy | Copy coordinates for use in GIS tools |
