const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.idr-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.idr-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#b91c1c;color:#fff;vertical-align:middle;margin-right:8px;}
.idr-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.idr-mod{font-family:ui-monospace,monospace;font-size:15px;color:#b91c1c;}
.idr-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.idr-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.idr-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:96px;}
.idr-card strong{display:block;font-size:1.2rem;font-weight:700;}
.idr-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.idr-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.idr-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.idr-list{margin:0;padding:0;list-style:none;}
.idr-list li{padding:6px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.idr-list li:last-child{border-bottom:none;}
.idr-tag{font-size:10px;padding:1px 6px;border-radius:4px;font-weight:700;}
.idr-tag-import{background:#dcfce7;color:#166534;}
.idr-tag-data{background:#fef9c3;color:#854d0e;}
.idr-tag-gadt{background:#fde8d8;color:#b45309;}
.idr-tag-record{background:#ede9fe;color:#7c3aed;}
.idr-tag-iface{background:#dbeafe;color:#1d4ed8;}
.idr-tag-impl{background:#e0f2fe;color:#0369a1;}
.idr-tag-total{background:#d8fde9;color:#0a7440;}
.idr-tag-partial{background:#fde8d8;color:#b45309;}
.idr-name{font-weight:600;}
.idr-sig{color:#0e7490;}
.idr-ctor{display:inline-block;margin:2px 6px 0 0;padding:1px 7px;border-radius:10px;font-size:11px;background:var(--bg-2,#eef2f7);color:#334155;font-family:ui-monospace,monospace;}
.idr-field{color:#475569;}
.idr-ftype{color:#0e7490;}
.idr-sub-rows{display:flex;flex-direction:column;gap:2px;width:100%;margin-top:4px;}
`;

// ── Pure parser (DOM-free, exported for unit testing) ───────────────────────

// Strip {- nested block -} comments (preserving newlines), then -- line comments
// and ||| doc-comment lines.
function stripComments(text) {
  const s = String(text || '');
  let out = '', i = 0, depth = 0;
  while (i < s.length) {
    if (!depth && s[i] === '{' && s[i + 1] === '-') { depth = 1; i += 2; continue; }
    if (depth) {
      if (s[i] === '{' && s[i + 1] === '-') { depth++; i += 2; continue; }
      if (s[i] === '-' && s[i + 1] === '}') { depth--; i += 2; continue; }
      if (s[i] === '\n') out += '\n';
      i++; continue;
    }
    out += s[i]; i++;
  }
  return out.split('\n').map((l) => {
    if (/^\s*\|\|\|/.test(l)) return '';          // documentation comment line
    const idx = l.indexOf('--');
    return idx >= 0 ? l.slice(0, idx) : l;
  }).join('\n');
}

const indentOf = (l) => (l.match(/^\s*/)[0] || '').length;

// Collect the indented body (indent > 0) that follows index `i`. Returns the
// trimmed non-blank lines and the index just past the block.
function indentedBlock(lines, i) {
  const body = [];
  while (i < lines.length) {
    const l = lines[i];
    if (l.trim() === '') { i++; continue; }
    if (indentOf(l) > 0) { body.push(l.trim()); i++; continue; }
    break;
  }
  return { body, i };
}

// `name : Type`  →  { name, type }. Name may be an operator in parens, e.g. (<+>).
function splitTyped(t) {
  const m = t.match(/^(\([^)]+\)|[\w'.]+)\s*:\s*(.+)$/);
  if (!m) return null;
  return { name: m[1], type: m[2].trim() };
}

export function analyzeIdris(text) {
  const lines = stripComments(text).split(/\r?\n/);
  let module = null;
  const imports = [];
  const dataTypes = [];   // { name, constructors:[], style:'adt'|'gadt' }
  const records = [];     // { name, constructor, fields:[{name,type}] }
  const interfaces = [];  // { name, methods:[{name,signature}] }
  const implementations = []; // strings, e.g. "HasArea Shape"
  const functions = [];   // { name, signature, totality }
  let pendingTotality = null;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();
    if (t === '') { i++; continue; }
    if (indentOf(line) > 0) { i++; continue; } // stray indented line (owned by a block)

    let m;
    if ((m = t.match(/^module\s+([\w.]+)/))) { if (!module) module = m[1]; i++; continue; }
    if ((m = t.match(/^import\s+(?:public\s+)?([\w.]+)/))) {
      if (!imports.includes(m[1])) imports.push(m[1]); i++; continue;
    }

    // totality / coverage annotations: standalone, or prefixing a signature
    if ((m = t.match(/^%?(total|partial|covering)\b\s*(.*)$/))) {
      const ann = m[1];
      const rest = m[2].trim();
      if (!rest) { pendingTotality = ann; i++; continue; }
      const ty = splitTyped(rest);
      if (ty) { functions.push({ name: ty.name, signature: ty.type, totality: ann }); i++; continue; }
      pendingTotality = ann; // `total funcName` — attach to its later signature
      i++; continue;
    }

    // data — GADT (`data T : ... where`) or ADT (`data T = A | B`)
    if ((m = t.match(/^data\s+([\w']+)/))) {
      const name = m[1];
      if (/\bwhere\b/.test(t)) {
        const { body, i: ni } = indentedBlock(lines, i + 1);
        const constructors = [];
        for (const b of body) {
          const ty = splitTyped(b);
          if (ty) ty.name.split(',').forEach((n) => { const c = n.trim(); if (c) constructors.push(c); });
        }
        dataTypes.push({ name, constructors, style: 'gadt' });
        i = ni; continue;
      }
      // ADT: gather RHS after first '=', plus indented continuation lines (| ...)
      let rhs = t.includes('=') ? t.slice(t.indexOf('=') + 1) : '';
      let j = i + 1;
      while (j < lines.length && lines[j].trim() !== '' && indentOf(lines[j]) > 0) {
        rhs += ' ' + lines[j].trim(); j++;
      }
      const constructors = rhs.split('|').map((p) => (p.trim().split(/\s+/)[0] || '')).filter(Boolean);
      dataTypes.push({ name, constructors, style: 'adt' });
      i = j; continue;
    }

    // record R where { constructor MkR; field : Type }
    if ((m = t.match(/^record\s+([\w']+)/))) {
      const name = m[1];
      const { body, i: ni } = indentedBlock(lines, i + 1);
      let constructor = null;
      const fields = [];
      for (const b of body) {
        const cm = b.match(/^constructor\s+([\w']+)/);
        if (cm) { constructor = cm[1]; continue; }
        const ty = splitTyped(b);
        if (ty) ty.name.split(',').forEach((n) => { const f = n.trim(); if (f) fields.push({ name: f, type: ty.type }); });
      }
      records.push({ name, constructor, fields });
      i = ni; continue;
    }

    // interface [Constraint =>] Name args where { method : Type }
    if ((m = t.match(/^interface\s+(.+?)\s+where\b/)) || (m = t.match(/^interface\s+(.+)$/))) {
      let head = m[1];
      if (head.includes('=>')) head = head.split('=>').pop();
      const nm = head.trim().match(/^([\w']+)/);
      const name = nm ? nm[1] : head.trim();
      const { body, i: ni } = indentedBlock(lines, i + 1);
      const methods = [];
      for (const b of body) {
        const ty = splitTyped(b);
        if (ty) ty.name.split(',').forEach((n) => { const mn = n.trim(); if (mn) methods.push({ name: mn, signature: ty.type }); });
      }
      interfaces.push({ name, methods });
      i = ni; continue;
    }

    // implementation [Constraint =>] Iface Type where  (Idris 2 also allows the
    // keyword to be omitted: `Show Shape where`)
    let implSpec = null;
    if ((m = t.match(/^implementation\s+(.+?)\s+where\b/))) implSpec = m[1].trim();
    else if ((m = t.match(/^([A-Z][\w.]*\s+.+?)\s+where\b/))) implSpec = m[1].trim();
    if (implSpec) {
      if (implSpec.includes('=>')) implSpec = implSpec.split('=>').pop().trim();
      implementations.push(implSpec);
      const { i: ni } = indentedBlock(lines, i + 1);
      i = ni; continue;
    }

    // top-level function / value type signature: `name : Type`
    const ty = splitTyped(t);
    if (ty && /^([a-z_]|\()/.test(ty.name)) {
      let signature = ty.type;
      let j = i + 1;
      while (j < lines.length && indentOf(lines[j]) > 0 && /^(->|=>)/.test(lines[j].trim())) {
        signature += ' ' + lines[j].trim(); j++;
      }
      functions.push({ name: ty.name, signature, totality: pendingTotality });
      pendingTotality = null;
      i = j; continue;
    }

    pendingTotality = null;
    i++;
  }

  return { module, imports, dataTypes, records, interfaces, implementations, functions };
}

// ── Rendering ───────────────────────────────────────────────────────────────

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'idr-section';
  const hd = document.createElement('div');
  hd.className = 'idr-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}
function makeList(sec) { const ul = document.createElement('ul'); ul.className = 'idr-list'; sec.appendChild(ul); return ul; }
function tag(cls, t) { return `<span class="idr-tag ${cls}">${esc(t)}</span>`; }
function row(ul, html) { const li = document.createElement('li'); li.innerHTML = html; ul.appendChild(li); }
const plural = (n, s) => `${n} ${s}${n !== 1 ? 's' : ''}`;

export async function render(intake) {
  const text = intake.text || '';
  const preview = text.slice(0, 3000);
  if (!/^module\s/m.test(preview) && !/^data\s/m.test(preview) && !/:\s*Type\b/.test(preview)) return null;

  const { module, imports, dataTypes, records, interfaces, implementations, functions } = analyzeIdris(text);

  const host = document.createElement('div');
  host.className = 'idr-doc';
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'idr-title';
  const badge = document.createElement('span');
  badge.className = 'idr-badge';
  badge.textContent = 'Idris';
  title.appendChild(badge);
  const mod = document.createElement('span');
  mod.className = 'idr-mod';
  mod.textContent = module || 'Source File';
  title.appendChild(mod);
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'idr-sub';
  sub.textContent = [
    imports.length && plural(imports.length, 'import'),
    dataTypes.length && plural(dataTypes.length, 'data type'),
    interfaces.length && plural(interfaces.length, 'interface'),
    records.length && plural(records.length, 'record'),
    functions.length && plural(functions.length, 'signature'),
  ].filter(Boolean).join(' · ') || 'Idris source';
  host.appendChild(sub);

  const cards = document.createElement('div');
  cards.className = 'idr-cards';
  for (const { value, label } of [
    { value: imports.length, label: 'Imports' },
    { value: dataTypes.length, label: 'Data types' },
    { value: interfaces.length, label: 'Interfaces' },
    { value: records.length, label: 'Records' },
    { value: functions.length, label: 'Signatures' },
  ]) {
    const card = document.createElement('div');
    card.className = 'idr-card';
    const s = document.createElement('strong'); s.textContent = value;
    const sp = document.createElement('span'); sp.textContent = label;
    card.appendChild(s); card.appendChild(sp); cards.appendChild(card);
  }
  host.appendChild(cards);

  if (imports.length) {
    const ul = makeList(makeSection(host, `Imports (${imports.length})`));
    for (const imp of imports) row(ul, `${tag('idr-tag-import', 'import')} <span class="idr-name">${esc(imp)}</span>`);
  }

  if (dataTypes.length) {
    const ul = makeList(makeSection(host, `Data Types (${dataTypes.length})`));
    for (const d of dataTypes) {
      const ctors = d.constructors.map((c) => `<span class="idr-ctor">${esc(c)}</span>`).join('');
      const styleTag = d.style === 'gadt' ? tag('idr-tag-gadt', 'GADT') : tag('idr-tag-data', 'data');
      row(ul, `${styleTag} <span class="idr-name">${esc(d.name)}</span>`
        + (ctors ? `<div class="idr-sub-rows"><div>${ctors}</div></div>` : ''));
    }
  }

  if (interfaces.length) {
    const ul = makeList(makeSection(host, `Interfaces (${interfaces.length})`));
    for (const iface of interfaces) {
      const methods = iface.methods.map((mt) =>
        `<div><span class="idr-name">${esc(mt.name)}</span> <span class="idr-sig">: ${esc(mt.signature)}</span></div>`).join('');
      row(ul, `${tag('idr-tag-iface', 'interface')} <span class="idr-name">${esc(iface.name)}</span>`
        + (methods ? `<div class="idr-sub-rows">${methods}</div>` : ''));
    }
  }

  if (records.length) {
    const ul = makeList(makeSection(host, `Records (${records.length})`));
    for (const r of records) {
      const fields = r.fields.map((f) =>
        `<div><span class="idr-field">${esc(f.name)}</span> <span class="idr-ftype">: ${esc(f.type)}</span></div>`).join('');
      const ctor = r.constructor ? ` <span class="idr-ctor">${esc(r.constructor)}</span>` : '';
      row(ul, `${tag('idr-tag-record', 'record')} <span class="idr-name">${esc(r.name)}</span>${ctor}`
        + (fields ? `<div class="idr-sub-rows">${fields}</div>` : ''));
    }
  }

  if (implementations.length) {
    const ul = makeList(makeSection(host, `Implementations (${implementations.length})`));
    for (const impl of implementations) row(ul, `${tag('idr-tag-impl', 'impl')} <span class="idr-name">${esc(impl)}</span>`);
  }

  if (functions.length) {
    const ul = makeList(makeSection(host, `Function Signatures (${functions.length})`));
    for (const f of functions) {
      const tot = f.totality ? tag(`idr-tag-${f.totality === 'total' ? 'total' : 'partial'}`, f.totality) + ' ' : '';
      row(ul, `${tot}<span class="idr-name">${esc(f.name)}</span> <span class="idr-sig">: ${esc(f.signature)}</span>`);
    }
  }

  return { parentNode: host };
}
