const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.fs-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.fs-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#378bbd;color:#fff;vertical-align:middle;margin-right:8px;}
.fs-kind-badge{display:inline-block;padding:2px 7px;border-radius:8px;font-size:10px;font-weight:700;background:#e8f4fb;color:#378bbd;border:1px solid #378bbd;vertical-align:middle;margin-left:6px;}
.fs-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.fs-mod{font-family:ui-monospace,monospace;font-size:13px;color:#378bbd;font-weight:700;}
.fs-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.fs-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.fs-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:96px;}
.fs-card strong{display:block;font-size:1.2rem;font-weight:700;}
.fs-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.fs-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.fs-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.fs-list{margin:0;padding:0;list-style:none;}
.fs-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.fs-list li:last-child{border-bottom:none;}
.fs-name{font-weight:600;}
.fs-type{color:#0e7490;}
.fs-ret{color:#1d4ed8;}
.fs-params{color:var(--fg-2,#555);}
.fs-of{color:#7c3aed;}
.fs-tag{font-size:10px;padding:1px 5px;border-radius:4px;font-weight:700;flex-shrink:0;}
.fs-tag-open{background:#dcfce7;color:#166534;}
.fs-tag-fn{background:#dbeafe;color:#1d4ed8;}
.fs-tag-val{background:#f3e8ff;color:#7e22ce;}
.fs-tag-du{background:#fef9c3;color:#854d0e;}
.fs-tag-rec{background:#e0f2fe;color:#0369a1;}
.fs-tag-type{background:#ffe4e6;color:#be123c;}
.fs-tag-member{background:#ede9fe;color:#7c3aed;}
.fs-pre{margin:0;background:var(--bg,#fff);padding:14px 16px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre;}
.fs-kw{color:#7c3aed;font-weight:600;}
.fs-str{color:#0a6640;}
.fs-comment{color:#6e7781;font-style:italic;}
.fs-tk-type{color:#0369a1;font-weight:600;}
.fs-attr{color:#b45309;font-weight:600;}
.fs-num{color:#b45309;}
`;

// ── Pure parsing (DOM-free, exported for tests) ──────────────────────────────

// Strip (* nested *) block comments and // line comments (string-aware), preserving line count.
function stripComments(text) {
  const s = String(text || '');
  let out = '', depth = 0, i = 0;
  while (i < s.length) {
    if (s[i] === '(' && s[i + 1] === '*') { depth++; i += 2; out += '  '; continue; }
    if (depth > 0 && s[i] === '*' && s[i + 1] === ')') { depth--; i += 2; out += '  '; continue; }
    if (depth > 0) { out += s[i] === '\n' ? '\n' : ' '; i++; continue; }
    out += s[i]; i++;
  }
  return out.split('\n').map(stripLineComment).join('\n');
}
function stripLineComment(line) {
  let inStr = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inStr = !inStr;
    else if (!inStr && c === '/' && line[i + 1] === '/') return line.slice(0, i);
  }
  return line;
}

const indentOf = (l) => (l.match(/^\s*/)[0] || '').length;

// Index of the top-level `=` that ends a binding signature (skips <=, >=, <>, :=, ==).
function findBindingEq(s) {
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth = Math.max(0, depth - 1);
    else if (depth === 0 && c === '=') {
      if ('<>:!='.includes(s[i - 1]) || s[i + 1] === '=') continue;
      return i;
    }
  }
  return -1;
}

// Split a post-name signature into params section and (annotated) return type at the top-level `:`.
function splitParamsReturn(post) {
  let depth = 0;
  for (let i = 0; i < post.length; i++) {
    const c = post[i];
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth = Math.max(0, depth - 1);
    else if (depth === 0 && c === ':') return { paramsPart: post.slice(0, i), returns: post.slice(i + 1).trim() };
  }
  return { paramsPart: post, returns: '' };
}

// Space-separated param atoms (paren-aware); each `(name: Type)` / `name` / `(a, b)` tuple.
function parseParams(s) {
  const atoms = [];
  let depth = 0, buf = '';
  for (const c of s) {
    if (c === '(' || c === '[' || c === '{') { depth++; buf += c; }
    else if (c === ')' || c === ']' || c === '}') { depth--; buf += c; }
    else if (c === ' ' && depth === 0) { if (buf.trim()) atoms.push(buf.trim()); buf = ''; }
    else buf += c;
  }
  if (buf.trim()) atoms.push(buf.trim());
  return atoms.map((a) => {
    let t = a;
    if (t.startsWith('(') && t.endsWith(')')) t = t.slice(1, -1).trim();
    const ci = t.indexOf(':');
    if (ci >= 0 && !t.slice(0, ci).includes(',')) return { name: t.slice(0, ci).trim(), type: t.slice(ci + 1).trim() };
    return { name: t, type: '' };
  }).filter((p) => p.name && p.name !== '()');
}

// Parse one `type ... ` block (block = the type line plus its more-indented body lines).
function parseTypeBlock(block) {
  const nameM = block.match(/^\s*type\s+(?:\[<[^\]]*>\]\s*)?(?:'\w+\s+)?(?:private\s+|internal\s+|public\s+)?([A-Za-z_]\w*)/);
  if (!nameM) return null;
  const name = nameM[1];
  const eqIdx = block.indexOf('=');
  const beforeEq = eqIdx >= 0 ? block.slice(0, eqIdx) : block;
  const body = eqIdx >= 0 ? block.slice(eqIdx + 1) : '';
  const hasParenCtor = new RegExp('\\b' + name + '\\s*<?[^=]*?\\(').test(beforeEq.slice(beforeEq.indexOf(name)));

  if (/\{/.test(body)) {
    let content = body.slice(body.indexOf('{') + 1);
    const close = content.indexOf('}');
    if (close >= 0) content = content.slice(0, close);
    const fields = [];
    const fre = /(?:mutable\s+)?([A-Za-z_]\w*)\s*:\s*([^;\n}]+)/g;
    let fm;
    while ((fm = fre.exec(content)) !== null) fields.push({ name: fm[1], type: fm[2].trim().replace(/\s+/g, ' ') });
    return { kind: 'record', name, fields };
  }
  if (/\|/.test(body)) {
    const cases = [];
    for (const part of body.split('|').map((s) => s.trim()).filter(Boolean)) {
      const cm = part.match(/^([A-Za-z_]\w*)\s*(?:of\s+([\s\S]+))?/);
      if (cm) cases.push({ name: cm[1], of: cm[2] ? cm[2].trim().replace(/\s+/g, ' ') : '' });
    }
    return { kind: 'union', name, cases };
  }
  if (/\bmember\b/.test(block) || /\binherit\b/.test(block) || /\binterface\b/.test(block) || hasParenCtor) {
    return { kind: 'class', name };
  }
  const alias = body.trim().replace(/\s+/g, ' ');
  return { kind: 'abbrev', name, alias };
}

// Parse F# source into structured facts.
export function analyzeFSharp(text) {
  const src = stripComments(text);
  const lines = src.split('\n');

  let moduleName = null, isNamespace = false;
  const modM = src.match(/^\s*(module|namespace)\s+(?:rec\s+)?([\w.]+)/m);
  if (modM) { moduleName = modM[2]; isNamespace = modM[1] === 'namespace'; }

  const opens = [];
  const openRe = /^\s*open\s+([\w.]+)/gm;
  let m;
  while ((m = openRe.exec(src)) !== null) if (!opens.includes(m[1])) opens.push(m[1]);

  const unions = [], records = [], types = [];
  const functions = [], values = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const ind = indentOf(line);

    // Type definitions (collect block: type line + more-indented body lines).
    if (/^\s*type\s+/.test(line) && ind === 0) {
      const block = [line];
      let j = i + 1;
      while (j < lines.length) {
        if (lines[j].trim() === '') { block.push(lines[j]); j++; continue; }
        if (indentOf(lines[j]) > ind) { block.push(lines[j]); j++; } else break;
      }
      const parsed = parseTypeBlock(block.join('\n'));
      if (parsed) {
        if (parsed.kind === 'record') records.push(parsed);
        else if (parsed.kind === 'union') unions.push(parsed);
        else types.push(parsed);
      }
      continue;
    }

    // Top-level let bindings (functions + values); signature may span continuation lines.
    if (/^let\b/.test(line) && ind === 0) {
      let acc = line, j = i + 1;
      while (findBindingEq(acc) === -1 && j < lines.length) {
        if (lines[j].trim() === '') { j++; continue; }
        if (indentOf(lines[j]) > 0) { acc += ' ' + lines[j].trim(); j++; } else break;
      }
      const eq = findBindingEq(acc);
      const head = eq >= 0 ? acc.slice(0, eq) : acc;
      const nm = head.match(/^let\s+(?:rec\s+)?(?:inline\s+)?(?:mutable\s+)?(?:private\s+|internal\s+|public\s+)?([A-Za-z_]\w*)/);
      if (nm) {
        const post = head.slice(head.indexOf(nm[1]) + nm[1].length);
        const { paramsPart, returns } = splitParamsReturn(post);
        const params = parseParams(paramsPart);
        if (params.length) functions.push({ name: nm[1], params, returns });
        else values.push({ name: nm[1], type: returns });
      }
      continue;
    }
  }

  const members = [];
  const memberRe = /^\s*(?:static\s+)?(?:member|abstract|override)\s+(?:\w+\.)?([A-Za-z_]\w*)/gm;
  while ((m = memberRe.exec(src)) !== null) if (!members.includes(m[1])) members.push(m[1]);

  const attrCount = (src.match(/\[</g) || []).length;
  const asyncCount = (src.match(/\basync\s*\{/g) || []).length;
  const taskCount = (src.match(/\btask\s*\{/g) || []).length;

  return {
    module: moduleName, isNamespace, opens,
    functions, values, unions, records, types, members,
    attrCount, asyncCount, taskCount,
  };
}

// ── Source highlighting ──────────────────────────────────────────────────────

const FS_KEYWORDS = new Set([
  'let', 'rec', 'in', 'fun', 'match', 'with', 'type', 'of', 'module', 'open',
  'if', 'then', 'else', 'begin', 'end', 'exception', 'try', 'raise', 'member',
  'interface', 'abstract', 'override', 'inherit', 'when', 'as', 'for', 'while',
  'do', 'yield', 'async', 'return', 'and', 'mutable', 'struct', 'new', 'null',
  'namespace', 'val', 'inline', 'static', 'private', 'public', 'internal', 'class',
]);

function highlightFsLine(line) {
  const slashIdx = line.indexOf('//');
  let code = line, commentSuffix = '';
  if (slashIdx !== -1) {
    const before = line.slice(0, slashIdx);
    if ((before.match(/"/g) || []).length % 2 === 0) {
      code = line.slice(0, slashIdx);
      commentSuffix = '<span class="fs-comment">' + esc(line.slice(slashIdx)) + '</span>';
    }
  }
  let e = esc(code);
  e = e.replace(/(&quot;[^&]*&quot;)/g, '<span class="fs-str">$1</span>');
  e = e.replace(/(\[&lt;[^&]*&gt;\])/g, '<span class="fs-attr">$1</span>');
  e = e.replace(/\b(\d+(?:\.\d+)?(?:[mMLuUy])?)\b/g, '<span class="fs-num">$1</span>');
  e = e.replace(/\b([A-Z][a-zA-Z0-9_']*)/g, '<span class="fs-tk-type">$1</span>');
  e = e.replace(new RegExp(`\\b(${[...FS_KEYWORDS].join('|')})\\b`, 'g'), '<span class="fs-kw">$1</span>');
  return e + commentSuffix;
}
const highlightFSharp = (text) => String(text || '').split(/\r?\n/).map(highlightFsLine).join('\n');

// ── DOM rendering ────────────────────────────────────────────────────────────

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'fs-section';
  const hd = document.createElement('div');
  hd.className = 'fs-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}
function makeList(sec) { const ul = document.createElement('ul'); ul.className = 'fs-list'; sec.appendChild(ul); return ul; }
function row(ul, html) { const li = document.createElement('li'); li.innerHTML = html; ul.appendChild(li); }
const tag = (cls, t) => `<span class="fs-tag ${cls}">${esc(t)}</span>`;

function paramsHtml(params) {
  return params.map((p) => {
    const ty = p.type ? `: <span class="fs-type">${esc(p.type)}</span>` : '';
    return `(<span class="fs-params">${esc(p.name)}</span>${ty})`;
  }).join(' ');
}

export async function render(intake) {
  const text = intake.text || '';
  const filename = (intake.name || intake.filename || '').toLowerCase();
  const ext = filename.endsWith('.fsi') ? '.fsi' : filename.endsWith('.fsx') ? '.fsx' : '.fs';
  const info = analyzeFSharp(text);

  const host = document.createElement('div');
  host.className = 'fs-doc';
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'fs-title';
  const kindLabel = ext === '.fsi' ? 'Signature (.fsi)' : ext === '.fsx' ? 'Script (.fsx)' : 'Source (.fs)';
  let titleHtml = '<span class="fs-badge">F#</span>';
  titleHtml += `<span class="fs-kind-badge">${esc(kindLabel)}</span>`;
  if (info.module) titleHtml += ` <span class="fs-mod">${esc((info.isNamespace ? 'namespace ' : 'module ') + info.module)}</span>`;
  title.innerHTML = titleHtml;
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'fs-sub';
  const typeCount = info.unions.length + info.records.length + info.types.length;
  sub.textContent = [
    info.opens.length && `${info.opens.length} open${info.opens.length !== 1 ? 's' : ''}`,
    typeCount && `${typeCount} type${typeCount !== 1 ? 's' : ''}`,
    info.functions.length && `${info.functions.length} function${info.functions.length !== 1 ? 's' : ''}`,
    info.values.length && `${info.values.length} value${info.values.length !== 1 ? 's' : ''}`,
    (info.asyncCount + info.taskCount) && `${info.asyncCount + info.taskCount} async/task`,
  ].filter(Boolean).join(' · ') || 'No declarations found';
  host.appendChild(sub);

  const cards = document.createElement('div');
  cards.className = 'fs-cards';
  for (const { value, label } of [
    { value: info.opens.length, label: 'Opens' },
    { value: info.unions.length, label: 'Unions' },
    { value: info.records.length, label: 'Records' },
    { value: info.functions.length, label: 'Functions' },
    { value: info.values.length, label: 'Values' },
    { value: info.members.length, label: 'Members' },
  ]) {
    const card = document.createElement('div');
    card.className = 'fs-card';
    const s = document.createElement('strong'); s.textContent = value;
    const sp = document.createElement('span'); sp.textContent = label;
    card.appendChild(s); card.appendChild(sp); cards.appendChild(card);
  }
  host.appendChild(cards);

  if (info.opens.length) {
    const ul = makeList(makeSection(host, `Opens (${info.opens.length})`));
    for (const o of info.opens) row(ul, `${tag('fs-tag-open', 'open')} ${esc(o)}`);
  }
  if (info.records.length) {
    const ul = makeList(makeSection(host, `Records (${info.records.length})`));
    for (const r of info.records) {
      const fields = r.fields.map((f) => `${esc(f.name)}: <span class="fs-type">${esc(f.type)}</span>`).join('; ');
      row(ul, `${tag('fs-tag-rec', 'record')} <span class="fs-name">${esc(r.name)}</span> { ${fields} }`);
    }
  }
  if (info.unions.length) {
    const ul = makeList(makeSection(host, `Discriminated Unions (${info.unions.length})`));
    for (const u of info.unions) {
      const cases = u.cases.map((c) => c.of
        ? `${esc(c.name)} <span class="fs-of">of ${esc(c.of)}</span>`
        : esc(c.name)).join(' | ');
      row(ul, `${tag('fs-tag-du', 'union')} <span class="fs-name">${esc(u.name)}</span> = ${cases}`);
    }
  }
  if (info.types.length) {
    const ul = makeList(makeSection(host, `Types (${info.types.length})`));
    for (const t of info.types) {
      const extra = t.kind === 'abbrev' && t.alias ? ` = <span class="fs-type">${esc(t.alias)}</span>` : '';
      row(ul, `${tag('fs-tag-type', t.kind)} <span class="fs-name">${esc(t.name)}</span>${extra}`);
    }
  }
  if (info.functions.length) {
    const ul = makeList(makeSection(host, `Functions (${info.functions.length})`));
    for (const f of info.functions) {
      const ret = f.returns ? ` : <span class="fs-ret">${esc(f.returns)}</span>` : '';
      row(ul, `${tag('fs-tag-fn', 'let')} <span class="fs-name">${esc(f.name)}</span> ${paramsHtml(f.params)}${ret}`);
    }
  }
  if (info.values.length) {
    const ul = makeList(makeSection(host, `Values (${info.values.length})`));
    for (const v of info.values) {
      const ty = v.type ? ` : <span class="fs-type">${esc(v.type)}</span>` : '';
      row(ul, `${tag('fs-tag-val', 'let')} <span class="fs-name">${esc(v.name)}</span>${ty}`);
    }
  }
  if (info.members.length) {
    const ul = makeList(makeSection(host, `Members (${info.members.length})`));
    for (const mb of info.members) row(ul, `${tag('fs-tag-member', 'member')} <span class="fs-name">${esc(mb)}</span>`);
  }

  const srcSec = makeSection(host, 'Source');
  const pre = document.createElement('pre');
  pre.className = 'fs-pre';
  pre.innerHTML = highlightFSharp(text);
  srcSec.appendChild(pre);

  return { parentNode: host };
}
