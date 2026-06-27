import { chip, ensureKnownUiStyle, esc, sourceButton, sourcePreview, wireSourceLinks } from '../../../../core/known-ui.js';

const CSS = `
.gleam-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.gleam-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#ffaff3;color:#1e0010;vertical-align:middle;margin-right:8px;}
.gleam-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.gleam-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.gleam-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.gleam-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.gleam-card strong{display:block;font-size:1.2rem;font-weight:700;}
.gleam-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.gleam-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.gleam-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.gleam-list{margin:0;padding:0;list-style:none;}
.gleam-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.gleam-list li:last-child{border-bottom:none;}
.gleam-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#fff0fc;color:#c026d3;font-weight:700;}
.gleam-tag-pub{background:#dcfce7;color:#166534;}
.gleam-tag-type{background:#ede9fe;color:#7c3aed;}
.gleam-tag-const{background:#fef9c3;color:#854d0e;}
.gleam-mod{font-family:ui-monospace,monospace;font-size:12px;color:#ffaff3;font-weight:600;background:#1e0010;padding:1px 6px;border-radius:4px;}
.gleam-sig{font-family:ui-monospace,monospace;white-space:normal;overflow-wrap:anywhere;}
.gleam-doc-comment{font-family:system-ui,sans-serif;color:var(--fg-2,#5a6678);font-size:12px;flex-basis:100%;}
.gleam-source-keyword{color:#c026d3;font-weight:700;}
.gleam-source-type{color:#0f766e;}
.gleam-source-string{color:#b45309;}
.gleam-source-comment{color:var(--fg-2,#6e7681);font-style:italic;}
`;

function analyzeGleam(text, filename) {
  const lines = text.split(/\r?\n/);
  const imports = [];
  const pubFunctions = [];
  const internalFunctions = [];
  const types = [];
  const constants = [];
  let pendingDocs = [];

  // Module path from filename
  const modulePath = filename
    ? filename.replace(/\\/g, '/').replace(/\.gleam$/i, '')
    : null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('///')) {
      pendingDocs.push(trimmed.replace(/^\/\/\/\s?/, ''));
      continue;
    }
    if (trimmed.startsWith('//')) continue;

    // Import: import gleam/list as l  OR  import gleam/io
    const impM = trimmed.match(/^import\s+([\w/]+)(?:\s+as\s+(\w+))?/);
    if (impM) {
      imports.push({ path: impM[1], alias: impM[2] || null, group: importGroup(impM[1]), line: i + 1 });
      pendingDocs = [];
      continue;
    }

    // pub fn with optional return type hint
    const pubFnM = trimmed.match(/^pub\s+fn\s+(\w+)\s*\(([^)]*)\)(?:\s*->\s*([\w()\[\], ]+))?/);
    if (pubFnM) {
      pubFunctions.push(readFunction(lines, i, pubFnM, true, pendingDocs));
      pendingDocs = [];
      continue;
    }

    // internal fn (non-pub)
    const fnM = trimmed.match(/^fn\s+(\w+)\s*\(([^)]*)\)(?:\s*->\s*([\w()\[\], ]+))?/);
    if (fnM) {
      internalFunctions.push(readFunction(lines, i, fnM, false, pendingDocs));
      pendingDocs = [];
      continue;
    }

    // pub type (custom type or type alias)
    const pubTypeM = trimmed.match(/^pub\s+type\s+(\w+)/);
    if (pubTypeM) {
      // Check for type alias (=) vs custom type ({)
      const kind = trimmed.includes('=') ? 'alias' : 'type';
      types.push({ name: pubTypeM[1], pub: true, kind, line: i + 1, docs: pendingDocs.join(' '), variants: countTypeVariants(lines, i) });
      pendingDocs = [];
      continue;
    }

    // type (internal)
    const typeM = trimmed.match(/^type\s+(\w+)/);
    if (typeM) {
      const kind = trimmed.includes('=') ? 'alias' : 'type';
      types.push({ name: typeM[1], pub: false, kind, line: i + 1, docs: pendingDocs.join(' '), variants: countTypeVariants(lines, i) });
      pendingDocs = [];
      continue;
    }

    // pub const
    const constM = trimmed.match(/^pub\s+const\s+(\w+)/);
    if (constM) { constants.push({ name: constM[1], pub: true, line: i + 1, docs: pendingDocs.join(' ') }); pendingDocs = []; continue; }

    // const (internal)
    const constIntM = trimmed.match(/^const\s+(\w+)/);
    if (constIntM) { constants.push({ name: constIntM[1], pub: false, line: i + 1, docs: pendingDocs.join(' ') }); pendingDocs = []; continue; }

    if (trimmed) pendingDocs = [];
  }

  return { modulePath, imports, pubFunctions, internalFunctions, types, constants };
}

