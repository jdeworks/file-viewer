# Map (GeoJSON / GPX)

> Geographic data rendered as an offline map preview with GPX track stats, waypoint listing, and GeoJSON↔GPX conversion.

## Format Details
| Field | Value |
|-------|-------|
| Extensions | `.geojson`, `.gpx` |
| MIME types | `application/geo+json`, `application/gpx+xml` |
| Binary/Text | Text (JSON or XML) |
| Common use | GPS tracks, mapping data, location datasets, GIS exports |

## Capabilities

### View
| Feature | Status | Details |
|---------|--------|---------|
| Offline map preview | ✅ | GeoJSON renders as inline SVG; GPX renders track/waypoints on canvas (no tile server — zero off-origin) |
| Track stats | ✅ | Distance, elevation gain/loss, duration, trackpoints, waypoints |
| GPX metadata | ✅ | Track name, creator, bounds |
| Waypoints | ⚠️ | Plotted as points and counted in the stats table; `<name>` is not parsed or labeled yet (see EDITOR.md "GPX waypoint labels") |
| GeoJSON features | ✅ | Points, LineStrings, Polygons, and Multi* geometries rendered without property labels |
| KML rendering | ❌ | Handled by the dedicated KML viewer, not this map type |
| KMZ (zipped KML) | ❌ | Handled by the dedicated KMZ viewer, not this map type |
| TopoJSON rendering | ❌ | Use the GeoJSON / TopoJSON summary viewer |
| Source view / diff | ✅ | Full raw text editable in Monaco; text diff available |
| Metadata | ✅ | GeoJSON geometry counts and bounds; GPX track stats and bounds |

### Edit
| Feature | Status | Details |
|---------|--------|---------|
| Text / source editing | ✅ | Full GeoJSON/GPX editing in Monaco editor (KML has its own dedicated viewer type) |
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
