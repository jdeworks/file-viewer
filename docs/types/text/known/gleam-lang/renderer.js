const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

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
.gleam-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;}
.gleam-list li:last-child{border-bottom:none;}
.gleam-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#fff0fc;color:#c026d3;font-weight:700;}
.gleam-tag-pub{background:#dcfce7;color:#166534;}
.gleam-tag-type{background:#ede9fe;color:#7c3aed;}
.gleam-tag-const{background:#fef9c3;color:#854d0e;}
.gleam-mod{font-family:ui-monospace,monospace;font-size:12px;color:#ffaff3;font-weight:600;background:#1e0010;padding:1px 6px;border-radius:4px;}
`;

function analyzeGleam(text, filename) {
  const lines = text.split(/\r?\n/);
  const imports = [];
  const pubFunctions = [];
  const types = [];
  const constants = [];
  let internalFnCount = 0;

  // Module path from filename
  const modulePath = filename
    ? filename.replace(/\\/g, '/').replace(/\.gleam$/i, '')
    : null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('//')) continue;

    // Import: import gleam/list as l  OR  import gleam/io
    const impM = trimmed.match(/^import\s+([\w/]+)(?:\s+as\s+(\w+))?/);
    if (impM) {
      imports.push({ path: impM[1], alias: impM[2] || null });
      continue;
    }

    // pub fn with optional return type hint
    const pubFnM = trimmed.match(/^pub\s+fn\s+(\w+)\s*\(([^)]*)\)(?:\s*->\s*([\w()\[\], ]+))?/);
    if (pubFnM) {
      pubFunctions.push({ name: pubFnM[1], params: pubFnM[2].trim(), ret: pubFnM[3] ? pubFnM[3].trim() : null });
      continue;
    }

    // internal fn (non-pub)
    const fnM = trimmed.match(/^fn\s+(\w+)\s*\(/);
    if (fnM) { internalFnCount++; continue; }

    // pub type (custom type or type alias)
    const pubTypeM = trimmed.match(/^pub\s+type\s+(\w+)/);
    if (pubTypeM) {
      // Check for type alias (=) vs custom type ({)
      const kind = trimmed.includes('=') ? 'alias' : 'type';
      types.push({ name: pubTypeM[1], pub: true, kind });
      continue;
    }

    // type (internal)
    const typeM = trimmed.match(/^type\s+(\w+)/);
    if (typeM) {
      const kind = trimmed.includes('=') ? 'alias' : 'type';
      types.push({ name: typeM[1], pub: false, kind });
      continue;
    }

    // pub const
    const constM = trimmed.match(/^pub\s+const\s+(\w+)/);
    if (constM) { constants.push({ name: constM[1], pub: true }); continue; }

    // const (internal)
    const constIntM = trimmed.match(/^const\s+(\w+)/);
    if (constIntM) { constants.push({ name: constIntM[1], pub: false }); continue; }
  }

  return { modulePath, imports, pubFunctions, types, constants, internalFnCount };
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
  return span;
}

export async function render(intake, _ctx) {
  const text = intake.text || '';
  const filename = (intake.name || intake.filename || '');
  const { modulePath, imports, pubFunctions, types, constants, internalFnCount } = analyzeGleam(text, filename);

  const host = document.createElement('div');
  host.className = 'gleam-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

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
  if (internalFnCount > 0) parts.push(`${internalFnCount} internal fn${internalFnCount !== 1 ? 's' : ''}`);
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Cards
  const cards = document.createElement('div');
  cards.className = 'gleam-cards';
  const cardItems = [
    { value: imports.length, label: 'Imports' },
    { value: pubFunctions.length, label: 'Pub Fns' },
    { value: types.length, label: 'Types' },
    { value: internalFnCount, label: 'Internal Fns' },
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
    for (const { path, alias } of shown) {
      const li = document.createElement('li');
      li.appendChild(document.createTextNode(path));
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
    for (const { name, ret } of pubFunctions) {
      const li = document.createElement('li');
      li.appendChild(makeTag('gleam-tag gleam-tag-pub', 'pub fn'));
      li.appendChild(document.createTextNode(' ' + name));
      if (ret) {
        const retSpan = document.createElement('span');
        retSpan.style.color = 'var(--fg-2,#888)';
        retSpan.textContent = ' -> ' + ret;
        li.appendChild(retSpan);
      }
      ul.appendChild(li);
    }
  }

  // Types
  if (types.length > 0) {
    const sec = makeSection(host, `Types (${types.length})`);
    const ul = makeList(sec);
    for (const { name, pub, kind } of types) {
      const li = document.createElement('li');
      li.appendChild(makeTag('gleam-tag gleam-tag-type', pub ? 'pub ' + kind : kind));
      li.appendChild(document.createTextNode(' ' + name));
      ul.appendChild(li);
    }
  }

  // Constants
  if (constants.length > 0) {
    const sec = makeSection(host, `Constants (${constants.length})`);
    const ul = makeList(sec);
    for (const { name, pub } of constants) {
      const li = document.createElement('li');
      li.appendChild(makeTag('gleam-tag gleam-tag-const', pub ? 'pub const' : 'const'));
      li.appendChild(document.createTextNode(' ' + name));
      ul.appendChild(li);
    }
  }

  return { parentNode: host };
}
