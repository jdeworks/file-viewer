const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.als-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.als-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0ea5e9;color:#fff;vertical-align:middle;margin-right:8px;}
.als-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.als-mod{font-family:ui-monospace,monospace;font-size:13px;color:#0369a1;font-weight:700;}
.als-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.als-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.als-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:96px;}
.als-card strong{display:block;font-size:1.2rem;font-weight:700;}
.als-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.als-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.als-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.als-list{margin:0;padding:0;list-style:none;}
.als-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.als-list li:last-child{border-bottom:none;}
.als-fields{margin:4px 0 0;padding:0 0 0 16px;list-style:none;flex-basis:100%;}
.als-fields li{border:none;padding:2px 0;font-size:11px;color:var(--fg-2,#555);}
.als-tag{font-size:10px;padding:1px 5px;border-radius:4px;font-weight:700;}
.als-tag-sig{background:#e0f2fe;color:#0369a1;}
.als-tag-mult{background:#fef9c3;color:#854d0e;}
.als-tag-ext{background:#dcfce7;color:#166534;}
.als-tag-pred{background:#ede9fe;color:#7c3aed;}
.als-tag-fun{background:#dbeafe;color:#1d4ed8;}
.als-tag-fact{background:#ffe4e6;color:#9f1239;}
.als-tag-assert{background:#fde68a;color:#92400e;}
.als-tag-open{background:#e2e8f0;color:#475569;}
.als-name{font-weight:600;}
.als-type{color:#0e7490;}
.als-ret{color:#1d4ed8;}
.als-fname{color:#7c3aed;}
.als-table{width:100%;border-collapse:collapse;font-size:12px;}
.als-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:6px 14px;border-bottom:1px solid var(--border,#e0e0e0);}
.als-table td{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;}
.als-table tr:last-child td{border-bottom:none;}
.als-kind{font-weight:700;color:#0369a1;}
`;

// Strip Alloy comments: block /* */, and line comments // and --.
function stripComments(text) {
  return String(text || '')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ')
    .replace(/--[^\n]*/g, ' ');
}

// Given the index of an opening '{', return the index of its matching '}' (-1 if none).
function matchBrace(s, open) {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === '{') depth++;
    else if (s[i] === '}') { depth--; if (depth === 0) return i; }
  }
  return -1;
}

// Split `s` on top-level `sep`, ignoring separators nested inside (), [], {}.
function splitTop(s, sep) {
  const out = [];
  let depth = 0, buf = '';
  for (const ch of s) {
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') depth = Math.max(0, depth - 1);
    if (ch === sep && depth === 0) { out.push(buf); buf = ''; } else buf += ch;
  }
  out.push(buf);
  return out.map((x) => x.trim()).filter(Boolean);
}

// Parse a "name[, name]: TypeExpr" decl into { names, mult, type }.
// A leading multiplicity keyword (set/one/lone/some) is split out from the type expr.
function parseDecl(part) {
  const m = part.match(/^([\w\s,]+?)\s*:\s*([\s\S]+)$/);
  if (!m) return null;
  let type = m[2].replace(/\s+/g, ' ').trim();
  let mult = '';
  const mm = type.match(/^(set|one|lone|some)\s+(.+)$/);
  if (mm) { mult = mm[1]; type = mm[2].trim(); }
  return { names: m[1].replace(/\s+/g, ' ').trim(), mult, type };
}

// Split a decl body (sig fields or params) into typed decls. Commas separate decls AND share names
// within one decl (`p, q: T`), so bare comma-pieces with no `:` are folded into the next typed piece.
function splitDecls(body) {
  const out = [];
  let pending = '';
  for (const piece of splitTop(body, ',')) {
    const combined = pending ? `${pending}, ${piece}` : piece;
    if (piece.includes(':')) { const d = parseDecl(combined); if (d) out.push(d); pending = ''; }
    else pending = combined;
  }
  return out;
}

// Parse a bracketed/parenthesised param list body into [{ names, mult, type }].
function parseParams(raw) {
  if (!raw) return [];
  const body = raw.replace(/^[[(]/, '').replace(/[\])]$/, '').trim();
  return body ? splitDecls(body) : [];
}

// Parse Alloy source into structured facts. Pure (no DOM) — exported for unit testing.
export function analyzeAlloy(text) {
  const src = stripComments(text);

  const modMatch = src.match(/\bmodule\s+([^\s/]+)/);
  const moduleName = modMatch ? modMatch[1] : null;

  const opens = [];
  for (const m of src.matchAll(/\bopen\s+([^\s]+)/g)) opens.push(m[1]);

  // Signatures (with fields). Handles: [abstract|one|lone|some]* sig A[, B] [extends|in Parent] { fields }
  const sigs = [];
  const sigRe = /\b((?:abstract|one|lone|some|var)\s+)*sig\s+([A-Za-z0-9_]+(?:\s*,\s*[A-Za-z0-9_]+)*)\s*((?:extends|in)\s+[A-Za-z0-9_]+)?\s*\{/g;
  let sm;
  while ((sm = sigRe.exec(src))) {
    const quals = (sm[1] || '').trim().split(/\s+/).filter(Boolean);
    const mult = quals.find((q) => q !== 'var') || '';
    let relation = '', parent = '';
    if (sm[3]) {
      const rm = sm[3].match(/^(extends|in)\s+([A-Za-z0-9_]+)$/);
      if (rm) { relation = rm[1]; parent = rm[2]; }
    }
    const open = sigRe.lastIndex - 1;
    const close = matchBrace(src, open);
    const body = close > open ? src.slice(open + 1, close) : '';
    const fields = body.trim() ? splitDecls(body) : [];
    for (const name of sm[2].split(',').map((x) => x.trim())) {
      sigs.push({ name, mult, relation, parent, fields });
    }
    if (close > open) sigRe.lastIndex = close + 1;
  }

  // Predicates: pred name[params] { ... }
  const preds = [];
  for (const m of src.matchAll(/\bpred\s+([A-Za-z0-9_]+)\s*([[(][^\])]*[\])])?\s*\{/g)) {
    preds.push({ name: m[1], params: parseParams(m[2]) });
  }

  // Functions: fun name[params]: ReturnType { ... }
  const functions = [];
  for (const m of src.matchAll(/\bfun\s+([A-Za-z0-9_]+)\s*([[(][^\])]*[\])])?\s*:\s*([^{]+?)\s*\{/g)) {
    functions.push({ name: m[1], params: parseParams(m[2]), returns: m[3].replace(/\s+/g, ' ').trim() });
  }

  // Facts (optionally named).
  const facts = [];
  for (const m of src.matchAll(/\bfact\s+([A-Za-z0-9_]*)\s*\{/g)) facts.push(m[1] || '(anonymous)');

  // Assertions.
  const assertions = [];
  for (const m of src.matchAll(/\bassert\s+([A-Za-z0-9_]+)\s*\{/g)) assertions.push(m[1]);

  // Commands: check / run (named or anonymous).
  const checks = [];
  for (const m of src.matchAll(/\bcheck\s+([A-Za-z0-9_]+|\{)/g)) checks.push(m[1] === '{' ? '(block)' : m[1]);
  const runs = [];
  for (const m of src.matchAll(/\brun\s+([A-Za-z0-9_]+|\{)/g)) runs.push(m[1] === '{' ? '(block)' : m[1]);

  return { moduleName, opens, sigs, preds, functions, facts, assertions, checks, runs };
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'als-section';
  const hd = document.createElement('div');
  hd.className = 'als-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}
function makeList(sec) { const ul = document.createElement('ul'); ul.className = 'als-list'; sec.appendChild(ul); return ul; }
function tag(cls, t) { return `<span class="als-tag ${cls}">${esc(t)}</span>`; }
function row(ul, html) { const li = document.createElement('li'); li.innerHTML = html; ul.appendChild(li); }
function declHtml(d) {
  const mult = d.mult ? `<span class="als-type">${esc(d.mult)}</span> ` : '';
  return `<span class="als-name">${esc(d.names)}</span>: ${mult}<span class="als-type">${esc(d.type)}</span>`;
}
function paramsHtml(params) { return params.map(declHtml).join(', '); }

export async function render(intake) {
  const text = intake.text || '';
  const preview = text.slice(0, 4000);
  if (!/\b(module|sig|pred|fun|fact|assert|check|run)\b/.test(preview)) return null;

  const { moduleName, opens, sigs, preds, functions, facts, assertions, checks, runs } = analyzeAlloy(text);

  const host = document.createElement('div');
  host.className = 'als-doc';
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'als-title';
  const badge = document.createElement('span');
  badge.className = 'als-badge';
  badge.textContent = 'Alloy';
  title.appendChild(badge);
  if (moduleName) {
    title.appendChild(document.createTextNode('module '));
    const n = document.createElement('span'); n.className = 'als-mod'; n.textContent = moduleName;
    title.appendChild(n);
  } else {
    title.appendChild(document.createTextNode('Alloy Specification'));
  }
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'als-sub';
  sub.textContent = [
    sigs.length && `${sigs.length} sig${sigs.length !== 1 ? 's' : ''}`,
    preds.length && `${preds.length} pred${preds.length !== 1 ? 's' : ''}`,
    functions.length && `${functions.length} fun${functions.length !== 1 ? 's' : ''}`,
    facts.length && `${facts.length} fact${facts.length !== 1 ? 's' : ''}`,
    assertions.length && `${assertions.length} assert${assertions.length !== 1 ? 'ions' : 'ion'}`,
  ].filter(Boolean).join(' · ');
  host.appendChild(sub);

  const cards = document.createElement('div');
  cards.className = 'als-cards';
  for (const { value, label } of [
    { value: sigs.length, label: 'Signatures' },
    { value: preds.length, label: 'Predicates' },
    { value: functions.length, label: 'Functions' },
    { value: facts.length, label: 'Facts' },
    { value: assertions.length, label: 'Assertions' },
  ]) {
    const card = document.createElement('div');
    card.className = 'als-card';
    const s = document.createElement('strong'); s.textContent = value;
    const sp = document.createElement('span'); sp.textContent = label;
    card.appendChild(s); card.appendChild(sp); cards.appendChild(card);
  }
  host.appendChild(cards);

  if (opens.length) {
    const ul = makeList(makeSection(host, `Imports (${opens.length})`));
    for (const o of opens) row(ul, `${tag('als-tag-open', 'open')} <span class="als-name">${esc(o)}</span>`);
  }

  if (sigs.length) {
    const ul = makeList(makeSection(host, `Signatures (${sigs.length})`));
    for (const s of sigs) {
      let html = '';
      if (s.mult) html += tag('als-tag-mult', s.mult) + ' ';
      html += tag('als-tag-sig', 'sig') + ` <span class="als-name">${esc(s.name)}</span>`;
      if (s.relation) html += ` ${tag('als-tag-ext', s.relation)} <span class="als-type">${esc(s.parent)}</span>`;
      if (s.fields.length) {
        html += `<ul class="als-fields">${s.fields.map((f) => `<li>${declHtml(f)}</li>`).join('')}</ul>`;
      }
      row(ul, html);
    }
  }

  if (preds.length) {
    const ul = makeList(makeSection(host, `Predicates (${preds.length})`));
    for (const p of preds) {
      row(ul, tag('als-tag-pred', 'pred') + ` <span class="als-fname">${esc(p.name)}</span>[${paramsHtml(p.params)}]`);
    }
  }

  if (functions.length) {
    const ul = makeList(makeSection(host, `Functions (${functions.length})`));
    for (const f of functions) {
      const ret = f.returns ? `: <span class="als-ret">${esc(f.returns)}</span>` : '';
      row(ul, tag('als-tag-fun', 'fun') + ` <span class="als-fname">${esc(f.name)}</span>[${paramsHtml(f.params)}]${ret}`);
    }
  }

  if (facts.length) {
    const ul = makeList(makeSection(host, `Facts (${facts.length})`));
    for (const name of facts) row(ul, `${tag('als-tag-fact', 'fact')} <span class="als-name">${esc(name)}</span>`);
  }

  if (assertions.length) {
    const ul = makeList(makeSection(host, `Assertions (${assertions.length})`));
    for (const name of assertions) row(ul, `${tag('als-tag-assert', 'assert')} <span class="als-name">${esc(name)}</span>`);
  }

  if (checks.length || runs.length) {
    const sec = makeSection(host, `Analysis Commands (${checks.length + runs.length})`);
    const table = document.createElement('table');
    table.className = 'als-table';
    table.innerHTML = '<thead><tr><th>Kind</th><th>Target</th></tr></thead>';
    const tbody = document.createElement('tbody');
    for (const name of checks) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td class="als-kind">check</td><td>${esc(name)}</td>`;
      tbody.appendChild(tr);
    }
    for (const name of runs) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td class="als-kind">run</td><td>${esc(name)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
  }

  return { parentNode: host };
}
