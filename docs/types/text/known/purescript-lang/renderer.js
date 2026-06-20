const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.purs-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.purs-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1c1c2e;color:#fff;vertical-align:middle;margin-right:8px;}
.purs-modname{font-size:13px;font-weight:400;margin-left:8px;color:var(--fg,#24292f);}
.purs-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.purs-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.purs-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.purs-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.purs-card strong{display:block;font-size:1.2rem;font-weight:700;}
.purs-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.purs-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.purs-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.purs-list{margin:0;padding:0;list-style:none;}
.purs-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;}
.purs-list li:last-child{border-bottom:none;}
.purs-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#ede9fe;color:#7c3aed;font-weight:700;}
.purs-tag-data{background:#dbeafe;color:#1e40af;}
.purs-tag-newtype{background:#fef3c7;color:#92400e;}
.purs-tag-type{background:#dcfce7;color:#166534;}
.purs-tag-class{background:#fce7f3;color:#9d174d;}
.purs-tag-instance{background:#f0fdf4;color:#15803d;}
.purs-pre{margin:0;background:var(--bg,#fff);padding:14px 16px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre;}
.purs-kw{color:#7c3aed;font-weight:600;}
.purs-str{color:#0a6640;}
.purs-comment{color:#6e7781;font-style:italic;}
.purs-type{color:#0369a1;font-weight:600;}
`;

const PURS_KEYWORDS = new Set([
  'module', 'where', 'import', 'qualified', 'as', 'hiding', 'data', 'type',
  'newtype', 'class', 'instance', 'derive', 'deriving', 'do', 'let', 'in',
  'if', 'then', 'else', 'case', 'of', 'forall', 'foreign', 'import', 'infixl',
  'infixr', 'infix', 'ado',
]);

function analyzePureScript(text) {
  const lines = text.split(/\r?\n/);
  let moduleName = null;
  const imports = { regular: [], hiding: [] };
  const dataTypes = [];
  const newtypes = [];
  const typeAliases = [];
  const classes = [];
  const instances = [];
  const funcSigs = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('--') || trimmed.startsWith('{-')) continue;

    // Module name
    const modM = trimmed.match(/^module\s+([\w.]+)\s+where/);
    if (modM && !moduleName) { moduleName = modM[1]; continue; }

    // Imports
    const impM = trimmed.match(/^import\s+(qualified\s+)?([\w.]+)(\s+hiding)?/);
    if (impM) {
      const modN = impM[2];
      if (impM[3]) {
        if (!imports.hiding.includes(modN)) imports.hiding.push(modN);
      } else {
        if (!imports.regular.includes(modN)) imports.regular.push(modN);
      }
      continue;
    }

    // data Type = ...
    const dataM = trimmed.match(/^data\s+([A-Z]\w*)/);
    if (dataM && !dataTypes.find(d => d.name === dataM[1])) {
      dataTypes.push({ name: dataM[1] });
      continue;
    }

    // newtype Foo = ...
    const newtypeM = trimmed.match(/^newtype\s+([A-Z]\w*)/);
    if (newtypeM && !newtypes.includes(newtypeM[1])) {
      newtypes.push(newtypeM[1]);
      continue;
    }

    // type Foo = ...
    const typeM = trimmed.match(/^type\s+([A-Z]\w*)/);
    if (typeM && !typeAliases.includes(typeM[1])) {
      typeAliases.push(typeM[1]);
      continue;
    }

    // class Foo ...
    const classM = trimmed.match(/^class\s+(?:.*\s+=>?\s+)?([A-Z]\w*)/);
    if (classM && !classes.includes(classM[1])) {
      classes.push(classM[1]);
      continue;
    }

    // instance ...
    const instM = trimmed.match(/^instance\s+([\w.]+\s+)+([A-Z]\w*)/);
    if (instM) {
      const sig = trimmed.replace(/^instance\s+/, '').replace(/\s+where.*$/, '').trim();
      if (!instances.includes(sig)) instances.push(sig);
      continue;
    }

    // Top-level function signatures: lowercase start :: Type
    const sigM = trimmed.match(/^([a-z_][a-zA-Z0-9_']*)\s*::/);
    if (sigM && !funcSigs.includes(sigM[1])) {
      funcSigs.push(sigM[1]);
    }
  }

  return { moduleName, imports, dataTypes, newtypes, typeAliases, classes, instances, funcSigs };
}

function highlightPureScript(text) {
  return text.split(/\r?\n/).map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('--')) {
      return '<span class="purs-comment">' + esc(line) + '</span>';
    }

    const commentIdx = line.indexOf('--');
    let code = line;
    let suffix = '';
    if (commentIdx !== -1) {
      const before = line.slice(0, commentIdx);
      const qCount = (before.match(/"/g) || []).length;
      if (qCount % 2 === 0) {
        code = line.slice(0, commentIdx);
        suffix = '<span class="purs-comment">' + esc(line.slice(commentIdx)) + '</span>';
      }
    }

    const escaped = esc(code)
      .replace(/(&quot;[^&]*&quot;)/g, '<span class="purs-str">$1</span>')
      .replace(/\b([A-Z][a-zA-Z0-9_']*)/g, '<span class="purs-type">$1</span>')
      .replace(new RegExp(`\\b(${[...PURS_KEYWORDS].join('|')})\\b`, 'g'), '<span class="purs-kw">$1</span>');

    return escaped + suffix;
  }).join('\n');
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'purs-section';
  const hd = document.createElement('div');
  hd.className = 'purs-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}

function makeList(sec) {
  const ul = document.createElement('ul');
  ul.className = 'purs-list';
  sec.appendChild(ul);
  return ul;
}

function addTaggedItems(ul, items, tagText, tagClass) {
  for (const item of items) {
    const li = document.createElement('li');
    const tag = document.createElement('span');
    tag.className = 'purs-tag' + (tagClass ? ' purs-tag-' + tagClass : '');
    tag.textContent = tagText;
    li.appendChild(tag);
    li.appendChild(document.createTextNode(' ' + (typeof item === 'string' ? item : item.name)));
    ul.appendChild(li);
  }
}

export async function render(intake, _ctx) {
  const text = intake.text || '';
  const info = analyzePureScript(text);
  const totalImports = info.imports.regular.length + info.imports.hiding.length;

  const host = document.createElement('div');
  host.className = 'purs-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  // Title
  const title = document.createElement('div');
  title.className = 'purs-title';
  const badgeEl = document.createElement('span');
  badgeEl.className = 'purs-badge';
  badgeEl.textContent = 'PureScript Module';
  title.appendChild(badgeEl);
  if (info.moduleName) {
    const modEl = document.createElement('span');
    modEl.className = 'purs-modname';
    modEl.textContent = info.moduleName;
    title.appendChild(modEl);
  }
  host.appendChild(title);

  // Sub
  const sub = document.createElement('div');
  sub.className = 'purs-sub';
  sub.textContent = [
    `${totalImports} import${totalImports !== 1 ? 's' : ''}`,
    `${info.dataTypes.length} data type${info.dataTypes.length !== 1 ? 's' : ''}`,
    `${info.newtypes.length} newtype${info.newtypes.length !== 1 ? 's' : ''}`,
    `${info.classes.length} class${info.classes.length !== 1 ? 'es' : ''}`,
    `${info.funcSigs.length} function${info.funcSigs.length !== 1 ? 's' : ''}`,
  ].join(' · ');
  host.appendChild(sub);

  // Cards
  const cards = document.createElement('div');
  cards.className = 'purs-cards';
  for (const { value, label } of [
    { value: totalImports, label: 'Imports' },
    { value: info.dataTypes.length, label: 'Data Types' },
    { value: info.newtypes.length, label: 'Newtypes' },
    { value: info.classes.length, label: 'Classes' },
    { value: info.instances.length, label: 'Instances' },
    { value: info.funcSigs.length, label: 'Functions' },
  ]) {
    const card = document.createElement('div');
    card.className = 'purs-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  // Imports
  if (totalImports > 0) {
    const allImports = [
      ...info.imports.regular.map(n => ({ name: n, kind: 'import' })),
      ...info.imports.hiding.map(n => ({ name: n, kind: 'hiding' })),
    ];
    const MAX = 6;
    const sec = makeSection(host, `Imports (${totalImports})`);
    const ul = makeList(sec);
    for (const { name, kind } of allImports.slice(0, MAX)) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'purs-tag' + (kind === 'hiding' ? ' purs-tag-newtype' : '');
      tag.textContent = kind;
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + name));
      ul.appendChild(li);
    }
    if (allImports.length > MAX) {
      const li = document.createElement('li');
      li.textContent = `… and ${allImports.length - MAX} more`;
      li.style.color = 'var(--fg-2,#888)';
      ul.appendChild(li);
    }
  }

  // Data types
  if (info.dataTypes.length > 0) {
    const sec = makeSection(host, `Data Types (${info.dataTypes.length})`);
    const ul = makeList(sec);
    addTaggedItems(ul, info.dataTypes, 'data', 'data');
  }

  // Newtypes
  if (info.newtypes.length > 0) {
    const sec = makeSection(host, `Newtypes (${info.newtypes.length})`);
    const ul = makeList(sec);
    addTaggedItems(ul, info.newtypes, 'newtype', 'newtype');
  }

  // Type aliases
  if (info.typeAliases.length > 0) {
    const sec = makeSection(host, `Type Aliases (${info.typeAliases.length})`);
    const ul = makeList(sec);
    addTaggedItems(ul, info.typeAliases, 'type', 'type');
  }

  // Classes
  if (info.classes.length > 0) {
    const sec = makeSection(host, `Type Classes (${info.classes.length})`);
    const ul = makeList(sec);
    addTaggedItems(ul, info.classes, 'class', 'class');
  }

  // Instances
  if (info.instances.length > 0) {
    const sec = makeSection(host, `Instances (${info.instances.length})`);
    const ul = makeList(sec);
    addTaggedItems(ul, info.instances, 'instance', 'instance');
  }

  // Function signatures
  if (info.funcSigs.length > 0) {
    const sec = makeSection(host, `Top-level Functions (${info.funcSigs.length})`);
    const ul = makeList(sec);
    for (const fn of info.funcSigs) {
      const li = document.createElement('li');
      li.textContent = fn;
      ul.appendChild(li);
    }
  }

  // Source
  const srcSec = makeSection(host, 'Source');
  const pre = document.createElement('pre');
  pre.className = 'purs-pre';
  pre.innerHTML = highlightPureScript(text);
  srcSec.appendChild(pre);

  return { parentNode: host };
}
