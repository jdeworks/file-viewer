const Q1_VERSIONS = {
  29: { game: 'Quake / QuakeWorld', engine: 'Quake (id Tech 2)' },
  30: { game: 'Half-Life', engine: 'GoldSrc' },
};

const IBSP_VERSIONS = {
  38: { game: 'Quake II', engine: 'Quake II (id Tech 2)' },
  46: { game: 'Quake III Arena', engine: 'Quake III (id Tech 3)' },
  47: { game: 'Quake III: Team Arena / RTCW', engine: 'id Tech 3' },
  59: { game: 'Doom 3', engine: 'id Tech 4' },
};

const VBSP_VERSIONS = {
  17: { game: 'Half-Life 2 (Beta)', engine: 'Source Engine' },
  18: { game: 'Half-Life 2', engine: 'Source Engine' },
  19: { game: 'Half-Life 2 (update)', engine: 'Source Engine' },
  20: { game: 'Half-Life 2 / Counter-Strike: Source', engine: 'Source Engine' },
  21: { game: 'Orange Box (TF2 / Portal)', engine: 'Source Engine' },
  22: { game: 'Source 2013', engine: 'Source Engine' },
};

const WORLDSPAWN_DISPLAY = [
  ['message', 'Map Name'],
  ['sky', 'Sky'],
  ['gravity', 'Gravity'],
  ['ambient', 'Ambient'],
  ['_sun_mangle', 'Sun Direction'],
  ['fog', 'Fog'],
  ['music', 'Music'],
  ['_skyroom', 'Sky Room'],
];

function r32le(b, off) {
  return ((b[off] | (b[off + 1] << 8) | (b[off + 2] << 16)) >>> 0) + b[off + 3] * 0x1000000;
}

function ascii4(b, off) {
  return String.fromCharCode(b[off], b[off + 1], b[off + 2], b[off + 3]);
}

function parseBspHeader(b) {
  if (b.length < 8) return null;
  const magic = ascii4(b, 0);

  if (magic === 'IBSP' || magic === 'VBSP') {
    const version = r32le(b, 4);
    const labels = magic === 'IBSP' ? IBSP_VERSIONS : VBSP_VERSIONS;
    const label = labels[version] || { game: `Unknown v${version}`, engine: magic === 'IBSP' ? 'id Tech' : 'Source Engine' };
    const entityOff = r32le(b, 8);
    const entityLen = r32le(b, 12);
    return { magic, version, format: `${magic} v${version}`, ...label, entityOff, entityLen };
  }

  const version = r32le(b, 0);
  if (version === 29 || version === 30) {
    const label = Q1_VERSIONS[version] || { game: `BSP v${version}`, engine: 'Unknown' };
    const entityOff = r32le(b, 4);
    const entityLen = r32le(b, 8);
    return { magic: `v${version}`, version, format: `BSP v${version}`, ...label, entityOff, entityLen };
  }

  return null;
}

function parseEntityLump(b, off, len) {
  if (!off || !len || off + len > b.length) return [];
  const text = new TextDecoder('ascii', { fatal: false }).decode(b.slice(off, off + len));
  const entities = [];
  const blockRe = /\{([^}]*)\}/g;
  let m;
  while ((m = blockRe.exec(text)) !== null) {
    const kv = {};
    const pairRe = /"([^"]+)"\s+"([^"]*)"/g;
    let p;
    while ((p = pairRe.exec(m[1])) !== null) kv[p[1]] = p[2];
    if (kv.classname) entities.push(kv);
  }
  return entities;
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function render(intake) {
  const b = intake.bytes;
  if (!b || b.length < 8) {
    return { bodyHtml: '<p class="viewer-message">Not a valid BSP file.</p>', hadUnsafe: false };
  }

  const hdr = parseBspHeader(b);
  if (!hdr) {
    return { bodyHtml: '<p class="viewer-message">Unrecognized BSP format.</p>', hadUnsafe: false };
  }

  const entities = parseEntityLump(b, hdr.entityOff, hdr.entityLen);
  const worldspawn = entities.find((e) => e.classname === 'worldspawn') || {};

  const classCounts = {};
  for (const e of entities) {
    const c = e.classname;
    classCounts[c] = (classCounts[c] || 0) + 1;
  }
  delete classCounts.worldspawn;
  const sortedClasses = Object.entries(classCounts).sort((a, b2) => b2[1] - a[1]);

  const badge = hdr.magic === 'VBSP' ? 'Source BSP' : hdr.magic === 'IBSP' ? 'IBSP' : `Quake BSP`;

  const headerHtml = `
    <div class="meta-section">
      <h4 class="meta-section-title">Map Header</h4>
      <div class="meta-row"><span class="meta-key">Format</span><span class="meta-val">${esc(hdr.format)}</span></div>
      <div class="meta-row"><span class="meta-key">Game Engine</span><span class="meta-val">${esc(hdr.engine)}</span></div>
      <div class="meta-row"><span class="meta-key">Compatible Game</span><span class="meta-val">${esc(hdr.game)}</span></div>
      ${entities.length ? `<div class="meta-row"><span class="meta-key">Entities</span><span class="meta-val">${entities.length}</span></div>` : ''}
    </div>`;

  let worldspawnHtml = '';
  const wProps = WORLDSPAWN_DISPLAY.filter(([k]) => worldspawn[k]);
  if (wProps.length) {
    worldspawnHtml = `
      <div class="meta-section">
        <h4 class="meta-section-title">Map Properties</h4>
        ${wProps.map(([k, label]) => `<div class="meta-row"><span class="meta-key">${esc(label)}</span><span class="meta-val">${esc(worldspawn[k])}</span></div>`).join('')}
      </div>`;
  }

  let entityTableHtml = '';
  if (sortedClasses.length) {
    const rows = sortedClasses.slice(0, 30).map(([c, n]) =>
      `<tr><td class="bsp-class">${esc(c)}</td><td class="bsp-count">${n}</td></tr>`
    ).join('');
    entityTableHtml = `
      <div class="meta-section">
        <h4 class="meta-section-title">Entity Classes</h4>
        <table class="bsp-table">
          <thead><tr><th>Class</th><th>Count</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        ${sortedClasses.length > 30 ? `<p class="viewer-note">${sortedClasses.length - 30} more class(es) not shown.</p>` : ''}
      </div>`;
  }

  const bodyHtml = `
    <style>
      .badge-bsp { background: #795548; color: #fff; }
      .bsp-table { border-collapse: collapse; width: 100%; margin-top: 0.5rem; font-size: 0.85rem; }
      .bsp-table th, .bsp-table td { padding: 0.25rem 0.5rem; text-align: left; border-bottom: 1px solid var(--border,#ddd); }
      .bsp-count { text-align: right !important; font-variant-numeric: tabular-nums; }
      .bsp-class { font-family: monospace; }
    </style>
    <div class="badge-row"><span class="badge badge-bsp">${esc(badge)}</span></div>
    ${headerHtml}${worldspawnHtml}${entityTableHtml}`;

  return { bodyHtml, hadUnsafe: false };
}
