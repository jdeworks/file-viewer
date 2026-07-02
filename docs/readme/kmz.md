# KMZ Map Archive

> KMZ viewer — extracts the embedded KML and shows map name, placemark list with geometry type, folder count, and overlay count.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.kmz` |
| MIME type | `application/vnd.google-earth.kmz` |
| Binary / Text | Binary (ZIP archive of KML) |
| Common use | Google Earth places, geographic data sharing, GPS track exports |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Map name | ✅ | From KML Document/name element |
| Description | ✅ | Document-level description |
| Placemark count | ✅ | Total placemarks in KML |
| Placemark list | ✅ | First 50 placemarks with name, geometry type, description |
| Geometry breakdown | ✅ | Point / LineString / Polygon counts |
| Folder count | ✅ | KML Folder elements |
| Ground overlays | ⚠️ | Parsed internally but not displayed in the current KMZ summary |
| Network links | ⚠️ | Parsed internally but not displayed in the current KMZ summary |
| File count | ✅ | Number of files inside ZIP |
| Source view | ❌ | Binary ZIP format |
| Diff | ❌ | Binary format |
| Metadata | ⚠️ | Side panel reports KMZ/ZIP container only; map details are in the preview |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Editing | ❌ | Binary format |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known Limitations

- Map is not rendered visually — text metadata only
- Embedded images (icons, ground overlay textures) are not shown
- NetworkLink and GroundOverlay counts are not currently surfaced in the KMZ preview cards

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Map preview | Low | Hard | Requires Leaflet/Mapbox — violates zero off-origin rule unless vendored |
| Extract KML | Low | Easy | Offer embedded KML as downloadable file |
| Coordinate bounds | Low | Easy | Parse coordinates to compute bounding box |
| Surface overlays/links | Low | Easy | Show parsed GroundOverlay and NetworkLink counts in the KMZ summary |
