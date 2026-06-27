const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.vhd-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.vhd-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#7c3aed;color:#fff;vertical-align:middle;margin-right:8px;}
.vhd-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.vhd-unit{font-family:ui-monospace,monospace;font-size:13px;color:#7c3aed;font-weight:700;}
.vhd-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.vhd-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.vhd-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:96px;}
.vhd-card strong{display:block;font-size:1.2rem;font-weight:700;}
.vhd-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.vhd-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.vhd-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.vhd-sub-hd{padding:6px 14px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#5a6678);background:var(--bg-2,#fbfcfe);border-bottom:1px solid var(--border,#eaecf0);}
.vhd-list{margin:0;padding:0;list-style:none;}
.vhd-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.vhd-list li:last-child{border-bottom:none;}
.vhd-empty{color:var(--fg-2,#888);font-style:italic;}
.vhd-tag{font-size:10px;padding:1px 5px;border-radius:4px;font-weight:700;background:#e0f2fe;color:#0369a1;}
.vhd-tag-entity{background:#ede9fe;color:#7e22ce;}
.vhd-tag-arch{background:#dbeafe;color:#1e40af;}
.vhd-tag-in{background:#e0f2fe;color:#0369a1;}
.vhd-tag-out{background:#fef3c7;color:#92400e;}
.vhd-tag-inout{background:#f3e8ff;color:#7e22ce;}
.vhd-tag-buffer{background:#fae8ff;color:#a21caf;}
.vhd-tag-signal{background:#f0f9ff;color:#0c4a6e;}
.vhd-tag-comp{background:#f0fdf4;color:#166534;}
.vhd-tag-gen{background:#fff7ed;color:#9a3412;}
.vhd-tag-func{background:#dbeafe;color:#1d4ed8;}
.vhd-tag-proc{background:#ede9fe;color:#7c3aed;}
.vhd-tag-type{background:#fef9c3;color:#854d0e;}
.vhd-name{font-weight:600;}
.vhd-type{color:#0e7490;}
.vhd-mode{color:#9f1239;font-style:italic;}
.vhd-default{color:#6b7280;}
.vhd-ret{color:#1d4ed8;}
`;

// --- pure parsing helpers (DOM-free) ---------------------------------------

const stripComments = (text) => String(text || '').replace(/--[^\n]*/g, ' ');

// Given index of an opening '(', return the balanced group's inner content + end index.
function balancedParen(s, open) {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === '(') depth++;
    else if (s[i] === ')') { depth--; if (depth === 0) return { content: s.slice(open + 1, i), end: i }; }
  }
  return { content: s.slice(open + 1), end: s.length };
}

// Split on `sep` only at paren depth 0 (so ranged types like (7 downto 0) stay intact).
function splitTop(s, sep = ';') {
  const out = []; let buf = '', depth = 0;
  for (const ch of s) {
    if (ch === '(') depth++;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    if (ch === sep && depth === 0) { out.push(buf); buf = ''; } else buf += ch;
  }
  if (buf.trim()) out.push(buf);
  return out;
}

const norm = (s) => s.replace(/\s+/g, ' ').trim();
const names = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);

// Find the first balanced ( ) group that follows `keyword` within region.
function groupAfter(region, keyword) {
  const m = region.match(keyword);
  if (!m) return null;
  const open = region.indexOf('(', m.index);
  return open < 0 ? null : balancedParen(region, open).content;
}

// "name[, name] : mode type" — expands shared names into one entry each.
function parsePorts(content) {
  if (!content) return [];
  const ports = [];
  for (const grp of splitTop(content)) {
    const g = norm(grp);
    if (!g) continue;
    const m = g.match(/^([\w\s,]+?)\s*:\s*(in\s+out|inout|buffer|linkage|in|out)\s+(.+)$/i);
    if (!m) continue;
    const mode = norm(m[2]).toLowerCase();
    const type = norm(m[3]);
    for (const name of names(m[1])) ports.push({ name, mode, type });
  }
  return ports;
}

// "name[, name] : type [:= default]"
function parseGenerics(content) {
  if (!content) return [];
  const gens = [];
  for (const grp of splitTop(content)) {
    const g = norm(grp);
    if (!g) continue;
    const [decl, def] = g.split(/:=/);
    const m = decl.match(/^([\w\s,]+?)\s*:\s*(.+)$/);
    if (!m) continue;
    const type = norm(m[2]);
    const dflt = def ? norm(def) : '';
    for (const name of names(m[1])) gens.push({ name, type, default: dflt });
  }
  return gens;
}

// VHDL subprogram params: "[constant|signal|variable] name[, name] : [mode] type [:= default]"
function parseSubParams(content) {
  if (!content) return [];
  return splitTop(content).map((g) => norm(g)).filter(Boolean).map((g) => {
    const [decl, def] = g.split(/:=/);
    const m = decl.match(/^(?:(?:constant|signal|variable|file)\s+)?([\w\s,]+?)\s*:\s*(in\s+out|inout|buffer|in|out)?\s*(.+)$/i);
    if (!m) return { names: g, mode: '', type: '', default: '' };
    return { names: norm(m[1]), mode: norm(m[2] || '').toLowerCase(), type: norm(m[3]), default: def ? norm(def) : '' };
  });
}

function parseSignals(decl) {
  const signals = [];
  for (const grp of splitTop(decl)) {
    const g = norm(grp);
    const m = g.match(/\bsignal\s+([\w\s,]+?)\s*:\s*([^:]+?)(?:\s*:=.*)?$/i);
    if (!m) continue;
    const type = norm(m[2]);
    for (const name of names(m[1])) signals.push({ name, type });
  }
  return signals;
}

function parseComponents(decl, body) {
  const out = [];
  let m;
  const declRe = /\bcomponent\s+(\w+)/gi;
  while ((m = declRe.exec(decl))) out.push(m[1]);
  // instantiations: label : [entity [lib.]]Name (port|generic) map
  const instRe = /\b\w+\s*:\s*(?:entity\s+(?:\w+\.)?(\w+)|(\w+))\s+(?:port\s+map|generic\s+map)/gi;
  while ((m = instRe.exec(body))) { const n = m[1] || m[2]; if (n) out.push(n); }
  return [...new Set(out)];
}

const countProcesses = (body) =>
  (body.match(/\bprocess\b/gi) || []).length - (body.match(/\bend\s+process\b/gi) || []).length;

// Slice from `start` to the next top-level structural header (or EOF).
function regionEnd(src, start) {
  const re = /\b(entity|architecture|package|configuration)\b/gi;
  re.lastIndex = start;
  const m = re.exec(src);
  return m ? m.index : src.length;
}

function parseSubprograms(src) {
  const functions = [], procedures = [];
  const re = /\b(impure\s+function|pure\s+function|function|procedure)\s+("[^"]+"|\w+)/gi;
  let m;
  while ((m = re.exec(src))) {
    if (/end\s+$/i.test(src.slice(Math.max(0, m.index - 5), m.index))) continue; // skip `end function Name`
    const isFn = /function/i.test(m[1]);
    const name = m[2];
    let i = re.lastIndex;
    while (i < src.length && /\s/.test(src[i])) i++;
    let params = [];
    if (src[i] === '(') { const g = balancedParen(src, i); params = parseSubParams(g.content); i = g.end + 1; }
    if (isFn) {
      const rm = src.slice(i, i + 120).match(/^\s*return\s+([\w.]+)/i);
      functions.push({ name, params, returns: rm ? rm[1] : '' });
    } else {
      procedures.push({ name, params });
    }
  }
  return { functions, procedures };
}

function parseTypes(src) {
  const types = [];
  let m;
  const re = /\b(subtype|type)\s+(\w+)\s+is\b([^;]*)/gi;
  while ((m = re.exec(src))) {
    const def = m[3] || '';
    let kind = m[1].toLowerCase() === 'subtype' ? 'subtype' : 'type';
    if (kind === 'type') {
      if (/^\s*record\b/i.test(def)) kind = 'record';
      else if (/^\s*array\b/i.test(def)) kind = 'array';
      else if (/^\s*range\b/i.test(def)) kind = 'range';
      else if (/^\s*access\b/i.test(def)) kind = 'access';
      else if (/^\s*\(/.test(def)) kind = 'enum';
    }
    types.push({ name: m[2], kind });
  }
  return types;
}

// Parse VHDL into structured facts. Exported (pure, no DOM) for unit testing.
export function analyzeVHDL(text) {
  const src = stripComments(text);
  const libraries = [], uses = [], entities = [], architectures = [], packages = [];
  let m;

  const libRe = /\blibrary\s+([\w\s,]+?)\s*;/gi;
  while ((m = libRe.exec(src))) for (const l of names(m[1])) libraries.push(l);

  const useRe = /\buse\s+([\w.]+)/gi;
  while ((m = useRe.exec(src))) uses.push(m[1]);

  const pkgRe = /\bpackage\s+(?:body\s+)?(\w+)\s+is\b/gi;
  while ((m = pkgRe.exec(src))) packages.push(m[1]);

  const entRe = /\bentity\s+(\w+)\s+is\b/gi;
  while ((m = entRe.exec(src))) {
    const region = src.slice(entRe.lastIndex, regionEnd(src, entRe.lastIndex));
    entities.push({
      name: m[1],
      generics: parseGenerics(groupAfter(region, /\bgeneric\b/i)),
      ports: parsePorts(groupAfter(region, /\bport\b/i)),
    });
  }

  const archRe = /\barchitecture\s+(\w+)\s+of\s+(\w+)\s+is\b/gi;
  while ((m = archRe.exec(src))) {
    const region = src.slice(archRe.lastIndex, regionEnd(src, archRe.lastIndex));
    const bi = region.search(/\bbegin\b/i);
    const decl = bi >= 0 ? region.slice(0, bi) : region;
    const body = bi >= 0 ? region.slice(bi) : '';
    architectures.push({
      name: m[1], entity: m[2],
      signals: parseSignals(decl),
      processes: countProcesses(body),
      components: parseComponents(decl, body),
    });
  }

  const { functions, procedures } = parseSubprograms(src);
  const types = parseTypes(src);
  return { libraries, uses, packages, entities, architectures, functions, procedures, types };
}

// --- DOM rendering ---------------------------------------------------------

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'vhd-section';
  const hd = document.createElement('div');
  hd.className = 'vhd-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}
function subHd(sec, text) { const d = document.createElement('div'); d.className = 'vhd-sub-hd'; d.textContent = text; sec.appendChild(d); }
function makeList(sec) { const ul = document.createElement('ul'); ul.className = 'vhd-list'; sec.appendChild(ul); return ul; }
function tag(cls, t) { return `<span class="vhd-tag ${cls}">${esc(t)}</span>`; }
function row(ul, html) { const li = document.createElement('li'); li.innerHTML = html; ul.appendChild(li); }
const MODE_CLS = { in: 'vhd-tag-in', out: 'vhd-tag-out', 'in out': 'vhd-tag-inout', inout: 'vhd-tag-inout', buffer: 'vhd-tag-buffer' };
function subParamsHtml(params) {
  return params.map((p) => {
    const mode = p.mode ? `<span class="vhd-mode">${esc(p.mode)}</span> ` : '';
    return `${esc(p.names)} : ${mode}<span class="vhd-type">${esc(p.type)}</span>`;
  }).join('; ');
}

export async function render(intake) {
  const text = intake.text || '';
  const preview = text.slice(0, 4000);
  if (!/\b(entity|architecture|package|library|use)\b/i.test(preview)
      || !/\b(entity|architecture|signal|port|std_logic|begin|end)\b/i.test(preview)) return null;

  const facts = analyzeVHDL(text);
  const { libraries, uses, packages, entities, architectures, functions, procedures, types } = facts;
  if (!entities.length && !architectures.length && !packages.length && !functions.length && !procedures.length) return null;

  const totalPorts = entities.reduce((n, e) => n + e.ports.length, 0);
  const totalSignals = architectures.reduce((n, a) => n + a.signals.length, 0);
  const totalProcs = architectures.reduce((n, a) => n + a.processes, 0);

  const host = document.createElement('div');
  host.className = 'vhd-doc';
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'vhd-title';
  const badge = document.createElement('span');
  badge.className = 'vhd-badge';
  badge.textContent = entities.length ? 'VHDL' : (packages.length ? 'VHDL Package' : 'VHDL');
  title.appendChild(badge);
  const unitName = (entities[0] && entities[0].name) || packages[0] || (architectures[0] && architectures[0].name);
  if (unitName) { const n = document.createElement('span'); n.className = 'vhd-unit'; n.textContent = unitName; title.appendChild(n); }
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'vhd-sub';
  sub.textContent = [
    entities.length && `${entities.length} entit${entities.length !== 1 ? 'ies' : 'y'}`,
    architectures.length && `${architectures.length} architecture${architectures.length !== 1 ? 's' : ''}`,
    totalPorts && `${totalPorts} port${totalPorts !== 1 ? 's' : ''}`,
    totalSignals && `${totalSignals} signal${totalSignals !== 1 ? 's' : ''}`,
  ].filter(Boolean).join(' · ');
  host.appendChild(sub);

  const cards = document.createElement('div');
  cards.className = 'vhd-cards';
  for (const { value, label } of [
    { value: entities.length, label: 'Entities' },
    { value: totalPorts, label: 'Ports' },
    { value: architectures.length, label: 'Architectures' },
    { value: totalSignals, label: 'Signals' },
    { value: totalProcs, label: 'Processes' },
  ]) {
    const card = document.createElement('div');
    card.className = 'vhd-card';
    const s = document.createElement('strong'); s.textContent = value;
    const sp = document.createElement('span'); sp.textContent = label;
    card.appendChild(s); card.appendChild(sp); cards.appendChild(card);
  }
  host.appendChild(cards);

  if (libraries.length || uses.length) {
    const sec = makeSection(host, `Libraries & Use Clauses`);
    const ul = makeList(sec);
    for (const l of libraries) row(ul, `${tag('vhd-tag', 'library')} ${esc(l)}`);
    for (const u of uses) row(ul, `${tag('vhd-tag-comp', 'use')} ${esc(u)}`);
  }

  for (const e of entities) {
    const sec = makeSection(host, `entity ${e.name}`);
    if (e.generics.length) {
      subHd(sec, `Generics (${e.generics.length})`);
      const ul = makeList(sec);
      for (const g of e.generics) {
        const dflt = g.default ? ` := <span class="vhd-default">${esc(g.default)}</span>` : '';
        row(ul, `${tag('vhd-tag-gen', 'generic')} <span class="vhd-name">${esc(g.name)}</span> : <span class="vhd-type">${esc(g.type)}</span>${dflt}`);
      }
    }
    subHd(sec, `Ports (${e.ports.length})`);
    const ul = makeList(sec);
    if (!e.ports.length) row(ul, `<span class="vhd-empty">no ports</span>`);
    for (const p of e.ports) {
      const cls = MODE_CLS[p.mode] || 'vhd-tag-signal';
      row(ul, `${tag(cls, p.mode)} <span class="vhd-name">${esc(p.name)}</span> : <span class="vhd-type">${esc(p.type)}</span>`);
    }
  }

  for (const a of architectures) {
    const sec = makeSection(host, `architecture ${a.name} of ${a.entity}`);
    const meta = [];
    meta.push(`${a.processes} process${a.processes !== 1 ? 'es' : ''}`);
    if (a.components.length) meta.push(`${a.components.length} component${a.components.length !== 1 ? 's' : ''}`);
    subHd(sec, `Signals (${a.signals.length}) · ${meta.join(' · ')}`);
    const ul = makeList(sec);
    for (const s of a.signals) {
      row(ul, `${tag('vhd-tag-signal', 'signal')} <span class="vhd-name">${esc(s.name)}</span> : <span class="vhd-type">${esc(s.type)}</span>`);
    }
    if (!a.signals.length) row(ul, `<span class="vhd-empty">no signals</span>`);
    for (const c of a.components) row(ul, `${tag('vhd-tag-comp', 'component')} <span class="vhd-name">${esc(c)}</span>`);
  }

  if (functions.length) {
    const ul = makeList(makeSection(host, `Functions (${functions.length})`));
    for (const f of functions) {
      const ret = f.returns ? ` return <span class="vhd-ret">${esc(f.returns)}</span>` : '';
      row(ul, `${tag('vhd-tag-func', 'function')} <span class="vhd-name">${esc(f.name)}</span>(${subParamsHtml(f.params)})${ret}`);
    }
  }
  if (procedures.length) {
    const ul = makeList(makeSection(host, `Procedures (${procedures.length})`));
    for (const p of procedures) {
      row(ul, `${tag('vhd-tag-proc', 'procedure')} <span class="vhd-name">${esc(p.name)}</span>(${subParamsHtml(p.params)})`);
    }
  }
  if (types.length) {
    const ul = makeList(makeSection(host, `Types (${types.length})`));
    for (const t of types) row(ul, `${tag('vhd-tag-type', t.kind)} <span class="vhd-name">${esc(t.name)}</span>`);
  }

  return { parentNode: host };
}
