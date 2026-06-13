// GeoJSON / GPX map preview — rendered as a pure inline SVG (no map tiles, so it works fully
// offline and makes zero network requests). Geometries are projected with a simple equirectangular
// projection (longitude compressed by cos(latitude) so shapes aren't stretched), fit to a padded
// viewport. Points = circles, lines = polylines, polygons = filled paths.
import { parseGeo, allCoords } from './geolib.js';

const W = 720, PAD = 24;

export async function render(intake, _ctx) {
  const geo = parseGeo(intake);
  const coords = allCoords(geo);
  if (!coords.length) {
    return { bodyHtml: '<div class="json-error"><strong>No geometry found</strong><br>Expected GeoJSON features or GPX track/route/waypoints.</div>', hadUnsafe: false };
  }

  let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const [lon, lat] of coords) {
    if (lon < minLon) minLon = lon; if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat; if (lat > maxLat) maxLat = lat;
  }
  const meanLat = (minLat + maxLat) / 2;
  const cos = Math.max(0.01, Math.cos(meanLat * Math.PI / 180));
  let lonSpan = (maxLon - minLon) * cos || 1e-6;
  let latSpan = (maxLat - minLat) || 1e-6;
  const inner = W - PAD * 2;
  const H = Math.max(160, Math.min(560, Math.round(inner * (latSpan / lonSpan)))) + PAD * 2;
  const innerH = H - PAD * 2;

  const px = (lon) => PAD + ((lon - minLon) * cos / lonSpan) * inner;
  const py = (lat) => PAD + (1 - (lat - minLat) / latSpan) * innerH;
  const pt = ([lon, lat]) => px(lon).toFixed(1) + ',' + py(lat).toFixed(1);

  const polys = geo.polygons.map((ring) => '<path class="geo-poly" d="M' + ring.map(pt).join(' L') + ' Z"/>').join('');
  const lines = geo.lines.map((line) => '<polyline class="geo-line" points="' + line.map(pt).join(' ') + '"/>').join('');
  const points = geo.points.map(([lon, lat]) => '<circle class="geo-pt" cx="' + px(lon).toFixed(1) + '" cy="' + py(lat).toFixed(1) + '" r="4"/>').join('');

  const counts = geo.points.length + ' point' + (geo.points.length === 1 ? '' : 's')
    + ' · ' + geo.lines.length + ' line' + (geo.lines.length === 1 ? '' : 's')
    + ' · ' + geo.polygons.length + ' polygon' + (geo.polygons.length === 1 ? '' : 's');
  const bbox = 'bbox [' + minLon.toFixed(4) + ', ' + minLat.toFixed(4) + '] → [' + maxLon.toFixed(4) + ', ' + maxLat.toFixed(4) + ']';

  const svg = '<svg class="geo-svg" viewBox="0 0 ' + W + ' ' + H + '" width="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">'
    + '<rect x="0" y="0" width="' + W + '" height="' + H + '" class="geo-bg"/>' + polys + lines + points + '</svg>';
  return { bodyHtml: '<div class="geo-doc"><div class="geo-meta">' + counts + ' · ' + bbox + '</div>' + svg + '</div>', hadUnsafe: false };
}