function importGroup(path) {
  if (path.startsWith('gleam/')) return 'stdlib';
  if (path.includes('/')) return 'package';
  return 'local';
}

function readFunction(lines, lineIndex, match, isPublic, docs) {
  const signature = collectSignature(lines, lineIndex);
  const params = splitParams(match[2] || '');
  return {
    name: match[1],
    pub: isPublic,
    params,
    arity: params.length,
    ret: match[3] ? match[3].trim() : '',
    signature,
    line: lineIndex + 1,
    docs: docs.join(' '),
    bodyLines: countBodyLines(lines, lineIndex),
  };
}

function collectSignature(lines, start) {
  const parts = [];
  for (let i = start; i < lines.length; i++) {
    const part = lines[i].trim();
    parts.push(part.replace(/\s*\{\s*$/, ''));
    if (/[{=]\s*$/.test(part)) break;
  }
  return parts.join(' ').replace(/\s+/g, ' ').replace(/\s*\{\s*$/, '').trim();
}

function splitParams(params) {
  return params.split(',').map((p) => p.trim()).filter(Boolean);
}

function braceDelta(line) {
  const cleaned = line.replace(/"([^"\\]|\\.)*"/g, '""');
  return (cleaned.match(/\{/g) || []).length - (cleaned.match(/\}/g) || []).length;
}

function countBodyLines(lines, start) {
  let depth = 0;
  let seenOpen = false;
  let count = 0;
  for (let i = start; i < lines.length; i++) {
    if (lines[i].includes('{')) seenOpen = true;
    if (seenOpen && i > start && lines[i].trim()) count++;
    depth += braceDelta(lines[i]);
    if (seenOpen && depth <= 0) return Math.max(0, count - 1);
  }
  return count;
}

function countTypeVariants(lines, start) {
  let depth = 0;
  let count = 0;
  for (let i = start; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    depth += braceDelta(lines[i]);
    if (i > start && depth > 0 && /^[A-Z]\w+\b/.test(trimmed)) count++;
    if (i > start && depth <= 0) break;
  }
  return count;
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'gleam-section';
  const hd = document.createElement('div');
  hd.className = 'gleam-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}

function makeList(sec) {
  const ul = document.createElement('ul');
  ul.className = 'gleam-list';
  sec.appendChild(ul);
  return ul;
}

function makeTag(cls, text) {
  const span = document.createElement('span');
  span.className = cls;
  span.textContent = text;
  span.title = tagHint(text);
  return span;
}

function tagHint(text) {
  if (/pub fn/.test(text)) return 'Public function exported by this module.';
  if (/fn/.test(text)) return 'Internal helper function local to this module.';
  if (/type|alias/.test(text)) return 'Type exposed or used by this module.';
  if (/const/.test(text)) return 'Compile-time constant.';
  if (/as /.test(text)) return 'Import alias used inside the module.';
  return '';
}

function addDocs(li, docs) {
  if (!docs) return;
  const doc = document.createElement('span');
  doc.className = 'gleam-doc-comment';
  doc.textContent = docs;
  li.appendChild(doc);
}

function highlightGleamLine(line) {
  if (/^\s*\/\//.test(line)) return `<span class="gleam-source-comment">${esc(line)}</span>`;
  let out = esc(line);
  out = out.replace(/\b(import|pub|fn|type|const|case|let)\b/g, '<span class="gleam-source-keyword">$1</span>');
  out = out.replace(/\b(Float|String|Int|Bool|Result|List)\b/g, '<span class="gleam-source-type">$1</span>');
  out = out.replace(/&quot;[^&]*?&quot;/g, '<span class="gleam-source-string">$&</span>');
  return out;
}

export async function render(intake, _ctx) {
  const text = intake.text || '';
  const filename = (intake.name || intake.filename || '');
  const { modulePath, imports, pubFunctions, internalFunctions, types, constants } = analyzeGleam(text, filename);

  const host = document.createElement('div');
  host.className = 'gleam-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);
  ensureKnownUiStyle(host);

  // Title
  const title = document.createElement('div');
  title.className = 'gleam-title';
  const badge = document.createElement('span');
  badge.className = 'gleam-badge';
  badge.textContent = 'Gleam Module';
  title.appendChild(badge);
  if (modulePath) {
    const mod = document.createElement('span');
    mod.className = 'gleam-mod';
    mod.textContent = modulePath;
    title.appendChild(mod);
  }
  host.appendChild(title);

  // Sub
  const sub = document.createElement('div');
  sub.className = 'gleam-sub';
  const parts = [];
  parts.push(`${imports.length} import${imports.length !== 1 ? 's' : ''}`);
  parts.push(`${pubFunctions.length} pub fn${pubFunctions.length !== 1 ? 's' : ''}`);
  parts.push(`${types.length} type${types.length !== 1 ? 's' : ''}`);
  if (internalFunctions.length > 0) parts.push(`${internalFunctions.length} internal fn${internalFunctions.length !== 1 ? 's' : ''}`);
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Cards
  const cards = document.createElement('div');
  cards.className = 'gleam-cards';
  const cardItems = [
    { value: imports.length, label: 'Imports' },
    { value: pubFunctions.length, label: 'Pub Fns' },
    { value: types.length, label: 'Types' },
    { value: internalFunctions.length, label: 'Internal Fns' },
  ];
  for (const { value, label } of cardItems) {
    const card = document.createElement('div');
    card.className = 'gleam-card';
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
  if (imports.length > 0) {
    const MAX = 6;
    const shown = imports.slice(0, MAX);
    const sec = makeSection(host, `Imports (${imports.length})`);
    const ul = makeList(sec);
    for (const { path, alias, group, line } of shown) {
      const li = document.createElement('li');
      li.appendChild(chip(group, group === 'stdlib' ? 'ok' : 'info', `${group} import`));
      li.appendChild(sourceButton(path, line, 'Open import in source'));
      if (alias) {
        const tag = makeTag('gleam-tag', 'as ' + alias);
        li.appendChild(document.createTextNode(' '));
        li.appendChild(tag);
      }
      ul.appendChild(li);
    }
    if (imports.length > MAX) {
      const li = document.createElement('li');
      li.textContent = `… and ${imports.length - MAX} more`;
      li.style.color = 'var(--fg-2,#888)';
      ul.appendChild(li);
    }
  }

  // Public functions
  if (pubFunctions.length > 0) {
    const sec = makeSection(host, `Public Functions (${pubFunctions.length})`);
    const ul = makeList(sec);
    for (const fn of pubFunctions) {
      const li = document.createElement('li');
      li.appendChild(makeTag('gleam-tag gleam-tag-pub', 'pub fn'));
      li.appendChild(sourceButton(fn.name, fn.line, 'Open public function in source'));
      li.appendChild(chip(`arity ${fn.arity}`, 'muted'));
      if (fn.ret) li.appendChild(chip(`returns ${fn.ret}`, 'info'));
      li.appendChild(chip(`${fn.bodyLines} lines`, fn.bodyLines > 20 ? 'warn' : 'muted'));
      const sig = document.createElement('span');
      sig.className = 'gleam-sig';
      sig.textContent = fn.signature;
      li.appendChild(sig);
      for (const param of fn.params) li.appendChild(chip(param, 'muted', 'Parameter from the function signature.'));
      addDocs(li, fn.docs);
      ul.appendChild(li);
    }
  }

  if (internalFunctions.length > 0) {
    const sec = makeSection(host, `Internal Functions (${internalFunctions.length})`);
    const ul = makeList(sec);
    for (const fn of internalFunctions) {
      const li = document.createElement('li');
      li.appendChild(makeTag('gleam-tag', 'fn'));
      li.appendChild(sourceButton(fn.name, fn.line, 'Open internal function in source'));
      li.appendChild(chip(`arity ${fn.arity}`, 'muted'));
      if (fn.ret) li.appendChild(chip(`returns ${fn.ret}`, 'info'));
      for (const param of fn.params) li.appendChild(chip(param, 'muted', 'Parameter from the function signature.'));
      addDocs(li, fn.docs);
      ul.appendChild(li);
    }
  }

  // Types
  if (types.length > 0) {
    const sec = makeSection(host, `Types (${types.length})`);
    const ul = makeList(sec);
    for (const { name, pub, kind, line, variants, docs } of types) {
      const li = document.createElement('li');
      li.appendChild(makeTag('gleam-tag gleam-tag-type', pub ? 'pub ' + kind : kind));
      li.appendChild(sourceButton(name, line, 'Open type definition in source'));
      if (variants) li.appendChild(chip(`${variants} variants`, 'info'));
      addDocs(li, docs);
      ul.appendChild(li);
    }
  }

  // Constants
  if (constants.length > 0) {
    const sec = makeSection(host, `Constants (${constants.length})`);
    const ul = makeList(sec);
    for (const { name, pub, line, docs } of constants) {
      const li = document.createElement('li');
      li.appendChild(makeTag('gleam-tag gleam-tag-const', pub ? 'pub const' : 'const'));
      li.appendChild(sourceButton(name, line, 'Open constant in source'));
      addDocs(li, docs);
      ul.appendChild(li);
    }
  }

  host.appendChild(sourcePreview(text, { title: 'Source', collapsed: true, idPrefix: 'gleam-line', highlighter: highlightGleamLine }));
  wireSourceLinks(host, { idPrefix: 'gleam-line' });

  return { parentNode: host };
}
