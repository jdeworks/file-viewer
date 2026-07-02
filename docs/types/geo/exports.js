// Geo exports: convert between GeoJSON and GPX. Both parse into the same {points,lines,polygons}
// model, so conversion is just re-serializing. GPX tracks/waypoints ↔ GeoJSON LineString/Point/
// Polygon. Lossy on properties (geometry only), which is fine for a quick interchange.
import { downloadBlob } from '../../core/exports.js';
import { parseGeo, isGpx as isGpxFile } from './geolib.js';

const n = (x) => Math.round(x * 1e7) / 1e7;

function toGeoJson(geo) {
  const features = [];
  for (const p of geo.points) features.push({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: p } });
  for (const l of geo.lines) features.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: l } });
  for (const p of geo.polygons) features.push({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [p] } });
  return { type: 'FeatureCollection', features };
}

function toGpx(geo) {
  const trk = (pts) => '  <trk><trkseg>\n' + pts.map((p) => '    <trkpt lat="' + n(p[1]) + '" lon="' + n(p[0]) + '"></trkpt>').join('\n') + '\n  </trkseg></trk>\n';
  let out = '<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="file-viewer" xmlns="http://www.topografix.com/GPX/1/1">\n';
  for (const p of geo.points) out += '  <wpt lat="' + n(p[1]) + '" lon="' + n(p[0]) + '"></wpt>\n';
  for (const l of geo.lines) out += trk(l);
  for (const p of geo.polygons) out += trk(p);
  return out + '</gpx>\n';
}

export function getExports(intake) {
  const base = (intake.filename || 'map').replace(/\.[^.]+$/, '');
  const geo = parseGeo(intake);
  if (isGpxFile(intake)) return [{ label: 'Download as GeoJSON', run: () => downloadBlob(JSON.stringify(toGeoJson(geo), null, 2), base + '.geojson', 'application/geo+json') }];
  return [{ label: 'Download as GPX', run: () => downloadBlob(toGpx(geo), base + '.gpx', 'application/gpx+xml') }];
}
