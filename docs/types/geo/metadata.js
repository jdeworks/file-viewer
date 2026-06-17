import { parseGeo, allCoords } from './geolib.js';

export function extract(intake) {
  const geo = parseGeo(intake);
  const coords = allCoords(geo);
  const out = [
    { label: 'Format', value: /\.gpx$/i.test(intake.filename || '') || /^\s*<\?xml/.test(intake.text || '') ? 'GPX' : 'GeoJSON' },
    { label: 'Points', value: String(geo.points.length) },
    { label: 'Lines', value: String(geo.lines.length) },
    { label: 'Polygons', value: String(geo.polygons.length) },
    { label: 'Vertices', value: String(coords.length) },
  ];
  if (coords.length) {
    let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
    for (const [lon, lat] of coords) {
      if (lon < minLon) minLon = lon; if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat; if (lat > maxLat) maxLat = lat;
    }
    out.push({ label: 'Bounds', value: minLon.toFixed(4) + ', ' + minLat.toFixed(4) + ' to ' + maxLon.toFixed(4) + ', ' + maxLat.toFixed(4) });
  }
  return out;
}
