// GeoJSON / GPX map preview — rendered as a pure inline SVG (no map tiles, so it works fully
// offline and makes zero network requests). Geometries are projected with a simple equirectangular
// projection (longitude compressed by cos(latitude) so shapes aren't stretched), fit to a padded
// viewport. Points = circles, lines = polylines, polygons = filled paths. Markup scaffolds live in
// sibling .html templates (error/doc/svg) filled via core/template.js; SVG geometry fragments are
// JS-built from numeric coordinates and inserted via {{&...}} raw slots.
import { parseGeo, allCoords, isGpx, formatDistance, formatDuration, formatElevation } from './geolib.js';
import { loadTemplate, fill } from '../../core/template.js';

const ERROR_TPL = new URL('./error.html', import.meta.url);
const DOC_TPL = new URL('./doc.html', import.meta.url);
const SVG_TPL = new URL('./svg.html', import.meta.url);

const W = 720, PAD = 24;

export async function render(intake, _ctx) {
  const geo = parseGeo(intake);
  const coords = allCoords(geo);
  if (!coords.length) {
    const errorTpl = await loadTemplate(ERROR_TPL);
    return { bodyHtml: errorTpl, hadUnsafe: false };
  }
  if (isGpx(intake)) return renderGpx(geo);

  const [docTpl, svgTpl] = await Promise.all([loadTemplate(DOC_TPL), loadTemplate(SVG_TPL)]);

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

  const svg = fill(svgTpl, { W, H, polys, lines, points });
  return { bodyHtml: fill(docTpl, { counts, bbox, svg }), hadUnsafe: false };
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function boundsText(coords) {
  let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const [lon, lat] of coords) {
    if (lon < minLon) minLon = lon; if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat; if (lat > maxLat) maxLat = lat;
  }
  return minLon.toFixed(4) + ', ' + minLat.toFixed(4) + ' to ' + maxLon.toFixed(4) + ', ' + maxLat.toFixed(4);
}

function chartPoints(geo) {
  let distance = 0;
  const hav = (a, b) => {
    const R = 6371000, rad = (n) => n * Math.PI / 180;
    const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  };
  return (geo.tracks || []).flatMap((trk) => trk.points.map((p, i) => {
    if (i) distance += hav(trk.points[i - 1], p);
    return { x: Math.round(distance), y: p.ele ?? null, t: p.time };
  })).filter((p) => p.y != null);
}

