const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.d-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.d-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#cc241d;color:#fff;vertical-align:middle;margin-right:8px;}
.d-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.d-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.d-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.d-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.d-card strong{display:block;font-size:1.2rem;font-weight:700;}
.d-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.d-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.d-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.d-list{margin:0;padding:0;list-style:none;}
.d-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.d-list li:last-child{border-bottom:none;}
.d-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#dbeafe;color:#1e40af;font-weight:700;}
.d-tag-class{background:#ede9fe;color:#7c3aed;}
.d-tag-struct{background:#dcfce7;color:#166534;}
.d-tag-iface{background:#fce7f3;color:#9d174d;}
.d-tag-enum{background:#fef3c7;color:#92400e;}
.d-tag-tmpl{background:#dbeafe;color:#1e40af;}
.d-tag-safe{background:#dcfce7;color:#166534;}
.d-tag-nogc{background:#fef3c7;color:#92400e;}
.d-tag-std{background:#e0f2fe;color:#075985;}
.d-tag-local{background:#fef3c7;color:#92400e;}
.d-pkg{font-family:ui-monospace,monospace;font-size:12px;color:#cc241d;font-weight:600;}
.d-pre{margin:0;background:var(--bg,#fff);padding:14px 16px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre;}
.d-kw{color:#cc241d;font-weight:600;}
.d-comment{color:#6e7781;font-style:italic;}
.d-str{color:#0a6640;}
.d-num{color:#b45309;}
.d-attr{color:#7c3aed;}
`;

const D_KEYWORDS = new Set([
  'abstract', 'alias', 'align', 'asm', 'assert', 'auto',
  'body', 'bool', 'break', 'byte',
  'case', 'cast', 'catch', 'cdouble', 'cent', 'cfloat', 'char', 'class', 'const', 'continue',
  'dchar', 'debug', 'default', 'delegate', 'delete', 'deprecated', 'do', 'double',
  'else', 'enum', 'export', 'extern',
  'false', 'final', 'finally', 'float', 'for', 'foreach', 'foreach_reverse', 'function',
  'goto',
  'idouble', 'if', 'ifloat', 'immutable', 'import', 'in', 'inout', 'int', 'interface', 'invariant', 'is',
  'lazy', 'long',
  'macro', 'mixin', 'module',
  'new', 'nothrow', 'null',
  'out', 'override',
  'package', 'pragma', 'private', 'protected', 'public', 'pure',
  'real', 'ref', 'return',
  'scope', 'shared', 'short', 'static', 'struct', 'super', 'switch', 'synchronized',
  'template', 'this', 'throw', 'true', 'try', 'typedef', 'typeid', 'typeof',
  'ubyte', 'ucent', 'uint', 'ulong', 'union', 'unittest', 'ushort',
  'version', 'void', 'volatile',
  'wchar', 'while', 'with',
  '__FILE__', '__LINE__', '__MODULE__', '__FUNCTION__', '__PRETTY_FUNCTION__',
  '__gshared', '__traits', '__vector', '__parameters',
]);

const D_ATTRS = new Set(['@safe', '@trusted', '@system', '@nogc', '@property', '@disable', '@live', 'nothrow', 'pure']);

function analyzeD(text) {
  const lines = text.split(/\r?\n/);
  let moduleName = null;
  const imports = { std: [], local: [] };
  const types = []; // { kind, name }
  const functions = []; // { name, attrs }
  const templates = [];
  let unittestCount = 0;
  const versions = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('*')) continue;

    // module declaration
    const modM = trimmed.match(/^module\s+([\w.]+)\s*;/);
    if (modM && !moduleName) { moduleName = modM[1]; continue; }

    // import
    const impM = trimmed.match(/^(?:public\s+|private\s+|static\s+)?import\s+([\w.]+)/);
    if (impM) {
      const mod = impM[1];
      if (mod.startsWith('std.') || mod.startsWith('core.') || mod.startsWith('etc.')) {
        imports.std.push(mod);
      } else {
        imports.local.push(mod);
      }
      continue;
    }

    // unittest
    if (/^unittest\s*\{/.test(trimmed)) { unittestCount++; continue; }

    // version blocks
    const verM = trimmed.match(/^version\s*\(\s*(\w+)\s*\)/);
    if (verM) { if (!versions.includes(verM[1])) versions.push(verM[1]); continue; }

    // template
    const tmplM = trimmed.match(/^(?:(?:private|public|package|protected)\s+)?template\s+(\w+)/);
    if (tmplM) { templates.push(tmplM[1]); continue; }

    // class, struct, interface, enum, union
    const typeM = trimmed.match(/^(?:(?:abstract|final|private|public|package|protected|export)\s+)*?(class|struct|interface|enum|union)\s+(\w+)/);
    if (typeM) {
      types.push({ kind: typeM[1], name: typeM[2] });
      continue;
    }

    // Functions: detect @safe/@nogc/nothrow attributes
    const fnM = trimmed.match(/^(?:(?:@safe|@trusted|@system|@nogc|@property|nothrow|pure|static|private|public|package|protected|export|override|final|extern|__gshared)\s+)*(?:[\w*&\[\]]+\s+)+(\w+)\s*\(/);
    if (fnM && !trimmed.startsWith('//') && !trimmed.includes('=')) {
      const fname = fnM[1];
      if (fname && fname !== 'if' && fname !== 'for' && fname !== 'while' && fname !== 'switch' && fname !== 'catch') {
        const attrs = [];
        if (/@safe\b/.test(trimmed)) attrs.push('@safe');
        if (/@trusted\b/.test(trimmed)) attrs.push('@trusted');
        if (/@nogc\b/.test(trimmed)) attrs.push('@nogc');
        if (/\bnothrow\b/.test(trimmed)) attrs.push('nothrow');
        functions.push({ name: fname, attrs });
      }
    }
  }

  return { moduleName, imports, types, functions, templates, unittestCount, versions };
}

function highlightD(text) {
  const lines = text.split(/\r?\n/);
  const result = [];
  let inBlockComment = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (inBlockComment) {
      result.push('<span class="d-comment">' + esc(line) + '</span>');
      if (line.includes('*/')) inBlockComment = false;
      continue;
    }

    if (trimmed.startsWith('//')) {
      result.push('<span class="d-comment">' + esc(line) + '</span>');
      continue;
    }

    let out = '';
    let i = 0;
    while (i < line.length) {
      // Block comment
      if (line[i] === '/' && line[i + 1] === '*') {
        const end = line.indexOf('*/', i + 2);
        if (end === -1) {
          out += '<span class="d-comment">' + esc(line.slice(i)) + '</span>';
          inBlockComment = true;
          break;
        }
        out += '<span class="d-comment">' + esc(line.slice(i, end + 2)) + '</span>';
        i = end + 2;
        continue;
      }
      // Line comment //
      if (line[i] === '/' && line[i + 1] === '/') {
        out += '<span class="d-comment">' + esc(line.slice(i)) + '</span>';
        break;
      }
      // D doc comment /+...+/
      if (line[i] === '/' && line[i + 1] === '+') {
        const end = line.indexOf('+/', i + 2);
        if (end === -1) {
          out += '<span class="d-comment">' + esc(line.slice(i)) + '</span>';
          break;
        }
        out += '<span class="d-comment">' + esc(line.slice(i, end + 2)) + '</span>';
        i = end + 2;
        continue;
      }
      // Attributes @safe, @nogc, etc.
      if (line[i] === '@') {
        let j = i + 1;
        while (j < line.length && /\w/.test(line[j])) j++;
        const attr = line.slice(i, j);
        if (D_ATTRS.has(attr)) {
          out += '<span class="d-attr">' + esc(attr) + '</span>';
        } else {
          out += esc(attr);
        }
        i = j;
        continue;
      }
      // Strings
      if (line[i] === '"') {
        let j = i + 1;
        while (j < line.length && line[j] !== '"') {
          if (line[j] === '\\') j++;
          j++;
        }
        j++;
        out += '<span class="d-str">' + esc(line.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // Char literals
      if (line[i] === "'") {
        let j = i + 1;
        if (line[j] === '\\') j++;
        j += 2;
        out += '<span class="d-str">' + esc(line.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // Numbers
      if (/[0-9]/.test(line[i])) {
        let j = i;
        while (j < line.length && /[0-9a-fA-F._xXbBoOuUlLfF]/.test(line[j])) j++;
        out += '<span class="d-num">' + esc(line.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // Identifiers / keywords
      if (/[A-Za-z_]/.test(line[i])) {
        let j = i;
        while (j < line.length && /[\w]/.test(line[j])) j++;
        const word = line.slice(i, j);
        if (D_KEYWORDS.has(word)) {
          out += '<span class="d-kw">' + esc(word) + '</span>';
        } else {
          out += esc(word);
        }
        i = j;
        continue;
      }
      out += esc(line[i]);
      i++;
    }
    result.push(out);
  }
  return result.join('\n');
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'd-section';
  const hd = document.createElement('div');
  hd.className = 'd-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}

function makeList(sec) {
  const ul = document.createElement('ul');
  ul.className = 'd-list';
  sec.appendChild(ul);
  return ul;
}

export function render(intake) {
  const text = intake.text || '';
  const name = (intake.name || intake.filename || '');
  const { moduleName, imports, types, functions, templates, unittestCount, versions } = analyzeD(text);
  const allImports = [...imports.std, ...imports.local];

  const host = document.createElement('div');
  host.className = 'd-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  // Title
  const title = document.createElement('div');
  title.className = 'd-title';
  const badge = document.createElement('span');
  badge.className = 'd-badge';
  badge.textContent = 'D Module';
  title.appendChild(badge);
  title.appendChild(document.createTextNode(name));
  host.appendChild(title);

  // Sub
  const sub = document.createElement('div');
  sub.className = 'd-sub';
  const parts = [];
  if (moduleName) parts.push('module: ' + moduleName);
  parts.push(`${allImports.length} import${allImports.length !== 1 ? 's' : ''}`);
  parts.push(`${types.length} type${types.length !== 1 ? 's' : ''}`);
  parts.push(`${functions.length} function${functions.length !== 1 ? 's' : ''}`);
  if (unittestCount) parts.push(`${unittestCount} unittest${unittestCount !== 1 ? 's' : ''}`);
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Cards
  const cards = document.createElement('div');
  cards.className = 'd-cards';
  const cardItems = [
    { value: moduleName || '—', label: 'Module' },
    { value: allImports.length, label: 'Imports' },
    { value: types.length, label: 'Types' },
    { value: functions.length, label: 'Functions' },
  ];
  for (const { value, label } of cardItems) {
    const card = document.createElement('div');
    card.className = 'd-card';
    const strong = document.createElement('strong');
    if (label === 'Module' && moduleName) strong.className = 'd-pkg';
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  // Imports — grouped std vs local
  if (allImports.length > 0) {
    const MAX = 8;
    const sec = makeSection(host, `Imports (${allImports.length})`);
    const ul = makeList(sec);
    let shown = 0;
    for (const imp of imports.std.slice(0, MAX)) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'd-tag d-tag-std';
      tag.textContent = 'std';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + imp));
      ul.appendChild(li);
      shown++;
    }
    for (const imp of imports.local.slice(0, Math.max(0, MAX - shown))) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'd-tag d-tag-local';
      tag.textContent = 'local';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + imp));
      ul.appendChild(li);
      shown++;
    }
    if (allImports.length > MAX) {
      const li = document.createElement('li');
      li.textContent = `… and ${allImports.length - MAX} more`;
      li.style.color = 'var(--fg-2,#888)';
      ul.appendChild(li);
    }
  }

  // Types
  if (types.length > 0) {
    const sec = makeSection(host, `Types (${types.length})`);
    const ul = makeList(sec);
    const kindClass = { class: 'd-tag-class', struct: 'd-tag-struct', interface: 'd-tag-iface', enum: 'd-tag-enum', union: 'd-tag' };
    for (const { kind, name: tname } of types) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'd-tag ' + (kindClass[kind] || 'd-tag');
      tag.textContent = kind;
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + tname));
      ul.appendChild(li);
    }
  }

  // Functions
  if (functions.length > 0) {
    const MAX = 15;
    const sec = makeSection(host, `Functions (${functions.length})`);
    const ul = makeList(sec);
    for (const { name: fname, attrs } of functions.slice(0, MAX)) {
      const li = document.createElement('li');
      for (const attr of attrs) {
        const tag = document.createElement('span');
        tag.className = attr === '@safe' || attr === '@trusted' ? 'd-tag d-tag-safe' : 'd-tag d-tag-nogc';
        tag.textContent = attr;
        li.appendChild(tag);
        li.appendChild(document.createTextNode(' '));
      }
      li.appendChild(document.createTextNode(fname));
      ul.appendChild(li);
    }
    if (functions.length > MAX) {
      const li = document.createElement('li');
      li.textContent = `… and ${functions.length - MAX} more`;
      li.style.color = 'var(--fg-2,#888)';
      ul.appendChild(li);
    }
  }

  // Templates
  if (templates.length > 0) {
    const sec = makeSection(host, `Templates (${templates.length})`);
    const ul = makeList(sec);
    for (const tmpl of templates) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'd-tag d-tag-tmpl';
      tag.textContent = 'template';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + tmpl));
      ul.appendChild(li);
    }
  }

  // version() blocks
  if (versions.length > 0) {
    const sec = makeSection(host, `Version Conditions (${versions.length})`);
    const ul = makeList(sec);
    for (const v of versions) {
      const li = document.createElement('li');
      li.textContent = 'version(' + v + ')';
      ul.appendChild(li);
    }
  }

  // Unittests
  if (unittestCount > 0) {
    const sec = makeSection(host, `Unittests (${unittestCount})`);
    const p = document.createElement('div');
    p.style.cssText = 'padding:8px 14px;font-size:12px;color:var(--fg-2,#666);';
    p.textContent = `${unittestCount} built-in unittest block${unittestCount !== 1 ? 's' : ''} — run with dmd -unittest or dub test`;
    sec.appendChild(p);
  }

  // Source
  const srcSec = makeSection(host, 'Source');
  const pre = document.createElement('pre');
  pre.className = 'd-pre';
  pre.innerHTML = highlightD(text);
  srcSec.appendChild(pre);

  return { parentNode: host };
}
