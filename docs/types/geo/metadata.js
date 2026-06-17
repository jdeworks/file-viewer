import { parseGeo, allCoords, isGpx, formatDistance, formatDuration, formatElevation } from './geolib.js';

export function extract(intake) {
  const geo = parseGeo(intake);
  const coords = allCoords(geo);
  if (isGpx(intake)) return gpxMetadata(geo, coords);
  const out = [
    { label: 'Format', value: 'GeoJSON' },
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

function gpxMetadata(geo, coords) {
  const out = [{ label: 'Format', value: 'GPX' }];
  if (geo.name) out.push({ label: 'Track name', value: geo.name });
  if (geo.creator) out.push({ label: 'Creator', value: geo.creator });
  out.push(
    { label: 'Tracks', value: String(geo.tracks?.length || 0) },
    { label: 'Trackpoints', value: String(geo.stats?.trackpoints || 0) },
    { label: 'Waypoints', value: String(geo.stats?.waypoints || 0) },
    { label: 'Distance', value: formatDistance(geo.stats?.distance || 0) },
    { label: 'Elevation gain', value: formatElevation(geo.stats?.gain || 0) },
    { label: 'Elevation loss', value: formatElevation(geo.stats?.loss || 0) },
    { label: 'Duration', value: formatDuration(geo.stats?.durationMs || 0) },
  );
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

export async function extractMetadata(intake) {
  return { fields: extract(intake) };
}
