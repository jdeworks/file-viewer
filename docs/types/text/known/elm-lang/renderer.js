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
.elm-pre{margin:0;background:var(--bg,#fff);padding:14px 16px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre;}
.elm-kw{color:#7c3aed;font-weight:600;}
.elm-str{color:#0a6640;}
.elm-comment{color:#6e7781;font-style:italic;}
.elm-type{color:#0369a1;font-weight:600;}
.elm-num{color:#b45309;}
`;

const ELM_KEYWORDS = new Set([
  'module', 'exposing', 'import', 'as', 'type', 'alias', 'let', 'in',
  'if', 'then', 'else', 'case', 'of', 'port', 'where', 'True', 'False',
]);

function analyzeElm(text) {
  const lines = text.split(/\r?\n/);

  // Module name and exposing
  let moduleName = null;
  let exposing = [];
  const modM = text.match(/^module\s+([\w.]+)\s+exposing\s+\(([^)]+)\)/m);
  if (modM) {
    moduleName = modM[1];
    exposing = modM[2].split(',').map((s) => s.trim()).filter(Boolean);
  } else {
    const modM2 = text.match(/^module\s+([\w.]+)/m);
    if (modM2) moduleName = modM2[1];
  }

  // Imports
  const imports = [];
  const importRe = /^import\s+([\w.]+)(?:\s+as\s+(\w+))?(?:\s+exposing\s+\(([^)]+)\))?/gm;
  let m;
  while ((m = importRe.exec(text)) !== null) {
    imports.push({
      name: m[1],
      alias: m[2] || null,
      exposing: m[3] ? m[3].split(',').map((s) => s.trim()).filter(Boolean) : [],
    });
  }

  // Type aliases
  const typeAliases = [];
  const aliasRe = /^type\s+alias\s+(\w+)/gm;
  while ((m = aliasRe.exec(text)) !== null) {
    if (!typeAliases.includes(m[1])) typeAliases.push(m[1]);
  }

  // Union types (type without alias)
  const unionTypes = [];
  const unionRe = /^type\s+(?!alias)(\w+)/gm;
  while ((m = unionRe.exec(text)) !== null) {
    const name = m[1];
    // Count variants: lines starting with | after the type declaration
    const afterIdx = m.index + m[0].length;
    const block = text.slice(afterIdx, afterIdx + 400);
    const variantCount = (block.match(/^\s+\|/gm) || []).length;
    if (!unionTypes.find((t) => t.name === name)) {
      unionTypes.push({ name, variantCount });
    }
  }

  // Function signatures: lines matching "name : Type"
  const funcSigs = [];
  const sigRe = /^([a-z_][a-zA-Z0-9_]*)\s*:/gm;
  while ((m = sigRe.exec(text)) !== null) {
    const name = m[1];
    if (name !== 'port' && !funcSigs.find((f) => f.name === name)) {
      // Grab type annotation (rest of line)
      const lineEnd = text.indexOf('\n', m.index);
      const sig = text.slice(m.index + name.length + 1, lineEnd > -1 ? lineEnd : undefined).trim();
      funcSigs.push({ name, sig });
    }
    if (funcSigs.length >= 10) break;
  }

  // TEA architecture type
  let teaType = null;
  if (/Browser\.application\b/.test(text)) teaType = 'Browser.application';
  else if (/Browser\.document\b/.test(text)) teaType = 'Browser.document';
  else if (/Browser\.element\b/.test(text)) teaType = 'Browser.element';
  else if (/Browser\.sandbox\b/.test(text)) teaType = 'Browser.sandbox';

  // Port usage
  const portCount = (text.match(/^port\s+/gm) || []).length;

  return { moduleName, exposing, imports, typeAliases, unionTypes, funcSigs, teaType, portCount };
}

function highlightElm(text) {
  return text.split(/\r?\n/).map((line) => highlightElmLine(line)).join('\n');
}

function highlightElmLine(line) {
  // -- line comments
  const dashIdx = line.indexOf('--');
  let code = line;
  let commentSuffix = '';
  if (dashIdx !== -1) {
    const before = line.slice(0, dashIdx);
    const quoteCount = (before.match(/"/g) || []).length;
    if (quoteCount % 2 === 0) {
      code = line.slice(0, dashIdx);
      commentSuffix = '<span class="elm-comment">' + esc(line.slice(dashIdx)) + '</span>';
    }
  }

  let escaped = esc(code);
  // String literals
  escaped = escaped.replace(/(&quot;[^&]*&quot;)/g, '<span class="elm-str">$1</span>');
  // Numbers
  escaped = escaped.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="elm-num">$1</span>');
  // Type names (uppercase)
  escaped = escaped.replace(/\b([A-Z][a-zA-Z0-9_]*)/g, '<span class="elm-type">$1</span>');
  // Keywords
  escaped = escaped.replace(
    new RegExp(`\\b(${[...ELM_KEYWORDS].join('|')})\\b`, 'g'),
    '<span class="elm-kw">$1</span>',
  );
  return escaped + commentSuffix;
}

function makeSection(title, items, tagFn, subFn) {
  if (!items || items.length === 0) return null;
  const sec = document.createElement('div');
  sec.className = 'elm-section';
  const hd = document.createElement('div');
  hd.className = 'elm-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  const ul = document.createElement('ul');
  ul.className = 'elm-list';
  for (const item of items) {
    const li = document.createElement('li');
    if (tagFn) {
      const tag = document.createElement('span');
      tag.className = 'elm-tag';
      tag.textContent = tagFn(item);
      li.appendChild(tag);
    }
    const nameSpan = document.createElement('span');
    nameSpan.textContent = typeof item === 'string' ? item : (item.name || String(item));
    li.appendChild(nameSpan);
    if (subFn) {
      const sub = subFn(item);
      if (sub) {
        const subSpan = document.createElement('span');
        subSpan.style.cssText = 'color:var(--fg-2,#888);font-size:11px;';
        subSpan.textContent = sub;
        li.appendChild(subSpan);
      }
    }
    ul.appendChild(li);
  }
  sec.appendChild(ul);
  return sec;
}

export function render(intake) {
  const text = intake.text || '';
  const info = analyzeElm(text);

  const host = document.createElement('div');
  host.className = 'elm-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'elm-title';
  let titleHtml = '<span class="elm-badge">Elm</span>';
  if (info.teaType) titleHtml += `<span class="elm-tea-badge">${esc(info.teaType)}</span>`;
  if (info.moduleName) titleHtml += ` <span style="font-size:13px;font-weight:400;">${esc(info.moduleName)}</span>`;
  title.innerHTML = titleHtml;
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'elm-sub';
  const parts = [];
  if (info.imports.length) parts.push(`${info.imports.length} import${info.imports.length !== 1 ? 's' : ''}`);
  if (info.typeAliases.length) parts.push(`${info.typeAliases.length} type alias${info.typeAliases.length !== 1 ? 'es' : ''}`);
  if (info.unionTypes.length) parts.push(`${info.unionTypes.length} union type${info.unionTypes.length !== 1 ? 's' : ''}`);
  if (info.funcSigs.length) parts.push(`${info.funcSigs.length} function${info.funcSigs.length !== 1 ? 's' : ''}`);
  if (info.portCount) parts.push(`${info.portCount} port${info.portCount !== 1 ? 's' : ''}`);
  sub.textContent = parts.join(' · ') || 'No declarations found';
  host.appendChild(sub);

  const cards = document.createElement('div');
  cards.className = 'elm-cards';
  for (const { value, label } of [
    { value: info.imports.length, label: 'Imports' },
    { value: info.typeAliases.length, label: 'Type aliases' },
    { value: info.unionTypes.length, label: 'Union types' },
    { value: info.funcSigs.length, label: 'Functions' },
    { value: info.portCount, label: 'Ports' },
  ]) {
    const card = document.createElement('div');
    card.className = 'elm-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  // Module exposing
  if (info.moduleName) {
    const modSec = document.createElement('div');
    modSec.className = 'elm-section';
    const modHd = document.createElement('div');
    modHd.className = 'elm-section-hd';
    modHd.textContent = 'Module';
    modSec.appendChild(modHd);
    const modBody = document.createElement('div');
    modBody.style.cssText = 'padding:8px 14px;font-family:ui-monospace,monospace;font-size:13px;';
    let modText = info.moduleName;
    if (info.exposing.length) modText += ` exposing (${info.exposing.join(', ')})`;
    modBody.textContent = modText;
    modSec.appendChild(modBody);
    host.appendChild(modSec);
  }

  const importsEl = makeSection(
    'Imports',
    info.imports,
    null,
    (i) => {
      const parts = [];
      if (i.alias) parts.push(`as ${i.alias}`);
      if (i.exposing.length) parts.push(`exposing (${i.exposing.join(', ')})`);
      return parts.join(' ') || null;
    },
  );
  if (importsEl) host.appendChild(importsEl);

  const aliasesEl = makeSection('Type Aliases', info.typeAliases);
  if (aliasesEl) host.appendChild(aliasesEl);

  const unionsEl = makeSection(
    'Union Types',
    info.unionTypes,
    null,
    (t) => t.variantCount > 0 ? `${t.variantCount} variant${t.variantCount !== 1 ? 's' : ''}` : null,
  );
  if (unionsEl) host.appendChild(unionsEl);

  const funcsEl = makeSection(
    'Functions',
    info.funcSigs,
    null,
    (f) => f.sig ? `: ${f.sig}` : null,
  );
  if (funcsEl) host.appendChild(funcsEl);

  // Source
  const srcSec = document.createElement('div');
  srcSec.className = 'elm-section';
  const srcHd = document.createElement('div');
  srcHd.className = 'elm-section-hd';
  srcHd.textContent = 'Source';
  srcSec.appendChild(srcHd);
  const pre = document.createElement('pre');
  pre.className = 'elm-pre';
  pre.innerHTML = highlightElm(text);
  srcSec.appendChild(pre);
  host.appendChild(srcSec);

  return { parentNode: host };
}
