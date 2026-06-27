const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.vlog-doc{padding:16px 18px;max-width:920px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.vlog-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#15803d;color:#fff;vertical-align:middle;margin-right:8px;}
.vlog-badge-sv{background:#1d4ed8;}
.vlog-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.vlog-modname{font-family:ui-monospace,monospace;color:#15803d;font-weight:700;}
.vlog-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.vlog-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:18px;}
.vlog-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:96px;}
.vlog-card strong{display:block;font-size:1.2rem;font-weight:700;}
.vlog-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.vlog-mod{margin:0 0 18px;border:1px solid var(--border,#d9e1ec);border-radius:8px;overflow:hidden;}
.vlog-mod-hd{background:var(--bg-2,#f6f8fa);padding:9px 14px;font-size:14px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.vlog-mod-meta{font-size:11px;color:var(--fg-2,#888);font-weight:400;margin-left:8px;}
.vlog-grp{padding:8px 14px 12px;border-bottom:1px solid var(--border,#eef1f5);}
.vlog-grp:last-child{border-bottom:none;}
.vlog-grp h4{margin:6px 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);}
.vlog-table{width:100%;border-collapse:collapse;font-size:12px;font-family:ui-monospace,monospace;}
.vlog-table th{text-align:left;color:var(--fg-2,#888);font-size:10px;text-transform:uppercase;padding:3px 8px;border-bottom:1px solid var(--border,#e0e0e0);}
.vlog-table td{padding:3px 8px;border-bottom:1px solid var(--border,#f0f2f5);vertical-align:top;}
.vlog-table tr:last-child td{border-bottom:none;}
.vlog-tag{font-size:10px;padding:1px 6px;border-radius:4px;font-weight:700;}
.vlog-dir-input{background:#dcfce7;color:#166534;}
.vlog-dir-output{background:#dbeafe;color:#1d4ed8;}
.vlog-dir-inout{background:#fef9c3;color:#854d0e;}
.vlog-dir-{background:#f1f5f9;color:#64748b;}
.vlog-type{color:#7c3aed;}
.vlog-width{color:#0e7490;}
.vlog-name{font-weight:600;}
.vlog-li{font-family:ui-monospace,monospace;font-size:12px;padding:2px 0;}
.vlog-val{color:#059669;}
`;

const NETS = ['logic', 'wire', 'reg', 'tri', 'triand', 'trior', 'wand', 'wor', 'supply0', 'supply1',
  'integer', 'genvar', 'real', 'realtime', 'time', 'bit', 'byte', 'shortint', 'longint', 'int'];
const NET_RE = new RegExp('\\b(' + NETS.join('|') + ')\\b');
const KEYWORDS = new Set(['if', 'else', 'case', 'casex', 'casez', 'for', 'while', 'begin', 'end',
  'assign', 'always', 'always_ff', 'always_comb', 'always_latch', 'initial', 'generate', 'endgenerate',
  'parameter', 'localparam', 'input', 'output', 'inout', 'function', 'task', 'module', 'endmodule',
  'return', 'posedge', 'negedge', 'defparam', 'specify', 'wait', 'force', 'release', 'fork', 'join']);

function stripComments(text) {
  return String(text || '').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
}

function isSystemVerilog(text) {
  return /\b(logic|always_ff|always_comb|always_latch|interface\s+\w|typedef\s+(?:struct|enum)|\bpackage\s+\w)\b/.test(text || '');
}

// Comma/semicolon splitter that respects (), [], {} nesting.
function splitTopLevel(text, sep) {
  const out = [];
  let buf = '', depth = 0;
  for (const ch of String(text || '')) {
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') depth = Math.max(0, depth - 1);
    if (ch === sep && depth === 0) { out.push(buf); buf = ''; } else buf += ch;
  }
  if (buf.trim()) out.push(buf);
  return out;
}

// Parse one declaration fragment → { dir, type, width, names:[] }. Used for ports and signals.
function parseDecl(s) {
  let rest = String(s).replace(/\s+/g, ' ').trim();
  const dirM = rest.match(/\b(input|output|inout)\b/);
  const dir = dirM ? dirM[1] : '';
  if (dirM) rest = rest.replace(/\b(input|output|inout)\b/, ' ');
  let type = '';
  const tM = rest.match(NET_RE);
  if (tM) { type = tM[1]; rest = rest.replace(NET_RE, ' '); }
  rest = rest.replace(/\b(signed|unsigned|automatic|static|const|var)\b/g, ' ');
  const wM = rest.match(/(\[[^\]]*\])/);
  const width = wM ? wM[1] : '';
  rest = rest.replace(/\[[^\]]*\]/g, ' ').replace(/=.*/, ' ');
  const names = rest.split(',').map((x) => (x.trim().match(/(\w+)\s*$/) || [])[1]).filter(Boolean);
  return { dir, type, width, names };
}

// ANSI port list: a port without a direction keyword inherits the previous port's dir/type/width.
function parsePortList(text) {
  const ports = [];
  let last = { dir: '', type: '', width: '' };
  for (let item of splitTopLevel(text, ',')) {
    item = item.replace(/\s+/g, ' ').trim();
    if (!item || item.startsWith('.')) continue;
    const d = parseDecl(item);
    if (!d.names.length) continue;
    const hasDir = /\b(input|output|inout)\b/.test(item);
    const dir = hasDir ? d.dir : (last.dir || d.dir);
    const type = hasDir ? d.type : (d.type || last.type);
    const width = hasDir ? d.width : (d.width || last.width);
    for (const name of d.names) ports.push({ dir, type, width, name });
    last = { dir, type, width };
  }
  return ports;
}

// `parameter A=1, B=2` / `localparam X=...` (also header #(...)) → [{name,value,local}].
function parseParamEntries(text) {
  const out = [];
  let local = /^\s*localparam\b/.test(text);
  for (let part of splitTopLevel(text, ',')) {
    part = part.replace(/\s+/g, ' ').trim();
    if (!part) continue;
    if (/^localparam\b/.test(part)) local = true;
    else if (/^parameter\b/.test(part)) local = false;
    const m = part.match(/(\w+)\s*=\s*(.+)$/);
    if (m) out.push({ name: m[1], value: m[2].trim(), local });
  }
  return out;
}

function parseSubprogram(blk) {
  const head = blk.match(/\b(?:function|task)\b\s+([\s\S]*?)(\(|;)/);
  let name = '', args = [];
  if (head) {
    const pre = head[1].replace(/\b(automatic|static|void)\b/g, ' ').trim();
    const words = pre.split(/[\s[\]:]+/).filter(Boolean);
    name = words[words.length - 1] || '';
    if (head[2] === '(') {
      const am = blk.slice(blk.indexOf('(')).match(/\(([\s\S]*?)\)/);
      if (am) args = parsePortList(am[1]).map((p) => p.name);
    }
  }
  if (!args.length) {
    let mm; const re = /\binput\b[^;]*;/g;
    while ((mm = re.exec(blk))) args.push(...parseDecl(mm[0]).names);
  }
  return { name, args };
}

function matchInstance(s) {
  if (/<?=|@|\b(begin|end|if|else|case|assign|generate|for|while)\b/.test(s)) return null;
  const m = s.match(/^(\w+)\s*(?:#\s*\([\s\S]*\)\s*)?(\w+)\s*\(/);
  if (!m || KEYWORDS.has(m[1]) || NETS.includes(m[1])) return null;
  return { module: m[1], name: m[2] };
}

function parseModule(name, header, body) {
  const mod = {
    name, parameters: [], ports: [], signals: [],
    always: [], assigns: 0, functions: [], tasks: [], instances: [],
  };
  // Header: #( params ) then ( port list ).
  let head = header;
  const hi = head.indexOf('#');
  if (hi >= 0) {
    const sub = head.slice(hi);
    const inner = (sub.match(/\(([\s\S]*)\)/) || [])[1];
    if (inner != null) mod.parameters.push(...parseParamEntries(inner));
    head = head.slice(0, hi);
  }
  const portText = (head.match(/\(([\s\S]*)\)/) || [])[1];
  if (portText != null) mod.ports.push(...parsePortList(portText));

  const byName = (n) => mod.ports.find((p) => p.name === n);

  // Extract & remove function/task blocks so their internals don't leak into module decls.
  let work = body;
  work = work.replace(/\bfunction\b[\s\S]*?\bendfunction\b/g, (b) => { mod.functions.push(parseSubprogram(b)); return ' '; });
  work = work.replace(/\btask\b[\s\S]*?\bendtask\b/g, (b) => { mod.tasks.push(parseSubprogram(b)); return ' '; });

  // Always blocks (count + sensitivity) and continuous assigns.
  let am; const ar = /\balways(_ff|_comb|_latch)?\b\s*(?:@\s*\(([^)]*)\))?/g;
  while ((am = ar.exec(work))) {
    mod.always.push({ kind: 'always' + (am[1] || ''), sensitivity: am[2] ? am[2].replace(/\s+/g, ' ').trim() : '' });
  }
  mod.assigns = (work.match(/(?<![\w$])assign\b/g) || []).length;

  for (let raw of splitTopLevel(work, ';')) {
    const s = raw.replace(/\s+/g, ' ').trim();
    if (!s) continue;
    if (/^(parameter|localparam)\b/.test(s)) { mod.parameters.push(...parseParamEntries(s)); continue; }
    if (/^(input|output|inout)\b/.test(s)) {
      const d = parseDecl(s);
      for (const nm of d.names) {
        const ex = byName(nm);
        if (ex) { ex.dir = ex.dir || d.dir; ex.type = ex.type || d.type; ex.width = ex.width || d.width; }
        else mod.ports.push({ dir: d.dir, type: d.type, width: d.width, name: nm });
      }
      continue;
    }
    if (NET_RE.test(s) && new RegExp('^(' + NETS.join('|') + ')\\b').test(s)) {
      const d = parseDecl(s);
      for (const nm of d.names) {
        const ex = byName(nm);
        if (ex) { ex.type = ex.type || d.type; ex.width = ex.width || d.width; }
        else mod.signals.push({ type: d.type, width: d.width, name: nm });
      }
      continue;
    }
    const inst = matchInstance(s);
    if (inst) mod.instances.push(inst);
  }
  return mod;
}

// Pure, DOM-free structural parse. Exported for unit testing.
export function analyzeVerilog(text) {
  const src = stripComments(text);
  const isSV = isSystemVerilog(text);
  const modules = [];
  let m; const re = /\bmodule\b\s+([\s\S]*?)\bendmodule\b/g;
  while ((m = re.exec(src))) {
    const block = m[1];
    const nameM = block.match(/^\s*(\w+)/);
    if (!nameM) continue;
    let rest = block.slice(nameM[0].length);
    let depth = 0, idx = -1;
    for (let i = 0; i < rest.length; i++) {
      const c = rest[i];
      if (c === '(' || c === '[' || c === '{') depth++;
      else if (c === ')' || c === ']' || c === '}') depth = Math.max(0, depth - 1);
      else if (c === ';' && depth === 0) { idx = i; break; }
    }
    const header = idx >= 0 ? rest.slice(0, idx) : rest;
    const bodyText = idx >= 0 ? rest.slice(idx + 1) : '';
    modules.push(parseModule(nameM[1], header, bodyText));
  }
  return { isSV, modules };
}

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

function dirTag(dir) {
  return `<span class="vlog-tag vlog-dir-${esc(dir)}">${esc(dir || '?')}</span>`;
}

function portsTable(ports) {
  const rows = ports.map((p) => `<tr><td>${dirTag(p.dir)}</td>`
    + `<td class="vlog-type">${esc(p.type || '')}</td>`
    + `<td class="vlog-width">${esc(p.width || '')}</td>`
    + `<td class="vlog-name">${esc(p.name)}</td></tr>`).join('');
  return `<table class="vlog-table"><thead><tr><th>Dir</th><th>Type</th><th>Width</th><th>Name</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderModule(mod) {
  const box = el('div', 'vlog-mod');
  const counts = [`${mod.ports.length} ports`,
    mod.always.length && `${mod.always.length} always`,
    mod.assigns && `${mod.assigns} assign`,
    mod.instances.length && `${mod.instances.length} inst`].filter(Boolean).join(' · ');
  box.appendChild(el('div', 'vlog-mod-hd', `module <span class="vlog-modname">${esc(mod.name)}</span><span class="vlog-mod-meta">${esc(counts)}</span>`));

  if (mod.parameters.length) {
    const g = el('div', 'vlog-grp', '<h4>Parameters</h4>');
    for (const p of mod.parameters) {
      g.appendChild(el('div', 'vlog-li', `<span class="vlog-tag vlog-dir-output">${p.local ? 'localparam' : 'parameter'}</span> `
        + `<span class="vlog-name">${esc(p.name)}</span> = <span class="vlog-val">${esc(p.value)}</span>`));
    }
    box.appendChild(g);
  }
  if (mod.ports.length) {
    const g = el('div', 'vlog-grp', '<h4>Ports</h4>');
    g.appendChild(el('div', null, portsTable(mod.ports)));
    box.appendChild(g);
  }
  if (mod.signals.length) {
    const g = el('div', 'vlog-grp', '<h4>Internal signals</h4>');
    for (const s of mod.signals) {
      g.appendChild(el('div', 'vlog-li', `<span class="vlog-type">${esc(s.type || 'wire')}</span> `
        + `<span class="vlog-width">${esc(s.width || '')}</span> <span class="vlog-name">${esc(s.name)}</span>`));
    }
    box.appendChild(g);
  }
  if (mod.always.length || mod.assigns) {
    const g = el('div', 'vlog-grp', '<h4>Behavior</h4>');
    for (const a of mod.always) {
      g.appendChild(el('div', 'vlog-li', `<span class="vlog-type">${esc(a.kind)}</span>`
        + (a.sensitivity ? ` @(<span class="vlog-width">${esc(a.sensitivity)}</span>)` : '')));
    }
    if (mod.assigns) g.appendChild(el('div', 'vlog-li', `${mod.assigns} continuous assign${mod.assigns !== 1 ? 's' : ''}`));
    box.appendChild(g);
  }
  for (const [label, list] of [['Functions', mod.functions], ['Tasks', mod.tasks]]) {
    if (!list.length) continue;
    const g = el('div', 'vlog-grp', `<h4>${label}</h4>`);
    for (const f of list) {
      g.appendChild(el('div', 'vlog-li', `<span class="vlog-name">${esc(f.name)}</span>(<span class="vlog-width">${esc(f.args.join(', '))}</span>)`));
    }
    box.appendChild(g);
  }
  if (mod.instances.length) {
    const g = el('div', 'vlog-grp', '<h4>Instances</h4>');
    for (const i of mod.instances) {
      g.appendChild(el('div', 'vlog-li', `<span class="vlog-type">${esc(i.module)}</span> <span class="vlog-name">${esc(i.name)}</span>`));
    }
    box.appendChild(g);
  }
  return box;
}

export function render(intake) {
  const text = intake.text || '';
  if (!/\b(module|endmodule|always|assign|input|output|inout|wire|reg|logic)\b/.test(text)) return null;

  const { isSV, modules } = analyzeVerilog(text);
  if (!modules.length && !/\bmodule\b/.test(text)) return null;

  const host = el('div', 'vlog-doc');
  host.appendChild(el('style', null, CSS));

  const variant = isSV ? 'SystemVerilog' : 'Verilog';
  host.appendChild(el('div', 'vlog-title',
    `<span class="vlog-badge${isSV ? ' vlog-badge-sv' : ''}">${esc(variant)}</span>Hardware Description`));

  const totalPorts = modules.reduce((n, m) => n + m.ports.length, 0);
  const totalParams = modules.reduce((n, m) => n + m.parameters.length, 0);
  const totalAlways = modules.reduce((n, m) => n + m.always.length, 0);
  host.appendChild(el('div', 'vlog-sub', [
    `${modules.length} module${modules.length !== 1 ? 's' : ''}`,
    totalPorts && `${totalPorts} ports`,
    totalParams && `${totalParams} parameters`,
  ].filter(Boolean).join(' · ')));

  const cards = el('div', 'vlog-cards');
  for (const { value, label } of [
    { value: modules.length, label: 'Modules' },
    { value: totalPorts, label: 'Ports' },
    { value: totalParams, label: 'Parameters' },
    { value: totalAlways, label: 'Always blocks' },
  ]) {
    const card = el('div', 'vlog-card');
    card.appendChild(el('strong', null, esc(value)));
    card.appendChild(el('span', null, esc(label)));
    cards.appendChild(card);
  }
  host.appendChild(cards);

  for (const mod of modules) host.appendChild(renderModule(mod));
  return { parentNode: host };
}
