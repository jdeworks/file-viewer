// DXF geometry extraction for the 2D preview. Walks the group-code/value pairs of the ENTITIES
// section and pulls out drawable primitives with real coordinates (the metadata view only counts
// entity TYPES; this gives the renderer something to draw). Model space only — INSERT block
// references are drawn as a marker at their insertion point (blocks aren't expanded). Bulge arcs on
// LWPOLYLINE are approximated as straight segments. Pure data → no DOM, no off-origin.

const DRAWABLE = new Set([
  'LINE', 'CIRCLE', 'ARC', 'ELLIPSE', 'POINT', 'LWPOLYLINE', 'TEXT', 'MTEXT', 'SOLID', '3DFACE', 'SPLINE', 'INSERT',
]);

function newEntity(type) {
  return { type, layer: null, color: null, verts: [], pts: {}, nums: {}, text: '', _px: null };
}

// Strip MTEXT inline formatting ({\f...}, \pard, etc.) down to readable text.
function cleanMText(s) {
  return s
    .replace(/\\par\b/g, ' ')
    .replace(/\{\\[^}]*\}/g, '')
    .replace(/\\[A-Za-z]+\d*;?/g, '')
    .replace(/[{}]/g, '')
    .trim();
}

function applyCode(e, code, value) {
  switch (code) {
    case 8: e.layer = value; break;
    case 62: e.color = parseInt(value, 10); break;
    case 70: e.nums.flags = parseInt(value, 10) || 0; break;
    case 1: e.text += value; break;
    case 3: e.text += value; break;       // MTEXT continuation chunks
    case 10:
      if (e.type === 'LWPOLYLINE' || e.type === 'POLYLINE' || e.type === 'SPLINE') { e._px = parseFloat(value); }
      else e.pts.x = parseFloat(value);
      break;
    case 20:
      if (e.type === 'LWPOLYLINE' || e.type === 'POLYLINE' || e.type === 'SPLINE') { if (e._px != null) { e.verts.push([e._px, parseFloat(value)]); e._px = null; } }
      else e.pts.y = parseFloat(value);
      break;
    case 11: e.pts.x2 = parseFloat(value); break;
    case 21: e.pts.y2 = parseFloat(value); break;
    case 12: e.pts.x3 = parseFloat(value); break;
    case 22: e.pts.y3 = parseFloat(value); break;
    case 13: e.pts.x4 = parseFloat(value); break;
    case 23: e.pts.y4 = parseFloat(value); break;
    case 40: if (e.type !== 'SPLINE') e.nums.r = parseFloat(value); break;  // radius / text height / ellipse ratio (SPLINE 40 = knots, ignore)
    case 41: e.nums.p1 = parseFloat(value); break;
    case 42: e.nums.p2 = parseFloat(value); break;
    case 50: e.nums.a1 = parseFloat(value); break;    // arc start angle (deg)
    case 51: e.nums.a2 = parseFloat(value); break;    // arc end angle (deg)
    default: break;
  }
}

export function parseGeometry(text) {
  const lines = text.split(/\r?\n/);
  const pairs = [];
  for (let i = 0; i + 1 < lines.length; i += 2) {
    const code = parseInt(lines[i].trim(), 10);
    if (!isNaN(code)) pairs.push({ code, value: lines[i + 1] });
  }

  const ents = [];
  let section = null, inEntities = false;
  let cur = null;       // current top-level entity
  let poly = null;      // active old-style POLYLINE collecting VERTEX sub-entities
  let vertex = null;    // current VERTEX sub-entity

  const flushVertex = () => { if (vertex && poly && vertex.pts.x != null) poly.verts.push([vertex.pts.x, vertex.pts.y]); vertex = null; };
  const flushCur = () => { if (cur && DRAWABLE.has(cur.type)) ents.push(cur); cur = null; };

  for (let i = 0; i < pairs.length; i++) {
    const code = pairs[i].code;
    const value = pairs[i].value.trim();

    if (code === 0 && value === 'SECTION') { section = null; continue; }
    if (code === 2 && section === null) { section = value; inEntities = value === 'ENTITIES'; continue; }
    if (code === 0 && value === 'ENDSEC') { flushVertex(); flushCur(); if (poly) { ents.push(poly); poly = null; } inEntities = false; section = null; continue; }
    if (!inEntities) continue;

    if (code === 0) {
      if (value === 'VERTEX' && poly) { flushVertex(); vertex = newEntity('VERTEX'); continue; }
      if (value === 'SEQEND') { flushVertex(); if (poly) { ents.push(poly); poly = null; } continue; }
      flushVertex(); flushCur();
      if (value === 'POLYLINE') { poly = newEntity('POLYLINE'); continue; }
      cur = DRAWABLE.has(value) ? newEntity(value) : null;
      continue;
    }
    const target = vertex || cur || poly;
    if (target) applyCode(target, code, value);
  }
  flushVertex(); flushCur(); if (poly) ents.push(poly);

  for (const e of ents) if (e.type === 'MTEXT') e.text = cleanMText(e.text);

  return { entities: ents, bounds: boundsOf(ents) };
}

// Axis-aligned bounds over every drawable. Returns null when nothing is drawable.
function boundsOf(ents) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const grow = (x, y) => { if (!isFinite(x) || !isFinite(y)) return; if (x < minX) minX = x; if (y < minY) minY = y; if (x > maxX) maxX = x; if (y > maxY) maxY = y; };
  for (const e of ents) {
    const p = e.pts, n = e.nums;
    switch (e.type) {
      case 'LINE': grow(p.x, p.y); grow(p.x2, p.y2); break;
      case 'CIRCLE': case 'ARC': grow(p.x - n.r, p.y - n.r); grow(p.x + n.r, p.y + n.r); break;
      case 'ELLIPSE': { const m = Math.hypot(p.x2 || 0, p.y2 || 0) || n.r || 0; grow(p.x - m, p.y - m); grow(p.x + m, p.y + m); break; }
      case 'POINT': case 'INSERT': grow(p.x, p.y); break;
      case 'TEXT': case 'MTEXT': grow(p.x, p.y); grow(p.x + (e.text.length * (n.r || 1) * 0.6), p.y + (n.r || 1)); break;
      case 'SOLID': case '3DFACE': grow(p.x, p.y); grow(p.x2, p.y2); grow(p.x3, p.y3); grow(p.x4, p.y4); break;
      case 'LWPOLYLINE': case 'POLYLINE': case 'SPLINE': for (const v of e.verts) grow(v[0], v[1]); break;
      default: break;
    }
  }
  if (minX === Infinity) return null;
  return { minX, minY, maxX, maxY };
}
