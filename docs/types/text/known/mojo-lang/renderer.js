const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

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

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) continue;

    const fromM = trimmed.match(/^from\s+([\w./]+)\s+import\s+(.+)/);
    if (fromM) {
      froms.push({ module: fromM[1], names: fromM[2].split(',').map((s) => s.trim()) });
      continue;
    }

    const impM = trimmed.match(/^import\s+([\w./]+)/);
    if (impM) {
      imports.push(impM[1]);
      continue;
    }

    const aliasM = trimmed.match(/^alias\s+(\w+)\s*=/);
    if (aliasM) { aliases.push(aliasM[1]); continue; }

    const structM = trimmed.match(/^struct\s+(\w+)/);
    if (structM) {
      const hasValue = prevLine.trim() === '@value';
      structs.push({ name: structM[1], value: hasValue });
      prevLine = line;
      continue;
    }

    const fnM = trimmed.match(/^(?:(async)\s+)?fn\s+(\w+)\s*(\([^)]*\))?(?:\s*->\s*([\w\[\], ]+))?/);
    if (fnM) {
      fns.push({ async: Boolean(fnM[1]), name: fnM[2], params: fnM[3] || '()', ret: fnM[4] || null });
      prevLine = line;
      continue;
    }

    const varM = trimmed.match(/^var\s+(\w+)/);
    if (varM) { vars.push({ name: varM[1], kind: 'var' }); prevLine = line; continue; }

    const letM = trimmed.match(/^let\s+(\w+)/);
    if (letM) { vars.push({ name: letM[1], kind: 'let' }); prevLine = line; continue; }

    prevLine = line;
  }

  return { froms, imports, structs, fns, aliases, vars };
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
  li.appendChild(tag);
  li.appendChild(document.createTextNode(' '));
}

export async function render(intake, _ctx) {
  const text = intake.text || '';
  const { froms, imports, structs, fns, aliases, vars } = analyzeMojo(text);

  const host = document.createElement('div');
  host.className = 'mojo-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

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
    ...froms.map((f) => ({ display: `${f.module} — ${f.names.join(', ')}`, kind: 'from' })),
    ...imports.map((i) => ({ display: i, kind: 'import' })),
  ];
  if (allImports.length) {
    const MAX = 8;
    const shown = allImports.slice(0, MAX);
    const sec = makeSection(host, `Imports (${allImports.length})`);
    const ul = makeList(sec);
    for (const { display } of shown) {
      const li = document.createElement('li');
      li.textContent = display;
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
    for (const { name, value } of structs) {
      const li = document.createElement('li');
      addTag(li, 'struct', 'mojo-tag mojo-tag-struct');
      if (value) addTag(li, '@value', 'mojo-tag mojo-tag-value');
      li.appendChild(document.createTextNode(name));
      ul.appendChild(li);
    }
  }

  // Functions
  if (fns.length) {
    const asyncCount = fns.filter((f) => f.async).length;
    const sec = makeSection(host, `Functions (${fns.length}${asyncCount ? `, ${asyncCount} async` : ''})`);
    const ul = makeList(sec);
    for (const { async: isAsync, name, params, ret } of fns) {
      const li = document.createElement('li');
      if (isAsync) addTag(li, 'async', 'mojo-tag mojo-tag-async');
      const sig = name + params + (ret ? ' -> ' + ret : '');
      li.appendChild(document.createTextNode(sig));
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
      li.appendChild(document.createTextNode(a));
      ul.appendChild(li);
    }
  }

  // Var / let declarations (top-level)
  if (vars.length) {
    const sec = makeSection(host, `Top-level Declarations (${vars.length})`);
    const ul = makeList(sec);
    for (const { name, kind } of vars) {
      const li = document.createElement('li');
      addTag(li, kind, kind === 'let' ? 'mojo-tag mojo-tag-let' : 'mojo-tag mojo-tag-var');
      li.appendChild(document.createTextNode(name));
      ul.appendChild(li);
    }
  }

  return { parentNode: host };
}
