const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.elm-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.elm-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1293d8;color:#fff;vertical-align:middle;margin-right:8px;}
.elm-tea-badge{display:inline-block;padding:2px 7px;border-radius:8px;font-size:10px;font-weight:700;background:#e3f5ff;color:#1293d8;border:1px solid #1293d8;vertical-align:middle;margin-left:6px;}
.elm-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.elm-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.elm-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.elm-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.elm-card strong{display:block;font-size:1.2rem;font-weight:700;}
.elm-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.elm-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.elm-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.elm-list{margin:0;padding:0;list-style:none;}
.elm-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.elm-list li:last-child{border-bottom:none;}
.elm-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#e3f5ff;color:#1293d8;font-weight:700;flex-shrink:0;}
.elm-tag-alias{background:#fef9c3;color:#854d0e;}
.elm-tag-custom{background:#ede9fe;color:#7c3aed;}
.elm-tag-func{background:#dbeafe;color:#1d4ed8;}
.elm-tag-port{background:#ffe4e6;color:#9f1239;}
.elm-tag-import{background:#dcfce7;color:#166534;}
.elm-name{font-weight:600;}
.elm-type{color:#0369a1;}
.elm-arrow{color:#9f1239;}
.elm-ret{color:#1d4ed8;font-weight:600;}
.elm-field{color:#0e7490;}
.elm-variant{color:#7c3aed;font-weight:600;}
.elm-mod{font-family:ui-monospace,monospace;font-size:13px;color:#1293d8;font-weight:700;}
`;

const KEYWORDS = new Set([
  'module', 'exposing', 'import', 'as', 'type', 'alias', 'let', 'in',
  'if', 'then', 'else', 'case', 'of', 'port', 'where', 'effect',
]);

// Remove Elm comments: nested {- -} block comments and -- line comments (quote-aware).
function stripComments(text) {
  let out = '';
  const s = String(text || '');
  let i = 0, depth = 0, inStr = false;
  while (i < s.length) {
    const two = s.slice(i, i + 2);
    if (depth > 0) {
      if (two === '{-') { depth++; i += 2; continue; }
      if (two === '-}') { depth--; i += 2; continue; }
      if (s[i] === '\n') out += '\n';
      i++; continue;
    }
    if (!inStr && two === '{-') { depth++; i += 2; continue; }
    if (!inStr && two === '--') { while (i < s.length && s[i] !== '\n') i++; continue; }
    if (s[i] === '"' && s[i - 1] !== '\\') inStr = !inStr;
    out += s[i]; i++;
  }
  return out;
}

// Split a string on a separator string, respecting (), {}, [] nesting (separator ignored when nested).
function splitTopLevel(str, sep) {
  const out = [];
  let depth = 0, buf = '';
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (c === '(' || c === '{' || c === '[') depth++;
    else if (c === ')' || c === '}' || c === ']') depth = Math.max(0, depth - 1);
    if (depth === 0 && str.startsWith(sep, i)) { out.push(buf); buf = ''; i += sep.length - 1; continue; }
    buf += c;
  }
  out.push(buf);
  return out.map((s) => s.trim()).filter((s) => s.length);
}

// Group source into top-level blocks: a non-blank column-0 line starts a block; indented lines
// (continuations of records, signatures, variant lists) attach to it. Returns flattened strings.
function topLevelBlocks(text) {
  const blocks = [];
  let cur = null;
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim()) continue;
    if (/^\s/.test(raw)) { if (cur !== null) cur += ' ' + raw.trim(); continue; }
    if (cur !== null) blocks.push(cur);
    cur = raw.trim();
  }
  if (cur !== null) blocks.push(cur);
  return blocks.map((b) => b.replace(/\s+/g, ' ').trim());
}

// Parse a record body "{ a : T, b : U }" into typed fields. Returns [] if not a record.
function recordFields(body) {
  const m = body.match(/\{([\s\S]*)\}/);
  if (!m) return [];
  return splitTopLevel(m[1], ',').map((f) => {
    const fm = f.match(/^([\w']+)\s*:\s*([\s\S]+)$/);
    return fm ? { name: fm[1], type: fm[2].trim() } : null;
  }).filter(Boolean);
}

// Parse a type signature "A -> B -> Ret" → { params:[A,B], returns:Ret }.
function parseSignature(sig) {
  const segs = splitTopLevel(sig, '->');
  if (segs.length === 0) return { params: [], returns: sig.trim() };
  return { params: segs.slice(0, -1), returns: segs[segs.length - 1] };
}

// Parse into structured facts. Exported (pure, no DOM) for unit testing.
export function analyzeElm(text) {
  const src = stripComments(text);
  const blocks = topLevelBlocks(src);

  let moduleName = null, exposing = [], portModule = false;
  const imports = [], functions = [], aliases = [], customTypes = [], ports = [];
  const fnNames = new Set();

  for (const block of blocks) {
    let m;

    // module / port module / effect module
    if ((m = block.match(/^(?:(port|effect)\s+)?module\s+([\w.]+)(?:\s+exposing\s+\(([\s\S]*?)\))?/))) {
      moduleName = m[2];
      if (m[1] === 'port') portModule = true;
      if (m[3] != null) exposing = m[3] === '..' ? ['..'] : splitTopLevel(m[3], ',');
      continue;
    }

    // import X[ as A][ exposing (...)]
    if ((m = block.match(/^import\s+([\w.]+)(?:\s+as\s+([\w.]+))?(?:\s+exposing\s+\(([\s\S]*?)\))?$/))) {
      imports.push({
        name: m[1],
        alias: m[2] || null,
        exposing: m[3] != null ? (m[3] === '..' ? ['..'] : splitTopLevel(m[3], ',')) : [],
      });
      continue;
    }

    // type alias Name [vars] = body
    if ((m = block.match(/^type\s+alias\s+([\w']+)([\w\s']*?)=\s*([\s\S]+)$/))) {
      const body = m[3].trim();
      const fields = recordFields(body);
      aliases.push({ name: m[1], fields, aliasType: fields.length ? null : body });
      continue;
    }

    // type Name [vars] = Variant [args] | Variant [args] | ...
    if ((m = block.match(/^type\s+([\w']+)([\w\s']*?)=\s*([\s\S]+)$/))) {
      const variants = splitTopLevel(m[3], '|').map((v) => {
        const parts = v.trim().split(/\s+/);
        return { name: parts[0], args: parts.slice(1).join(' ') };
      }).filter((v) => v.name);
      customTypes.push({ name: m[1], variants });
      continue;
    }

    // port name : Signature  (declared in a port module)
    if ((m = block.match(/^port\s+([a-z_][\w']*)\s*:\s*([\s\S]+)$/))) {
      const sig = m[2].trim();
      ports.push({ name: m[1], signature: sig, ...parseSignature(sig) });
      continue;
    }

    // top-level function type annotation: name : Type -> ... -> Ret
    if ((m = block.match(/^([a-z_][\w']*)\s*:\s*([\s\S]+)$/))) {
      const name = m[1];
      if (KEYWORDS.has(name) || fnNames.has(name)) continue;
      const sig = m[2].trim();
      fnNames.add(name);
      functions.push({ name, signature: sig, ...parseSignature(sig) });
    }
  }

  let teaType = null;
  if (/Browser\.application\b/.test(src)) teaType = 'Browser.application';
  else if (/Browser\.document\b/.test(src)) teaType = 'Browser.document';
  else if (/Browser\.element\b/.test(src)) teaType = 'Browser.element';
  else if (/Browser\.sandbox\b/.test(src)) teaType = 'Browser.sandbox';

  return { module: moduleName, exposing, portModule, imports, functions, aliases, customTypes, ports, teaType };
}

// --- DOM helpers ---
function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'elm-section';
  const hd = document.createElement('div');
  hd.className = 'elm-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}
function makeList(sec) { const ul = document.createElement('ul'); ul.className = 'elm-list'; sec.appendChild(ul); return ul; }
function row(ul, html) { const li = document.createElement('li'); li.innerHTML = html; ul.appendChild(li); }
function tag(cls, t) { return `<span class="elm-tag ${cls}">${esc(t)}</span>`; }

function signatureHtml(params, returns) {
  const ps = params.map((p) => `<span class="elm-type">${esc(p)}</span>`);
  const ret = `<span class="elm-ret">${esc(returns)}</span>`;
  return [...ps, ret].join(' <span class="elm-arrow">→</span> ');
}

export async function render(intake) {
  const text = intake.text || '';
  const info = analyzeElm(text);
  const { module: moduleName, exposing, imports, functions, aliases, customTypes, ports, teaType, portModule } = info;

  const host = document.createElement('div');
  host.className = 'elm-doc';
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'elm-title';
  let titleHtml = '<span class="elm-badge">Elm</span>';
  if (moduleName) titleHtml += `<span class="elm-mod">${esc(moduleName)}</span>`;
  if (portModule) titleHtml += '<span class="elm-tea-badge">port module</span>';
  if (teaType) titleHtml += `<span class="elm-tea-badge">${esc(teaType)}</span>`;
  title.innerHTML = titleHtml;
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'elm-sub';
  sub.textContent = [
    imports.length && `${imports.length} import${imports.length !== 1 ? 's' : ''}`,
    aliases.length && `${aliases.length} alias${aliases.length !== 1 ? 'es' : ''}`,
    customTypes.length && `${customTypes.length} custom type${customTypes.length !== 1 ? 's' : ''}`,
    functions.length && `${functions.length} function${functions.length !== 1 ? 's' : ''}`,
    ports.length && `${ports.length} port${ports.length !== 1 ? 's' : ''}`,
  ].filter(Boolean).join(' · ') || 'No declarations found';
  host.appendChild(sub);

  const cards = document.createElement('div');
  cards.className = 'elm-cards';
  for (const { value, label } of [
    { value: imports.length, label: 'Imports' },
    { value: aliases.length, label: 'Type aliases' },
    { value: customTypes.length, label: 'Custom types' },
    { value: functions.length, label: 'Functions' },
    { value: ports.length, label: 'Ports' },
  ]) {
    const card = document.createElement('div');
    card.className = 'elm-card';
    const s = document.createElement('strong'); s.textContent = value;
    const sp = document.createElement('span'); sp.textContent = label;
    card.appendChild(s); card.appendChild(sp); cards.appendChild(card);
  }
  host.appendChild(cards);

  if (moduleName && exposing.length) {
    const ul = makeList(makeSection(host, 'Module Exposes'));
    for (const e of exposing) row(ul, `<span class="elm-name">${esc(e)}</span>`);
  }

  if (imports.length) {
    const ul = makeList(makeSection(host, `Imports (${imports.length})`));
    for (const i of imports) {
      const bits = [tag('elm-tag-import', 'import'), `<span class="elm-name">${esc(i.name)}</span>`];
      if (i.alias) bits.push(`<span class="elm-arrow">as</span> <span class="elm-type">${esc(i.alias)}</span>`);
      if (i.exposing.length) bits.push(`<span style="color:var(--fg-2,#888);">exposing (${esc(i.exposing.join(', '))})</span>`);
      row(ul, bits.join(' '));
    }
  }

  if (aliases.length) {
    const ul = makeList(makeSection(host, `Type Aliases (${aliases.length})`));
    for (const a of aliases) {
      if (a.fields.length) {
        const fields = a.fields.map((f) => `<span class="elm-field">${esc(f.name)}</span> : <span class="elm-type">${esc(f.type)}</span>`).join(', ');
        row(ul, `${tag('elm-tag-alias', 'alias')} <span class="elm-name">${esc(a.name)}</span> = { ${fields} }`);
      } else {
        row(ul, `${tag('elm-tag-alias', 'alias')} <span class="elm-name">${esc(a.name)}</span> = <span class="elm-type">${esc(a.aliasType || '')}</span>`);
      }
    }
  }

  if (customTypes.length) {
    const ul = makeList(makeSection(host, `Custom Types (${customTypes.length})`));
    for (const t of customTypes) {
      const variants = t.variants.map((v) => {
        const args = v.args ? ` <span class="elm-type">${esc(v.args)}</span>` : '';
        return `<span class="elm-variant">${esc(v.name)}</span>${args}`;
      }).join(' <span class="elm-arrow">|</span> ');
      row(ul, `${tag('elm-tag-custom', 'type')} <span class="elm-name">${esc(t.name)}</span> = ${variants}`);
    }
  }

  if (functions.length) {
    const ul = makeList(makeSection(host, `Functions (${functions.length})`));
    for (const f of functions) {
      row(ul, `${tag('elm-tag-func', 'fn')} <span class="elm-name">${esc(f.name)}</span> : ${signatureHtml(f.params, f.returns)}`);
    }
  }

  if (ports.length) {
    const ul = makeList(makeSection(host, `Ports (${ports.length})`));
    for (const p of ports) {
      row(ul, `${tag('elm-tag-port', 'port')} <span class="elm-name">${esc(p.name)}</span> : ${signatureHtml(p.params, p.returns)}`);
    }
  }

  return { parentNode: host };
}
