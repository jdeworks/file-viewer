import { chip, ensureKnownUiStyle, esc, sourceButton, sourcePreview, wireSourceLinks } from '../../../../core/known-ui.js';

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
.jl-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.jl-list li:last-child{border-bottom:none;}
.jl-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#f3e8ff;color:#7c3aed;font-weight:700;}
.jl-tag-struct{background:#fef3c7;color:#92400e;}
.jl-tag-mutable{background:#fff7ed;color:#c2410c;}
.jl-tag-abstract{background:#ede9fe;color:#7f52ff;}
.jl-tag-macro{background:#dcfce7;color:#166534;}
.jl-mod{font-family:ui-monospace,monospace;font-size:12px;color:#9558b2;font-weight:600;}
.jl-sig{font-family:ui-monospace,monospace;white-space:normal;overflow-wrap:anywhere;}
.jl-doc-comment{font-family:system-ui,sans-serif;color:var(--fg-2,#5a6678);font-size:12px;flex-basis:100%;}
.jl-source-keyword{color:#9558b2;font-weight:700;}
.jl-source-type{color:#1d4ed8;font-weight:600;}
.jl-source-string{color:#b45309;}
.jl-source-comment{color:var(--fg-2,#6e7681);font-style:italic;}
`;

function analyzeJulia(text) {
  const lines = text.split(/\r?\n/);
  let moduleInfo = null;
  const usings = [];
  const imports = [];
  const functions = [];
  const structs = [];
  const macros = [];
  const aliases = [];
  const consts = [];
  let pendingDoc = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (/^"""/.test(trimmed)) {
      const doc = collectDocstring(lines, i);
      pendingDoc = doc.text;
      i = doc.end;
      continue;
    }
    if (trimmed.startsWith('#')) continue;

    // Module name
    const modM = trimmed.match(/^module\s+(\w+)/);
    if (modM && !moduleInfo) { moduleInfo = { name: modM[1], line: i + 1 }; continue; }

    // Using
    const usingM = trimmed.match(/^using\s+([\w.,: ]+)/);
    if (usingM) {
      usings.push(...parseDeps(usingM[1], i + 1));
      continue;
    }

    // Import
    const importM = trimmed.match(/^import\s+([\w.,: ]+)/);
    if (importM) {
      imports.push(...parseDeps(importM[1], i + 1));
      continue;
    }

    // Function
    const funcM = trimmed.match(/^function\s+([\w.]+[!?]?)\s*\(([^)]*)\)(?:::\s*([\w.{}]+))?/);
    if (funcM) {
      functions.push(readFunction(lines, i, funcM[1], funcM[2], funcM[3] || '', trimmed, pendingDoc));
      pendingDoc = '';
      continue;
    }

    // Shorthand function: name(args) = ...
    const shortFuncM = trimmed.match(/^([\w.]+[!?]?)\s*\(([^)]*)\)(?:::\s*([\w.{}]+))?\s*=/);
    if (shortFuncM && shortFuncM[1] !== 'if' && shortFuncM[1] !== 'while') {
      functions.push(readFunction(lines, i, shortFuncM[1], shortFuncM[2], shortFuncM[3] || '', trimmed, pendingDoc));
      pendingDoc = '';
      continue;
    }

    // Structs (mutable struct, abstract type, struct)
    const mutableM = trimmed.match(/^mutable\s+struct\s+(\w+)/);
    if (mutableM) { structs.push({ kind: 'mutable struct', name: mutableM[1], line: i + 1, fields: countFields(lines, i), docs: pendingDoc }); pendingDoc = ''; continue; }

    const abstractM = trimmed.match(/^abstract\s+type\s+(\w+)/);
    if (abstractM) { structs.push({ kind: 'abstract type', name: abstractM[1], line: i + 1, fields: 0, docs: pendingDoc }); pendingDoc = ''; continue; }

    const structM = trimmed.match(/^struct\s+(\w+)/);
    if (structM) { structs.push({ kind: 'struct', name: structM[1], line: i + 1, fields: countFields(lines, i), docs: pendingDoc }); pendingDoc = ''; continue; }

    // Macros
    const macroM = trimmed.match(/^macro\s+(\w+[!?]?)\s*\(/);
    if (macroM) { macros.push({ name: macroM[1], line: i + 1, signature: trimmed, docs: pendingDoc }); pendingDoc = ''; continue; }

    // Type aliases
    const aliasM = trimmed.match(/^(?:const\s+)?(\w+)\s*=\s*(?:Union|Tuple|Vector|Matrix|Dict|AbstractArray|AbstractVector)\{/);
    if (aliasM) { aliases.push({ name: aliasM[1], line: i + 1, signature: trimmed }); continue; }

    // Consts
    const constM = trimmed.match(/^const\s+(\w+)/);
    if (constM) consts.push({ name: constM[1], line: i + 1, signature: trimmed });
    if (trimmed) pendingDoc = '';
  }

  return { moduleInfo, usings: uniqueByName(usings), imports: uniqueByName(imports), functions, structs, macros, aliases, consts };
}

function collectDocstring(lines, start) {
  const docs = [];
  let first = lines[start].trim().replace(/^"""\s?/, '');
  if (first.endsWith('"""')) return { text: first.replace(/"""$/, '').trim(), end: start };
  if (first) docs.push(first);
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.endsWith('"""')) {
      const cleaned = line.replace(/"""$/, '').trim();
      if (cleaned) docs.push(cleaned);
      return { text: docs.join(' ').replace(/\s+/g, ' ').trim(), end: i };
    }
    if (line) docs.push(line);
  }
  return { text: docs.join(' ').replace(/\s+/g, ' ').trim(), end: start };
}

function readFunction(lines, index, name, argText, ret, signature, docs) {
  const args = splitArgs(argText);
  return {
    name,
    baseName: name.split('.').pop(),
    args,
    ret,
    signature,
    line: index + 1,
    docs,
    bodyLines: functionLength(lines, index),
  };
}

function splitArgs(text) {
  return String(text || '').split(/[;,]/).map((s) => s.trim()).filter(Boolean);
}

function functionLength(lines, start) {
  if (/=\s*/.test(lines[start]) && !/^function\b/.test(lines[start].trim())) return 0;
  let count = 0;
  for (let i = start + 1; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (/^end\b/.test(trimmed)) return count;
    if (trimmed && !trimmed.startsWith('#')) count++;
  }
  return count;
}

function countFields(lines, start) {
  let count = 0;
  for (let i = start + 1; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (/^end\b/.test(trimmed)) return count;
    if (/^\w+::/.test(trimmed)) count++;
  }
  return count;
}

function uniqueByName(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = item.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function parseDeps(text, line) {
  const raw = String(text || '').trim();
  if (!raw) return [];
  if (raw.includes(':')) {
    const [moduleName, symbols] = raw.split(/:\s*/, 2);
    return [{
      name: moduleName.trim(),
      line,
      symbols: symbols.split(',').map((s) => s.trim()).filter(Boolean),
    }];
  }
  return raw.split(',').map((name) => ({ name: name.trim(), symbols: [], line })).filter((item) => item.name);
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
  span.title = tagHint(text);
  return span;
}

function tagHint(text) {
  const hints = {
    'mutable struct': 'Composite type whose fields can be reassigned.',
    'abstract type': 'Abstract supertype used for dispatch and type hierarchy.',
    struct: 'Immutable composite type by default.',
    macro: 'Code-generation hook expanded before runtime.',
  };
  return hints[text] || '';
}

function addDocs(li, docs) {
  if (!docs) return;
  const doc = document.createElement('span');
  doc.className = 'jl-doc-comment';
  doc.textContent = docs;
  li.appendChild(doc);
}

function highlightJuliaLine(line) {
  if (/^\s*#/.test(line)) return `<span class="jl-source-comment">${esc(line)}</span>`;
  let out = esc(line);
  out = out.replace(/(&quot;[^&]*?&quot;|"""[^]*?""")/g, '<span class="jl-source-string">$1</span>');
  out = out.replace(/\b(module|using|import|function|struct|mutable|abstract|type|const|macro|end|for|return|quote)\b/g, '<span class="jl-source-keyword">$1</span>');
  out = out.replace(/\b(Float64|Int|Vector|Matrix|Point|IO|DomainError)\b/g, '<span class="jl-source-type">$1</span>');
  return out;
}

export async function render(intake) {
  const text = intake.text || '';
  const { moduleInfo, usings, imports, functions, structs, macros, aliases, consts } = analyzeJulia(text);

  const badgeLabel = moduleInfo ? 'Julia Module' : 'Julia Script';

  const host = document.createElement('div');
  host.className = 'jl-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);
  ensureKnownUiStyle(host);

  // Title
  const title = document.createElement('div');
  title.className = 'jl-title';
  const badge = document.createElement('span');
  badge.className = 'jl-badge';
  badge.textContent = badgeLabel;
  title.appendChild(badge);
  if (moduleInfo) {
    const modSpan = document.createElement('span');
    modSpan.className = 'jl-mod';
    modSpan.appendChild(sourceButton(moduleInfo.name, moduleInfo.line, 'Open module declaration in source'));
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
  if (consts.length > 0) parts.push(`${consts.length} const${consts.length !== 1 ? 's' : ''}`);
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
  if (consts.length > 0) cardItems.push({ value: consts.length, label: 'Consts' });
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
      li.appendChild(sourceButton(u.name, u.line, 'Open using statement in source'));
      if (u.symbols?.length) li.appendChild(chip(`symbols: ${u.symbols.join(', ')}`, 'info'));
      ul.appendChild(li);
    }
  }

  // Imports
  if (imports.length > 0) {
    const sec = makeSection(host, `Import (${imports.length})`);
    const ul = makeList(sec);
    for (const imp of imports) {
      const li = document.createElement('li');
      li.appendChild(sourceButton(imp.name, imp.line, 'Open import statement in source'));
      if (imp.symbols?.length) li.appendChild(chip(`symbols: ${imp.symbols.join(', ')}`, 'info'));
      ul.appendChild(li);
    }
  }

  // Functions
  if (functions.length > 0) {
    const sec = makeSection(host, `Functions (${functions.length})`);
    const ul = makeList(sec);
    const MAX = 8;
    const shown = functions.slice(0, MAX);
    const dispatchCounts = functions.reduce((map, fn) => map.set(fn.baseName, (map.get(fn.baseName) || 0) + 1), new Map());
    for (const fn of shown) {
      const li = document.createElement('li');
      li.appendChild(sourceButton(fn.name, fn.line, 'Open function in source'));
      li.appendChild(chip(`arity ${fn.args.length}`, 'muted'));
      if (fn.ret) li.appendChild(chip(`returns ${fn.ret}`, 'info'));
      const methods = dispatchCounts.get(fn.baseName) || 1;
      if (methods > 1) li.appendChild(chip(`${methods} methods`, 'info', 'Multiple dispatch definitions with this base name.'));
      li.appendChild(chip(`${fn.bodyLines} lines`, fn.bodyLines > 20 ? 'warn' : 'muted'));
      const sig = document.createElement('span');
      sig.className = 'jl-sig';
      sig.textContent = fn.signature;
      li.appendChild(sig);
      for (const arg of fn.args) li.appendChild(chip(arg, 'muted', 'Argument from the function signature.'));
      addDocs(li, fn.docs);
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
    for (const item of structs) {
      const li = document.createElement('li');
      const cls = item.kind === 'mutable struct' ? 'jl-tag-mutable' : item.kind === 'abstract type' ? 'jl-tag-abstract' : 'jl-tag-struct';
      li.appendChild(tag(cls, item.kind));
      li.appendChild(sourceButton(item.name, item.line, 'Open type definition in source'));
      if (item.fields) li.appendChild(chip(`${item.fields} field${item.fields !== 1 ? 's' : ''}`, 'info'));
      addDocs(li, item.docs);
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
      li.appendChild(sourceButton('@' + mac.name, mac.line, 'Open macro in source'));
      const sig = document.createElement('span');
      sig.className = 'jl-sig';
      sig.textContent = mac.signature;
      li.appendChild(sig);
      addDocs(li, mac.docs);
      ul.appendChild(li);
    }
  }

  // Type aliases
  if (aliases.length > 0) {
    const sec = makeSection(host, `Type Aliases (${aliases.length})`);
    const ul = makeList(sec);
    for (const al of aliases) {
      const li = document.createElement('li');
      li.appendChild(sourceButton(al.name, al.line, 'Open type alias in source'));
      li.appendChild(chip(al.signature, 'muted'));
      ul.appendChild(li);
    }
  }

  host.appendChild(sourcePreview(text, { title: 'Source', collapsed: true, idPrefix: 'julia-line', highlighter: highlightJuliaLine }));
  wireSourceLinks(host, { idPrefix: 'julia-line' });

  return { parentNode: host };
}
