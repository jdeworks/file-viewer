import { chip, ensureKnownUiStyle, esc, sourceButton, sourcePreview, wireSourceLinks } from '../../../../core/known-ui.js';

const CSS = `
.mojo-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.mojo-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#ff4500;color:#fff;vertical-align:middle;margin-right:8px;}
.mojo-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.mojo-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.mojo-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.mojo-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:100px;}
.mojo-card strong{display:block;font-size:1.2rem;font-weight:700;}
.mojo-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.mojo-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.mojo-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.mojo-list{margin:0;padding:0;list-style:none;}
.mojo-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.mojo-list li:last-child{border-bottom:none;}
.mojo-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#fff0eb;color:#ff4500;font-weight:700;}
.mojo-tag-async{background:#fce7f3;color:#9d174d;}
.mojo-tag-struct{background:#dbeafe;color:#1e40af;}
.mojo-tag-value{background:#d1fae5;color:#065f46;}
.mojo-tag-alias{background:#fef3c7;color:#92400e;}
.mojo-tag-var{background:#f3f4f6;color:#374151;}
.mojo-tag-let{background:#ede9fe;color:#5b21b6;}
.mojo-sig{font-family:ui-monospace,monospace;white-space:normal;overflow-wrap:anywhere;}
.mojo-source-keyword{color:#ff4500;font-weight:700;}
.mojo-source-type{color:#0f766e;}
.mojo-source-string{color:#b45309;}
.mojo-source-comment{color:var(--fg-2,#6e7681);font-style:italic;}
`;

function analyzeMojo(text) {
  const lines = text.split(/\r?\n/);
  const froms = [];
  const imports = [];
  const structs = [];
  const fns = [];
  const aliases = [];
  const vars = [];
  let prevLine = '';
  let currentStruct = null;
  let currentStructIndent = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) continue;
    const indent = leadingSpaces(line);
    if (currentStruct && trimmed && indent <= currentStructIndent) currentStruct = null;

    const fromM = trimmed.match(/^from\s+([\w./]+)\s+import\s+(.+)/);
    if (fromM) {
      froms.push({ module: fromM[1], names: fromM[2].split(',').map((s) => s.trim()), line: i + 1 });
      continue;
    }

    const impM = trimmed.match(/^import\s+([\w./]+)/);
    if (impM) {
      imports.push({ module: impM[1], line: i + 1 });
      continue;
    }

    const aliasM = trimmed.match(/^alias\s+(\w+)\s*=\s*(.+)$/);
    if (aliasM) { aliases.push({ name: aliasM[1], value: aliasM[2].trim(), line: i + 1 }); continue; }

    const structM = trimmed.match(/^struct\s+(\w+)/);
    if (structM) {
      const hasValue = prevLine.trim() === '@value';
      currentStruct = { name: structM[1], value: hasValue, line: i + 1, fields: 0, methods: 0 };
      currentStructIndent = indent;
      structs.push(currentStruct);
      prevLine = line;
      continue;
    }

    const fnM = trimmed.match(/^(?:(async)\s+)?fn\s+(\w+)\s*(\([^)]*\))?(?:\s*->\s*([\w\[\], ]+))?/);
    if (fnM) {
      const params = splitParams((fnM[3] || '()').replace(/^\(|\)$/g, ''));
      const fn = {
        async: Boolean(fnM[1]),
        name: fnM[2],
        params,
        signature: collectSignature(lines, i),
        ret: fnM[4] || null,
        line: i + 1,
        struct: currentStruct?.name || null,
        bodyLines: countBlockLines(lines, i, indent),
      };
      fns.push(fn);
      if (currentStruct) currentStruct.methods++;
      prevLine = line;
      continue;
    }

    const varM = trimmed.match(/^var\s+(\w+)(?:\s*:\s*([^=]+))?/);
    if (varM) {
      vars.push({ name: varM[1], type: (varM[2] || '').trim(), kind: 'var', line: i + 1, scope: currentStruct ? `field of ${currentStruct.name}` : indent === 0 ? 'module' : 'local' });
      if (currentStruct) currentStruct.fields++;
      prevLine = line;
      continue;
    }

    const letM = trimmed.match(/^let\s+(\w+)(?:\s*:\s*([^=]+))?/);
    if (letM) { vars.push({ name: letM[1], type: (letM[2] || '').trim(), kind: 'let', line: i + 1, scope: indent === 0 ? 'module' : 'local' }); prevLine = line; continue; }

    prevLine = line;
  }

  return { froms, imports, structs, fns, aliases, vars };
}

