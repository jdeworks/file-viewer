import { chip, ensureKnownUiStyle, esc, sourceButton, sourcePreview, wireSourceLinks } from '../../../../core/known-ui.js';

const CSS = `
.haxe-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.haxe-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#f47920;color:#fff;vertical-align:middle;margin-right:8px;}
.haxe-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.haxe-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.haxe-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.haxe-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.haxe-card strong{display:block;font-size:1.2rem;font-weight:700;}
.haxe-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.haxe-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.haxe-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.haxe-list{margin:0;padding:0;list-style:none;}
.haxe-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.haxe-list li:last-child{border-bottom:none;}
.haxe-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#fff7ed;color:#c2410c;font-weight:700;}
.haxe-tag-class{background:#dbeafe;color:#1d4ed8;}
.haxe-tag-interface{background:#dcfce7;color:#166534;}
.haxe-tag-abstract{background:#ede9fe;color:#7c3aed;}
.haxe-tag-enum{background:#fef9c3;color:#854d0e;}
.haxe-tag-typedef{background:#f0fdf4;color:#15803d;}
.haxe-tag-access{background:#f1f5f9;color:#475569;}
.haxe-tag-meta{background:#fdf4ff;color:#a21caf;}
.haxe-pkg{font-family:ui-monospace,monospace;font-size:12px;color:#f47920;font-weight:600;}
.haxe-sig{font-family:ui-monospace,monospace;white-space:normal;overflow-wrap:anywhere;}
.haxe-doc-comment{font-family:system-ui,sans-serif;color:var(--fg-2,#5a6678);font-size:12px;flex-basis:100%;}
.haxe-source-keyword{color:#f47920;font-weight:700;}
.haxe-source-type{color:#1d4ed8;font-weight:600;}
.haxe-source-string{color:#b45309;}
.haxe-source-comment{color:var(--fg-2,#6e7681);font-style:italic;}
`;

