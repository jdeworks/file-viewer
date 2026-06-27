const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.awk-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.awk-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#2d6a4f;color:#fff;vertical-align:middle;margin-right:8px;}
.awk-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.awk-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.awk-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.awk-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:96px;}
.awk-card strong{display:block;font-size:1.2rem;font-weight:700;}
.awk-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.awk-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.awk-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.awk-list{margin:0;padding:0;list-style:none;}
.awk-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.awk-list li:last-child{border-bottom:none;}
.awk-tag{font-size:10px;padding:1px 5px;border-radius:4px;font-weight:700;}
.awk-tag-pattern{background:#fef3c7;color:#92400e;}
.awk-tag-regex{background:#fee2e2;color:#991b1b;}
.awk-tag-range{background:#fde68a;color:#92400e;}
.awk-tag-always{background:#e5e7eb;color:#374151;}
.awk-tag-func{background:#ede9fe;color:#5b21b6;}
.awk-tag-var{background:#e0f2fe;color:#0369a1;}
.awk-tag-special{background:#d1fae5;color:#065f46;}
.awk-name{font-weight:600;}
.awk-params{color:#1d4ed8;}
.awk-locals{color:#9333ea;font-style:italic;}
.awk-pattern{color:#92400e;}
.awk-pill{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f1f5f9);border:1px solid var(--border,#cbd5e1);font-family:ui-monospace,monospace;margin:2px 2px;}
.awk-pre{margin:0;background:var(--bg,#fff);padding:14px 16px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre;}
`;

// AWK built-in variables (gawk superset). Detected by whole-word use in the source.
const BUILTINS = ['FS', 'OFS', 'ORS', 'RS', 'NR', 'NF', 'FNR', 'FILENAME', 'SUBSEP', 'RSTART',
  'RLENGTH', 'OFMT', 'CONVFMT', 'ARGC', 'ARGV', 'ENVIRON', 'IGNORECASE', 'FIELDWIDTHS', 'FPAT',
  'PROCINFO', 'RT', 'BINMODE', 'LINT', 'TEXTDOMAIN'];
// Features that only exist in GNU awk.
const GAWK_FEATURES = /\b(gensub|patsplit|asort|asorti|strtonum|systime|mktime|strftime|typeof|and|or|xor|compl|lshift|rshift)\s*\(|\b(PROCINFO|FIELDWIDTHS|FPAT|BEGINFILE|ENDFILE)\b/;

// `/` begins a regex (not division) when the previous significant char is not a value terminator.
const isRegexPos = (p) => p === '' || !/[\w)\]"$.]/.test(p);

// Parse a `function name(p1, p2,   local1, local2)` header into name + params + locals.
// AWK has no syntactic local keyword: locals are extra params conventionally set off by 2+ spaces.
export function parseSignature(header) {
  const withParens = header.match(/^func(?:tion)?\s+(\w+)\s*\(([^)]*)\)/);
  if (!withParens) {
    const bare = header.match(/^func(?:tion)?\s+(\w+)/);
    return bare ? { name: bare[1], params: [], locals: [], arity: 0 } : null;
  }
  const name = withParens[1];
  const raw = withParens[2];
  if (!raw.trim()) return { name, params: [], locals: [], arity: 0 };
  const rawParts = raw.split(',');
  let localIdx = rawParts.length;
  for (let k = 1; k < rawParts.length; k++) {
    if (/^\s{2,}/.test(rawParts[k])) { localIdx = k; break; }
  }
  const names = rawParts.map((p) => p.trim()).filter(Boolean);
  const params = names.slice(0, localIdx);
  const locals = names.slice(localIdx);
  return { name, params, locals, arity: params.length };
}

// Classify a rule's pattern text into a display kind.
function classifyPattern(pat) {
  if (!pat) return 'always';
  if (/^\/.*\/\s*,\s*\/.*\/$/.test(pat)) return 'range';
  if (/^\/.*\/$/.test(pat)) return 'regex';
  return 'expression';
}

// Walk the AWK source at top level (brace depth 0), splitting it into special blocks (BEGIN/END),
// pattern-action rules, and function definitions. String, regex and comment contents are skipped so
// braces inside them never confuse the depth tracking. Pure (no DOM) so it is unit-testable.
export function analyzeAwk(text) {
  const src = String(text || '');
  const n = src.length;
  let i = 0;
  let header = '';
  let lastSig = '';

  let hasBegin = false, hasEnd = false;
  const functions = [];
  const rules = [];

  // Skip a "double-quoted string" starting at src[i] === '"', appending to header.
  const skipString = () => {
    header += src[i]; i++;
    while (i < n) {
      const c = src[i]; header += c; i++;
      if (c === '\\') { if (i < n) { header += src[i]; i++; } continue; }
      if (c === '"') break;
    }
    lastSig = '"';
  };
  // Skip a /regex/ literal (handles [..] char classes) starting at src[i] === '/'.
  const skipRegex = () => {
    header += src[i]; i++;
    let inClass = false;
    while (i < n) {
      const c = src[i]; header += c; i++;
      if (c === '\\') { if (i < n) { header += src[i]; i++; } continue; }
      if (c === '[') inClass = true;
      else if (c === ']') inClass = false;
      else if (c === '/' && !inClass) break;
    }
    lastSig = '/';
  };
  // Consume a balanced { ... } action block starting at src[i] === '{'. Returns once matched.
  const consumeBlock = () => {
    let depth = 0;
    let sig = '';
    while (i < n) {
      const c = src[i];
      if (c === '"') {
        i++;
        while (i < n) { const d = src[i]; i++; if (d === '\\') { i++; continue; } if (d === '"') break; }
        sig = '"'; continue;
      }
      if (c === '#') { while (i < n && src[i] !== '\n') i++; continue; }
      if (c === '/' && isRegexPos(sig)) {
        i++; let inClass = false;
        while (i < n) { const d = src[i]; i++; if (d === '\\') { i++; continue; } if (d === '[') inClass = true; else if (d === ']') inClass = false; else if (d === '/' && !inClass) break; }
        sig = '/'; continue;
      }
      i++;
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) break; }
      if (!/\s/.test(c)) sig = c;
    }
  };
  // Peek the next significant char from j (skips whitespace + comment lines).
  const peekSig = (j) => {
    while (j < n) {
      const c = src[j];
      if (c === '#') { while (j < n && src[j] !== '\n') j++; continue; }
      if (/\s/.test(c)) { j++; continue; }
      return c;
    }
    return '';
  };
  const emitItem = (pat, hasAction) => {
    if (/^func(?:tion)?\b/.test(pat)) {
      const sig = parseSignature(pat);
      if (sig) functions.push(sig);
    } else if (pat === 'BEGIN') hasBegin = true;
    else if (pat === 'END') hasEnd = true;
    else rules.push({ pattern: pat, kind: classifyPattern(pat), hasAction });
  };

  while (i < n) {
    const c = src[i];
    if (c === '"') { skipString(); continue; }
    if (c === '#') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && isRegexPos(lastSig)) { skipRegex(); continue; }
    if (c === '{') {
      const pat = header.trim();
      consumeBlock();
      emitItem(pat, true);
      header = ''; lastSig = '';
      continue;
    }
    if (c === '\n') {
      const pat = header.trim();
      if (pat && !/[-+*/%<>=!&|,~?:([\\]$/.test(pat) && peekSig(i + 1) !== '{') {
        emitItem(pat, false);
        header = ''; lastSig = '';
      }
      i++;
      continue;
    }
    header += c;
    if (!/\s/.test(c)) lastSig = c;
    i++;
  }
  const tail = header.trim();
  if (tail && !/^func/.test(tail) && tail !== 'BEGIN' && tail !== 'END') emitItem(tail, false);

  // Built-in variables + feature scan over a string/comment-stripped copy.
  const scan = src
    .replace(/#[^\n]*/g, ' ')
    .replace(/"(?:\\.|[^"\\])*"/g, ' "" ');
  const builtins = BUILTINS.filter((b) => new RegExp('\\b' + b + '\\b').test(scan));
  const isGawk = GAWK_FEATURES.test(scan);
  const count = (re) => (scan.match(re) || []).length;
  const printfCount = count(/\bprintf\b/g);
  const printCount = count(/\bprint\b/g) - printfCount;
  const getlineCount = count(/\bgetline\b/g);
  const pipeCount = count(/\|/g);

  return {
    hasBegin, hasEnd,
    functions, rules,
    ruleCount: rules.length,
    builtins, isGawk,
    printCount, printfCount, getlineCount, pipeCount,
  };
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'awk-section';
  const hd = document.createElement('div');
  hd.className = 'awk-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}
function makeList(sec) { const ul = document.createElement('ul'); ul.className = 'awk-list'; sec.appendChild(ul); return ul; }
function tag(cls, t) { return `<span class="awk-tag ${cls}">${esc(t)}</span>`; }
function row(ul, html) { const li = document.createElement('li'); li.innerHTML = html; ul.appendChild(li); }

export function render(intake) {
  const text = intake.text || '';
  const name = (intake.name || intake.filename || '').split('/').pop();
  const facts = analyzeAwk(text);
  const { hasBegin, hasEnd, functions, rules, ruleCount, builtins, isGawk,
    printCount, printfCount, getlineCount, pipeCount } = facts;

  const host = document.createElement('div');
  host.className = 'awk-doc';
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'awk-title';
  title.innerHTML = `<span class="awk-badge">${esc(isGawk ? 'GAWK Script' : 'AWK Script')}</span>${esc(name)}`;
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'awk-sub';
  sub.textContent = [
    hasBegin && 'BEGIN', hasEnd && 'END',
    `${ruleCount} rule${ruleCount !== 1 ? 's' : ''}`,
    functions.length && `${functions.length} function${functions.length !== 1 ? 's' : ''}`,
    builtins.length && `${builtins.length} built-in${builtins.length !== 1 ? 's' : ''}`,
  ].filter(Boolean).join(' · ');
  host.appendChild(sub);

  const cards = document.createElement('div');
  cards.className = 'awk-cards';
  for (const { value, label } of [
    { value: ruleCount, label: 'Rules' },
    { value: functions.length, label: 'Functions' },
    { value: builtins.length, label: 'Built-ins' },
    { value: printCount + printfCount, label: 'print calls' },
    { value: pipeCount, label: 'Pipes' },
  ]) {
    const card = document.createElement('div');
    card.className = 'awk-card';
    const s = document.createElement('strong'); s.textContent = value;
    const sp = document.createElement('span'); sp.textContent = label;
    card.appendChild(s); card.appendChild(sp); cards.appendChild(card);
  }
  host.appendChild(cards);

  // Special blocks
  if (hasBegin || hasEnd) {
    const ul = makeList(makeSection(host, 'Special Blocks'));
    if (hasBegin) row(ul, `${tag('awk-tag-special', 'BEGIN')} runs before input is read`);
    if (hasEnd) row(ul, `${tag('awk-tag-special', 'END')} runs after all input is processed`);
  }

  // Pattern-action rules
  if (rules.length) {
    const ul = makeList(makeSection(host, `Pattern-Action Rules (${rules.length})`));
    for (const r of rules) {
      const kindCls = { regex: 'awk-tag-regex', range: 'awk-tag-range', always: 'awk-tag-always', expression: 'awk-tag-pattern' }[r.kind] || 'awk-tag-pattern';
      const patHtml = r.pattern
        ? `<span class="awk-pattern">${esc(r.pattern)}</span>`
        : '<span class="awk-pattern">(every line)</span>';
      const act = r.hasAction ? ' { … }' : ' → print';
      row(ul, `${tag(kindCls, r.kind)} ${patHtml}${esc(act)}`);
    }
  }

  // User-defined functions with param + local names
  if (functions.length) {
    const ul = makeList(makeSection(host, `Functions (${functions.length})`));
    for (const fn of functions) {
      const params = `<span class="awk-params">${esc(fn.params.join(', '))}</span>`;
      const locals = fn.locals.length ? ` <span class="awk-locals">[locals: ${esc(fn.locals.join(', '))}]</span>` : '';
      row(ul, `${tag('awk-tag-func', 'function')} <span class="awk-name">${esc(fn.name)}</span>(${params})${locals}`);
    }
  }

  // Built-in variables
  if (builtins.length) {
    const sec = makeSection(host, `Built-in Variables (${builtins.length})`);
    const wrap = document.createElement('div');
    wrap.style.padding = '10px 14px';
    for (const b of builtins) {
      const pill = document.createElement('span');
      pill.className = 'awk-pill';
      pill.textContent = b;
      wrap.appendChild(pill);
    }
    sec.appendChild(wrap);
  }

  // Features
  const features = [];
  if (printfCount) features.push(`printf (${printfCount}×)`);
  if (getlineCount) features.push(`getline (${getlineCount}×)`);
  if (pipeCount) features.push(`pipes (${pipeCount}×)`);
  if (isGawk) features.push('gawk extensions');
  if (features.length) {
    const sec = makeSection(host, 'Features');
    const wrap = document.createElement('div');
    wrap.style.padding = '10px 14px';
    for (const f of features) {
      const pill = document.createElement('span');
      pill.className = 'awk-pill';
      pill.textContent = f;
      wrap.appendChild(pill);
    }
    sec.appendChild(wrap);
  }

  // Source
  const srcSec = makeSection(host, 'Source');
  const pre = document.createElement('pre');
  pre.className = 'awk-pre';
  pre.textContent = text;
  srcSec.appendChild(pre);

  return { parentNode: host };
}
