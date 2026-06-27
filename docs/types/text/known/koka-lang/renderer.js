const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.koka-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.koka-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#8b1a89;color:#fff;vertical-align:middle;margin-right:8px;}
.koka-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.koka-mod{font-family:ui-monospace,monospace;font-size:13px;color:#8b1a89;font-weight:700;}
.koka-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.koka-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.koka-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:96px;}
.koka-card strong{display:block;font-size:1.2rem;font-weight:700;}
.koka-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.koka-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.koka-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.koka-list{margin:0;padding:0;list-style:none;}
.koka-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.koka-list li:last-child{border-bottom:none;}
.koka-tag{font-size:10px;padding:1px 5px;border-radius:4px;font-weight:700;}
.koka-tag-import{background:#e0f2fe;color:#0369a1;}
.koka-tag-fun{background:#dbeafe;color:#1d4ed8;}
.koka-tag-pub{background:#dcfce7;color:#166534;}
.koka-tag-type{background:#fef9c3;color:#854d0e;}
.koka-tag-effect{background:#f3e8ff;color:#7e22ce;}
.koka-tag-val{background:#ffe4e6;color:#be123c;}
.koka-tag-alias{background:#fee2e2;color:#9f1239;}
.koka-tag-con{background:#fef3c7;color:#92400e;}
.koka-name{font-weight:600;}
.koka-type{color:#0e7490;}
.koka-eff{color:#7e22ce;font-style:italic;}
.koka-ret{color:#1d4ed8;}
.koka-params{color:var(--fg-2,#555);}
`;

// Strip // line and /* */ block comments while respecting string literals so a // inside a string survives.
function stripComments(src) {
  let out = '', i = 0;
  const s = String(src || '');
  while (i < s.length) {
    const c = s[i], n = s[i + 1];
    if (c === '"') { out += c; i++; while (i < s.length && s[i] !== '"') { if (s[i] === '\\') { out += s[i]; i++; } out += s[i]; i++; } out += s[i] || ''; i++; continue; }
    if (c === '/' && n === '/') { while (i < s.length && s[i] !== '\n') i++; continue; }
    if (c === '/' && n === '*') { i += 2; while (i < s.length && !(s[i] === '*' && s[i + 1] === '/')) i++; i += 2; continue; }
    out += c; i++;
  }
  return out;
}

// Split on `sep` only at bracket depth 0 so spaces/commas inside type expressions are not separators.
function splitTop(str, sep) {
  const out = []; let buf = '', depth = 0;
  for (const ch of str) {
    if ('(<[{'.includes(ch)) depth++;
    else if (')>]}'.includes(ch)) depth = Math.max(0, depth - 1);
    if (depth === 0 && ch === sep) { out.push(buf); buf = ''; } else buf += ch;
  }
  if (buf.trim() || out.length) out.push(buf);
  return out.map((x) => x.trim()).filter(Boolean);
}

// From the `(` at index `open`, return the substring inside the balanced paren and the index past `)`.
function balanced(text, open) {
  let depth = 0, i = open;
  for (; i < text.length; i++) {
    if (text[i] === '(') depth++;
    else if (text[i] === ')') { depth--; if (depth === 0) break; }
  }
  return { inner: text.slice(open + 1, i), end: i + 1 };
}

// "name : Type" / "name: Type" / "^name : Type" / bare "Type" -> { name, type }.
function parseParams(raw) {
  return splitTop(raw, ',').map((p) => {
    const m = p.match(/^(\^?[\w']+)\s*:\s*([\s\S]+)$/);
    return m ? { name: m[1], type: m[2].replace(/\s+/g, ' ').trim() } : { name: '', type: p.replace(/\s+/g, ' ').trim() };
  });
}

// A Koka result annotation after `):` is `<effect> <returnType>` (effect optional / total). One token => return only.
function parseResult(raw) {
  const toks = splitTop(raw.replace(/\s+/g, ' ').trim(), ' ');
  if (toks.length === 0) return { effect: '', returns: '' };
  if (toks.length === 1) return { effect: '', returns: toks[0] };
  return { effect: toks[0], returns: toks.slice(1).join(' ') };
}

// Parse Koka source into structured facts. Pure (no DOM) so it is unit-testable.
export function analyzeKoka(text) {
  const clean = stripComments(text);
  const lines = clean.split(/\r?\n/);
  const imports = [], functions = [], values = [], types = [], effects = [], aliases = [];
  let moduleName = null;

  // Line-level declarations: module, import, top-level val, alias.
  for (const line of lines) {
    let m;
    if (!moduleName && (m = line.match(/^\s*module\s+([\w/.\-]+)/))) { moduleName = m[1]; continue; }
    if ((m = line.match(/^\s*(?:pub\s+|public\s+)?import\s+(?:(\w+)\s*=\s*)?([\w/.\-]+)/))) {
      imports.push({ path: m[2], alias: m[1] || '' }); continue;
    }
    if ((m = line.match(/^(pub\s+|public\s+)?val\s+([\w']+)\s*(?::\s*([^=\n]+?))?\s*(?:=\s*(.+))?$/))) {
      values.push({ name: m[2], type: (m[3] || '').trim(), value: (m[4] || '').trim(), pub: !!m[1] }); continue;
    }
    if ((m = line.match(/^(pub\s+|public\s+)?alias\s+([\w']+)(?:<[^>]*>)?\s*(?:=\s*(.+))?$/))) {
      aliases.push({ name: m[2], target: (m[3] || '').trim(), pub: !!m[1] }); continue;
    }
  }

  // Top-level functions (column 0): name + balanced params + result annotation. Indented `fun` (effect
  // operations, handler clauses, nested defs) are skipped, mirroring Ada's top-level-only scope.
  const funRe = /^(pub\s+|public\s+)?(?:extern\s+|inline\s+|noinline\s+)?(?:fun|fn)\s+([\w']+)\s*(?:<[^>]*>)?\s*\(/gm;
  let fm;
  while ((fm = funRe.exec(clean))) {
    const open = clean.indexOf('(', fm.index);
    if (open < 0) continue;
    const { inner, end } = balanced(clean, open);
    let result = '';
    const rm = clean.slice(end).match(/^\s*:\s*([^\n{]+)/);
    if (rm) result = rm[1].replace(/=.*$/, '').trim();
    const { effect, returns } = parseResult(result);
    functions.push({ name: fm[2], params: parseParams(inner), effect, returns, pub: !!fm[1] });
  }

  // Type declarations: capture constructors from brace `{ A; B }` or layout-indented form.
  const typeRe = /^([ \t]*)(pub\s+|public\s+)?(?:value\s+|reference\s+|open\s+|extend\s+|co\s+|rec\s+|div\s+)*(type|struct)\s+([\w']+)/gm;
  let tm;
  while ((tm = typeRe.exec(clean))) {
    const indent = tm[1].length;
    const name = tm[4];
    const cons = [];
    const after = clean.slice(tm.index + tm[0].length);
    const bracePos = after.indexOf('{');
    const newlinePos = after.indexOf('\n');
    if (bracePos >= 0 && (newlinePos < 0 || bracePos < newlinePos)) {
      const { inner } = braceBlock(after, bracePos);
      for (const seg of inner.split(/[;\n]/)) {
        const cm = seg.match(/^\s*(?:con\s+)?([A-Za-z_][\w']*)/);
        if (cm) cons.push(cm[1]);
      }
    } else {
      const startLine = clean.slice(0, tm.index).split(/\r?\n/).length - 1;
      for (let j = startLine + 1; j < lines.length; j++) {
        const l = lines[j];
        if (!l.trim()) continue;
        const ind = (l.match(/^[ \t]*/) || [''])[0].length;
        if (ind <= indent) break;
        const cm = l.match(/^\s*con\s+([A-Za-z_][\w']*)/) || l.match(/^\s+([A-Z][\w']*)\s*(?:\(|<|$|;)/);
        if (cm) cons.push(cm[1]);
      }
    }
    types.push({ name, constructors: cons });
  }

  // Effect declarations + their operation names (layout or brace form).
  const effRe = /^([ \t]*)(pub\s+|public\s+)?effect\s+(?:(?:ctl|fun|val|brk)\s+)?([\w']+)/gm;
  let em;
  while ((em = effRe.exec(clean))) {
    const indent = em[1].length;
    const name = em[3];
    const ops = [];
    const after = clean.slice(em.index + em[0].length);
    const bracePos = after.indexOf('{');
    const newlinePos = after.indexOf('\n');
    if (bracePos >= 0 && (newlinePos < 0 || bracePos < newlinePos)) {
      const { inner } = braceBlock(after, bracePos);
      for (const seg of inner.split(/[;\n]/)) {
        const om = seg.match(/^\s*(?:ctl|fun|val)\s+([\w']+)/);
        if (om) ops.push(om[1]);
      }
    } else {
      const startLine = clean.slice(0, em.index).split(/\r?\n/).length - 1;
      for (let j = startLine + 1; j < lines.length; j++) {
        const l = lines[j];
        if (!l.trim()) continue;
        const ind = (l.match(/^[ \t]*/) || [''])[0].length;
        if (ind <= indent) break;
        const om = l.match(/^\s*(?:ctl|fun|val)\s+([\w']+)/);
        if (om) ops.push(om[1]);
      }
    }
    effects.push({ name, operations: ops });
  }

  return { moduleName, imports, functions, values, types, effects, aliases };
}

// Return text inside the balanced `{...}` starting at `open` within str.
function braceBlock(str, open) {
  let depth = 0, i = open;
  for (; i < str.length; i++) {
    if (str[i] === '{') depth++;
    else if (str[i] === '}') { depth--; if (depth === 0) break; }
  }
  return { inner: str.slice(open + 1, i), end: i + 1 };
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'koka-section';
  const hd = document.createElement('div');
  hd.className = 'koka-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}
function makeList(sec) { const ul = document.createElement('ul'); ul.className = 'koka-list'; sec.appendChild(ul); return ul; }
function tag(cls, t) { return `<span class="koka-tag ${cls}">${esc(t)}</span>`; }
function row(ul, html) { const li = document.createElement('li'); li.innerHTML = html; ul.appendChild(li); }
function paramsHtml(params) {
  return params.map((p) => {
    const nm = p.name ? `${esc(p.name)} : ` : '';
    return `${nm}<span class="koka-type">${esc(p.type)}</span>`;
  }).join(', ');
}

export async function render(intake) {
  const text = intake.text || '';
  const preview = text.slice(0, 4000);
  if (!/\bfun\b/.test(preview) && !/\beffect\b/.test(preview) && !/\bmodule\b/.test(preview)) return null;

  const { moduleName, imports, functions, values, types, effects, aliases } = analyzeKoka(text);

  const host = document.createElement('div');
  host.className = 'koka-doc';
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'koka-title';
  const badge = document.createElement('span');
  badge.className = 'koka-badge';
  badge.textContent = 'Koka';
  title.appendChild(badge);
  if (moduleName) { const n = document.createElement('span'); n.className = 'koka-mod'; n.textContent = moduleName; title.appendChild(n); }
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'koka-sub';
  sub.textContent = [
    imports.length && `${imports.length} import${imports.length !== 1 ? 's' : ''}`,
    functions.length && `${functions.length} function${functions.length !== 1 ? 's' : ''}`,
    types.length && `${types.length} type${types.length !== 1 ? 's' : ''}`,
    effects.length && `${effects.length} effect${effects.length !== 1 ? 's' : ''}`,
  ].filter(Boolean).join(' · ') || 'Koka source';
  host.appendChild(sub);

  const cards = document.createElement('div');
  cards.className = 'koka-cards';
  for (const { value, label } of [
    { value: imports.length, label: 'Imports' },
    { value: functions.length, label: 'Functions' },
    { value: types.length, label: 'Types' },
    { value: effects.length, label: 'Effects' },
    { value: values.length, label: 'Values' },
    { value: aliases.length, label: 'Aliases' },
  ]) {
    const card = document.createElement('div');
    card.className = 'koka-card';
    const s = document.createElement('strong'); s.textContent = value;
    const sp = document.createElement('span'); sp.textContent = label;
    card.appendChild(s); card.appendChild(sp); cards.appendChild(card);
  }
  host.appendChild(cards);

  if (imports.length) {
    const ul = makeList(makeSection(host, `Imports (${imports.length})`));
    for (const im of imports) {
      const al = im.alias ? `<span class="koka-name">${esc(im.alias)}</span> = ` : '';
      row(ul, `${tag('koka-tag-import', 'import')} ${al}${esc(im.path)}`);
    }
  }
  if (effects.length) {
    const ul = makeList(makeSection(host, `Effects (${effects.length})`));
    for (const ef of effects) {
      const ops = ef.operations.length ? ` <span class="koka-params">{ ${esc(ef.operations.join(', '))} }</span>` : '';
      row(ul, `${tag('koka-tag-effect', 'effect')} <span class="koka-name">${esc(ef.name)}</span>${ops}`);
    }
  }
  if (types.length) {
    const ul = makeList(makeSection(host, `Types (${types.length})`));
    for (const ty of types) {
      const cons = ty.constructors.length
        ? ' ' + ty.constructors.map((c) => tag('koka-tag-con', c)).join(' ')
        : '';
      row(ul, `${tag('koka-tag-type', 'type')} <span class="koka-name">${esc(ty.name)}</span>${cons}`);
    }
  }
  if (functions.length) {
    const ul = makeList(makeSection(host, `Functions (${functions.length})`));
    for (const f of functions) {
      const pub = f.pub ? tag('koka-tag-pub', 'pub') + ' ' : '';
      const eff = f.effect ? `<span class="koka-eff">${esc(f.effect)}</span> ` : '';
      const ret = f.returns ? `<span class="koka-ret">${esc(f.returns)}</span>` : '';
      const tail = (f.effect || f.returns) ? ` : ${eff}${ret}` : '';
      row(ul, `${pub}${tag('koka-tag-fun', 'fun')} <span class="koka-name">${esc(f.name)}</span>(${paramsHtml(f.params)})${tail}`);
    }
  }
  if (values.length) {
    const ul = makeList(makeSection(host, `Values (${values.length})`));
    for (const v of values) {
      const pub = v.pub ? tag('koka-tag-pub', 'pub') + ' ' : '';
      const ty = v.type ? ` : <span class="koka-type">${esc(v.type)}</span>` : '';
      const val = v.value ? ` <span class="koka-params">= ${esc(v.value)}</span>` : '';
      row(ul, `${pub}${tag('koka-tag-val', 'val')} <span class="koka-name">${esc(v.name)}</span>${ty}${val}`);
    }
  }
  if (aliases.length) {
    const ul = makeList(makeSection(host, `Aliases (${aliases.length})`));
    for (const a of aliases) {
      const target = a.target ? ` <span class="koka-params">= ${esc(a.target)}</span>` : '';
      row(ul, `${tag('koka-tag-alias', 'alias')} <span class="koka-name">${esc(a.name)}</span>${target}`);
    }
  }

  return { parentNode: host };
}
