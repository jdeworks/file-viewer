const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.pro-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.pro-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#7c3aed;color:#fff;vertical-align:middle;margin-right:8px;}
.pro-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.pro-mod{font-family:ui-monospace,monospace;font-size:13px;color:#7c3aed;font-weight:700;}
.pro-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.pro-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.pro-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:96px;}
.pro-card strong{display:block;font-size:1.2rem;font-weight:700;}
.pro-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.pro-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.pro-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.pro-list{margin:0;padding:0;list-style:none;}
.pro-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.pro-list li:last-child{border-bottom:none;}
.pro-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#ede9fe;color:#7c3aed;font-weight:700;}
.pro-tag-fact{background:#dcfce7;color:#166534;}
.pro-tag-rule{background:#dbeafe;color:#1e40af;}
.pro-tag-dcg{background:#fef3c7;color:#92400e;}
.pro-tag-dyn{background:#ffe4e6;color:#9f1239;}
.pro-tag-use{background:#e0f2fe;color:#0369a1;}
.pro-name{font-weight:600;color:#0a6640;}
.pro-arity{color:#7c3aed;font-weight:600;}
`;

// --- pure parsing helpers (DOM-free) ---------------------------------------

// Split Prolog source into top-level clauses. Strips %-line and /* */ block comments,
// respects quoted atoms/strings/backquotes and 0'c char literals, and only treats a `.`
// as a clause terminator when at paren-depth 0 and followed by whitespace/EOL/comment.
function clauses(text) {
  const src = String(text || '');
  const out = [];
  let buf = '', depth = 0, i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    if (c === '%') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { i += 2; while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++; i += 2; buf += ' '; continue; }
    if (c === '0' && src[i + 1] === "'") { buf += src.slice(i, i + 3); i += 3; continue; }
    if (c === '"' || c === "'" || c === '`') {
      const q = c; buf += c; i++;
      while (i < n) {
        if (src[i] === '\\') { buf += src.slice(i, i + 2); i += 2; continue; }
        if (src[i] === q) { if (src[i + 1] === q) { buf += q + q; i += 2; continue; } buf += q; i++; break; }
        buf += src[i]; i++;
      }
      continue;
    }
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth = Math.max(0, depth - 1);
    if (c === '.' && depth === 0) {
      const next = src[i + 1];
      if (next === undefined || next === ' ' || next === '\t' || next === '\n' || next === '\r' || next === '%') {
        const t = buf.trim(); if (t) out.push(t); buf = ''; i++; continue;
      }
    }
    buf += c; i++;
  }
  const t = buf.trim(); if (t) out.push(t);
  return out;
}

// Find a top-level operator (e.g. `:-`, `-->`) outside parens and quotes; -1 if absent.
function topLevelOp(s, op) {
  let depth = 0, i = 0; const n = s.length;
  while (i < n) {
    const c = s[i];
    if (c === '"' || c === "'" || c === '`') { const q = c; i++; while (i < n) { if (s[i] === '\\') { i += 2; continue; } if (s[i] === q) { i++; break; } i++; } continue; }
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth = Math.max(0, depth - 1);
    else if (depth === 0 && s.startsWith(op, i)) return i;
    i++;
  }
  return -1;
}

// Count comma-separated, depth-0 arguments inside an argument-list body.
function countArgs(inner) {
  let depth = 0, count = 1, i = 0; const n = inner.length;
  while (i < n) {
    const c = inner[i];
    if (c === '"' || c === "'" || c === '`') { const q = c; i++; while (i < n) { if (inner[i] === '\\') { i += 2; continue; } if (inner[i] === q) { i++; break; } i++; } continue; }
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth--;
    else if (c === ',' && depth === 0) count++;
    i++;
  }
  return count;
}

// Content between the first `(` of s and its matching `)`.
function parenBody(s) {
  let depth = 0, i = 0, start = -1; const n = s.length;
  for (; i < n; i++) {
    const c = s[i];
    if (c === '"' || c === "'" || c === '`') { const q = c; i++; while (i < n) { if (s[i] === '\\') { i++; continue; } if (s[i] === q) break; i++; } continue; }
    if (c === '(') { if (depth === 0) start = i + 1; depth++; }
    else if (c === ')') { depth--; if (depth === 0) return s.slice(start, i); }
  }
  return start < 0 ? '' : s.slice(start);
}

// Predicate indicator {name, arity} from a clause head term.
function indicator(head) {
  head = head.trim();
  let name, rest;
  let m = head.match(/^'((?:\\.|[^'\\])*)'/);
  if (m) { name = m[1]; rest = head.slice(m[0].length).trim(); }
  else if ((m = head.match(/^([a-z]\w*)/))) { name = m[1]; rest = head.slice(m[0].length).trim(); }
  else { m = head.match(/^([^\s(]+)/); return { name: m ? m[1] : head, arity: 0 }; }
  if (rest.startsWith('(')) {
    const inner = parenBody(rest).trim();
    return { name, arity: inner === '' ? 0 : countArgs(inner) };
  }
  return { name, arity: 0 };
}

// Pull `name/arity` (and DCG `name//arity`) indicators out of a directive argument list.
function parseIndicators(s) {
  const out = []; const re = /([a-z]\w*)\s*\/{1,2}\s*(\d+)/g; let m;
  while ((m = re.exec(s))) out.push(m[1] + '/' + m[2]);
  return out;
}

// Parse Prolog into structured facts. Exported (pure, no DOM) for unit testing.
export function analyzeProlog(text) {
  let module = null;
  const moduleExports = [], uses = [], directives = [], dynamics = [], discontiguous = [], dcgRules = [];
  const predMap = new Map(); // "name/arity" -> { name, arity, clauses, facts, rules }
  const predFor = (name, arity) => {
    const key = name + '/' + arity;
    if (!predMap.has(key)) predMap.set(key, { name, arity, clauses: 0, facts: 0, rules: 0 });
    return predMap.get(key);
  };

  for (const raw of clauses(text)) {
    const clause = raw.replace(/\s+/g, ' ').trim();
    if (!clause) continue;

    if (clause.startsWith(':-') || clause.startsWith('?-')) {
      const body = clause.replace(/^[:?]-\s*/, '').trim();
      let m;
      if ((m = body.match(/^module\s*\(\s*(\w+)\s*,\s*\[([\s\S]*?)\]/))) {
        module = m[1]; for (const ind of parseIndicators(m[2])) moduleExports.push(ind); continue;
      }
      if ((m = body.match(/^(?:use_module|ensure_loaded|consult|reexport)\s*\(\s*(?:library\s*\(\s*)?([\w/.]+)/))) {
        uses.push(m[1]); continue;
      }
      if ((m = body.match(/^dynamic\b([\s\S]*)$/))) { for (const ind of parseIndicators(m[1])) dynamics.push(ind); continue; }
      if ((m = body.match(/^discontiguous\b([\s\S]*)$/))) { for (const ind of parseIndicators(m[1])) discontiguous.push(ind); continue; }
      const dm = body.match(/^([a-z]\w*)/);
      directives.push(dm ? dm[1] : body.slice(0, 48));
      continue;
    }

    const dcgIdx = topLevelOp(clause, '-->');
    if (dcgIdx >= 0) { dcgRules.push(indicator(clause.slice(0, dcgIdx))); continue; }

    const neckIdx = topLevelOp(clause, ':-');
    if (neckIdx >= 0) {
      const { name, arity } = indicator(clause.slice(0, neckIdx));
      const p = predFor(name, arity); p.clauses++; p.rules++; continue;
    }

    const { name, arity } = indicator(clause);
    if (!name) continue;
    const p = predFor(name, arity); p.clauses++; p.facts++;
  }

  return { module, moduleExports, uses, predicates: [...predMap.values()], directives, dynamics, discontiguous, dcgRules };
}

// --- rendering --------------------------------------------------------------

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'pro-section';
  const hd = document.createElement('div');
  hd.className = 'pro-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}
function makeList(sec) { const ul = document.createElement('ul'); ul.className = 'pro-list'; sec.appendChild(ul); return ul; }
function tag(cls, t) { return `<span class="pro-tag ${cls}">${esc(t)}</span>`; }
function row(ul, html) { const li = document.createElement('li'); li.innerHTML = html; ul.appendChild(li); }
const plural = (n, w) => `${n} ${w}${n !== 1 ? 's' : ''}`;
const indHtml = (name, arity) => `<span class="pro-name">${esc(name)}</span><span class="pro-arity">/${arity}</span>`;

export function render(intake) {
  const text = intake.text || '';
  const name = intake.name || intake.filename || '';
  const a = analyzeProlog(text);
  const totalFacts = a.predicates.reduce((s, p) => s + p.facts, 0);
  const totalRules = a.predicates.reduce((s, p) => s + p.rules, 0);

  const host = document.createElement('div');
  host.className = 'pro-doc';
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'pro-title';
  const badge = document.createElement('span');
  badge.className = 'pro-badge';
  badge.textContent = a.module ? 'Prolog Module' : 'Prolog Script';
  title.appendChild(badge);
  if (a.module) { const n = document.createElement('span'); n.className = 'pro-mod'; n.textContent = a.module; title.appendChild(n); }
  else title.appendChild(document.createTextNode(name));
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'pro-sub';
  sub.textContent = [
    plural(a.predicates.length, 'predicate'),
    plural(totalFacts, 'fact'),
    plural(totalRules, 'rule'),
    a.dcgRules.length && plural(a.dcgRules.length, 'DCG rule'),
  ].filter(Boolean).join(' · ');
  host.appendChild(sub);

  const cards = document.createElement('div');
  cards.className = 'pro-cards';
  for (const { value, label } of [
    { value: a.predicates.length, label: 'Predicates' },
    { value: totalFacts, label: 'Facts' },
    { value: totalRules, label: 'Rules' },
    { value: a.dcgRules.length, label: 'DCG Rules' },
    { value: a.uses.length, label: 'Imports' },
    { value: a.directives.length, label: 'Directives' },
  ]) {
    const card = document.createElement('div');
    card.className = 'pro-card';
    const s = document.createElement('strong'); s.textContent = value;
    const sp = document.createElement('span'); sp.textContent = label;
    card.appendChild(s); card.appendChild(sp); cards.appendChild(card);
  }
  host.appendChild(cards);

  if (a.moduleExports.length) {
    const ul = makeList(makeSection(host, `Exported Predicates (${a.moduleExports.length})`));
    for (const ind of a.moduleExports) row(ul, `${tag('pro-tag', 'export')} ${esc(ind)}`);
  }
  if (a.uses.length) {
    const ul = makeList(makeSection(host, `Imports (${a.uses.length})`));
    for (const u of a.uses) row(ul, `${tag('pro-tag-use', 'use_module')} ${esc(u)}`);
  }
  if (a.dynamics.length) {
    const ul = makeList(makeSection(host, `Dynamic (${a.dynamics.length})`));
    for (const d of a.dynamics) row(ul, `${tag('pro-tag-dyn', 'dynamic')} ${esc(d)}`);
  }
  if (a.discontiguous.length) {
    const ul = makeList(makeSection(host, `Discontiguous (${a.discontiguous.length})`));
    for (const d of a.discontiguous) row(ul, `${tag('pro-tag-dyn', 'discontiguous')} ${esc(d)}`);
  }
  if (a.predicates.length) {
    const ul = makeList(makeSection(host, `Predicates by name/arity (${a.predicates.length})`));
    for (const p of a.predicates) {
      const tags = [
        p.facts && tag('pro-tag-fact', plural(p.facts, 'fact')),
        p.rules && tag('pro-tag-rule', plural(p.rules, 'rule')),
      ].filter(Boolean).join(' ');
      row(ul, `${indHtml(p.name, p.arity)} ${tags}`);
    }
  }
  if (a.dcgRules.length) {
    const ul = makeList(makeSection(host, `DCG Rules (${a.dcgRules.length})`));
    for (const d of a.dcgRules) row(ul, `${tag('pro-tag-dcg', 'DCG')} ${indHtml(d.name, d.arity)}`);
  }
  if (a.directives.length) {
    const ul = makeList(makeSection(host, `Directives (${a.directives.length})`));
    for (const d of a.directives) row(ul, `${tag('pro-tag', ':-')} ${esc(d)}`);
  }

  return { parentNode: host };
}
