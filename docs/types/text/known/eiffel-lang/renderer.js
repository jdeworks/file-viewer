const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.efl-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.efl-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#059669;color:#fff;vertical-align:middle;margin-right:8px;}
.efl-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.efl-cls{font-family:ui-monospace,monospace;color:#059669;}
.efl-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.efl-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.efl-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:96px;}
.efl-card strong{display:block;font-size:1.2rem;font-weight:700;}
.efl-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.efl-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.efl-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.efl-list{margin:0;padding:0;list-style:none;}
.efl-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.efl-list li:last-child{border-bottom:none;}
.efl-tag{font-size:10px;padding:1px 5px;border-radius:4px;font-weight:700;}
.efl-tag-parent{background:#dcfce7;color:#166534;}
.efl-tag-create{background:#ede9fe;color:#7c3aed;}
.efl-tag-proc{background:#dbeafe;color:#1d4ed8;}
.efl-tag-func{background:#cffafe;color:#0e7490;}
.efl-tag-attr{background:#fef9c3;color:#854d0e;}
.efl-name{font-weight:600;}
.efl-type{color:#0e7490;}
.efl-ret{color:#1d4ed8;}
.efl-sect-label{color:var(--fg-2,#888);font-style:italic;margin-left:auto;font-size:11px;}
.efl-contract{padding:8px 14px;font-size:12px;color:var(--fg-2,#555);}
`;

// ---------------------------------------------------------------------------
// Pure parser (DOM-free, exported for unit testing).
// ---------------------------------------------------------------------------

const stripComment = (l) => String(l).replace(/--.*$/, '').replace(/\s+$/, '');

// Keywords that may begin a line in the feature region but are NOT a feature name.
const RESERVED = new Set([
  'do', 'end', 'then', 'else', 'elseif', 'loop', 'until', 'from', 'if', 'inspect',
  'when', 'check', 'debug', 'across', 'local', 'require', 'ensure', 'rescue', 'variant',
  'once', 'deferred', 'external', 'attribute', 'obsolete', 'note', 'alias', 'assign',
  'like', 'old', 'current', 'precursor', 'agent', 'create', 'invariant', 'feature',
  'inherit', 'class', 'convert', 'separate', 'expanded', 'frozen', 'detachable',
  'attached', 'and', 'or', 'not', 'xor', 'implies', 'true', 'false', 'void',
]);

// Keywords that introduce a routine body (closed by a matching `end`).
const BODY_KW = new Set(['do', 'once', 'deferred', 'external', 'attribute']);

const OPENERS = /\b(if|from|inspect|debug|across|check|do|once|deferred|external|attribute)\b/gi;
const ENDS = /\bend\b/gi;
const countOpeners = (t) => (t.match(OPENERS) || []).length;
const countEnds = (t) => (t.match(ENDS) || []).length;

// "a, b: INTEGER; c: STRING" -> [{name:'a',type:'INTEGER'}, {name:'b',...}, {name:'c',type:'STRING'}]
function eiffelParams(paramStr) {
  const inner = paramStr.replace(/^\(/, '').replace(/\)$/, '').trim();
  if (!inner) return [];
  const out = [];
  for (const group of inner.split(';')) {
    const g = group.trim();
    if (!g) continue;
    const m = g.match(/^([a-z]\w*(?:\s*,\s*[a-z]\w*)*)\s*:\s*(.+)$/i);
    if (m) {
      const type = m[2].trim();
      for (const nm of m[1].split(',')) out.push({ name: nm.trim(), type });
    } else {
      out.push({ name: g, type: '' });
    }
  }
  return out;
}

// Parse a single feature header (a balanced, possibly multi-line, param list collapsed into `buf`).
// Returns { names:[...], params:[...], returns:'' } or null.
function parseHeader(buf) {
  const nm = buf.match(/^(?:frozen\s+)?([a-z]\w*(?:\s*,\s*[a-z]\w*)*)/i);
  if (!nm) return null;
  const names = nm[1].split(',').map((s) => s.trim()).filter(Boolean);
  if (!names.length || RESERVED.has(names[0].toLowerCase())) return null;

  let rest = buf.slice(nm[0].length).trim();
  let params = [];
  if (rest.startsWith('(')) {
    let d = 0, k = 0;
    for (; k < rest.length; k++) {
      const c = rest[k];
      if (c === '(') d++;
      else if (c === ')') { d--; if (d === 0) { k++; break; } }
    }
    params = eiffelParams(rest.slice(0, k));
    rest = rest.slice(k).trim();
  }
  let returns = '';
  if (rest.startsWith(':')) {
    rest = rest.slice(1).trim();
    const kw = rest.match(/\b(assign|obsolete|is|do|deferred|once|external|attribute|note|require|ensure|rename)\b/i);
    const eq = rest.indexOf('=');
    let stop = kw ? rest.indexOf(kw[0]) : -1;
    if (eq >= 0) stop = stop < 0 ? eq : Math.min(stop, eq);
    returns = (stop >= 0 ? rest.slice(0, stop) : rest).trim();
  }
  return { names, params, returns };
}

const unbalanced = (s) => (s.match(/\(/g) || []).length > (s.match(/\)/g) || []).length;

// Parse the feature starting at `lines[start]`. Returns { features:[...], next } where `next`
// is the index of the first line NOT consumed by this feature.
function parseFeatureAt(lines, start, section) {
  let buf = lines[start].trim();
  let j = start;
  while (unbalanced(buf) && j + 1 < lines.length) { j++; buf += ' ' + lines[j].trim(); }

  const hdr = parseHeader(buf);
  if (!hdr) return null;

  let hasBody = false, bodyKw = null, isRoutine = false, depth = 0, phase = 'predecl';
  let k = j + 1;

  // Same-line body, e.g. `make do balance := 0 end`.
  const inlineBody = buf.match(/\b(do|once|deferred|external|attribute)\b([\s\S]*)$/i);
  if (inlineBody) {
    hasBody = true; bodyKw = inlineBody[1].toLowerCase();
    depth = 1 + countOpeners(inlineBody[2]) - countEnds(inlineBody[2]);
    phase = depth <= 0 ? 'done' : 'inbody';
  }

  while (phase !== 'done' && k < lines.length) {
    const t = lines[k].trim();
    if (!t) { k++; continue; }
    const w = (t.match(/^[A-Za-z]\w*/) || [''])[0].toLowerCase();
    if (phase === 'predecl') {
      if (BODY_KW.has(w)) { bodyKw = w; hasBody = true; phase = 'inbody'; depth = 1; k++; continue; }
      if (['require', 'ensure', 'local', 'obsolete', 'note', 'rescue', 'variant'].includes(w)) { isRoutine = true; k++; continue; }
      if (isRoutine) { k++; continue; }
      break; // simple attribute: declaration ended; do not consume line k
    } else { // inbody
      depth += countOpeners(t) - countEnds(t);
      k++;
      if (depth <= 0) break;
    }
  }

  let kind;
  if (bodyKw === 'attribute') kind = 'attribute';
  else if (hasBody || isRoutine) kind = hdr.returns ? 'function' : 'procedure';
  else kind = 'attribute';

  const features = hdr.names.map((name) => ({ name, params: hdr.params, returns: hdr.returns, kind, section }));
  return { features, next: k };
}

// Top-level analysis. Returns structured facts; pure & DOM-free.
export function analyzeEiffel(text) {
  const lines = String(text || '').split(/\r?\n/).map(stripComment);
  const n = lines.length;

  let className = null, deferred = false, section = null, mode = 'pre';
  const inherits = [], creators = [], features = [];

  const addParent = (s) => {
    const m = s.match(/^([A-Z][A-Z0-9_]*)/);
    if (m && !inherits.includes(m[1])) inherits.push(m[1]);
  };
  const addCreators = (s) => {
    for (const part of s.split(/[\s,]+/)) {
      if (/^[a-z]\w*$/.test(part) && !creators.includes(part)) creators.push(part);
    }
  };

  let i = 0;
  while (i < n) {
    const line = lines[i].trim();
    if (!line) { i++; continue; }
    const fw = (line.match(/^[A-Za-z]\w*/) || [''])[0].toLowerCase();

    const cm = line.match(/^(?:(?:deferred|expanded|frozen|external)\s+)*class\s+([A-Za-z]\w*)/i);
    if (cm && !className) {
      className = cm[1];
      deferred = /\bdeferred\b/i.test(line.split(/\bclass\b/i)[0]);
      i++; continue;
    }
    if (fw === 'inherit') { mode = 'inherit'; const inl = line.replace(/^inherit/i, '').trim(); if (inl) addParent(inl); i++; continue; }
    if (fw === 'create') { mode = 'create'; const inl = line.replace(/^create/i, '').trim(); if (inl) addCreators(inl); i++; continue; }
    if (fw === 'feature') { mode = 'feature'; const lm = line.match(/^feature\b\s*(.*)$/i); section = lm && lm[1] ? lm[1].replace(/^--\s*/, '').trim() : null; i++; continue; }
    if (fw === 'invariant') { mode = 'invariant'; i++; continue; }
    if (fw === 'note' || fw === 'convert' || fw === 'indexing') { mode = 'other'; i++; continue; }
    if (fw === 'end') { mode = 'post'; i++; continue; }

    if (mode === 'inherit') { addParent(line); i++; continue; }
    if (mode === 'create') { addCreators(line); i++; continue; }
    if (mode === 'feature') {
      const res = parseFeatureAt(lines, i, section);
      if (res) { for (const f of res.features) features.push(f); i = res.next > i ? res.next : i + 1; continue; }
    }
    i++;
  }

  const joined = lines.join('\n');
  const cnt = (re) => (joined.match(re) || []).length;
  const contracts = {
    require: cnt(/(^|\n)[ \t]*require\b/gi),
    ensure: cnt(/(^|\n)[ \t]*ensure\b/gi),
    invariant: cnt(/(^|\n)[ \t]*invariant\b/gi),
  };

  return { className, deferred, inherits, creators, features, contracts };
}

// ---------------------------------------------------------------------------
// DOM rendering
// ---------------------------------------------------------------------------

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'efl-section';
  const hd = document.createElement('div');
  hd.className = 'efl-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}
function makeList(sec) { const ul = document.createElement('ul'); ul.className = 'efl-list'; sec.appendChild(ul); return ul; }
function row(ul, html) { const li = document.createElement('li'); li.innerHTML = html; ul.appendChild(li); }
function tag(cls, t) { return `<span class="efl-tag ${cls}">${esc(t)}</span>`; }
function paramsHtml(params) {
  return params.map((p) => `${esc(p.name)}: <span class="efl-type">${esc(p.type)}</span>`).join('; ');
}
function featureRow(ul, f, tagCls, tagLabel) {
  const sig = f.params.length ? ` (${paramsHtml(f.params)})` : '';
  const ret = f.returns ? `: <span class="efl-ret">${esc(f.returns)}</span>` : '';
  const sect = f.section ? `<span class="efl-sect-label">${esc(f.section)}</span>` : '';
  row(ul, `${tag(tagCls, tagLabel)} <span class="efl-name">${esc(f.name)}</span>${sig}${ret}${sect}`);
}

export function render(intake) {
  const text = intake.text || '';
  const facts = analyzeEiffel(text);
  const { className, deferred, inherits, creators, features, contracts } = facts;
  if (!className && !features.length) return null;

  const procedures = features.filter((f) => f.kind === 'procedure');
  const functions = features.filter((f) => f.kind === 'function');
  const attributes = features.filter((f) => f.kind === 'attribute');
  const contractTotal = contracts.require + contracts.ensure + contracts.invariant;

  const host = document.createElement('div');
  host.className = 'efl-doc';
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'efl-title';
  title.innerHTML = `<span class="efl-badge">Eiffel${deferred ? ' · deferred' : ''}</span>`
    + `<span class="efl-cls">${esc(className || 'class')}</span>`;
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'efl-sub';
  sub.textContent = [
    inherits.length && `inherits ${inherits.join(', ')}`,
    features.length && `${features.length} feature${features.length !== 1 ? 's' : ''}`,
    contractTotal && `${contractTotal} contract clause${contractTotal !== 1 ? 's' : ''}`,
  ].filter(Boolean).join(' · ') || 'Eiffel class';
  host.appendChild(sub);

  const cards = document.createElement('div');
  cards.className = 'efl-cards';
  for (const { value, label } of [
    { value: inherits.length, label: 'Parents' },
    { value: procedures.length, label: 'Procedures' },
    { value: functions.length, label: 'Queries' },
    { value: attributes.length, label: 'Attributes' },
    { value: contractTotal, label: 'Contracts' },
  ]) {
    const card = document.createElement('div');
    card.className = 'efl-card';
    const s = document.createElement('strong'); s.textContent = value;
    const sp = document.createElement('span'); sp.textContent = label;
    card.appendChild(s); card.appendChild(sp); cards.appendChild(card);
  }
  host.appendChild(cards);

  if (inherits.length) {
    const ul = makeList(makeSection(host, `Inheritance (${inherits.length})`));
    for (const p of inherits) row(ul, `${tag('efl-tag-parent', 'inherit')} <span class="efl-name">${esc(p)}</span>`);
  }
  if (creators.length) {
    const ul = makeList(makeSection(host, `Creation (${creators.length})`));
    for (const c of creators) row(ul, `${tag('efl-tag-create', 'create')} <span class="efl-name">${esc(c)}</span>`);
  }
  if (procedures.length) {
    const ul = makeList(makeSection(host, `Procedures (${procedures.length})`));
    for (const f of procedures) featureRow(ul, f, 'efl-tag-proc', 'procedure');
  }
  if (functions.length) {
    const ul = makeList(makeSection(host, `Queries (${functions.length})`));
    for (const f of functions) featureRow(ul, f, 'efl-tag-func', 'query');
  }
  if (attributes.length) {
    const ul = makeList(makeSection(host, `Attributes (${attributes.length})`));
    for (const f of attributes) featureRow(ul, f, 'efl-tag-attr', 'attribute');
  }
  if (contractTotal) {
    const sec = makeSection(host, 'Design by Contract');
    const div = document.createElement('div');
    div.className = 'efl-contract';
    div.textContent = `${contracts.require} require (preconditions) · ${contracts.ensure} ensure (postconditions) · ${contracts.invariant} invariant`;
    sec.appendChild(div);
  }

  return { parentNode: host };
}
