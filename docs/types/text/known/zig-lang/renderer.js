const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.zig-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.zig-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#f7a41d;color:#1a1a1a;vertical-align:middle;margin-right:8px;}
.zig-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.zig-name{font-family:ui-monospace,monospace;font-size:15px;color:#b86c00;font-weight:700;}
.zig-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.zig-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.zig-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:96px;}
.zig-card strong{display:block;font-size:1.2rem;font-weight:700;}
.zig-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.zig-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.zig-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.zig-list{margin:0;padding:0;list-style:none;}
.zig-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.zig-list li:last-child{border-bottom:none;}
.zig-tag{font-size:10px;padding:1px 5px;border-radius:4px;font-weight:700;}
.zig-tag-pub{background:#dcfce7;color:#15803d;}
.zig-tag-priv{background:#f1f5f9;color:#64748b;}
.zig-tag-kind{background:#fef9c3;color:#854d0e;}
.zig-tag-import{background:#e0f2fe;color:#0369a1;}
.zig-tag-test{background:#ede9fe;color:#7c3aed;}
.zig-tag-err{background:#ffe4e6;color:#9f1239;}
.zig-id{font-weight:600;}
.zig-type{color:#0f766e;}
.zig-ret{color:#1d4ed8;}
.zig-val{color:#9f1239;}
.zig-members{padding:4px 14px 8px 30px;}
.zig-member{padding:3px 0;border-bottom:1px dashed var(--border,#eef1f5);font-family:ui-monospace,monospace;font-size:12px;}
.zig-member:last-child{border-bottom:none;}
.zig-field-label{font-size:10px;color:var(--fg-2,#94a3b8);text-transform:uppercase;letter-spacing:.05em;padding:4px 14px 0 30px;}
`;

// ── Pure parsing layer (DOM-free, exported for unit tests) ────────────────────

// Strip // line comments and \\ multiline-string lines; mask string/char literals so their
// inner braces/semicolons/commas never affect structure parsing (import paths kept intact).
function clean(text) {
  const src = String(text || '');
  let out = '', i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i], c2 = src[i + 1];
    if (c === '/' && c2 === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '\\' && c2 === '\\') { while (i < n && src[i] !== '\n') i++; out += '""'; continue; }
    if (c === '"') {
      i++; let s = '';
      while (i < n) {
        if (src[i] === '\\') { i += 2; continue; }
        if (src[i] === '"') { i++; break; }
        s += src[i]; i++;
      }
      out += '"' + s.replace(/[{}()\[\];,]/g, ' ') + '"';
      continue;
    }
    if (c === "'") {
      i++;
      while (i < n) {
        if (src[i] === '\\') { i += 2; continue; }
        if (src[i] === "'") { i++; break; }
        i++;
      }
      out += "''";
      continue;
    }
    out += c; i++;
  }
  return out;
}

// Split cleaned source into top-level items. A `{...}` block (fn/struct/enum/test body) becomes the
// item's `body`; bare statements terminate at a `;` or `,` at depth 0. Brace-depth aware so a fn
// body's inner declarations are never mistaken for top-level items.
function splitItems(src) {
  const items = [];
  let head = '', i = 0, paren = 0, bracket = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    if (c === '(') { paren++; head += c; i++; continue; }
    if (c === ')') { paren = Math.max(0, paren - 1); head += c; i++; continue; }
    if (c === '[') { bracket++; head += c; i++; continue; }
    if (c === ']') { bracket = Math.max(0, bracket - 1); head += c; i++; continue; }
    if (c === '{' && paren === 0 && bracket === 0) {
      let depth = 1, body = ''; i++;
      while (i < n && depth > 0) {
        const d = src[i];
        if (d === '{') depth++;
        else if (d === '}') { depth--; if (depth === 0) { i++; break; } }
        body += d; i++;
      }
      items.push({ head: head.replace(/\s+/g, ' ').trim(), body });
      head = '';
      continue;
    }
    if ((c === ';' || c === ',') && paren === 0 && bracket === 0) {
      if (head.trim()) items.push({ head: head.replace(/\s+/g, ' ').trim(), body: null });
      head = ''; i++;
      continue;
    }
    head += c; i++;
  }
  if (head.trim()) items.push({ head: head.replace(/\s+/g, ' ').trim(), body: null });
  return items;
}

function splitCommas(s) {
  const out = [];
  let buf = '', paren = 0, bracket = 0, brace = 0;
  for (const ch of s) {
    if (ch === '(') paren++; else if (ch === ')') paren = Math.max(0, paren - 1);
    else if (ch === '[') bracket++; else if (ch === ']') bracket = Math.max(0, bracket - 1);
    else if (ch === '{') brace++; else if (ch === '}') brace = Math.max(0, brace - 1);
    if (ch === ',' && !paren && !bracket && !brace) { out.push(buf); buf = ''; } else buf += ch;
  }
  if (buf.trim()) out.push(buf);
  return out.map((x) => x.trim()).filter(Boolean);
}

// Extract the first balanced (...) group; return its inner text and the remainder after it.
function extractParen(s) {
  const start = s.indexOf('(');
  if (start < 0) return { inner: '', after: s };
  let depth = 0, i = start;
  for (; i < s.length; i++) {
    if (s[i] === '(') depth++;
    else if (s[i] === ')') { depth--; if (depth === 0) { i++; break; } }
  }
  return { inner: s.slice(start + 1, i - 1), after: s.slice(i) };
}

function parseParams(inner) {
  return splitCommas(inner).map((p) => {
    const m = p.match(/^(comptime\s+|noalias\s+)*([A-Za-z_]\w*|_)\s*:\s*([\s\S]+)$/);
    if (m) return { name: m[2], type: m[3].replace(/\s+/g, ' ').trim() };
    return { name: p, type: '' };
  });
}

// Parse a fn signature head (modifiers + fn name + params + return) into a structured record.
function parseFn(head) {
  const m = head.match(/\bfn\s+([A-Za-z_]\w*)/);
  if (!m) return null;
  const pub = /^\s*pub\b/.test(head);
  const exported = /\bexport\b/.test(head);
  const sig = head.slice(head.indexOf(m[0]) + m[0].length);
  const { inner, after } = extractParen(sig);
  let returns = after.replace(/^\s*\)?/, '')
    .replace(/\bcallconv\s*\([^)]*\)/g, '')
    .replace(/\balign\s*\([^)]*\)/g, '')
    .replace(/\s+/g, ' ').trim();
  return { name: m[1], params: parseParams(inner), returns, pub, exported };
}

// Parse the body of a struct/enum/union/opaque into fields + nested methods.
function parseTypeBody(body, kind) {
  const fields = [], methods = [];
  for (const it of splitItems(body || '')) {
    if (/\bfn\s+[A-Za-z_]\w*\s*\(/.test(it.head)) { const f = parseFn(it.head); if (f) methods.push(f); continue; }
    if (/^(?:pub\s+)?(?:const|var)\b/.test(it.head)) continue; // nested decls/types: not a field
    if (/^(?:test|comptime|usingnamespace)\b/.test(it.head)) continue;
    const fm = it.head.match(/^([A-Za-z_]\w*)\s*(?::\s*([^=]+?))?\s*(?:=[\s\S]*)?$/);
    if (fm) fields.push({ name: fm[1], type: (fm[2] || '').replace(/\s+/g, ' ').trim() });
  }
  return { fields, methods };
}

export function analyzeZig(text) {
  const cleaned = clean(text);
  const imports = [], types = [], functions = [], constants = [], errorSets = [], tests = [];
  let comptimeBlocks = 0;

  for (const it of splitItems(cleaned)) {
    const head = it.head;
    if (!head) continue;

    if (/^test\b/.test(head)) {
      const nm = head.match(/^test\s+"([^"]*)"/);
      tests.push(nm ? nm[1] : '(anonymous)');
      continue;
    }
    if (/^comptime\b/.test(head) && it.body != null) { comptimeBlocks++; continue; }

    const isFn = /^(?:pub\s+|export\s+|extern\s+(?:"[^"]*"\s+)?|inline\s+|noinline\s+)*fn\b/.test(head);
    if (isFn) { const f = parseFn(head); if (f) functions.push(f); continue; }

    if (/@import\s*\(/.test(head)) {
      const nm = head.match(/^(?:pub\s+)?(?:const|var)\s+([A-Za-z_]\w*)/);
      const pm = head.match(/@import\s*\(\s*"([^"]*)"\s*\)/);
      imports.push({ name: nm ? nm[1] : '', path: pm ? pm[1] : '' });
      continue;
    }

    const tm = head.match(/^(?:pub\s+)?(?:const|var)\s+([A-Za-z_]\w*)\s*=\s*(?:extern\s+|packed\s+)?(struct|enum|union|opaque|error)\b/);
    if (tm) {
      const name = tm[1], kw = tm[2];
      if (kw === 'error') {
        const members = splitCommas(it.body || '').map((m) => m.replace(/\s+/g, ' ').trim()).filter(Boolean);
        errorSets.push({ name, members });
      } else {
        const { fields, methods } = parseTypeBody(it.body, kw);
        types.push({ kind: kw, name, pub: /^\s*pub\b/.test(head), fields, methods });
      }
      continue;
    }

    const cm = head.match(/^(?:pub\s+)?(const|var)\s+([A-Za-z_]\w*)\s*(?::\s*([^=]+?))?\s*(?:=\s*([\s\S]+))?$/);
    if (cm) {
      let value = (cm[4] || '').replace(/\s+/g, ' ').trim();
      if (it.body != null && !value) value = '{ … }';
      else if (it.body != null) value += ' { … }';
      constants.push({
        name: cm[2],
        type: (cm[3] || '').replace(/\s+/g, ' ').trim(),
        value,
        pub: /^\s*pub\b/.test(head),
        mutable: cm[1] === 'var',
      });
    }
  }
  return { imports, types, functions, constants, errorSets, tests, comptimeBlocks };
}

// ── Rendering layer ───────────────────────────────────────────────────────────

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'zig-section';
  const hd = document.createElement('div');
  hd.className = 'zig-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}
function makeList(sec) { const ul = document.createElement('ul'); ul.className = 'zig-list'; sec.appendChild(ul); return ul; }
function row(ul, html) { const li = document.createElement('li'); li.innerHTML = html; ul.appendChild(li); }
function tag(cls, t) { return `<span class="zig-tag ${cls}">${esc(t)}</span>`; }
function visTag(pub) { return pub ? tag('zig-tag-pub', 'pub') : tag('zig-tag-priv', 'priv'); }
function paramsHtml(params) {
  return params.map((p) => p.type
    ? `${esc(p.name)}: <span class="zig-type">${esc(p.type)}</span>`
    : esc(p.name)).join(', ');
}
function fnHtml(fn) {
  const ret = fn.returns ? ` <span class="zig-ret">${esc(fn.returns)}</span>` : '';
  return `${visTag(fn.pub)} <span class="zig-id">${esc(fn.name)}</span>(${paramsHtml(fn.params)})${ret}`;
}

export function render(intake) {
  const text = intake.text || '';
  const preview = text.slice(0, 4000);
  if (!/\bfn\b|\bconst\b|@import|\btest\s|\bpub\b/.test(preview)) return null;

  const { imports, types, functions, constants, errorSets, tests, comptimeBlocks } = analyzeZig(text);
  if (!functions.length && !types.length && !imports.length && !tests.length && !constants.length && !errorSets.length) return null;

  const host = document.createElement('div');
  host.className = 'zig-doc';
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'zig-title';
  const badge = document.createElement('span');
  badge.className = 'zig-badge';
  badge.textContent = 'Zig';
  title.appendChild(badge);
  const nm = document.createElement('span');
  nm.className = 'zig-name';
  nm.textContent = (intake.name || intake.filename || 'source.zig');
  title.appendChild(nm);
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'zig-sub';
  sub.textContent = [
    types.length && `${types.length} type${types.length !== 1 ? 's' : ''}`,
    functions.length && `${functions.length} fn${functions.length !== 1 ? 's' : ''}`,
    imports.length && `${imports.length} import${imports.length !== 1 ? 's' : ''}`,
    tests.length && `${tests.length} test${tests.length !== 1 ? 's' : ''}`,
    comptimeBlocks && `${comptimeBlocks} comptime`,
  ].filter(Boolean).join(' · ');
  host.appendChild(sub);

  const cards = document.createElement('div');
  cards.className = 'zig-cards';
  for (const { value, label } of [
    { value: types.length, label: 'Types' },
    { value: functions.length, label: 'Functions' },
    { value: imports.length, label: 'Imports' },
    { value: constants.length, label: 'Constants' },
    { value: tests.length, label: 'Tests' },
  ]) {
    const card = document.createElement('div');
    card.className = 'zig-card';
    const s = document.createElement('strong'); s.textContent = value;
    const sp = document.createElement('span'); sp.textContent = label;
    card.appendChild(s); card.appendChild(sp); cards.appendChild(card);
  }
  host.appendChild(cards);

  if (types.length) {
    const sec = makeSection(host, `Types (${types.length})`);
    const ul = makeList(sec);
    for (const t of types) {
      row(ul, `${visTag(t.pub)} ${tag('zig-tag-kind', t.kind)} <span class="zig-id">${esc(t.name)}</span>`);
      if (t.fields.length) {
        const lbl = document.createElement('div');
        lbl.className = 'zig-field-label';
        lbl.textContent = t.kind === 'enum' ? 'variants' : 'fields';
        sec.appendChild(lbl);
        const box = document.createElement('div');
        box.className = 'zig-members';
        for (const f of t.fields) {
          const d = document.createElement('div');
          d.className = 'zig-member';
          d.innerHTML = f.type
            ? `<span class="zig-id">${esc(f.name)}</span>: <span class="zig-type">${esc(f.type)}</span>`
            : `<span class="zig-id">${esc(f.name)}</span>`;
          box.appendChild(d);
        }
        sec.appendChild(box);
      }
      if (t.methods.length) {
        const lbl = document.createElement('div');
        lbl.className = 'zig-field-label';
        lbl.textContent = 'methods';
        sec.appendChild(lbl);
        const box = document.createElement('div');
        box.className = 'zig-members';
        for (const mth of t.methods) {
          const d = document.createElement('div');
          d.className = 'zig-member';
          d.innerHTML = fnHtml(mth);
          box.appendChild(d);
        }
        sec.appendChild(box);
      }
    }
  }

  if (functions.length) {
    const ul = makeList(makeSection(host, `Functions (${functions.length})`));
    for (const fn of functions) row(ul, fnHtml(fn));
  }

  if (errorSets.length) {
    const ul = makeList(makeSection(host, `Error Sets (${errorSets.length})`));
    for (const e of errorSets) {
      row(ul, `${tag('zig-tag-err', 'error')} <span class="zig-id">${esc(e.name)}</span>`
        + (e.members.length ? ` <span class="zig-type">{ ${esc(e.members.join(', '))} }</span>` : ''));
    }
  }

  if (imports.length) {
    const ul = makeList(makeSection(host, `Imports (${imports.length})`));
    for (const im of imports) {
      row(ul, `${tag('zig-tag-import', 'import')} <span class="zig-id">${esc(im.name)}</span>`
        + (im.path ? ` <span class="zig-val">"${esc(im.path)}"</span>` : ''));
    }
  }

  if (constants.length) {
    const ul = makeList(makeSection(host, `Constants (${constants.length})`));
    for (const c of constants) {
      const ty = c.type ? `: <span class="zig-type">${esc(c.type)}</span>` : '';
      const val = c.value ? ` = <span class="zig-val">${esc(c.value.slice(0, 60))}</span>` : '';
      row(ul, `${visTag(c.pub)} ${tag('zig-tag-kind', c.mutable ? 'var' : 'const')} <span class="zig-id">${esc(c.name)}</span>${ty}${val}`);
    }
  }

  if (tests.length) {
    const ul = makeList(makeSection(host, `Tests (${tests.length})`));
    for (const t of tests) row(ul, `${tag('zig-tag-test', 'test')} <span class="zig-id">${esc(t)}</span>`);
  }

  return { parentNode: host };
}