function leadingSpaces(line) {
  return line.match(/^\s*/)?.[0].length || 0;
}

function splitParams(params) {
  return params.split(',').map((p) => p.trim()).filter(Boolean);
}

function collectSignature(lines, start) {
  const parts = [];
  for (let i = start; i < lines.length; i++) {
    const part = lines[i].trim();
    parts.push(part.replace(/:\s*$/, ''));
    if (/:\s*$/.test(part)) break;
  }
  return parts.join(' ').replace(/\s+/g, ' ').replace(/:\s*$/, '').trim();
}

function countBlockLines(lines, start, indent) {
  let count = 0;
  for (let i = start + 1; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;
    if (leadingSpaces(lines[i]) <= indent) break;
    count++;
  }
  return count;
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'mojo-section';
  const hd = document.createElement('div');
  hd.className = 'mojo-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}

function makeList(sec) {
  const ul = document.createElement('ul');
  ul.className = 'mojo-list';
  sec.appendChild(ul);
  return ul;
}

function addTag(li, text, cls = 'mojo-tag') {
  const tag = document.createElement('span');
  tag.className = cls;
  tag.textContent = text;
  tag.title = tagHint(text);
  li.appendChild(tag);
  li.appendChild(document.createTextNode(' '));
}

function tagHint(text) {
  const hints = {
    '@value': 'Mojo value type decorator; values behave more like plain data and receive generated value semantics.',
    alias: 'Compile-time name for a type or value expression.',
    var: 'Mutable binding or field.',
    let: 'Immutable local binding.',
    async: 'Function can suspend and run asynchronously.',
    struct: 'Nominal aggregate type with fields and methods.',
  };
  return hints[text] || '';
}

function highlightMojoLine(line) {
  if (/^\s*#/.test(line)) return `<span class="mojo-source-comment">${esc(line)}</span>`;
  let out = esc(line);
  out = out.replace(/\b(from|import|alias|struct|fn|async|var|let|return|inout|self)\b/g, '<span class="mojo-source-keyword">$1</span>');
  out = out.replace(/\b(Int|Float32|Float64|String|DynamicVector|Python)\b/g, '<span class="mojo-source-type">$1</span>');
  out = out.replace(/&quot;[^&]*?&quot;/g, '<span class="mojo-source-string">$&</span>');
  return out;
}

export async function render(intake, _ctx) {
  const text = intake.text || '';
  const { froms, imports, structs, fns, aliases, vars } = analyzeMojo(text);

  const host = document.createElement('div');
  host.className = 'mojo-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);
  ensureKnownUiStyle(host);

  // Title
  const title = document.createElement('div');
  title.className = 'mojo-title';
  title.innerHTML = '<span class="mojo-badge">Mojo</span>';
  host.appendChild(title);

  // Sub
  const sub = document.createElement('div');
  sub.className = 'mojo-sub';
  const parts = [];
  const totalImports = froms.length + imports.length;
  if (totalImports) parts.push(`${totalImports} import${totalImports !== 1 ? 's' : ''}`);
  if (structs.length) parts.push(`${structs.length} struct${structs.length !== 1 ? 's' : ''}`);
  if (fns.length) parts.push(`${fns.length} fn${fns.length !== 1 ? 's' : ''}`);
  if (!parts.length) parts.push('Mojo source file');
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Cards
  const cards = document.createElement('div');
  cards.className = 'mojo-cards';
  for (const { value, label } of [
    { value: froms.length + imports.length, label: 'Imports' },
    { value: structs.length, label: 'Structs' },
    { value: fns.length, label: 'Functions' },
    { value: aliases.length, label: 'Aliases' },
  ]) {
    const card = document.createElement('div');
    card.className = 'mojo-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  // From/import
  const allImports = [
    ...froms.map((f) => ({ display: `${f.module} - ${f.names.join(', ')}`, kind: 'from', line: f.line })),
    ...imports.map((i) => ({ display: i.module, kind: 'import', line: i.line })),
  ];
  if (allImports.length) {
    const MAX = 8;
    const shown = allImports.slice(0, MAX);
    const sec = makeSection(host, `Imports (${allImports.length})`);
    const ul = makeList(sec);
    for (const { display, kind, line } of shown) {
      const li = document.createElement('li');
      li.appendChild(chip(kind, 'info'));
      li.appendChild(sourceButton(display, line, 'Open import in source'));
      ul.appendChild(li);
    }
    if (allImports.length > MAX) {
      const li = document.createElement('li');
      li.textContent = `… and ${allImports.length - MAX} more`;
      li.style.color = 'var(--fg-2,#888)';
      ul.appendChild(li);
    }
  }

  // Structs
  if (structs.length) {
    const sec = makeSection(host, `Structs (${structs.length})`);
    const ul = makeList(sec);
    for (const { name, value, fields, methods, line } of structs) {
      const li = document.createElement('li');
      addTag(li, 'struct', 'mojo-tag mojo-tag-struct');
      if (value) addTag(li, '@value', 'mojo-tag mojo-tag-value');
      li.appendChild(sourceButton(name, line, 'Open struct in source'));
      li.appendChild(chip(`${fields} field${fields !== 1 ? 's' : ''}`, 'info'));
      li.appendChild(chip(`${methods} method${methods !== 1 ? 's' : ''}`, 'muted'));
      ul.appendChild(li);
    }
  }

  // Functions
  if (fns.length) {
    const asyncCount = fns.filter((f) => f.async).length;
    const sec = makeSection(host, `Functions (${fns.length}${asyncCount ? `, ${asyncCount} async` : ''})`);
    const ul = makeList(sec);
    for (const fn of fns) {
      const li = document.createElement('li');
      if (fn.async) addTag(li, 'async', 'mojo-tag mojo-tag-async');
      li.appendChild(sourceButton(fn.name, fn.line, 'Open function in source'));
      li.appendChild(chip(`arity ${fn.params.length}`, 'muted'));
      if (fn.ret) li.appendChild(chip(`returns ${fn.ret}`, 'info'));
      if (fn.struct) li.appendChild(chip(`method of ${fn.struct}`, 'muted'));
      li.appendChild(chip(`${fn.bodyLines} lines`, fn.bodyLines > 20 ? 'warn' : 'muted'));
      const sig = document.createElement('span');
      sig.className = 'mojo-sig';
      sig.textContent = fn.signature;
      li.appendChild(sig);
      for (const param of fn.params) li.appendChild(chip(param, 'muted', 'Parameter from the function signature.'));
      ul.appendChild(li);
    }
  }

  // Aliases
  if (aliases.length) {
    const sec = makeSection(host, `Aliases (${aliases.length})`);
    const ul = makeList(sec);
    for (const a of aliases) {
      const li = document.createElement('li');
      addTag(li, 'alias', 'mojo-tag mojo-tag-alias');
      li.appendChild(sourceButton(a.name, a.line, 'Open alias in source'));
      li.appendChild(chip(a.value, 'muted', 'Aliased expression.'));
      ul.appendChild(li);
    }
  }

  // Var / let declarations
  if (vars.length) {
    const sec = makeSection(host, `Bindings And Fields (${vars.length})`);
    const ul = makeList(sec);
    for (const { name, kind, type, line, scope } of vars) {
      const li = document.createElement('li');
      addTag(li, kind, kind === 'let' ? 'mojo-tag mojo-tag-let' : 'mojo-tag mojo-tag-var');
      li.appendChild(sourceButton(name, line, 'Open binding in source'));
      if (type) li.appendChild(chip(type, 'info'));
      li.appendChild(chip(scope, scope === 'local' ? 'muted' : 'info'));
      ul.appendChild(li);
    }
  }

  host.appendChild(sourcePreview(text, { title: 'Source', collapsed: true, idPrefix: 'mojo-line', highlighter: highlightMojoLine }));
  wireSourceLinks(host, { idPrefix: 'mojo-line' });

  return { parentNode: host };
}
