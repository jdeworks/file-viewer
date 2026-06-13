import { parseGeo, allCoords } from './geolib.js';

export function extract(intake) {
  const geo = parseGeo(intake);
  const coords = allCoords(geo);
  const out = [
    { label: 'Points', value: String(geo.points.length) },
    { label: 'Lines', value: String(geo.lines.length) },
    { label: 'Polygons', value: String(geo.polygons.length) },
    { label: 'Vertices', value: String(coords.length) },
  ];
  return out;
}
