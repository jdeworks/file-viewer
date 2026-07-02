# KML Map

> KML viewer — placemark list with geometry types, folder count, ground overlays, network links, and document name.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.kml` |
| MIME type | `application/vnd.google-earth.kml+xml` |
| Binary / Text | Text (XML) |
| Common use | Google Earth / Maps layers, GPS track exports, geographic annotations |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Document name | ✅ | From `<name>` on Document or root element |
| Description | ✅ | `<description>` of Document element |
| Placemark count | ✅ | Total placemarks |
| Folder count | ✅ | Nested folder count |
| Ground overlay count | ✅ | `<GroundOverlay>` elements |
| Network link count | ✅ | `<NetworkLink>` references |
| Geometry type breakdown | ✅ | Points / Lines / Polygons counted |
| Placemark list | ✅ | First 50: name, description, geometry type icon |
| Source view | ✅ | Monaco editor (XML syntax) |
| Text diff | ✅ | Standard line diff |
| Metadata | ✅ | Placemark count, geometry types, folder count |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Source editing | ✅ | Monaco editor with XML highlighting |
| Save (Companion) | ✅ | Write-back to local file |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known Limitations

- `.kmz` (zipped KML) is handled by the dedicated KMZ viewer, not this text type
- No interactive map rendering
- Extended data / schemas are not parsed

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Interactive map (Leaflet) | Med | Med | Render placemarks on a tile map |
| Coordinate bounds | Low | Easy | Compute min/max lat/lng from all coordinates |
