function esc(s) { return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function parseSexpr(text) {
  const tokens = [];
  const re = /\(|\)|"(?:[^"\\]|\\.)*"|[^\s()]+/g;
  let m;
  while ((m = re.exec(text)) !== null) tokens.push(m[0]);
  let pos = 0;
  function read() {
    if (pos >= tokens.length) return null;
    const tok = tokens[pos++];
    if (tok === '(') {
      const list = [];
      while (pos < tokens.length && tokens[pos] !== ')') list.push(read());
      pos++;
      return list;
    }
    if (tok === ')') return null;
    if (tok.startsWith('"')) return tok.slice(1, -1).replace(/\\"/g, '"');
    return tok;
  }
  const results = [];
  while (pos < tokens.length) { const r = read(); if (r !== null) results.push(r); }
  return results;
}

function findAll(nodes, tag) {
  const out = [];
  function walk(n) {
    if (!Array.isArray(n)) return;
    if (n[0] === tag) { out.push(n); return; }
    for (const c of n) walk(c);
  }
  for (const n of nodes) walk(n);
  return out;
}

function findFirst(nodes, tag) {
  return findAll(nodes, tag)[0] || null;
}

function strAttr(node, tag) {
  if (!node) return '';
  const child = node.find((c) => Array.isArray(c) && c[0] === tag);
  return child && child[1] != null ? String(child[1]) : '';
}

