# Editor Roadmap — Geo (GeoJSON · GPX · KML · Shapefile · GDF)

## Current state

Two distinct render paths live in `docs/types/geo/renderer.js`, both fully offline with no map tiles:

**GeoJSON path** — equirectangular SVG projection (longitude compressed by cos(latitude)), fit to a 720px padded viewport. Renders polygons as `<path>`, lines as `<polyline>`, points as `<circle>`. Displays feature counts and bounding-box coordinates. No interactivity beyond viewing.

**GPX path** — canvas-based; draws the track on a 360px canvas map and an elevation profile on a 220px canvas (Chart.js if loaded, otherwise a plain canvas fallback). Stats table shows distance, elevation gain/loss, duration, trackpoint count, and waypoint count. Map is drawn with haversine-correct distance calculations.

`geolib.js` handles parsing: GeoJSON (FeatureCollection, Feature, bare geometries, all standard geometry types) and GPX (tracks, routes, waypoints, elevation, timestamps). No KML, Shapefile, or GDF parser exists yet.

`detect.js` claims: `.geojson` at 0.97, `.gpx` at 0.90, GPX XML sniff at 0.95, GeoJSON FeatureCollection sniff at 0.55.

Both renderers return `{ bodyHtml, hadUnsafe: false }`.

---

## Viewer enhancements (no write-back needed)

- **Feature hover tooltip** — for GeoJSON, convert the SVG path/polyline/circle elements to `<g>` groups carrying `data-props` attributes from each feature's `properties` object; show a floating tooltip on mouseover with key-value pairs — M

- **Attribute table panel** — collapsible panel below the SVG listing all GeoJSON features as rows, with their properties as columns; clicking a row highlights the corresponding geometry by adding a CSS class — M

- **Style by property** — dropdown to pick a numeric or categorical property; map it to a color scale (categorical: categorical palette; numeric: linear interpolation e.g. yellow→red); re-render SVG fills accordingly — M (key lib: d3-scale from a pre-bundled CDN drop, or a hand-rolled linear interpolator)

- **Layer toggle (multi-geometry)** — add checkboxes to independently show/hide points, lines, and polygons layers — S

- **Measurement tool** — click two points on the SVG; invert the equirectangular projection to recover lon/lat; compute haversine distance (the formula already exists in `geolib.js`); display result in km/m — M

- **GPX pace/speed chart** — compute time delta between consecutive trackpoints (timestamps already parsed); add a speed channel to the elevation canvas or a third Chart.js panel — M

- **GPX waypoint labels** — render waypoint `<name>` elements from the GPX as text labels on the canvas map next to the red circles — S

- **Minimap / overview** — for large GeoJSON with many features, render a small thumbnail overview with a viewport rectangle that syncs with a panned main view — L

- **KML parser** — add `parseKml()` to `geolib.js`: DOMParser on the XML, extract `<Placemark>` children, map `<Point>`, `<LineString>`, `<Polygon>` coordinates to the same `{ points, lines, polygons }` normalized output; update `detect.js` for `.kml` at 0.95 — M

- **CRS / projection info panel** — display the detected CRS (WGS84 assumed; surface it explicitly), bounding box in both decimal degrees and approximate UTM zone — S

---

## In-browser editing (download-on-save)

- **Draw new features (points/lines/polygons)** — switch the SVG renderer to an interactive SVG (not inline HTML); add draw-mode buttons (point / polyline / polygon); capture `click` events on the SVG to push coordinate vertices; on close/double-click, append a new GeoJSON Feature to the in-memory FeatureCollection; download button exports the modified GeoJSON — L (key lib: no heavy dependency needed; pure SVG event handling; alternatively Leaflet.draw if the renderer is migrated to Leaflet)

- **Edit vertices** — when a feature is selected (click to select), render its vertices as draggable SVG circles; `pointermove` updates the coordinate array in real-time and re-renders the path; download exports modified GeoJSON — L

- **Delete features** — select a feature (click) and press Delete or a trash button to remove it from the FeatureCollection; download exports the pruned GeoJSON — S (once selection is implemented)

- **Style editor (fill / stroke / opacity)** — per-feature or per-layer color and opacity controls written into the feature's `properties.stroke`, `properties.fill`, `properties.fill-opacity` (GeoJSON simple-style spec); persisted into the exported GeoJSON — M

- **Export as KML** — serialize the in-memory FeatureCollection to a KML document: wrap each feature in `<Placemark>`, map geometry types to their KML equivalents, write coordinates in `lon,lat,0` format; download as `.kml` — M

- **Export as GeoJSON** — always available; serialize the current in-memory FeatureCollection (including any drawn or edited features) to pretty-printed GeoJSON and trigger a blob download — S

- **GPX export** — serialize GPX tracks and waypoints back to a `<gpx>` XML document; useful after editing waypoint names or trimming a track — M

- **WGS84 ↔ UTM coordinate toggle** — add a toolbar toggle that re-labels bounding box and tooltip coordinates between decimal degrees and UTM easting/northing; conversion is pure math, no library needed for a single zone — M

- **Shapefile reader** — parse `.shp` + `.dbf` binary formats in JS: SHP is a fixed binary record structure; DBF is dBASE III; produce the same normalized `{ points, lines, polygons }` output and feature properties for the GeoJSON viewer pipeline — L (key lib: `shapefile` npm package pre-bundled, or a standalone pure-JS parser ~300 lines)

---

## Full write-back editing (companion required)

- **Save edited GeoJSON in-place** — write the modified FeatureCollection back to the original file path via the Tauri/Axum companion write-back endpoint; preserves CRS and any top-level properties the viewer does not touch

- **Watch for external edits** — companion file-watch; reload geometry when the source `.geojson` or `.gpx` file changes on disk (useful when editing in QGIS alongside)

- **Split track at point (GPX)** — select a trackpoint on the elevation profile or map canvas; split the GPX track at that point into two `<trk>` elements; write back the modified GPX

---

## Shared toolbar / modular note

The GPX and GeoJSON paths currently share only the `parseGeo` / `allCoords` entry points. As interactivity grows, extract a shared `GeoToolbar` component (mode buttons: view / draw / edit / delete; layer toggles; export menu) that both paths mount. The SVG renderer should move from inline `bodyHtml` string-building to a live DOM construction pattern (same style as `mountMeshView`) so event listeners can be attached directly to SVG elements without relying on `<script>` injection. This is a prerequisite for vertex editing and draw mode.
