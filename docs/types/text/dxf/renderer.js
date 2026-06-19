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
`;

export async function render(intake) {
  const text = intake.text || '';
  if (!text.trim()) {
    return { bodyHtml: `<style>${STYLE}</style><div class="empty">Empty file.</div>` };
  }

  const parsed = parseDxf(text);

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

  return { bodyHtml: html, hadUnsafe: false };
}
