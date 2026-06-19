// ESRI Shapefile viewer — parses .shp header and shape records.

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

const SHAPE_TYPES = {
  0: 'Null', 1: 'Point', 3: 'Polyline', 5: 'Polygon', 8: 'MultiPoint',
  11: 'PointZ', 13: 'PolylineZ', 15: 'PolygonZ', 18: 'MultiPointZ',
  21: 'PointM', 23: 'PolylineM', 25: 'PolygonM', 28: 'MultiPointM',
  31: 'MultiPatch',
};

const SHAPE_ICON = {
  Point: '•', PointZ: '•', PointM: '•', MultiPoint: '⋯',
  Polyline: '〰', PolylineZ: '〰', PolylineM: '〰',
  Polygon: '⬡', PolygonZ: '⬡', PolygonM: '⬡',
};

function r32be(b, off) { return ((b[off]*0x1000000) + ((b[off+1]<<16)|(b[off+2]<<8)|b[off+3])) >>> 0; }
function r32le(b, off) { return ((b[off] | (b[off+1]<<8) | (b[off+2]<<16)) >>> 0) + (b[off+3] * 0x1000000); }
function rf64le(b, off) { const dv = new DataView(b.buffer, b.byteOffset + off, 8); return dv.getFloat64(0, true); }

function fmtCoord(v, isLon) {
  if (!isFinite(v)) return '?';
  const deg = Math.abs(v).toFixed(5);
  const dir = isLon ? (v >= 0 ? 'E' : 'W') : (v >= 0 ? 'N' : 'S');
  return `${deg}°${dir}`;
}

export function render(intake) {
  const b = intake.bytes;
  if (!b || b.length < 100) {
    return { bodyHtml: '<div class="shp-preview"><p class="shp-note">File too small to be a valid Shapefile.</p></div>' };
  }

  // Parse 100-byte header
  const fileCode = r32be(b, 0);
  if (fileCode !== 9994) {
    return { bodyHtml: '<div class="shp-preview"><p class="shp-note">Not a valid Shapefile (bad file code).</p></div>' };
  }

  const fileLenWords = r32be(b, 24);
  const fileLen = fileLenWords * 2;
  const version = r32le(b, 28);
  const shapeType = r32le(b, 32);
  const shapeLabel = SHAPE_TYPES[shapeType] || `Type ${shapeType}`;

  const xmin = rf64le(b, 36);
  const ymin = rf64le(b, 44);
  const xmax = rf64le(b, 52);
  const ymax = rf64le(b, 60);
  const zmin = rf64le(b, 68);
  const zmax = rf64le(b, 76);
  const mmin = rf64le(b, 84);
  const mmax = rf64le(b, 92);

  const hasZ = [11, 13, 15, 18].includes(shapeType);
  const hasM = [21, 23, 25, 28].includes(shapeType) || hasZ;

  // Count records
  const records = [];
  let pos = 100;
  while (pos + 8 <= b.length && pos + 8 <= fileLen) {
    const recNum = r32be(b, pos);
    const contentLen = r32be(b, pos + 4); // in 16-bit words
    if (contentLen === 0) { pos += 8; continue; }
    const recShapeType = b.length >= pos + 12 ? r32le(b, pos + 8) : -1;
    records.push({ n: recNum, type: SHAPE_TYPES[recShapeType] || String(recShapeType) });
    pos += 8 + contentLen * 2;
    if (records.length >= 500) break; // safety cap
  }

  const typeCounts = {};
  for (const r of records) typeCounts[r.type] = (typeCounts[r.type] || 0) + 1;

  const hasGeo = isFinite(xmin) && isFinite(ymin) && isFinite(xmax) && isFinite(ymax) &&
    Math.abs(xmin) <= 180 && Math.abs(xmax) <= 180 && Math.abs(ymin) <= 90 && Math.abs(ymax) <= 90;

  const bboxHtml = hasGeo
    ? `<tr><td class="shp-key">Bounding box</td><td>${fmtCoord(ymax,false)}, ${fmtCoord(xmin,true)}<br>${fmtCoord(ymin,false)}, ${fmtCoord(xmax,true)}</td></tr>`
    : `<tr><td class="shp-key">Bounding box</td><td>(${xmin.toFixed(3)}, ${ymin.toFixed(3)}) → (${xmax.toFixed(3)}, ${ymax.toFixed(3)})</td></tr>`;

  const typeRows = Object.entries(typeCounts).map(([t, c]) =>
    `<tr><td>${esc(SHAPE_ICON[t] || '')} ${esc(t)}</td><td>${c.toLocaleString()}</td></tr>`
  ).join('');

  const bodyHtml = `<div class="shp-preview">
  <div class="shp-header">
    <span class="badge-shp">Shapefile</span>
    <span class="shp-type">${esc(shapeLabel)}</span>
  </div>
  <table class="shp-meta">
    <tr><td class="shp-key">Version</td><td>${version}</td></tr>
    <tr><td class="shp-key">Shape type</td><td>${esc(shapeLabel)}</td></tr>
    ${records.length ? `<tr><td class="shp-key">Records</td><td>${records.length.toLocaleString()}${records.length >= 500 ? '+' : ''}</td></tr>` : ''}
    ${isFinite(xmin) && isFinite(ymax) ? bboxHtml : ''}
    ${hasZ && isFinite(zmin) ? `<tr><td class="shp-key">Z range</td><td>${zmin.toFixed(3)} – ${zmax.toFixed(3)}</td></tr>` : ''}
  </table>
  ${typeRows ? `<h3 class="shp-section">Record types</h3><table class="shp-types"><thead><tr><th>Type</th><th>Count</th></tr></thead><tbody>${typeRows}</tbody></table>` : ''}
</div>`;

  return { bodyHtml };
}