function sniffKind(text, filename) {
  const ext = (filename || '').split('.').pop().toLowerCase();
  if (ext === 'kicad_pcb') return 'pcb';
  if (ext === 'kicad_sch') return 'schematic';
  if (ext === 'kicad_pro') return 'project';
  if (ext === 'kicad_mod' || ext === 'kicad_sym') return 'library';
  const head = text.slice(0, 200);
  if (/^\(kicad_pcb\b/.test(head)) return 'pcb';
  if (/^\(kicad_sch\b/.test(head)) return 'schematic';
  if (/^\(kicad_pro\b/.test(head)) return 'project';
  if (/^\(kicad_symbol_lib\b/.test(head)) return 'library';
  if (/^\(module\b/.test(head)) return 'module';
  return 'kicad';
}

function parsePcb(nodes) {
  const version = strAttr(findFirst(nodes, 'kicad_pcb'), 'version') || strAttr(findFirst(nodes, 'version'), '') || '';
  const layers = findAll(nodes, 'layers').flatMap((l) => l.slice(1).filter(Array.isArray).map((c) => c[2] || c[1] || '').filter(Boolean));
  const footprints = findAll(nodes, 'footprint').length || findAll(nodes, 'module').length;
  const nets = findAll(nodes, 'net').filter((n) => typeof n[1] === 'string' && n[1] !== '0').length;
  const vias = findAll(nodes, 'via').length;
  const segments = findAll(nodes, 'segment').length;
  const zones = findAll(nodes, 'zone').length;
  const title = strAttr(findFirst(nodes, 'title_block'), 'title');
  const rev = strAttr(findFirst(nodes, 'title_block'), 'rev');
  const company = strAttr(findFirst(nodes, 'title_block'), 'company');
  const generalNode = findFirst(nodes, 'general');
  const thickness = generalNode ? strAttr(generalNode, 'thickness') : '';
  return { kind: 'pcb', title, rev, company, version, layers: layers.slice(0, 30), footprints, nets, vias, segments, zones, thickness };
}

function parseSchematic(nodes) {
  const version = strAttr(findFirst(nodes, 'kicad_sch'), 'version') || '';
  const symbols = findAll(nodes, 'symbol').filter((n) => typeof n[1] === 'string').length;
  const wires = findAll(nodes, 'wire').length;
  const nets = findAll(nodes, 'net_name').length || findAll(nodes, 'label').length;
  const power = findAll(nodes, 'power').length;
  const title = strAttr(findFirst(nodes, 'title_block'), 'title');
  const rev = strAttr(findFirst(nodes, 'title_block'), 'rev');
  const company = strAttr(findFirst(nodes, 'title_block'), 'company');
  return { kind: 'schematic', title, rev, company, version, symbols, wires, nets, power };
}

function parseProject(nodes) {
  const boardNode = findFirst(nodes, 'board');
  const board = boardNode ? { designRulesFile: strAttr(boardNode, 'design_rules_file') } : null;
  const schNode = findFirst(nodes, 'schematic');
  const meta = findFirst(nodes, 'meta');
  const version = meta ? strAttr(meta, 'version') : '';
  return { kind: 'project', version, hasBoard: !!boardNode, hasSchematic: !!schNode };
}

function parseLibrary(nodes, text) {
  const rootTag = text.trim().startsWith('(kicad_symbol_lib') ? 'kicad_symbol_lib' : 'kicad_mod';
  const version = strAttr(findFirst(nodes, rootTag), 'version') || '';
  const generator = strAttr(findFirst(nodes, rootTag), 'generator') || '';
  const symbols = findAll(nodes, 'symbol').filter((n) => typeof n[1] === 'string').map((n) => n[1]);
  const footprints = findAll(nodes, 'module').filter((n) => typeof n[1] === 'string').map((n) => n[1]);
  return { kind: 'library', version, generator, symbols: symbols.slice(0, 30), footprints: footprints.slice(0, 30) };
}

function statCard(label, value) {
  return `<div class="kicad-stat"><div class="kicad-stat-value">${esc(String(value))}</div><div class="kicad-stat-label">${esc(label)}</div></div>`;
}

function chips(items) {
  if (!items.length) return '';
  const shown = items.slice(0, 16);
  const extra = items.length - shown.length;
  return '<div class="kicad-chips">'
    + shown.map((c) => `<span class="kicad-chip">${esc(c)}</span>`).join('')
    + (extra > 0 ? `<span class="kicad-chip kicad-chip-more">+${extra} more</span>` : '')
    + '</div>';
}

export function render(intake, _ctx) {
  const text = intake.text || '';
  const kind = sniffKind(text, intake.filename || '');

  let nodes;
  try { nodes = parseSexpr(text.slice(0, 300000)); } catch { nodes = []; }

  let badge = 'KiCad';
  let titleLine = '';
  let metaHtml = '';
  let statsHtml = '';

  if (kind === 'pcb') {
    const d = parsePcb(nodes);
    badge = 'PCB Layout';
    if (d.title) titleLine = d.title;
    const stats = [
      d.footprints ? statCard('Footprints', d.footprints) : '',
      d.nets ? statCard('Nets', d.nets) : '',
      d.segments ? statCard('Tracks', d.segments) : '',
      d.vias ? statCard('Vias', d.vias) : '',
      d.zones ? statCard('Zones', d.zones) : '',
    ].filter(Boolean).join('');
    statsHtml = stats ? `<div class="kicad-stats">${stats}</div>` : '';
    if (d.layers.length) {
      metaHtml += `<div class="kicad-section"><div class="kicad-label">Layers (${d.layers.length})</div>${chips(d.layers)}</div>`;
    }
    const rows = [
      d.version && ['KiCad version', d.version],
      d.rev && ['Revision', d.rev],
      d.company && ['Company', d.company],
      d.thickness && ['Board thickness', d.thickness + ' mm'],
    ].filter(Boolean);
    if (rows.length) {
      metaHtml += '<div class="kicad-section"><div class="kicad-label">Properties</div>'
        + '<table class="kicad-table"><tbody>'
        + rows.map(([k, v]) => `<tr><td class="kicad-key">${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')
        + '</tbody></table></div>';
    }

  } else if (kind === 'schematic') {
    const d = parseSchematic(nodes);
    badge = 'Schematic';
    if (d.title) titleLine = d.title;
    const stats = [
      d.symbols ? statCard('Symbols', d.symbols) : '',
      d.wires ? statCard('Wires', d.wires) : '',
      d.nets ? statCard('Labels', d.nets) : '',
      d.power ? statCard('Power', d.power) : '',
    ].filter(Boolean).join('');
    statsHtml = stats ? `<div class="kicad-stats">${stats}</div>` : '';
    const rows = [
      d.version && ['KiCad version', d.version],
      d.rev && ['Revision', d.rev],
      d.company && ['Company', d.company],
    ].filter(Boolean);
    if (rows.length) {
      metaHtml += '<div class="kicad-section"><div class="kicad-label">Properties</div>'
        + '<table class="kicad-table"><tbody>'
        + rows.map(([k, v]) => `<tr><td class="kicad-key">${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')
        + '</tbody></table></div>';
    }

  } else if (kind === 'project') {
    const d = parseProject(nodes);
    badge = 'KiCad Project';
    const parts = [d.hasBoard && 'PCB layout', d.hasSchematic && 'Schematic'].filter(Boolean);
    if (parts.length) titleLine = parts.join(' + ');
    if (d.version) {
      metaHtml += '<div class="kicad-section"><div class="kicad-label">Properties</div>'
        + '<table class="kicad-table"><tbody>'
        + `<tr><td class="kicad-key">KiCad version</td><td>${esc(d.version)}</td></tr>`
        + '</tbody></table></div>';
    }

  } else if (kind === 'library' || kind === 'module') {
    const d = parseLibrary(nodes, text);
    badge = d.symbols.length ? 'Symbol Library' : 'Footprint Library';
    const items = d.symbols.length ? d.symbols : d.footprints;
    const count = items.length;
    if (count) titleLine = count + (d.symbols.length ? ' symbol' : ' footprint') + (count !== 1 ? 's' : '');
    if (items.length) {
      metaHtml += `<div class="kicad-section"><div class="kicad-label">Contents</div>${chips(items)}</div>`;
    }
    const rows = [
      d.version && ['KiCad version', d.version],
      d.generator && ['Generator', d.generator],
    ].filter(Boolean);
    if (rows.length) {
      metaHtml += '<div class="kicad-section"><div class="kicad-label">Properties</div>'
        + '<table class="kicad-table"><tbody>'
        + rows.map(([k, v]) => `<tr><td class="kicad-key">${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')
        + '</tbody></table></div>';
    }
  }

  const headerHtml = '<div class="kicad-header">'
    + `<span class="kicad-badge">${esc(badge)}</span>`
    + (titleLine ? `<span class="kicad-title">${esc(titleLine)}</span>` : '')
    + '</div>';

  const bodyHtml = `<div class="kicad-preview">${headerHtml}${statsHtml}${metaHtml}</div>`;
  return { bodyHtml };
}
