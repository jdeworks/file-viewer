// Parse GeoJSON or GPX into a normalized set of geometries: points, lines, polygons — each a
// list of [lon, lat] coordinates. No projection here; the renderer maps to SVG. Pure client-side.

export function parseGeo(intake) {
  const text = intake.text || '';
  const name = (intake.filename || '').toLowerCase();
  if (name.endsWith('.gpx') || /<gpx[\s>]/.test(text)) return parseGpx(text);
  return parseGeoJson(text);
}

function empty(extra = {}) { return { points: [], lines: [], polygons: [], ...extra }; }

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
  const out = empty({ format: 'GPX', tracks: [], waypoints: [], creator: '', name: '', stats: null });
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.querySelector('parsererror')) return out;
  const root = doc.querySelector('gpx');
  out.creator = root?.getAttribute('creator') || '';
  out.name = doc.querySelector('trk > name')?.textContent?.trim() || doc.querySelector('metadata > name')?.textContent?.trim() || '';
  const pt = (el) => {
    const lon = parseFloat(el.getAttribute('lon'));
    const lat = parseFloat(el.getAttribute('lat'));
    if (!isFinite(lon) || !isFinite(lat)) return null;
    const eleEl = el.querySelector('ele');
    const timeEl = el.querySelector('time');
    const ele = eleEl ? parseFloat(eleEl.textContent) : null;
    const time = timeEl ? Date.parse(timeEl.textContent) : null;
    return { lon, lat, ele: isFinite(ele) ? ele : null, time: isFinite(time) ? time : null };
  };
  for (const trk of doc.querySelectorAll('trk')) {
    const trackName = trk.querySelector(':scope > name')?.textContent?.trim() || '';
    for (const seg of trk.querySelectorAll('trkseg')) {
      const pts = [...seg.querySelectorAll('trkpt')].map(pt).filter(Boolean);
      if (!pts.length) continue;
      out.tracks.push({ name: trackName, points: pts });
      out.lines.push(pts.map((p) => [p.lon, p.lat]));
    }
  }
  for (const rte of doc.querySelectorAll('rte')) {
    const pts = [...rte.querySelectorAll('rtept')].map(pt).filter(Boolean);
    if (pts.length) {
      out.tracks.push({ name: rte.querySelector(':scope > name')?.textContent?.trim() || '', points: pts });
      out.lines.push(pts.map((p) => [p.lon, p.lat]));
    }
  }
  for (const wpt of doc.querySelectorAll('gpx > wpt, wpt')) {
    const p = pt(wpt);
    if (p) { out.points.push([p.lon, p.lat]); out.waypoints.push(p); }
  }
  out.stats = gpxStats(out);
  return out;
}

export function isGpx(intake) {
  return /\.gpx$/i.test(intake.filename || '') || /<gpx[\s>]/.test(intake.text || '');
}

function haversine(a, b) {
  const R = 6371000;
  const rad = (n) => n * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const s1 = Math.sin(dLat / 2), s2 = Math.sin(dLon / 2);
  const h = s1 * s1 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * s2 * s2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function gpxStats(geo) {
  let distance = 0, gain = 0, loss = 0, points = 0;
  let firstTime = null, lastTime = null;
  for (const trk of geo.tracks || []) {
    points += trk.points.length;
    for (let i = 0; i < trk.points.length; i++) {
      const p = trk.points[i];
      if (p.time != null) {
        if (firstTime == null || p.time < firstTime) firstTime = p.time;
        if (lastTime == null || p.time > lastTime) lastTime = p.time;
      }
      if (i === 0) continue;
      const prev = trk.points[i - 1];
      distance += haversine(prev, p);
      if (prev.ele != null && p.ele != null) {
        const d = p.ele - prev.ele;
        if (d > 0) gain += d;
        else loss += Math.abs(d);
      }
    }
  }
  return { distance, gain, loss, durationMs: firstTime != null && lastTime != null ? Math.max(0, lastTime - firstTime) : 0, trackpoints: points, waypoints: geo.waypoints?.length || 0 };
}

export function formatDistance(m) {
  return m >= 1000 ? (m / 1000).toFixed(2) + ' km' : Math.round(m) + ' m';
}

export function formatDuration(ms) {
  const mins = Math.round(ms / 60000);
  if (mins < 60) return mins + ' min';
  return Math.floor(mins / 60) + ' h ' + String(mins % 60).padStart(2, '0') + ' min';
}

export function formatElevation(m) {
  return Math.round(m) + ' m';
}

// All coordinates flattened — used for the bounding box.
export function allCoords(geo) {
  return [...geo.points, ...geo.lines.flat(), ...geo.polygons.flat()];
}