function analyzeHaxe(text, filename) {
  const lines = text.split(/\r?\n/);
  let pkg = null;
  const imports = [];
  const types = [];     // class / interface / abstract / enum
  const functions = []; // method list
  const typedefs = [];
  const metas = [];
  let pendingDocs = [];
  let pendingMetas = [];
  let currentType = null;
  let currentTypeDepth = 0;

  // Detect if this has a main class (for badge)
  const fname = (filename || '').replace(/\\/g, '/').split('/').pop().replace(/\.hx$/i, '');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (/^\/\*\*/.test(trimmed)) {
      const block = collectDoc(lines, i);
      pendingDocs = block.docs;
      i = block.end;
      continue;
    }
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;
    if (currentType && trimmed && currentTypeDepth <= 0) currentType = null;

    // Package
    const pkgM = trimmed.match(/^package\s+([\w.]*)\s*;/);
    if (pkgM && !pkg) { pkg = { name: pkgM[1] || '(default)', line: i + 1 }; continue; }

    // Import
    const impM = trimmed.match(/^import\s+([\w.*]+)\s*;/);
    if (impM) { imports.push({ name: impM[1], line: i + 1 }); continue; }

    // Metadata @:annotation
    const metaM = trimmed.match(/^@:(\w+)(?:\((.*)\))?/);
    if (metaM) {
      const meta = { name: '@:' + metaM[1], args: metaM[2] || '', line: i + 1 };
      metas.push(meta);
      pendingMetas.push(meta);
      continue;
    }

    // typedef
    const typedefM = trimmed.match(/^typedef\s+(\w+)/);
    if (typedefM) { typedefs.push({ name: typedefM[1], line: i + 1, docs: pendingDocs.join(' ') }); pendingDocs = []; continue; }

    // class / interface / abstract / enum (with access modifiers)
    const typeM = trimmed.match(/^(?:(?:private|extern|final|@:final)\s+)*(class|interface|abstract|enum)\s+(\w+)(?:\(([^)]*)\))?(?:\s+extends\s+([\w.<>]+))?(?:\s+implements\s+([^{]+))?\s*\{?/);
    if (typeM) {
      currentType = {
        kind: typeM[1],
        name: typeM[2],
        params: typeM[3] || '',
        extends: typeM[4] || '',
        implements: typeM[5] ? typeM[5].replace(/\s*\{.*$/, '').split(',').map((s) => s.trim()).filter(Boolean) : [],
        line: i + 1,
        docs: pendingDocs.join(' '),
        metas: pendingMetas,
      };
      currentTypeDepth = braceDelta(line);
      types.push(currentType);
      pendingDocs = [];
      pendingMetas = [];
      continue;
    }

    // Functions / methods — detect access modifiers
    const fnM = trimmed.match(/^((?:(?:public|private|static|override|inline|dynamic|macro|extern|final)\s+)*)function\s+(\w+)\s*\(([^)]*)\)\s*(?::\s*([\w.<>]+))?/);
    if (fnM) {
      const accessStr = fnM[1].trim();
      const accMods = accessStr ? accessStr.split(/\s+/).filter(Boolean) : [];
      functions.push({
        name: fnM[2],
        access: accMods,
        params: splitParams(fnM[3] || ''),
        ret: fnM[4] || '',
        signature: trimmed.replace(/\s*\{\s*$/, ''),
        owner: currentType?.name || '',
        line: i + 1,
        docs: pendingDocs.join(' '),
        metas: pendingMetas,
        bodyLines: methodLength(lines, i),
      });
      pendingDocs = [];
      pendingMetas = [];
      continue;
    }

    if (currentType) currentTypeDepth += braceDelta(line);
    if (trimmed) pendingDocs = [];
  }

  return { pkg, imports, types, functions, typedefs, metas: uniqueMetas(metas), fname };
}

function collectDoc(lines, start) {
  const docs = [];
  for (let i = start; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.endsWith('*/')) return { docs, end: i };
    const cleaned = line.replace(/^\/\*\*?/, '').replace(/^\*\s?/, '').trim();
    if (cleaned && !cleaned.startsWith('@')) docs.push(cleaned);
  }
  return { docs, end: start };
}

function splitParams(text) {
  return String(text || '').split(',').map((s) => s.trim()).filter(Boolean);
}

function braceDelta(line) {
  const cleaned = line.replace(/'([^'\\]|\\.)*'/g, "''").replace(/"([^"\\]|\\.)*"/g, '""');
  return (cleaned.match(/\{/g) || []).length - (cleaned.match(/\}/g) || []).length;
}

function methodLength(lines, start) {
  let depth = 0;
  let opened = false;
  let count = 0;
  for (let i = start; i < lines.length; i++) {
    if (lines[i].includes('{')) opened = true;
    if (opened && i > start && lines[i].trim()) count++;
    depth += braceDelta(lines[i]);
    if (opened && depth <= 0) return Math.max(0, count - 1);
  }
  return count;
}

