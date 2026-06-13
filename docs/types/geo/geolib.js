// Parse GeoJSON or GPX into a normalized set of geometries: points, lines, polygons — each a
// list of [lon, lat] coordinates. No projection here; the renderer maps to SVG. Pure client-side.

export function parseGeo(intake) {
  const text = intake.text || '';
  const name = (intake.filename || '').toLowerCase();
  if (name.endsWith('.gpx') || /^\s*<\?xml/.test(text) && /<gpx[\s>]/.test(text)) return parseGpx(text);
  return parseGeoJson(text);
}

function empty() { return { points: [], lines: [], polygons: [] }; }

function parseGeoJson(text) {
  const out = empty();
  let obj;
  try { obj = JSON.parse(text); } catch { return out; }
  const geoms = [];
  const pushGeom = (g) => {
    if (!g) return;
    if (g.type === 'GeometryCollection') { (g.geometries || []).forEach(pushGeom); return; }
    geoms.push(g);
  };
  if (obj.type === 'FeatureCollection') (obj.features || []).forEach((f) => pushGeom(f.geometry));
  else if (obj.type === 'Feature') pushGeom(obj.geometry);
  else pushGeom(obj);

  for (const g of geoms) {
    const c = g.coordinates;
    switch (g.type) {
      case 'Point': out.points.push(c); break;
      case 'MultiPoint': out.points.push(...c); break;
      case 'LineString': out.lines.push(c); break;
      case 'MultiLineString': out.lines.push(...c); break;
      case 'Polygon': out.polygons.push(c[0]); break;                          // outer ring
      case 'MultiPolygon': c.forEach((poly) => out.polygons.push(poly[0])); break;
      default: break;
    }
  }
  return out;
}

function parseGpx(text) {
  const out = empty();
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.querySelector('parsererror')) return out;
  const ll = (el) => [parseFloat(el.getAttribute('lon')), parseFloat(el.getAttribute('lat'))];
  for (const seg of doc.querySelectorAll('trkseg')) {
    const pts = [...seg.querySelectorAll('trkpt')].map(ll).filter((p) => isFinite(p[0]) && isFinite(p[1]));
    if (pts.length) out.lines.push(pts);
  }
  for (const rte of doc.querySelectorAll('rte')) {
    const pts = [...rte.querySelectorAll('rtept')].map(ll).filter((p) => isFinite(p[0]) && isFinite(p[1]));
    if (pts.length) out.lines.push(pts);
  }
  for (const wpt of doc.querySelectorAll('gpx > wpt, wpt')) {
    const p = ll(wpt);
    if (isFinite(p[0]) && isFinite(p[1])) out.points.push(p);
  }
  return out;
}

// All coordinates flattened — used for the bounding box.
export function allCoords(geo) {
  return [...geo.points, ...geo.lines.flat(), ...geo.polygons.flat()];
}
