const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.ocaml-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.ocaml-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#e07c16;color:#fff;vertical-align:middle;margin-right:8px;}
.ocaml-iface-badge{display:inline-block;padding:2px 7px;border-radius:8px;font-size:10px;font-weight:700;background:#fff3e0;color:#e07c16;border:1px solid #e07c16;vertical-align:middle;margin-left:6px;}
.ocaml-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.ocaml-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.ocaml-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.ocaml-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.ocaml-card strong{display:block;font-size:1.2rem;font-weight:700;}
.ocaml-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.ocaml-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.ocaml-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.ocaml-list{margin:0;padding:0;list-style:none;}
.ocaml-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.ocaml-list li:last-child{border-bottom:none;}
.ocaml-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#fff3e0;color:#e07c16;font-weight:700;flex-shrink:0;}
.ocaml-pre{margin:0;background:var(--bg,#fff);padding:14px 16px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre;}
.ocaml-kw{color:#7c3aed;font-weight:600;}
.ocaml-str{color:#0a6640;}
.ocaml-comment{color:#6e7781;font-style:italic;}
.ocaml-type{color:#0369a1;font-weight:600;}
.ocaml-num{color:#b45309;}
`;

const OCAML_KEYWORDS = new Set([
  'let', 'rec', 'in', 'fun', 'function', 'match', 'with', 'type', 'of',
  'module', 'struct', 'sig', 'end', 'open', 'include', 'if', 'then', 'else',
  'begin', 'exception', 'try', 'raise', 'val', 'external', 'and', 'or', 'not',
  'true', 'false', 'mutable', 'virtual', 'class', 'object', 'method', 'inherit',
  'when', 'as', 'for', 'while', 'do', 'done', 'to', 'downto', 'new', 'lazy',
  'assert', 'constraint', 'functor',
]);

function analyzeOcaml(text, isInterface) {
  const lines = text.split(/\r?\n/);

  // Module name from file or first `module M = struct`
  let moduleName = null;
  const moduleM = text.match(/^module\s+([A-Z]\w*)/m);
  if (moduleM) moduleName = moduleM[1];

  // Opens
  const opens = [];
  const openRe = /^open\s+([A-Z][\w.]*)/gm;
  let m;
  while ((m = openRe.exec(text)) !== null) {
    if (!opens.includes(m[1])) opens.push(m[1]);
  }

  // Includes
  const includes = [];
  const includeRe = /^include\s+([A-Z][\w.]*)/gm;
  while ((m = includeRe.exec(text)) !== null) {
    if (!includes.includes(m[1])) includes.push(m[1]);
  }

  // Type definitions
  const types = [];
  const typeRe = /^type\s+(?:'[a-z]\s+)*(\w+)/gm;
  while ((m = typeRe.exec(text)) !== null) {
    if (!types.find((t) => t === m[1])) types.push(m[1]);
  }

  // Exceptions
  const exceptions = [];
  const excRe = /^exception\s+([A-Z]\w*)/gm;
  while ((m = excRe.exec(text)) !== null) {
    if (!exceptions.includes(m[1])) exceptions.push(m[1]);
  }

  // External C bindings
  const externals = [];
  const extRe = /^external\s+(\w+)\s*:/gm;
  while ((m = extRe.exec(text)) !== null) {
    if (!externals.includes(m[1])) externals.push(m[1]);
  }

  // Top-level let bindings or val declarations
  const bindings = [];
  const bindingRe = isInterface
    ? /^val\s+(\w+)\s*:/gm
    : /^let\s+(?:rec\s+)?(\w+)(?:\s+[^=]*)?(?:\s*:\s*([^=]+?))?\s*=/gm;
  while ((m = bindingRe.exec(text)) !== null) {
    const name = m[1];
    // Skip anonymous entry points tracked separately
    const typeSig = m[2] ? m[2].trim() : null;
    if (!bindings.find((b) => b.name === name)) {
      bindings.push({ name, typeSig });
    }
    if (bindings.length >= 12) break;
  }

  // Entry point
  const hasEntryPoint = /^let\s*\(\)\s*=/m.test(text);

  return { moduleName, opens, includes, types, exceptions, externals, bindings, hasEntryPoint };
}

function highlightOcaml(text) {
  // Multi-line (* ... *) comment pass — simplistic single-pass approach
  const lines = text.split(/\r?\n/);
  let inComment = 0;
  const result = [];
  for (const line of lines) {
    result.push(highlightOcamlLine(line));
  }
  return result.join('\n');
}

function highlightOcamlLine(line) {
  // Detect (* comment *) — simplistic: mark entire line if starts with (*
  const commentStart = line.indexOf('(*');
  const commentEnd = line.indexOf('*)');
  if (commentStart !== -1 && commentStart < (commentEnd === -1 ? Infinity : commentEnd)) {
    const before = esc(line.slice(0, commentStart));
    const comment = esc(line.slice(commentStart));
    return before + '<span class="ocaml-comment">' + comment + '</span>';
  }

  let escaped = esc(line);
  // String literals
  escaped = escaped.replace(/(&quot;[^&]*&quot;)/g, '<span class="ocaml-str">$1</span>');
  // Char literals
  escaped = escaped.replace(/('(?:[^\\']|\\.)')/g, '<span class="ocaml-str">$1</span>');
  // Numbers
  escaped = escaped.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="ocaml-num">$1</span>');
  // Type names (uppercase identifiers)
  escaped = escaped.replace(/\b([A-Z][a-zA-Z0-9_']*)/g, '<span class="ocaml-type">$1</span>');
  // Keywords
  escaped = escaped.replace(
    new RegExp(`\\b(${[...OCAML_KEYWORDS].join('|')})\\b`, 'g'),
    '<span class="ocaml-kw">$1</span>',
  );
  return escaped;
}

function makeSection(title, items, tagFn) {
  if (!items || items.length === 0) return null;
  const sec = document.createElement('div');
  sec.className = 'ocaml-section';
  const hd = document.createElement('div');
  hd.className = 'ocaml-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  const ul = document.createElement('ul');
  ul.className = 'ocaml-list';
  for (const item of items) {
    const li = document.createElement('li');
    if (tagFn) {
      const tag = document.createElement('span');
      tag.className = 'ocaml-tag';
      tag.textContent = tagFn(item);
      li.appendChild(tag);
    }
    const nameSpan = document.createElement('span');
    nameSpan.textContent = typeof item === 'string' ? item : (item.name || String(item));
    li.appendChild(nameSpan);
    if (item && item.typeSig) {
      const typSpan = document.createElement('span');
      typSpan.style.cssText = 'color:var(--fg-2,#888);font-size:11px;';
      typSpan.textContent = ': ' + item.typeSig;
      li.appendChild(typSpan);
    }
    ul.appendChild(li);
  }
  sec.appendChild(ul);
  return sec;
}

export function render(intake) {
  const text = intake.text || '';
  const name = (intake.name || intake.filename || '').toLowerCase();
  const isInterface = name.endsWith('.mli');
  const info = analyzeOcaml(text, isInterface);

  // Try to infer module name from filename if not found in code
  let displayModule = info.moduleName;
  if (!displayModule) {
    const base = name.split('/').pop().replace(/\.(ml|mli)$/, '');
    if (base) displayModule = base.charAt(0).toUpperCase() + base.slice(1);
  }

  const host = document.createElement('div');
  host.className = 'ocaml-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'ocaml-title';
  let titleHtml = '<span class="ocaml-badge">OCaml</span>';
  if (isInterface) titleHtml += '<span class="ocaml-iface-badge">Interface (.mli)</span>';
  else titleHtml += '<span class="ocaml-iface-badge">Implementation (.ml)</span>';
  if (displayModule) titleHtml += ` <span style="font-size:13px;font-weight:400;">${esc(displayModule)}</span>`;
  title.innerHTML = titleHtml;
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'ocaml-sub';
  const parts = [];
  if (info.opens.length) parts.push(`${info.opens.length} open${info.opens.length !== 1 ? 's' : ''}`);
  if (info.types.length) parts.push(`${info.types.length} type${info.types.length !== 1 ? 's' : ''}`);
  if (info.exceptions.length) parts.push(`${info.exceptions.length} exception${info.exceptions.length !== 1 ? 's' : ''}`);
  if (info.bindings.length) parts.push(`${info.bindings.length} binding${info.bindings.length !== 1 ? 's' : ''}`);
  if (info.externals.length) parts.push(`${info.externals.length} external${info.externals.length !== 1 ? 's' : ''}`);
  sub.textContent = parts.join(' · ') || 'No declarations found';
  host.appendChild(sub);

  // Summary cards
  const cards = document.createElement('div');
  cards.className = 'ocaml-cards';
  for (const { value, label } of [
    { value: info.opens.length, label: 'Opens' },
    { value: info.types.length, label: 'Types' },
    { value: info.exceptions.length, label: 'Exceptions' },
    { value: info.bindings.length, label: isInterface ? 'Val decls' : 'Let bindings' },
    { value: info.externals.length, label: 'Externals' },
  ]) {
    const card = document.createElement('div');
    card.className = 'ocaml-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  const opensEl = makeSection('Opens', info.opens);
  if (opensEl) host.appendChild(opensEl);

  const includesEl = makeSection('Includes', info.includes);
  if (includesEl) host.appendChild(includesEl);

  const typesEl = makeSection('Type Definitions', info.types);
  if (typesEl) host.appendChild(typesEl);

  const excEl = makeSection('Exceptions', info.exceptions);
  if (excEl) host.appendChild(excEl);

  const bindLabel = isInterface ? 'Val Declarations' : 'Let Bindings';
  const bindingsEl = makeSection(bindLabel, info.bindings);
  if (bindingsEl) host.appendChild(bindingsEl);

  const extEl = makeSection('External C Bindings', info.externals);
  if (extEl) host.appendChild(extEl);

  // Source
  const srcSec = document.createElement('div');
  srcSec.className = 'ocaml-section';
  const srcHd = document.createElement('div');
  srcHd.className = 'ocaml-section-hd';
  srcHd.textContent = 'Source';
  srcSec.appendChild(srcHd);
  const pre = document.createElement('pre');
  pre.className = 'ocaml-pre';
  pre.innerHTML = highlightOcaml(text);
  srcSec.appendChild(pre);
  host.appendChild(srcSec);

  return { parentNode: host };
}
