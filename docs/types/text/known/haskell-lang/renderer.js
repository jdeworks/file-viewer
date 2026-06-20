const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.hs-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.hs-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#5c4a8a;color:#fff;vertical-align:middle;margin-right:8px;}
.hs-lhs-badge{display:inline-block;padding:2px 7px;border-radius:8px;font-size:10px;font-weight:700;background:#ede9fe;color:#5c4a8a;vertical-align:middle;margin-left:6px;}
.hs-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.hs-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.hs-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.hs-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.hs-card strong{display:block;font-size:1.2rem;font-weight:700;}
.hs-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.hs-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.hs-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.hs-list{margin:0;padding:0;list-style:none;}
.hs-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;}
.hs-list li:last-child{border-bottom:none;}
.hs-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#ede9fe;color:#5c4a8a;font-weight:700;}
.hs-pre{margin:0;background:var(--bg,#fff);padding:14px 16px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre;}
.hs-kw{color:#7c3aed;font-weight:600;}
.hs-str{color:#0a6640;}
.hs-comment{color:#6e7781;font-style:italic;}
.hs-type{color:#0369a1;font-weight:600;}
.hs-lhs-code{color:var(--fg,#24292f);}
.hs-lhs-prose{color:#6e7781;}
.hs-guard{color:#b45309;font-weight:600;}
`;

const HS_KEYWORDS = new Set(['module', 'where', 'import', 'qualified', 'as', 'hiding', 'data', 'type', 'newtype', 'class', 'instance', 'deriving', 'do', 'let', 'in', 'if', 'then', 'else', 'case', 'of', 'infixl', 'infixr', 'infix', 'forall', 'family']);

function analyzeHaskell(text, isLhs) {
  const lines = text.split(/\r?\n/);

  // For LHS, code lines are prefixed with '>'
  const codeLines = isLhs ? lines.filter((l) => l.startsWith('> ')).map((l) => l.slice(2)) : lines;
  const codeText = codeLines.join('\n');

  // Module name
  let moduleName = null;
  const moduleM = codeText.match(/^module\s+([\w.]+)/m);
  if (moduleM) moduleName = moduleM[1];

  // Imports: group qualified vs regular
  const imports = { qualified: [], regular: [] };
  const importRe = /^import\s+(qualified\s+)?([A-Z][\w.]*)/gm;
  let m;
  while ((m = importRe.exec(codeText)) !== null) {
    const isQualified = Boolean(m[1]);
    const modName = m[2];
    if (isQualified) {
      if (!imports.qualified.includes(modName)) imports.qualified.push(modName);
    } else {
      if (!imports.regular.includes(modName)) imports.regular.push(modName);
    }
  }

  // Data types (data, newtype, type)
  const dataTypes = [];
  const dataRe = /^(?:data|newtype|type)\s+([A-Z]\w*)/gm;
  while ((m = dataRe.exec(codeText)) !== null) {
    const entry = { name: m[1], kind: codeText.slice(m.index, m.index + 7).trim().split(' ')[0] };
    if (!dataTypes.find((d) => d.name === entry.name)) dataTypes.push(entry);
  }

  // Type classes
  const typeClasses = [];
  const classRe = /^class\s+(?:.*?)([A-Z]\w*(?:\s+\w+)*)\s+where/gm;
  while ((m = classRe.exec(codeText)) !== null) {
    // Extract just the class name (last uppercased word before 'where')
    const parts = m[1].trim().split(/\s+/);
    const name = parts[parts.length - 1];
    if (!typeClasses.includes(name)) typeClasses.push(name);
  }

  // Instances
  const instances = [];
  const instanceRe = /^instance\s+([\s\S]*?)\s+where/gm;
  while ((m = instanceRe.exec(codeText)) !== null) {
    const sig = m[1].trim().replace(/\s+/g, ' ');
    if (!instances.includes(sig)) instances.push(sig);
  }

  // Top-level function signatures: lines matching /^[a-z][a-zA-Z0-9_']* ::/
  const funcSigs = [];
  const sigRe = /^([a-z_][a-zA-Z0-9_']*)\s*::/gm;
  while ((m = sigRe.exec(codeText)) !== null) {
    if (!funcSigs.includes(m[1])) funcSigs.push(m[1]);
    if (funcSigs.length >= 10) break;
  }

  return { moduleName, imports, dataTypes, typeClasses, instances, funcSigs };
}

function highlightHaskell(text, isLhs) {
  if (isLhs) {
    // Literate Haskell: prose vs code lines
    return text.split(/\r?\n/).map((line) => {
      if (line.startsWith('> ')) {
        return '<span class="hs-lhs-code">&gt; ' + highlightHsLine(line.slice(2)) + '</span>';
      }
      return '<span class="hs-lhs-prose">' + esc(line) + '</span>';
    }).join('\n');
  }
  return text.split(/\r?\n/).map((line) => highlightHsLine(line)).join('\n');
}

function highlightHsLine(line) {
  // Single-line comments
  const commentIdx = line.indexOf('--');
  let code = line;
  let commentSuffix = '';
  if (commentIdx !== -1) {
    // Make sure it's not inside a string
    const before = line.slice(0, commentIdx);
    const quoteCount = (before.match(/"/g) || []).length;
    if (quoteCount % 2 === 0) {
      code = line.slice(0, commentIdx);
      commentSuffix = '<span class="hs-comment">' + esc(line.slice(commentIdx)) + '</span>';
    }
  }
  let result = esc(code)
    // String literals
    .replace(/(&quot;[^&]*&quot;)/g, '<span class="hs-str">$1</span>')
    // Type names (uppercase identifiers)
    .replace(/\b([A-Z][a-zA-Z0-9_']*)/g, '<span class="hs-type">$1</span>')
    // Keywords
    .replace(new RegExp(`\\b(${[...HS_KEYWORDS].join('|')})\\b`, 'g'), '<span class="hs-kw">$1</span>')
    // Guards
    .replace(/(\|(?!=))/g, '<span class="hs-guard">$1</span>');
  return result + commentSuffix;
}

function makeSection(title, items, tagFn) {
  if (!items || items.length === 0) return null;
  const sec = document.createElement('div');
  sec.className = 'hs-section';
  const hd = document.createElement('div');
  hd.className = 'hs-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  const ul = document.createElement('ul');
  ul.className = 'hs-list';
  for (const item of items) {
    const li = document.createElement('li');
    if (tagFn) {
      const tag = document.createElement('span');
      tag.className = 'hs-tag';
      tag.textContent = tagFn(item);
      li.appendChild(tag);
    }
    const nameSpan = document.createElement('span');
    nameSpan.textContent = typeof item === 'string' ? item : (item.name || item);
    li.appendChild(nameSpan);
    ul.appendChild(li);
  }
  sec.appendChild(ul);
  return sec;
}

export function render(intake) {
  const text = intake.text || '';
  const name = (intake.name || intake.filename || '').toLowerCase();
  const isLhs = name.endsWith('.lhs');
  const info = analyzeHaskell(text, isLhs);

  const host = document.createElement('div');
  host.className = 'hs-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'hs-title';
  let titleHtml = '<span class="hs-badge">Haskell</span>';
  if (isLhs) titleHtml += '<span class="hs-lhs-badge">Literate Haskell</span>';
  if (info.moduleName) titleHtml += `<span style="font-size:13px;font-weight:400;margin-left:8px;">${esc(info.moduleName)}</span>`;
  title.innerHTML = titleHtml;
  host.appendChild(title);

  const totalImports = info.imports.qualified.length + info.imports.regular.length;
  const sub = document.createElement('div');
  sub.className = 'hs-sub';
  sub.textContent = `${totalImports} import${totalImports !== 1 ? 's' : ''} · ${info.dataTypes.length} type${info.dataTypes.length !== 1 ? 's' : ''} · ${info.typeClasses.length} class${info.typeClasses.length !== 1 ? 'es' : ''} · ${info.instances.length} instance${info.instances.length !== 1 ? 's' : ''} · ${info.funcSigs.length} function${info.funcSigs.length !== 1 ? 's' : ''}`;
  host.appendChild(sub);

  // Summary cards
  const cards = document.createElement('div');
  cards.className = 'hs-cards';
  for (const { value, label } of [
    { value: totalImports, label: 'Imports' },
    { value: info.dataTypes.length, label: 'Types' },
    { value: info.typeClasses.length, label: 'Classes' },
    { value: info.instances.length, label: 'Instances' },
    { value: info.funcSigs.length, label: 'Functions' },
  ]) {
    const card = document.createElement('div');
    card.className = 'hs-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  // Imports section (split qualified vs regular)
  if (totalImports > 0) {
    const allImports = [
      ...info.imports.qualified.map((n) => ({ name: n, kind: 'qualified' })),
      ...info.imports.regular.map((n) => ({ name: n, kind: 'import' })),
    ];
    const importsEl = makeSection('Imports', allImports, (i) => i.kind);
    if (importsEl) host.appendChild(importsEl);
  }

  const typesEl = makeSection('Data Types', info.dataTypes, (d) => d.kind);
  if (typesEl) host.appendChild(typesEl);

  const classesEl = makeSection('Type Classes', info.typeClasses);
  if (classesEl) host.appendChild(classesEl);

  const instancesEl = makeSection('Instances', info.instances);
  if (instancesEl) host.appendChild(instancesEl);

  const funcsEl = makeSection('Top-level Functions', info.funcSigs);
  if (funcsEl) host.appendChild(funcsEl);

  // Source
  const srcSec = document.createElement('div');
  srcSec.className = 'hs-section';
  const srcHd = document.createElement('div');
  srcHd.className = 'hs-section-hd';
  srcHd.textContent = 'Source';
  srcSec.appendChild(srcHd);
  const pre = document.createElement('pre');
  pre.className = 'hs-pre';
  pre.innerHTML = highlightHaskell(text, isLhs);
  srcSec.appendChild(pre);
  host.appendChild(srcSec);

  return { parentNode: host };
}
