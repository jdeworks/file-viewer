import { parseGeometry } from './geometry.js';

function esc(s) { return String(s ?? '').replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

// DXF is line pairs: odd lines are group codes (integers), even lines are values.
function parseDxf(text) {
  const lines = text.split(/\r?\n/);
  const pairs = [];
  for (let i = 0; i + 1 < lines.length; i += 2) {
    const code = parseInt(lines[i].trim(), 10);
    const value = lines[i + 1].trim();
    if (!isNaN(code)) pairs.push({ code, value });
  }

  const result = {
    version: null,
    sections: [],
    headerVars: {},
    entityCounts: {},
    layerNames: [],
    blockNames: [],
    units: null,
    limits: null,
  };

  let inSection = false;
  let sectionName = null;
  let inHeader = false;
  let inEntities = false;
  let inTables = false;
  let inBlocks = false;
  let currentVar = null;

  for (let i = 0; i < pairs.length; i++) {
    const { code, value } = pairs[i];

    if (code === 0 && value === 'SECTION') {
      inSection = true;
      sectionName = null;
      inHeader = false; inEntities = false; inTables = false; inBlocks = false;
      continue;
    }
    if (code === 2 && inSection && sectionName === null) {
      sectionName = value;
      if (!result.sections.includes(value)) result.sections.push(value);
      inHeader    = value === 'HEADER';
      inEntities  = value === 'ENTITIES';
      inTables    = value === 'TABLES';
      inBlocks    = value === 'BLOCKS';
      continue;
    }
    if (code === 0 && value === 'ENDSEC') {
      inSection = false; sectionName = null;
      inHeader = false; inEntities = false; inTables = false; inBlocks = false;
      currentVar = null;
      continue;
    }
    if (code === 0 && value === 'EOF') break;

    if (inHeader) {
      if (code === 9) {
        currentVar = value;
      } else if (currentVar && result.headerVars[currentVar] === undefined) {
        result.headerVars[currentVar] = value;
        currentVar = null;
      }
    }

    if (inEntities && code === 0 && value && value !== 'ENDSEC') {
      result.entityCounts[value] = (result.entityCounts[value] || 0) + 1;
    }

    if (inTables && code === 2 && value && pairs[i - 1]?.value === 'LAYER') {
      // layer name follows TABLE group of type LAYER
      // Actually layer name comes via group 2 inside LAYER entity, but also tables use 2 for name
      // We'll pick it up from LAYER entries below
    }
    if (inTables && pairs[i]?.value === 'LAYER' && code === 0) {
      // next group 2 in this TABLE entity block will be the layer name
      // We track by looking for code=2 after code=0/LAYER within TABLES
    }

    if ((inTables || inEntities) && code === 8 && value) {
      // Group code 8 = layer name used throughout the file
      if (!result.layerNames.includes(value)) result.layerNames.push(value);
    }

    if (inBlocks && code === 2 && value && value !== 'MODEL_SPACE' && value !== 'PAPER_SPACE'
        && value !== '*Model_Space' && value !== '*Paper_Space') {
      if (!result.blockNames.includes(value)) result.blockNames.push(value);
    }
  }

  // Extract version from $ACADVER header variable
  const ver = result.headerVars['$ACADVER'];
  if (ver) result.version = ver;

  // Extract units from $INSUNITS
  const unitCode = parseInt(result.headerVars['$INSUNITS'] || '0', 10);
  const UNITS = {0:'Unitless',1:'Inches',2:'Feet',3:'Miles',4:'Millimeters',5:'Centimeters',6:'Meters',7:'Kilometers',8:'Microinches',9:'Mils',10:'Yards',11:'Angstroms',12:'Nanometers',13:'Microns',14:'Decimeters',15:'Decameters',16:'Hectometers',17:'Gigameters',18:'Astronomical units',19:'Light years',20:'Parsecs'};
  if (unitCode) result.units = UNITS[unitCode] || `Unit code ${unitCode}`;

  // Extract drawing limits
  const limMinX = result.headerVars['$LIMMIN'];
  if (limMinX) result.limits = limMinX;

  return result;
}

const ACAD_VERSIONS = {
  'AC1006': 'R10', 'AC1009': 'R11/R12', 'AC1012': 'R13', 'AC1014': 'R14',
  'AC1015': '2000', 'AC1018': '2004', 'AC1021': '2007', 'AC1024': '2010',
  'AC1027': '2013', 'AC1032': '2018',
};

const ENTITY_ICONS = {
  LINE:'—', CIRCLE:'○', ARC:'◡', TEXT:'T', MTEXT:'T', INSERT:'⊞',
  LWPOLYLINE:'□', POLYLINE:'□', SPLINE:'∿', ELLIPSE:'⬭', POINT:'•',
  SOLID:'▪', FACE:'△', DIMENSION:'←→', LEADER:'↗',
};

const STYLE = `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,sans-serif;font-size:13px;color:var(--fg,#1a1a1a);background:var(--bg,#f5f5f5);padding:18px 16px}
.dxf-header{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:18px}
.badge{display:inline-block;font-weight:700;font-size:11px;letter-spacing:.06em;padding:3px 9px;border-radius:4px;border:1px solid transparent}
.badge-dxf{background:#1565c0;color:#fff;font-size:13px;padding:4px 12px}
.badge-ver{background:#e3f2fd;color:#0d47a1;border-color:#90caf9}
.badge-units{background:#e8f5e9;color:#1b5e20;border-color:#a5d6a7}
.badge-size{background:var(--bg2,#eee);color:var(--fg2,#555);border-color:var(--border,#d0d0d0)}
.sec{margin-bottom:20px}
.sec-title{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--fg2,#666);border-bottom:1px solid var(--border,#e0e0e0);padding-bottom:4px;margin-bottom:8px}
.card{background:var(--panel,#fff);border:1px solid var(--border,#e0e0e0);border-radius:6px;overflow:hidden}
table{width:100%;border-collapse:collapse}
th{text-align:left;padding:6px 12px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--fg2,#777);background:var(--th-bg,#f9f9f9);border-bottom:1px solid var(--border,#e8e8e8)}
td{padding:5px 12px;border-bottom:1px solid var(--border,#f0f0f0)}
tr:last-child td{border-bottom:none}
tr:hover td{background:var(--hover,#fafafa)}
.td-num{text-align:right;font-weight:600;font-size:12px;color:var(--fg2,#444)}
.td-icon{text-align:center;width:30px;font-size:16px;color:var(--fg2,#555)}
.tag-list{display:flex;gap:6px;flex-wrap:wrap;padding:10px 12px}
.tag{font-size:11px;padding:2px 8px;border-radius:3px;background:var(--bg2,#f0f0f0);border:1px solid var(--border,#ddd);color:var(--fg,#333);white-space:nowrap}
.empty{padding:10px 12px;color:var(--fg2,#999);font-style:italic}
dl.kv{display:grid;grid-template-columns:130px 1fr;gap:1px}
dl.kv dt{background:var(--th-bg,#f9f9f9);padding:6px 12px;font-size:12px;font-weight:500;color:var(--fg2,#555)}
dl.kv dd{padding:6px 12px;word-break:break-all}
.section-pills{display:flex;gap:6px;flex-wrap:wrap;padding:10px 12px}
.pill{font-size:11px;padding:3px 10px;border-radius:12px;background:#e3e8ef;color:#333;border:1px solid #c5cdd8}
.pill.present{background:#dff0d8;color:#2a5e17;border-color:#a5d69b}
.dxf-tools{display:flex;gap:6px;align-items:center;margin-bottom:8px}
.dxf-tools button{cursor:pointer;border:1px solid var(--border,#cbd5e1);background:var(--panel,#fff);color:inherit;border-radius:6px;padding:3px 11px;font:600 12px system-ui,sans-serif;line-height:1.4}
.dxf-hint{font-size:11px;color:var(--fg2,#999);margin-left:auto}
.dxf-canvas-wrap{position:relative;background:var(--panel,#fbfbfb);border:1px solid var(--border,#e0e0e0);border-radius:6px;overflow:hidden}
.dxf-canvas{display:block;width:100%;height:440px;touch-action:none;cursor:grab}
.dxf-canvas:active{cursor:grabbing}
body.fv-dark{--fg:#e6e6e6;--fg2:#aeb7c2;--bg:#1e1e1e;--bg2:#2d2d30;--panel:#252526;--border:#45464a;--th-bg:#2d2d30;--hover:#333438}
body.fv-dark .badge-ver{background:#122b45;color:#9dccff;border-color:#315b80}
body.fv-dark .badge-units{background:#16351f;color:#a7e3b5;border-color:#397249}
body.fv-dark .pill{background:#27313e;color:#d7e0ea;border-color:#526276}
body.fv-dark .pill.present{background:#1d3a24;color:#b9e6c3;border-color:#477854}
body.fv-dark .dxf-canvas-wrap{background:#17191c}
body.fv-dark .dxf-tools button{background:#252526;color:#e6e6e6}
`;

// Inline canvas renderer, run inside the sandboxed preview iframe. Reads the injected GEO object
// (entities + bounds) and draws model space with fit / scroll-zoom / drag-pan. Written WITHOUT any
// backtick or ${...} (it sits inside the renderer's template literal) and the closing tag is split.
const DRAW_JS = `
var cv = document.querySelector('.dxf-canvas');
if (cv && GEO && GEO.bounds) {
  var ctx = cv.getContext('2d');
  var b = GEO.bounds;
  var zoom = 1, panX = 0, panY = 0;
  var ACI = {1:'#e84a4a',2:'#d6b400',3:'#3fb950',4:'#2bb0c4',5:'#4a7fe8',6:'#c050c0'};
  function defColor(){ return document.body.classList.contains('fv-dark') ? '#d8dde3' : '#2a2f36'; }
  function colorOf(e){ return (e.color && ACI[e.color]) ? ACI[e.color] : defColor(); }
  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var W = 1, H = 1, base = 1;
  var cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2;
  function S(){ return base * zoom; }
  function sx(x){ return (x - cx) * S() + W / 2 + panX; }
  function sy(y){ return H / 2 - (y - cy) * S() + panY; }
  function poly(pts, close){ if (!pts.length) return; ctx.beginPath(); ctx.moveTo(sx(pts[0][0]), sy(pts[0][1])); for (var i = 1; i < pts.length; i++) ctx.lineTo(sx(pts[i][0]), sy(pts[i][1])); if (close) ctx.closePath(); ctx.stroke(); }
  function arcPts(ccx, ccy, r, a0, a1){ var out = [], n = 48; for (var i = 0; i <= n; i++){ var t = a0 + (a1 - a0) * i / n; out.push([ccx + r * Math.cos(t), ccy + r * Math.sin(t)]); } return out; }
  function dot(x, y, r){ ctx.beginPath(); ctx.arc(sx(x), sy(y), r, 0, Math.PI * 2); ctx.fill(); }
  function marker(x, y){ var X = sx(x), Y = sy(y), s = 5; ctx.beginPath(); ctx.moveTo(X - s, Y); ctx.lineTo(X + s, Y); ctx.moveTo(X, Y - s); ctx.lineTo(X, Y + s); ctx.stroke(); }
  function drawText(e){ var h = Math.max(7, Math.min((e.nums.r || 3) * S(), 40)); ctx.save(); ctx.font = h + 'px system-ui,sans-serif'; ctx.textBaseline = 'alphabetic'; ctx.fillText(e.text || '', sx(e.pts.x), sy(e.pts.y)); ctx.restore(); }
  function drawEllipse(e){ var p = e.pts, nm = e.nums; var mx = p.x2 || 0, my = p.y2 || 0, ratio = nm.r || 1; var t0 = (nm.p1 != null ? nm.p1 : 0), t1 = (nm.p2 != null ? nm.p2 : Math.PI * 2); if (t1 <= t0) t1 = t0 + Math.PI * 2; var px = -my * ratio, py = mx * ratio, out = [], n = 64; for (var i = 0; i <= n; i++){ var t = t0 + (t1 - t0) * i / n; out.push([p.x + Math.cos(t) * mx + Math.sin(t) * px, p.y + Math.cos(t) * my + Math.sin(t) * py]); } poly(out); }
  function draw(){
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 1; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (var k = 0; k < GEO.entities.length; k++){
      var e = GEO.entities[k], p = e.pts || {}, nm = e.nums || {};
      ctx.strokeStyle = colorOf(e); ctx.fillStyle = ctx.strokeStyle;
      if (e.type === 'LINE') poly([[p.x, p.y], [p.x2, p.y2]]);
      else if (e.type === 'CIRCLE') poly(arcPts(p.x, p.y, nm.r || 0, 0, Math.PI * 2), true);
      else if (e.type === 'ARC'){ var a0 = (nm.a1 || 0) * Math.PI / 180, a1 = (nm.a2 || 0) * Math.PI / 180; if (a1 < a0) a1 += Math.PI * 2; poly(arcPts(p.x, p.y, nm.r || 0, a0, a1)); }
      else if (e.type === 'ELLIPSE') drawEllipse(e);
      else if (e.type === 'LWPOLYLINE' || e.type === 'POLYLINE') poly(e.verts || [], !!((nm.flags || 0) & 1));
      else if (e.type === 'SPLINE') poly(e.verts || []);
      else if (e.type === 'POINT') dot(p.x, p.y, 2);
      else if (e.type === 'SOLID' || e.type === '3DFACE'){ var q = [[p.x, p.y], [p.x2, p.y2], [(p.x4 != null ? p.x4 : p.x3), (p.y4 != null ? p.y4 : p.y3)], [p.x3, p.y3]].filter(function(c){ return c[0] != null; }); poly(q, true); }
      else if (e.type === 'TEXT' || e.type === 'MTEXT') drawText(e);
      else if (e.type === 'INSERT') marker(p.x, p.y);
    }
  }
  function resize(){
    var r = cv.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    var bw = (b.maxX - b.minX) || 1, bh = (b.maxY - b.minY) || 1;
    base = Math.min(W / bw, H / bh) * 0.9;
    draw();
  }
  cv.addEventListener('wheel', function(ev){ ev.preventDefault(); var r = cv.getBoundingClientRect(); var ux = (ev.clientX - r.left) - W / 2, uy = (ev.clientY - r.top) - H / 2; var f = ev.deltaY < 0 ? 1.15 : 1 / 1.15; panX = ux - f * (ux - panX); panY = uy - f * (uy - panY); zoom *= f; draw(); }, { passive: false });
  var dragging = false, lx = 0, ly = 0;
  cv.addEventListener('mousedown', function(ev){ dragging = true; lx = ev.clientX; ly = ev.clientY; });
  window.addEventListener('mousemove', function(ev){ if (!dragging) return; panX += ev.clientX - lx; panY += ev.clientY - ly; lx = ev.clientX; ly = ev.clientY; draw(); });
  window.addEventListener('mouseup', function(){ dragging = false; });
  var fitBtn = document.querySelector('.dxf-fit'), inBtn = document.querySelector('.dxf-zin'), outBtn = document.querySelector('.dxf-zout');
  if (fitBtn) fitBtn.addEventListener('click', function(){ zoom = 1; panX = 0; panY = 0; draw(); });
  if (inBtn) inBtn.addEventListener('click', function(){ zoom *= 1.25; draw(); });
  if (outBtn) outBtn.addEventListener('click', function(){ zoom /= 1.25; draw(); });
  if (window.ResizeObserver) new ResizeObserver(function(){ resize(); }).observe(cv);
  cv.dataset.drawn = String(GEO.entities.length);
  resize();
}
`;

export async function render(intake) {
  const text = intake.text || '';
  if (!text.trim()) {
    return { bodyHtml: `<style>${STYLE}</style><div class="empty">Empty file.</div>` };
  }

  const parsed = parseDxf(text);
  const geo = parseGeometry(text);

  const fmtBytes = (n) => {
    if (!n) return '—';
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1048576).toFixed(1) + ' MB';
  };

  const verLabel = parsed.version
    ? (ACAD_VERSIONS[parsed.version] ? `AutoCAD ${ACAD_VERSIONS[parsed.version]} (${parsed.version})` : parsed.version)
    : null;

  let html = `<style>${STYLE}</style>`;

  // Header badges
  html += `<div class="dxf-header">`;
  html += `<span class="badge badge-dxf">DXF</span>`;
  if (verLabel) html += `<span class="badge badge-ver">${esc(verLabel)}</span>`;
  if (parsed.units) html += `<span class="badge badge-units">${esc(parsed.units)}</span>`;
  html += `<span class="badge badge-size">${esc(fmtBytes(intake.size))}</span>`;
  html += `</div>`;

  // 2D drawing — a real canvas render of the model-space geometry (lines/arcs/circles/polylines/
  // text/ellipses), with fit + scroll-zoom + drag-pan. Drawn by the inline script appended below.
  if (geo.entities.length && geo.bounds) {
    html += `<div class="sec dxf-draw"><div class="sec-title">2D View (${geo.entities.length} drawable entities)</div>`;
    html += `<div class="dxf-tools"><button type="button" class="dxf-fit">Fit</button><button type="button" class="dxf-zin">+</button><button type="button" class="dxf-zout">−</button><span class="dxf-hint">scroll to zoom · drag to pan</span></div>`;
    html += `<div class="dxf-canvas-wrap"><canvas class="dxf-canvas"></canvas></div></div>`;
  }

  // Sections present
  const ALL_SECTIONS = ['HEADER', 'CLASSES', 'TABLES', 'BLOCKS', 'ENTITIES', 'OBJECTS'];
  html += `<div class="sec"><div class="sec-title">Sections</div><div class="card"><div class="section-pills">`;
  for (const s of ALL_SECTIONS) {
    const present = parsed.sections.includes(s);
    html += `<span class="pill${present ? ' present' : ''}">${esc(s)}</span>`;
  }
  for (const s of parsed.sections.filter((s) => !ALL_SECTIONS.includes(s))) {
    html += `<span class="pill present">${esc(s)}</span>`;
  }
  html += `</div></div></div>`;

  // Entities
  const entityEntries = Object.entries(parsed.entityCounts).sort((a, b) => b[1] - a[1]);
  const totalEntities = entityEntries.reduce((s, [, n]) => s + n, 0);

  html += `<div class="sec"><div class="sec-title">Entities (${totalEntities.toLocaleString()} total)</div>`;
  if (entityEntries.length === 0) {
    html += `<div class="card"><div class="empty">No ENTITIES section found.</div></div>`;
  } else {
    html += `<div class="card"><table><thead><tr><th></th><th>Type</th><th style="text-align:right">Count</th></tr></thead><tbody>`;
    for (const [type, count] of entityEntries.slice(0, 30)) {
      const icon = ENTITY_ICONS[type] || '';
      html += `<tr><td class="td-icon">${icon}</td><td>${esc(type)}</td><td class="td-num">${count.toLocaleString()}</td></tr>`;
    }
    if (entityEntries.length > 30) {
      html += `<tr><td></td><td colspan="2" style="color:var(--fg2);font-style:italic;padding:6px 12px">…and ${entityEntries.length - 30} more entity types</td></tr>`;
    }
    html += `</tbody></table></div>`;
  }
  html += `</div>`;

  // Layers
  if (parsed.layerNames.length > 0) {
    html += `<div class="sec"><div class="sec-title">Layers (${parsed.layerNames.length})</div><div class="card"><div class="tag-list">`;
    for (const layer of parsed.layerNames.slice(0, 50)) {
      html += `<span class="tag">${esc(layer)}</span>`;
    }
    if (parsed.layerNames.length > 50) {
      html += `<span class="tag" style="color:var(--fg2)">+${parsed.layerNames.length - 50} more</span>`;
    }
    html += `</div></div></div>`;
  }

  // Blocks
  if (parsed.blockNames.length > 0) {
    html += `<div class="sec"><div class="sec-title">Named Blocks (${parsed.blockNames.length})</div><div class="card"><div class="tag-list">`;
    for (const block of parsed.blockNames.slice(0, 30)) {
      html += `<span class="tag">${esc(block)}</span>`;
    }
    if (parsed.blockNames.length > 30) {
      html += `<span class="tag" style="color:var(--fg2)">+${parsed.blockNames.length - 30} more</span>`;
    }
    html += `</div></div></div>`;
  }

  // Key header variables (a curated subset)
  const keyVars = [
    ['$ACADVER', 'Version'], ['$ACADMAINTVER', 'Maintenance ver'],
    ['$INSUNITS', 'Insertion units'], ['$MEASUREMENT', 'Measurement'],
    ['$DWGCODEPAGE', 'Code page'], ['$LASTSAVEDBY', 'Last saved by'],
    ['$TDCREATE', 'Created'], ['$TDUCREATE', 'Created (UTC)'],
    ['$TDUPDATE', 'Updated'], ['$TDUUPDATE', 'Updated (UTC)'],
    ['$LIMMIN', 'Drawing limits min'], ['$LIMMAX', 'Drawing limits max'],
    ['$EXTMIN', 'Extents min'], ['$EXTMAX', 'Extents max'],
  ];

  const shownVars = keyVars.filter(([k]) => parsed.headerVars[k] !== undefined);
  if (shownVars.length > 0) {
    html += `<div class="sec"><div class="sec-title">Header Variables</div><div class="card"><dl class="kv">`;
    for (const [k, label] of shownVars) {
      html += `<dt>${esc(label)}</dt><dd>${esc(parsed.headerVars[k])}</dd>`;
    }
    html += `</dl></div></div>`;
  }

  // Inject the geometry + draw script (only when there's something to draw). The GEO JSON is escaped
  // so neither the template literal (backtick / ${) nor the <script> tag (</) can be broken by a
  // TEXT/MTEXT entity's content — the only place arbitrary characters appear.
  if (geo.entities.length && geo.bounds) {
    const geoJson = JSON.stringify(geo).replace(/</g, '\\u003c').replace(/`/g, '\\u0060').replace(/\$/g, '\\u0024');
    html += '<script>(function(){var GEO=' + geoJson + ';' + DRAW_JS + '})();</scr' + 'ipt>';
  }

  return { bodyHtml: html, hadUnsafe: false };
}
