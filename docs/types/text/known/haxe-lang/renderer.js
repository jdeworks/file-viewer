const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

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
`;

function analyzeHaxe(text, filename) {
  const lines = text.split(/\r?\n/);
  let pkg = null;
  const imports = [];
  const types = [];     // class / interface / abstract / enum
  const functions = []; // method list
  const typedefs = [];
  const metas = new Set();

  // Detect if this has a main class (for badge)
  const fname = (filename || '').replace(/\\/g, '/').split('/').pop().replace(/\.hx$/i, '');

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;

    // Package
    const pkgM = trimmed.match(/^package\s+([\w.]*)\s*;/);
    if (pkgM && !pkg) { pkg = pkgM[1] || '(default)'; continue; }

    // Import
    const impM = trimmed.match(/^import\s+([\w.*]+)\s*;/);
    if (impM) { imports.push(impM[1]); continue; }

    // Metadata @:annotation
    const metaM = trimmed.match(/^@:(\w+)/);
    if (metaM) { metas.add('@:' + metaM[1]); continue; }

    // typedef
    const typedefM = trimmed.match(/^typedef\s+(\w+)/);
    if (typedefM) { typedefs.push(typedefM[1]); continue; }

    // class / interface / abstract / enum (with access modifiers)
    const typeM = trimmed.match(/^(?:(?:private|extern|final|@:final)\s+)*(class|interface|abstract|enum)\s+(\w+)/);
    if (typeM) {
      types.push({ kind: typeM[1], name: typeM[2] });
      continue;
    }

    // Functions / methods — detect access modifiers
    const fnM = trimmed.match(/^((?:(?:public|private|static|override|inline|dynamic|macro|extern|final)\s+)*)function\s+(\w+)/);
    if (fnM) {
      const accessStr = fnM[1].trim();
      const accMods = accessStr ? accessStr.split(/\s+/).filter(Boolean) : [];
      functions.push({ name: fnM[2], access: accMods });
      continue;
    }
  }

  return { pkg, imports, types, functions, typedefs, metas: [...metas], fname };
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
  return span;
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
  if (pkg) parts.push('package ' + pkg);
  parts.push(`${imports.length} import${imports.length !== 1 ? 's' : ''}`);
  parts.push(`${types.length} type${types.length !== 1 ? 's' : ''}`);
  parts.push(`${functions.length} method${functions.length !== 1 ? 's' : ''}`);
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Cards
  const cards = document.createElement('div');
  cards.className = 'haxe-cards';
  const cardItems = [
    { value: pkg || '(default)', label: 'Package' },
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
      li.textContent = imp;
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
    for (const { kind, name } of types) {
      const li = document.createElement('li');
      li.appendChild(makeTag(TYPE_TAG_CLASS[kind] || 'haxe-tag', kind));
      li.appendChild(document.createTextNode(' ' + name));
      ul.appendChild(li);
    }
  }

  // Methods
  if (functions.length > 0) {
    const sec = makeSection(host, `Methods (${functions.length})`);
    const ul = makeList(sec);
    for (const { name, access } of functions) {
      const li = document.createElement('li');
      for (const mod of access) {
        li.appendChild(makeTag('haxe-tag haxe-tag-access', mod));
        li.appendChild(document.createTextNode(' '));
      }
      li.appendChild(document.createTextNode(name));
      ul.appendChild(li);
    }
  }

  // Typedefs
  if (typedefs.length > 0) {
    const sec = makeSection(host, `Typedefs (${typedefs.length})`);
    const ul = makeList(sec);
    for (const name of typedefs) {
      const li = document.createElement('li');
      li.appendChild(makeTag('haxe-tag haxe-tag-typedef', 'typedef'));
      li.appendChild(document.createTextNode(' ' + name));
      ul.appendChild(li);
    }
  }

  // Metadata
  if (metas.length > 0) {
    const sec = makeSection(host, `Metadata (${metas.length})`);
    const ul = makeList(sec);
    for (const meta of metas) {
      const li = document.createElement('li');
      li.appendChild(makeTag('haxe-tag haxe-tag-meta', meta));
      ul.appendChild(li);
    }
  }

  return { parentNode: host };
}
