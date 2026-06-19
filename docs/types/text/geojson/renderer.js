function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

const GEOM_ICON = {
  Point: '📍', MultiPoint: '📍', LineString: '〰', MultiLineString: '〰',
  Polygon: '🔷', MultiPolygon: '🔷', GeometryCollection: '📦',
};

function parseGeoJson(text) {
  let doc;
  try { doc = JSON.parse(text); } catch { return null; }

  const t = doc.type;
  if (t === 'Topology') {
    const objects = Object.keys(doc.objects || {});
    const totalFeatures = objects.reduce((n, k) => {
      const obj = doc.objects[k];
      return n + (obj.geometries ? obj.geometries.length : 1);
    }, 0);
    return { format: 'TopoJSON', objects, totalFeatures, bbox: doc.bbox };
  }

  const features = t === 'FeatureCollection' ? (doc.features || [])
    : t === 'Feature' ? [doc] : [];

  const geomCounts = {};
  const propKeys = new Set();
  for (const f of features) {
    const gt = f?.geometry?.type || 'Unknown';
    geomCounts[gt] = (geomCounts[gt] || 0) + 1;
    for (const k of Object.keys(f?.properties || {})) propKeys.add(k);
  }

  const named = features.filter((f) => f?.properties?.name).slice(0, 8);
  return { format: t === 'Feature' ? 'GeoJSON Feature' : 'GeoJSON', features, geomCounts, propKeys: [...propKeys].slice(0, 20), named, bbox: doc.bbox };
}

export function render(intake) {
  const text = intake.text || '';
  if (!text.trim()) return { bodyHtml: '<div class="geo-preview"><p class="geo-note">Empty file.</p></div>' };

  const info = parseGeoJson(text);
  if (!info) return { bodyHtml: '<div class="geo-preview"><p class="geo-note">Could not parse as GeoJSON/TopoJSON.</p></div>' };

  if (info.format === 'TopoJSON') {
    const objList = info.objects.map((o) => `<span class="geo-chip">${esc(o)}</span>`).join('');
    return { bodyHtml: `<div class="geo-preview">
  <div class="geo-header"><span class="geo-badge">TOPO</span><span class="geo-title">TopoJSON</span></div>
  <div class="geo-stats">
    <div class="geo-stat"><div class="geo-stat-value">${info.totalFeatures}</div><div class="geo-stat-label">Geometries</div></div>
    <div class="geo-stat"><div class="geo-stat-value">${info.objects.length}</div><div class="geo-stat-label">Objects</div></div>
  </div>
  <div class="geo-section"><div class="geo-label">Objects</div><div class="geo-chips">${objList}</div></div>
  ${info.bbox ? `<p class="geo-note">Bounding box: ${info.bbox.map((v) => v.toFixed(4)).join(', ')}</p>` : ''}
</div>` };
  }

  const total = info.features.length;
  const geomRows = Object.entries(info.geomCounts)
    .map(([gt, n]) => `<tr><td>${GEOM_ICON[gt] || ''} ${esc(gt)}</td><td>${n}</td></tr>`)
    .join('');
  const namedList = info.named.map((f) => {
    const name = f?.properties?.name || '';
    const gt = f?.geometry?.type || '';
    return `<tr><td class="geo-geom">${GEOM_ICON[gt] || ''}${esc(gt)}</td><td>${esc(name)}</td></tr>`;
  }).join('');
  const propChips = info.propKeys.map((k) => `<span class="geo-chip">${esc(k)}</span>`).join('');

  return { bodyHtml: `<div class="geo-preview">
  <div class="geo-header"><span class="geo-badge">GEO</span><span class="geo-title">${esc(info.format)}</span></div>
  <div class="geo-stats">
    <div class="geo-stat"><div class="geo-stat-value">${total}</div><div class="geo-stat-label">Features</div></div>
    ${Object.keys(info.geomCounts).length > 0 ? `<div class="geo-stat"><div class="geo-stat-value">${Object.keys(info.geomCounts).length}</div><div class="geo-stat-label">Geom types</div></div>` : ''}
    ${info.propKeys.length > 0 ? `<div class="geo-stat"><div class="geo-stat-value">${info.propKeys.length}</div><div class="geo-stat-label">Properties</div></div>` : ''}
  </div>
  ${geomRows ? `<div class="geo-section"><div class="geo-label">Geometry breakdown</div><table class="geo-table">${geomRows}</table></div>` : ''}
  ${namedList ? `<div class="geo-section"><div class="geo-label">Named features</div><table class="geo-table"><tr><th>Type</th><th>Name</th></tr>${namedList}</table></div>` : ''}
  ${propChips ? `<div class="geo-section"><div class="geo-label">Properties</div><div class="geo-chips">${propChips}</div></div>` : ''}
  ${info.bbox ? `<p class="geo-note">Bounding box: ${info.bbox.map((v) => v.toFixed(4)).join(', ')}</p>` : ''}
</div>` };
}