function renderGpx(geo) {
  const coords = allCoords(geo);
  const stats = geo.stats || {};
  const rows = [
    ['Distance', formatDistance(stats.distance || 0), 'distance'],
    ['Elevation gain', formatElevation(stats.gain || 0), 'gain'],
    ['Elevation loss', formatElevation(stats.loss || 0), 'loss'],
    ['Duration', formatDuration(stats.durationMs || 0), 'duration'],
    ['Trackpoints', String(stats.trackpoints || 0), 'trackpoints'],
    ['Waypoints', String(stats.waypoints || 0), 'waypoints'],
  ];
  const data = {
    tracks: geo.tracks || [],
    waypoints: geo.waypoints || [],
    profile: chartPoints(geo),
  };
  const json = JSON.stringify(data).replace(/<\//g, '<\\/');
  const table = rows.map(([label, value, key]) => '<tr><th>' + esc(label) + '</th><td data-stat="' + key + '">' + esc(value) + '</td></tr>').join('');
  const title = esc(geo.name || 'GPX track');
  const creator = geo.creator ? '<span>Creator ' + esc(geo.creator) + '</span>' : '';
  return {
    hadUnsafe: false,
    bodyHtml: `
<section class="gpx-doc">
  <style>
    .gpx-doc{max-width:980px;margin:0 auto;padding:18px;color:#18212f}
    .gpx-head{display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;margin-bottom:12px}
    .gpx-head h1{font-size:1.35rem;margin:0}
    .gpx-head span,.gpx-bounds{color:#586373;font-size:.9rem}
    .gpx-grid{display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:16px;align-items:start}
    .gpx-map,.gpx-elevation{width:100%;display:block;border:1px solid #d8dee8;border-radius:8px;background:#f8fafc}
    .gpx-map{height:360px}
    .gpx-elevation{height:220px;margin-top:16px}
    .gpx-stats{border-collapse:collapse;width:100%;font-size:.92rem}
    .gpx-stats th,.gpx-stats td{padding:8px 10px;border-bottom:1px solid #e2e7ef;text-align:left}
    .gpx-stats th{font-weight:600;color:#394557}
    .gpx-stats td{text-align:right;color:#18212f}
    .fv-dark .gpx-doc{color:#e8edf7}.fv-dark .gpx-head span,.fv-dark .gpx-bounds{color:#a9b4c5}
    .fv-dark .gpx-map,.fv-dark .gpx-elevation{background:#121923;border-color:#2f3b4d}.fv-dark .gpx-stats th,.fv-dark .gpx-stats td{border-color:#2f3b4d;color:#e8edf7}.fv-dark .gpx-stats th{color:#c4ccda}
    @media (max-width:720px){.gpx-doc{padding:12px}.gpx-grid{grid-template-columns:1fr}.gpx-map{height:300px}.gpx-elevation{height:190px}}
  </style>
  <div class="gpx-head"><h1>${title}</h1>${creator}<span>${esc(boundsText(coords))}</span></div>
  <div class="gpx-grid">
    <div>
      <canvas class="gpx-map" aria-label="GPX track map"></canvas>
      <canvas class="gpx-elevation" aria-label="GPX elevation profile"></canvas>
    </div>
    <table class="gpx-stats"><tbody>${table}</tbody></table>
  </div>
</section>
<script src="/vendor/chartjs/chart.umd.js"></scr` + `ipt>
<script>
(() => {
  const data = ${json};
  const isDark = document.body.classList.contains('fv-dark');
  const fg = isDark ? '#e8edf7' : '#18212f';
  const grid = isDark ? '#334155' : '#dbe3ee';
  function sizeCanvas(c) {
    const r = c.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    c.width = Math.max(1, Math.round(r.width * dpr));
    c.height = Math.max(1, Math.round(r.height * dpr));
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w: r.width, h: r.height };
  }
  function drawMap() {
    const c = document.querySelector('.gpx-map');
    const { ctx, w, h } = sizeCanvas(c);
    const pts = data.tracks.flatMap((t) => t.points).concat(data.waypoints || []);
    let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
    pts.forEach((p) => { minLon = Math.min(minLon, p.lon); maxLon = Math.max(maxLon, p.lon); minLat = Math.min(minLat, p.lat); maxLat = Math.max(maxLat, p.lat); });
    const pad = 24, lonSpan = maxLon - minLon || 1e-6, latSpan = maxLat - minLat || 1e-6;
    const x = (p) => pad + ((p.lon - minLon) / lonSpan) * (w - pad * 2);
    const y = (p) => pad + (1 - (p.lat - minLat) / latSpan) * (h - pad * 2);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = isDark ? '#121923' : '#f8fafc';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = grid; ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) { const gx = pad + (w - pad * 2) * i / 4, gy = pad + (h - pad * 2) * i / 4; ctx.beginPath(); ctx.moveTo(gx, pad); ctx.lineTo(gx, h - pad); ctx.moveTo(pad, gy); ctx.lineTo(w - pad, gy); ctx.stroke(); }
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = '#2563eb';
    data.tracks.forEach((t) => { ctx.beginPath(); t.points.forEach((p, i) => i ? ctx.lineTo(x(p), y(p)) : ctx.moveTo(x(p), y(p))); ctx.stroke(); });
    ctx.fillStyle = '#ef4444';
    (data.waypoints || []).forEach((p) => { ctx.beginPath(); ctx.arc(x(p), y(p), 5, 0, Math.PI * 2); ctx.fill(); });
  }
  function drawFallbackProfile(c) {
    const { ctx, w, h } = sizeCanvas(c);
    const pts = data.profile;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = isDark ? '#121923' : '#f8fafc'; ctx.fillRect(0, 0, w, h);
    if (!pts.length) return;
    const minX = pts[0].x, maxX = pts[pts.length - 1].x || 1, minY = Math.min(...pts.map((p) => p.y)), maxY = Math.max(...pts.map((p) => p.y));
    const pad = 28, ys = maxY - minY || 1;
    ctx.strokeStyle = grid; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad, h - pad); ctx.lineTo(w - pad, h - pad); ctx.lineTo(w - pad, pad); ctx.stroke();
    ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 3; ctx.beginPath();
    pts.forEach((p, i) => { const x = pad + ((p.x - minX) / (maxX - minX || 1)) * (w - pad * 2), y = pad + (1 - (p.y - minY) / ys) * (h - pad * 2); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.stroke();
  }
  function drawProfile() {
    const c = document.querySelector('.gpx-elevation');
    if (window.Chart && data.profile.length) {
      new Chart(c, { type: 'line', data: { datasets: [{ label: 'Elevation', data: data.profile, borderColor: '#16a34a', backgroundColor: 'rgba(22,163,74,.12)', tension: .25, fill: true, pointRadius: 2 }] }, options: { responsive: true, maintainAspectRatio: false, parsing: false, plugins: { legend: { display: false } }, scales: { x: { type: 'linear', title: { display: true, text: 'Distance (m)', color: fg }, ticks: { color: fg }, grid: { color: grid } }, y: { title: { display: true, text: 'Elevation (m)', color: fg }, ticks: { color: fg }, grid: { color: grid } } } } });
    } else drawFallbackProfile(c);
  }
  drawMap(); drawProfile();
  window.addEventListener('resize', () => { drawMap(); if (!window.Chart) drawFallbackProfile(document.querySelector('.gpx-elevation')); });
})();
</scr` + `ipt>`,
  };
}