function uniqueMetas(items) {
  const seen = new Set();
  return items.filter((meta) => {
    const key = meta.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'haxe-section';
  const hd = document.createElement('div');
  hd.className = 'haxe-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}

function makeList(sec) {
  const ul = document.createElement('ul');
  ul.className = 'haxe-list';
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
  if (String(text).startsWith('@:')) return metaHint(text);
  const hints = {
    class: 'Reference type that can extend a class and implement interfaces.',
    interface: 'Contract of fields and methods implemented by classes.',
    abstract: 'Haxe abstract type wrapping an underlying representation with conversions/operators.',
    enum: 'Algebraic enum with named constructors.',
    typedef: 'Structural type alias.',
    public: 'Visible from other modules.',
    private: 'Limited visibility.',
    static: 'Member belongs to the type rather than instances.',
    inline: 'Compiler may inline this function at call sites.',
    override: 'Overrides an inherited member.',
  };
  return hints[text] || '';
}

function metaHint(name) {
  const hints = {
    '@:keep': 'Prevent dead-code elimination from removing this symbol.',
    '@:expose': 'Expose the generated symbol for the target platform.',
    '@:final': 'Prevent subclassing or overriding where supported.',
  };
  return hints[name] || 'Haxe compiler metadata';
}

function addDocs(li, docs) {
  if (!docs) return;
  const doc = document.createElement('span');
  doc.className = 'haxe-doc-comment';
  doc.textContent = docs;
  li.appendChild(doc);
}

function highlightHaxeLine(line) {
  if (/^\s*(\/\/|\/\*|\*)/.test(line)) return `<span class="haxe-source-comment">${esc(line)}</span>`;
  let out = esc(line);
  out = out.replace(/(&#39;[^&]*?&#39;|&quot;[^&]*?&quot;)/g, '<span class="haxe-source-string">$1</span>');
  out = out.replace(/\b(package|import|class|interface|abstract|enum|typedef|extends|implements|function|public|private|static|inline|override|var|return|new)\b/g, '<span class="haxe-source-keyword">$1</span>');
  out = out.replace(/\b(Int|Float|String|Bool|Void|Map|Sprite|Event|MouseEvent)\b/g, '<span class="haxe-source-type">$1</span>');
  return out;
}

const TYPE_TAG_CLASS = {
  class: 'haxe-tag haxe-tag-class',
  interface: 'haxe-tag haxe-tag-interface',
  abstract: 'haxe-tag haxe-tag-abstract',
  enum: 'haxe-tag haxe-tag-enum',
};

export async function render(intake, _ctx) {
  const text = intake.text || '';
  const filename = intake.name || intake.filename || '';

  // Content guard
  const preview = text.slice(0, 2000);
  if (!preview.includes('class ') && !preview.includes('import ') && !preview.includes('package ')) {
    return null;
  }

  const { pkg, imports, types, functions, typedefs, metas, fname } = analyzeHaxe(text, filename);

  const host = document.createElement('div');
  host.className = 'haxe-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);
  ensureKnownUiStyle(host);

  // Badge text: "Haxe Class" if there's a class, else "Haxe Module"
  const hasClass = types.some(t => t.kind === 'class');
  const badgeText = hasClass ? 'Haxe Class' : 'Haxe Module';

  // Title
  const title = document.createElement('div');
  title.className = 'haxe-title';
  const badge = document.createElement('span');
  badge.className = 'haxe-badge';
  badge.textContent = badgeText;
  title.appendChild(badge);
  if (fname) {
    const nameSpan = document.createElement('span');
    nameSpan.style.cssText = 'font-size:15px;font-weight:600;';
    nameSpan.textContent = fname;
    title.appendChild(nameSpan);
  }
  host.appendChild(title);

  // Sub
  const sub = document.createElement('div');
  sub.className = 'haxe-sub';
  const parts = [];
  if (pkg) parts.push('package ' + pkg.name);
  parts.push(`${imports.length} import${imports.length !== 1 ? 's' : ''}`);
  parts.push(`${types.length} type${types.length !== 1 ? 's' : ''}`);
  parts.push(`${functions.length} method${functions.length !== 1 ? 's' : ''}`);
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Cards
  const cards = document.createElement('div');
  cards.className = 'haxe-cards';
  const cardItems = [
    { value: pkg?.name || '(default)', label: 'Package' },
    { value: imports.length, label: 'Imports' },
    { value: types.length, label: 'Types' },
    { value: functions.length, label: 'Methods' },
  ];
  for (const { value, label } of cardItems) {
    const card = document.createElement('div');
    card.className = 'haxe-card';
    const strong = document.createElement('strong');
    if (label === 'Package' && pkg) strong.className = 'haxe-pkg';
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
    for (const imp of shown) {
      const li = document.createElement('li');
      li.appendChild(sourceButton(imp.name, imp.line, 'Open import in source'));
      ul.appendChild(li);
    }
    if (imports.length > MAX) {
      const li = document.createElement('li');
      li.textContent = `… and ${imports.length - MAX} more`;
      li.style.color = 'var(--fg-2,#888)';
      ul.appendChild(li);
    }
  }

  // Types (class/interface/abstract/enum)
  if (types.length > 0) {
    const sec = makeSection(host, `Types (${types.length})`);
    const ul = makeList(sec);
    for (const type of types) {
      const li = document.createElement('li');
      li.appendChild(makeTag(TYPE_TAG_CLASS[type.kind] || 'haxe-tag', type.kind));
      for (const meta of type.metas) li.appendChild(chip(meta.name, 'info', metaHint(meta.name)));
      li.appendChild(sourceButton(type.name, type.line, 'Open type in source'));
      if (type.params) li.appendChild(chip(type.params, 'muted', 'Underlying abstract representation.'));
      if (type.extends) li.appendChild(chip(`extends ${type.extends}`, 'info'));
      for (const impl of type.implements) li.appendChild(chip(`implements ${impl}`, 'ok'));
      addDocs(li, type.docs);
      ul.appendChild(li);
    }
  }

  // Methods
  if (functions.length > 0) {
    const sec = makeSection(host, `Methods (${functions.length})`);
    const ul = makeList(sec);
    for (const fn of functions) {
      const li = document.createElement('li');
      for (const meta of fn.metas) li.appendChild(chip(meta.name, 'info', metaHint(meta.name)));
      for (const mod of fn.access) {
        li.appendChild(makeTag('haxe-tag haxe-tag-access', mod));
        li.appendChild(document.createTextNode(' '));
      }
      li.appendChild(sourceButton(fn.name, fn.line, 'Open method in source'));
      li.appendChild(chip(`arity ${fn.params.length}`, 'muted'));
      if (fn.ret) li.appendChild(chip(`returns ${fn.ret}`, 'info'));
      if (fn.owner) li.appendChild(chip(`in ${fn.owner}`, 'muted'));
      li.appendChild(chip(`${fn.bodyLines} lines`, fn.bodyLines > 25 ? 'warn' : 'muted'));
      const sig = document.createElement('span');
      sig.className = 'haxe-sig';
      sig.textContent = fn.signature;
      li.appendChild(sig);
      for (const param of fn.params) li.appendChild(chip(param, 'muted', 'Parameter from the method signature.'));
      addDocs(li, fn.docs);
      ul.appendChild(li);
    }
  }

  // Typedefs
  if (typedefs.length > 0) {
    const sec = makeSection(host, `Typedefs (${typedefs.length})`);
    const ul = makeList(sec);
    for (const item of typedefs) {
      const li = document.createElement('li');
      li.appendChild(makeTag('haxe-tag haxe-tag-typedef', 'typedef'));
      li.appendChild(sourceButton(item.name, item.line, 'Open typedef in source'));
      addDocs(li, item.docs);
      ul.appendChild(li);
    }
  }

  // Metadata
  if (metas.length > 0) {
    const sec = makeSection(host, `Metadata (${metas.length})`);
    const ul = makeList(sec);
    for (const meta of metas) {
      const li = document.createElement('li');
      li.appendChild(makeTag('haxe-tag haxe-tag-meta', meta.name));
      if (meta.args) li.appendChild(chip(meta.args, 'muted'));
      li.appendChild(sourceButton(`line ${meta.line}`, meta.line, 'Open metadata in source'));
      ul.appendChild(li);
    }
  }

  host.appendChild(sourcePreview(text, { title: 'Source', collapsed: true, idPrefix: 'haxe-line', highlighter: highlightHaxeLine }));
  wireSourceLinks(host, { idPrefix: 'haxe-line' });

  return { parentNode: host };
}
