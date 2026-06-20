const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.jl-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.jl-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#9558b2;color:#fff;vertical-align:middle;margin-right:8px;}
.jl-badge-sub{display:inline-block;padding:2px 7px;border-radius:8px;font-size:10px;font-weight:700;background:#f3e8ff;color:#7c3aed;vertical-align:middle;margin-left:6px;}
.jl-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.jl-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.jl-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.jl-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.jl-card strong{display:block;font-size:1.2rem;font-weight:700;}
.jl-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.jl-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.jl-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.jl-list{margin:0;padding:0;list-style:none;}
.jl-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;}
.jl-list li:last-child{border-bottom:none;}
.jl-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#f3e8ff;color:#7c3aed;font-weight:700;}
.jl-tag-struct{background:#fef3c7;color:#92400e;}
.jl-tag-mutable{background:#fff7ed;color:#c2410c;}
.jl-tag-abstract{background:#ede9fe;color:#7f52ff;}
.jl-tag-macro{background:#dcfce7;color:#166534;}
.jl-mod{font-family:ui-monospace,monospace;font-size:12px;color:#9558b2;font-weight:600;}
`;

function analyzeJulia(text) {
  const lines = text.split(/\r?\n/);
  let moduleName = null;
  const usings = [];
  const imports = [];
  const functions = [];
  const structs = [];
  const macros = [];
  const aliases = [];
  let constCount = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) continue;

    // Module name
    const modM = trimmed.match(/^module\s+(\w+)/);
    if (modM && !moduleName) { moduleName = modM[1]; continue; }

    // Using
    const usingM = trimmed.match(/^using\s+([\w.,: ]+)/);
    if (usingM) {
      const pkgs = usingM[1].split(',').map((s) => s.trim().split(':')[0].trim()).filter(Boolean);
      usings.push(...pkgs);
      continue;
    }

    // Import
    const importM = trimmed.match(/^import\s+([\w.,: ]+)/);
    if (importM) {
      const pkgs = importM[1].split(',').map((s) => s.trim().split(':')[0].trim()).filter(Boolean);
      imports.push(...pkgs);
      continue;
    }

    // Function
    const funcM = trimmed.match(/^function\s+(\w+[!?]?)\s*\(([^)]*)\)/);
    if (funcM) {
      const args = funcM[2].trim();
      const argSummary = args.length > 40 ? args.slice(0, 37) + '…' : args;
      functions.push({ name: funcM[1], args: argSummary });
      continue;
    }

    // Shorthand function: name(args) = ...
    const shortFuncM = trimmed.match(/^(\w+[!?]?)\s*\([^)]*\)\s*=/);
    if (shortFuncM && shortFuncM[1] !== 'if' && shortFuncM[1] !== 'while') {
      functions.push({ name: shortFuncM[1], args: '…' });
      continue;
    }

    // Structs (mutable struct, abstract type, struct)
    const mutableM = trimmed.match(/^mutable\s+struct\s+(\w+)/);
    if (mutableM) { structs.push({ kind: 'mutable struct', name: mutableM[1] }); continue; }

    const abstractM = trimmed.match(/^abstract\s+type\s+(\w+)/);
    if (abstractM) { structs.push({ kind: 'abstract type', name: abstractM[1] }); continue; }

    const structM = trimmed.match(/^struct\s+(\w+)/);
    if (structM) { structs.push({ kind: 'struct', name: structM[1] }); continue; }

    // Macros
    const macroM = trimmed.match(/^macro\s+(\w+[!?]?)\s*\(/);
    if (macroM) { macros.push(macroM[1]); continue; }

    // Type aliases
    const aliasM = trimmed.match(/^(?:const\s+)?(\w+)\s*=\s*(?:Union|Tuple|Vector|Matrix|Dict|AbstractArray|AbstractVector)\{/);
    if (aliasM) { aliases.push(aliasM[1]); continue; }

    // Consts
    if (/^const\s+\w+/.test(trimmed)) constCount++;
  }

  return { moduleName, usings: [...new Set(usings)], imports: [...new Set(imports)], functions, structs, macros, aliases, constCount };
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'jl-section';
  const hd = document.createElement('div');
  hd.className = 'jl-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}

function makeList(sec) {
  const ul = document.createElement('ul');
  ul.className = 'jl-list';
  sec.appendChild(ul);
  return ul;
}

function tag(cls, text) {
  const span = document.createElement('span');
  span.className = 'jl-tag ' + (cls || '');
  span.textContent = text;
  return span;
}

export async function render(intake) {
  const text = intake.text || '';
  const { moduleName, usings, imports, functions, structs, macros, aliases, constCount } = analyzeJulia(text);

  const badgeLabel = moduleName ? 'Julia Module' : 'Julia Script';

  const host = document.createElement('div');
  host.className = 'jl-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  // Title
  const title = document.createElement('div');
  title.className = 'jl-title';
  const badge = document.createElement('span');
  badge.className = 'jl-badge';
  badge.textContent = badgeLabel;
  title.appendChild(badge);
  if (moduleName) {
    const modSpan = document.createElement('span');
    modSpan.className = 'jl-mod';
    modSpan.textContent = moduleName;
    title.appendChild(modSpan);
  }
  host.appendChild(title);

  // Subtitle
  const sub = document.createElement('div');
  sub.className = 'jl-sub';
  const parts = [];
  const totalDeps = usings.length + imports.length;
  parts.push(`${totalDeps} dep${totalDeps !== 1 ? 's' : ''}`);
  parts.push(`${functions.length} function${functions.length !== 1 ? 's' : ''}`);
  parts.push(`${structs.length} type${structs.length !== 1 ? 's' : ''}`);
  if (macros.length > 0) parts.push(`${macros.length} macro${macros.length !== 1 ? 's' : ''}`);
  if (constCount > 0) parts.push(`${constCount} const${constCount !== 1 ? 's' : ''}`);
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Cards
  const cards = document.createElement('div');
  cards.className = 'jl-cards';
  const cardItems = [
    { value: usings.length, label: 'Using' },
    { value: imports.length, label: 'Imports' },
    { value: functions.length, label: 'Functions' },
    { value: structs.length, label: 'Types' },
  ];
  if (constCount > 0) cardItems.push({ value: constCount, label: 'Consts' });
  for (const { value, label } of cardItems) {
    const card = document.createElement('div');
    card.className = 'jl-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  // Using
  if (usings.length > 0) {
    const sec = makeSection(host, `Using (${usings.length})`);
    const ul = makeList(sec);
    for (const u of usings) {
      const li = document.createElement('li');
      li.textContent = u;
      ul.appendChild(li);
    }
  }

  // Imports
  if (imports.length > 0) {
    const sec = makeSection(host, `Import (${imports.length})`);
    const ul = makeList(sec);
    for (const imp of imports) {
      const li = document.createElement('li');
      li.textContent = imp;
      ul.appendChild(li);
    }
  }

  // Functions
  if (functions.length > 0) {
    const sec = makeSection(host, `Functions (${functions.length})`);
    const ul = makeList(sec);
    const MAX = 8;
    const shown = functions.slice(0, MAX);
    for (const { name: fname, args } of shown) {
      const li = document.createElement('li');
      li.textContent = `${fname}(${args})`;
      ul.appendChild(li);
    }
    if (functions.length > MAX) {
      const li = document.createElement('li');
      li.textContent = `… and ${functions.length - MAX} more`;
      li.style.color = 'var(--fg-2,#888)';
      ul.appendChild(li);
    }
  }

  // Structs / types
  if (structs.length > 0) {
    const sec = makeSection(host, `Types (${structs.length})`);
    const ul = makeList(sec);
    for (const { kind, name: sname } of structs) {
      const li = document.createElement('li');
      const cls = kind === 'mutable struct' ? 'jl-tag-mutable' : kind === 'abstract type' ? 'jl-tag-abstract' : 'jl-tag-struct';
      li.appendChild(tag(cls, kind));
      li.appendChild(document.createTextNode(' ' + sname));
      ul.appendChild(li);
    }
  }

  // Macros
  if (macros.length > 0) {
    const sec = makeSection(host, `Macros (${macros.length})`);
    const ul = makeList(sec);
    for (const mac of macros) {
      const li = document.createElement('li');
      li.appendChild(tag('jl-tag-macro', 'macro'));
      li.appendChild(document.createTextNode(' @' + mac));
      ul.appendChild(li);
    }
  }

  // Type aliases
  if (aliases.length > 0) {
    const sec = makeSection(host, `Type Aliases (${aliases.length})`);
    const ul = makeList(sec);
    for (const al of aliases) {
      const li = document.createElement('li');
      li.textContent = al;
      ul.appendChild(li);
    }
  }

  return { parentNode: host };
}
