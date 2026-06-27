const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.re-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.re-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#dd4b39;color:#fff;vertical-align:middle;margin-right:8px;}
.re-badge-sub{display:inline-block;padding:2px 7px;border-radius:8px;font-size:10px;font-weight:700;background:#fdf0ee;color:#a03020;vertical-align:middle;margin-left:6px;}
.re-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.re-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.re-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.re-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:96px;}
.re-card strong{display:block;font-size:1.2rem;font-weight:700;}
.re-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.re-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.re-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.re-list{margin:0;padding:0;list-style:none;}
.re-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.re-list li:last-child{border-bottom:none;}
.re-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#e0f2fe;color:#0369a1;font-weight:700;}
.re-tag-fn{background:#e8f4fb;color:#1a3a5c;}
.re-tag-val{background:#f1f5f9;color:#475569;}
.re-tag-ext{background:#dcfce7;color:#166534;}
.re-tag-rec{background:#fef9c3;color:#854d0e;}
.re-tag-var{background:#ede9fe;color:#7c3aed;}
.re-tag-alias{background:#fde7f3;color:#9d174d;}
.re-tag-mod{background:#fdf0ee;color:#a03020;}
.re-tag-jsx{background:#fdf6ec;color:#7c5c2e;}
.re-name{font-weight:600;}
.re-type{color:#0e7490;}
.re-ret{color:#1d4ed8;}
.re-label{color:#9f1239;}
`;

// Strip /* */, (* *) and // comments (string-aware) so structural scans see only code.
function stripComments(src) {
  let out = '', i = 0;
  while (i < src.length) {
    const a = src[i], b = src[i + 1];
    if (a === '/' && b === '*') { i += 2; while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++; i += 2; out += ' '; continue; }
    if (a === '(' && b === '*') { i += 2; while (i < src.length && !(src[i] === '*' && src[i + 1] === ')')) i++; i += 2; out += ' '; continue; }
    if (a === '/' && b === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (a === '"') { out += src[i++]; while (i < src.length && src[i] !== '"') { if (src[i] === '\\') out += src[i++]; out += src[i++]; } if (i < src.length) out += src[i++]; continue; }
    out += src[i++];
  }
  return out;
}

// Split on top-level commas (ignoring those inside () [] {}).
function splitTopComma(s) {
  const out = []; let depth = 0, buf = '';
  for (let k = 0; k < s.length; k++) {
    const c = s[k];
    if ('{[('.includes(c)) { depth++; buf += c; }
    else if ('}])'.includes(c)) { depth--; buf += c; }
    else if (c === ',' && depth === 0) { out.push(buf); buf = ''; }
    else buf += c;
  }
  if (buf.trim()) out.push(buf);
  return out;
}

// Index of first top-level ':' that is not part of '::'.
function topColon(s) {
  let depth = 0;
  for (let k = 0; k < s.length; k++) {
    const c = s[k];
    if ('{[('.includes(c)) depth++;
    else if ('}])'.includes(c)) depth--;
    else if (c === ':' && depth === 0 && s[k + 1] !== ':' && s[k - 1] !== ':') return k;
  }
  return -1;
}

// Drop a '= default' suffix while preserving '=>' in function types.
function stripDefault(s) {
  let depth = 0;
  for (let k = 0; k < s.length; k++) {
    const c = s[k];
    if ('{[('.includes(c)) depth++;
    else if ('}])'.includes(c)) depth--;
    else if (c === '=' && s[k + 1] !== '>' && depth === 0) return s.slice(0, k).trim();
  }
  return s.trim();
}

// Extract a balanced (...) group starting at src[i] === '('. Returns {inner, end}.
function balancedParen(src, i) {
  let depth = 0, k = i;
  for (; k < src.length; k++) {
    const c = src[k];
    if (c === '"') { k++; while (k < src.length && src[k] !== '"') { if (src[k] === '\\') k++; k++; } }
    else if (c === '(') depth++;
    else if (c === ')') { depth--; if (depth === 0) { k++; break; } }
  }
  return { inner: src.slice(i + 1, k - 1), end: k };
}

// ReasonML params: "~label: type=default", "x: type", "x", "()". Returns [{name,type,labeled}].
function reasonParams(inner) {
  inner = inner.trim();
  if (!inner || inner === '()') return [];
  return splitTopComma(inner).map((p) => p.trim()).filter(Boolean).map((p) => {
    let labeled = false;
    if (p[0] === '~') { labeled = true; p = p.slice(1).trim(); }
    const c = topColon(p);
    let name, type = '';
    if (c >= 0) { name = p.slice(0, c).trim(); type = stripDefault(p.slice(c + 1).trim()); }
    else name = p;
    name = name.replace(/=.*$/s, '').replace(/\bas\b.*$/s, '').trim();
    return { name, type, labeled };
  }).filter((p) => p.name);
}

// Gather a type/value body from after '=' until a top-level ';' (brace/paren-aware).
function gatherBody(src, start) {
  let depth = 0, k = start, buf = '';
  for (; k < src.length; k++) {
    const c = src[k];
    if ('{[('.includes(c)) depth++;
    else if ('}])'.includes(c)) depth--;
    else if (c === ';' && depth === 0) break;
    buf += c;
  }
  return { body: buf, end: k };
}

function parseFields(inner) {
  return splitTopComma(inner).map((f) => f.trim()).filter(Boolean).map((f) => {
    let mutable = false;
    if (/^mutable\b/.test(f)) { mutable = true; f = f.replace(/^mutable\s+/, ''); }
    const c = topColon(f);
    if (c < 0) return { name: f, type: '', mutable };
    return { name: f.slice(0, c).trim(), type: f.slice(c + 1).trim().replace(/,+$/, '').trim(), mutable };
  }).filter((f) => f.name);
}

function parseConstructors(body) {
  return body.split('|').map((s) => s.trim()).filter(Boolean).map((c) => {
    const mm = c.match(/^([A-Za-z_]\w*)\s*(?:\(([\s\S]*)\))?/);
    if (!mm) return { name: c, args: [] };
    const args = mm[2] ? splitTopComma(mm[2]).map((a) => a.trim()).filter(Boolean) : [];
    return { name: mm[1], args };
  });
}

// Parse Reason source into structured facts. Pure (DOM-free) and exported for unit testing.
export function analyzeReason(text) {
  const src = stripComments(String(text || ''));
  const opens = [], includes = [], modules = [], externals = [], types = [], lets = [], decorators = [];
  let m;

  const openRe = /(?:^|[^\w'])open\s+([\w.]+)/g;
  while ((m = openRe.exec(src))) opens.push(m[1]);
  const incRe = /(?:^|[^\w'])include\s+([\w.]+)/g;
  while ((m = incRe.exec(src))) includes.push(m[1]);
  const modRe = /(?:^|[^\w'])module\s+(\w+)/g;
  while ((m = modRe.exec(src))) { if (m[1] !== 'type') modules.push(m[1]); }
  const extRe = /(?:^|[^\w'])external\s+(\w+)\s*:\s*([\s\S]+?)\s*=\s*"/g;
  while ((m = extRe.exec(src))) externals.push({ name: m[1], type: m[2].replace(/\s+/g, ' ').trim() });
  const decRe = /\[@+([\w.]+)/g;
  while ((m = decRe.exec(src))) decorators.push(m[1]);

  // type declarations
  const typeRe = /(?:^|[^\w'])type\s+(\w+)/g;
  while ((m = typeRe.exec(src))) {
    const name = m[1];
    let i = m.index + m[0].length, depth = 0;
    while (i < src.length && src[i] !== '=' && !(src[i] === ';' && depth === 0)) {
      if ('{[('.includes(src[i])) depth++; else if ('}])'.includes(src[i])) depth--; i++;
    }
    if (src[i] !== '=') { types.push({ name, kind: 'abstract', fields: [], constructors: [], alias: '' }); continue; }
    const g = gatherBody(src, i + 1);
    const bt = g.body.trim();
    typeRe.lastIndex = g.end;
    if (bt.startsWith('{')) {
      types.push({ name, kind: 'record', fields: parseFields(bt.slice(1, bt.lastIndexOf('}'))), constructors: [], alias: '' });
    } else if (bt.includes('|')) {
      types.push({ name, kind: 'variant', fields: [], constructors: parseConstructors(bt), alias: '' });
    } else {
      types.push({ name, kind: 'alias', fields: [], constructors: [], alias: bt });
    }
  }

  // let bindings (functions + values)
  const letRe = /(?:^|[^\w'])let\s+(?:rec\s+)?(\w+)/g;
  while ((m = letRe.exec(src))) {
    const name = m[1];
    let i = m.index + m[0].length;
    while (i < src.length && /\s/.test(src[i])) i++;
    let declaredType = '', params = [], returns = '', fn = false;
    if (src[i] === ':') {
      let depth = 0, k = i + 1, t = '';
      for (; k < src.length; k++) {
        const c = src[k];
        if ('{[('.includes(c)) depth++; else if ('}])'.includes(c)) depth--;
        else if (c === '=' && src[k + 1] !== '>' && depth === 0) break;
        t += c;
      }
      declaredType = t.trim(); i = k;
    }
    if (src[i] === '=') i++;
    while (i < src.length && /\s/.test(src[i])) i++;
    if (src[i] === '(') {
      const grp = balancedParen(src, i);
      params = reasonParams(grp.inner);
      fn = true;
      let after = grp.end;
      while (after < src.length && /\s/.test(src[after])) after++;
      if (src[after] === ':') {
        let depth = 0, k = after + 1, t = '';
        for (; k < src.length; k++) {
          const c = src[k];
          if ('{[('.includes(c)) depth++; else if ('}])'.includes(c)) depth--;
          else if (c === '=' && src[k + 1] === '>' && depth === 0) break;
          t += c;
        }
        returns = t.trim();
      }
    } else {
      const am = src.slice(i, i + 120).match(/^(\w+)\s*=>/);
      if (am) { fn = true; params = [{ name: am[1], type: '', labeled: false }]; }
      else if (/^[\w.]+\s*=>/.test(declaredType) || /=>/.test(declaredType)) fn = false;
    }
    lets.push({ name, params, returns, declaredType, fn });
  }

  const isJsx = /<[A-Za-z]/.test(src) || /\bReact\./.test(src) || /\bReasonReact\./.test(src);
  return { opens, includes, modules, externals, types, lets, decorators: [...new Set(decorators)], isJsx };
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 're-section';
  const hd = document.createElement('div');
  hd.className = 're-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}
function makeList(sec) { const ul = document.createElement('ul'); ul.className = 're-list'; sec.appendChild(ul); return ul; }
function tag(cls, t) { return `<span class="re-tag ${cls}">${esc(t)}</span>`; }
function row(ul, html) { const li = document.createElement('li'); li.innerHTML = html; ul.appendChild(li); }
function paramsHtml(params) {
  if (!params.length) return '()';
  return '(' + params.map((p) => {
    const lbl = p.labeled ? `<span class="re-label">~${esc(p.name)}</span>` : esc(p.name);
    return p.type ? `${lbl}: <span class="re-type">${esc(p.type)}</span>` : lbl;
  }).join(', ') + ')';
}

export async function render(intake) {
  const text = intake.text || '';
  const filename = (intake.name || intake.filename || '').toLowerCase();
  const preview = text.slice(0, 4000);
  if (!/\blet\b/.test(preview) && !/\btype\b/.test(preview) && !/\bopen\b/.test(preview)
      && !/\bmodule\b/.test(preview) && !/\bexternal\b/.test(preview)) return null;

  const isInterface = filename.endsWith('.rei');
  const { opens, includes, modules, externals, types, lets, decorators, isJsx } = analyzeReason(text);
  const fns = lets.filter((l) => l.fn);
  const vals = lets.filter((l) => !l.fn);
  const imports = [...opens.map((o) => ({ kind: 'open', name: o })), ...includes.map((o) => ({ kind: 'include', name: o }))];

  const host = document.createElement('div');
  host.className = 're-doc';
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 're-title';
  let titleHtml = `<span class="re-badge">${isInterface ? 'Reason Interface' : 'Reason Module'}</span>`
    + `<span class="re-badge-sub">${isInterface ? '.rei' : '.re'}</span>`;
  if (isJsx) titleHtml += ` ${tag('re-tag-jsx', 'JSX / React')}`;
  title.innerHTML = titleHtml;
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 're-sub';
  sub.textContent = [
    imports.length && `${imports.length} import${imports.length !== 1 ? 's' : ''}`,
    types.length && `${types.length} type${types.length !== 1 ? 's' : ''}`,
    fns.length && `${fns.length} function${fns.length !== 1 ? 's' : ''}`,
    vals.length && `${vals.length} value${vals.length !== 1 ? 's' : ''}`,
    externals.length && `${externals.length} external${externals.length !== 1 ? 's' : ''}`,
  ].filter(Boolean).join(' · ');
  host.appendChild(sub);

  const cards = document.createElement('div');
  cards.className = 're-cards';
  for (const { value, label } of [
    { value: imports.length, label: 'Imports' },
    { value: modules.length, label: 'Modules' },
    { value: types.length, label: 'Types' },
    { value: fns.length, label: 'Functions' },
    { value: vals.length, label: 'Values' },
    { value: externals.length, label: 'Externals' },
  ]) {
    const card = document.createElement('div');
    card.className = 're-card';
    const s = document.createElement('strong'); s.textContent = value;
    const sp = document.createElement('span'); sp.textContent = label;
    card.appendChild(s); card.appendChild(sp); cards.appendChild(card);
  }
  host.appendChild(cards);

  if (imports.length) {
    const ul = makeList(makeSection(host, `Imports (${imports.length})`));
    for (const im of imports) row(ul, `${tag('re-tag', im.kind)} <span class="re-name">${esc(im.name)}</span>`);
  }
  if (modules.length) {
    const ul = makeList(makeSection(host, `Modules (${modules.length})`));
    for (const mod of modules) row(ul, `${tag('re-tag-mod', 'module')} <span class="re-name">${esc(mod)}</span>`);
  }
  if (types.length) {
    const ul = makeList(makeSection(host, `Types (${types.length})`));
    for (const t of types) {
      const cls = t.kind === 'record' ? 're-tag-rec' : t.kind === 'variant' ? 're-tag-var' : 're-tag-alias';
      let detail = '';
      if (t.kind === 'record') detail = ' { ' + t.fields.map((f) => `${esc(f.name)}: <span class="re-type">${esc(f.type)}</span>`).join(', ') + ' }';
      else if (t.kind === 'variant') detail = ' = ' + t.constructors.map((c) => esc(c.name) + (c.args.length ? `(<span class="re-type">${esc(c.args.join(', '))}</span>)` : '')).join(' | ');
      else if (t.kind === 'alias' && t.alias) detail = ` = <span class="re-type">${esc(t.alias)}</span>`;
      row(ul, `${tag(cls, t.kind)} <span class="re-name">${esc(t.name)}</span>${detail}`);
    }
  }
  if (fns.length) {
    const ul = makeList(makeSection(host, `Functions (${fns.length})`));
    for (const f of fns) {
      const ret = f.returns ? ` : <span class="re-ret">${esc(f.returns)}</span>` : '';
      row(ul, `${tag('re-tag-fn', 'fn')} <span class="re-name">${esc(f.name)}</span> ${paramsHtml(f.params)}${ret}`);
    }
  }
  if (vals.length) {
    const ul = makeList(makeSection(host, `Values (${vals.length})`));
    for (const v of vals) {
      const ty = v.declaredType ? ` : <span class="re-type">${esc(v.declaredType)}</span>` : '';
      row(ul, `${tag('re-tag-val', 'val')} <span class="re-name">${esc(v.name)}</span>${ty}`);
    }
  }
  if (externals.length) {
    const ul = makeList(makeSection(host, `Externals (${externals.length})`));
    for (const e of externals) row(ul, `${tag('re-tag-ext', 'external')} <span class="re-name">${esc(e.name)}</span> : <span class="re-type">${esc(e.type)}</span>`);
  }
  if (decorators.length) {
    const ul = makeList(makeSection(host, `Decorators (${decorators.length})`));
    for (const d of decorators) row(ul, `<span class="re-name">[@${esc(d)}]</span>`);
  }

  return { parentNode: host };
}
