# Map (GeoJSON / GPX / KML)

> Geographic data rendered as an interactive canvas map with track stats, waypoint listing, and GeoJSON↔GPX conversion.

## Format Details
| Field | Value |
|-------|-------|
| Extensions | `.geojson`, `.gpx`, `.kml`, `.kmz`, `.topojson` |
| MIME types | `application/geo+json`, `application/gpx+xml`, `application/vnd.google-earth.kml+xml` |
| Binary/Text | Text (XML or JSON) |
| Common use | GPS tracks, mapping data, location datasets, GIS exports |

## Capabilities

### View
| Feature | Status | Details |
|---------|--------|---------|
| Interactive map | ✅ | Canvas-rendered track/waypoints (no tile server — zero off-origin) |
| Track stats | ✅ | Distance, elevation gain/loss, duration, trackpoints, waypoints |
| GPX metadata | ✅ | Track name, creator, bounds |
| Waypoints | ✅ | Listed with name and coordinates |
| GeoJSON features | ✅ | Points, LineStrings, Polygons rendered with labels |
| KML rendering | ✅ | Placemarks and paths |
| KMZ (zipped KML) | ✅ | Auto-extracted and parsed |
| Source view / diff | ✅ | Full raw text editable in Monaco; text diff available |
| Metadata | ✅ | Feature count, bounds, coordinate count |

### Edit
| Feature | Status | Details |
|---------|--------|---------|
| Text / source editing | ✅ | Full GeoJSON/GPX/KML editing in Monaco editor |
| Add/move waypoints | ❌ | Visual map editing not yet implemented |

### Export
| Feature | Status | Details |
|---------|--------|---------|
| Download original | ✅ | Always available |
| Convert GPX → GeoJSON | ✅ | Geometry-only (properties not carried over) |
| Convert GeoJSON → GPX | ✅ | Points → waypoints, LineStrings → tracks |
| Export as KML | ❌ | Not yet implemented |

## Example Files
- [`sample.geojson`](../examples/sample.geojson) — GeoJSON feature collection
- [`sample.gpx`](../examples/sample.gpx) — GPS track file

## Gaps / Planned Improvements
| Feature | Priority | Notes |
|---------|----------|-------|
| Visual waypoint editing | High | Click map to add/move waypoints; save to source |
| KML export | Medium | Convert GeoJSON/GPX → KML |
| Elevation profile chart | Medium | Chart altitude vs. distance for GPX tracks |
| Tile background option | Low | Optional OpenStreetMap tile layer (off-origin opt-in) |
| Heatmap mode | Low | Density visualization for point clouds |
| Polygon area calculation | Low | Show area in km² for polygon features |
