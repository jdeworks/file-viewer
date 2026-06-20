const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.gr-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.gr-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#4298b8;color:#fff;vertical-align:middle;margin-right:8px;}
.gr-badge-sub{display:inline-block;padding:2px 7px;border-radius:8px;font-size:10px;font-weight:700;background:#e0f2f7;color:#0d6e8a;vertical-align:middle;margin-left:6px;}
.gr-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.gr-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.gr-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.gr-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.gr-card strong{display:block;font-size:1.2rem;font-weight:700;}
.gr-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.gr-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.gr-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.gr-list{margin:0;padding:0;list-style:none;}
.gr-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;}
.gr-list li:last-child{border-bottom:none;}
.gr-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#e0f2f7;color:#0d6e8a;font-weight:700;}
.gr-tag-class{background:#e0f2f7;color:#0d6e8a;}
.gr-tag-trait{background:#fef3c7;color:#92400e;}
.gr-tag-interface{background:#dcfce7;color:#166534;}
.gr-tag-enum{background:#fce7f3;color:#9d174d;}
.gr-tag-private{background:#f1f5f9;color:#64748b;}
.gr-tag-public{background:#dcfce7;color:#166534;}
.gr-tag-protected{background:#fef3c7;color:#92400e;}
.gr-tag-static{background:#ede9fe;color:#7f52ff;}
.gr-ann{color:#c026d3;font-family:ui-monospace,monospace;font-size:12px;}
.gr-pkg{font-family:ui-monospace,monospace;font-size:12px;color:#0d6e8a;font-weight:600;}
`;

function analyzeGroovy(text) {
  const lines = text.split(/\r?\n/);
  let pkg = null;
  const imports = [];
  const types = [];
  const methods = [];
  const annotations = new Set();
  let closureCount = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;

    // Package
    const pkgM = trimmed.match(/^package\s+([\w.]+)/);
    if (pkgM && !pkg) { pkg = pkgM[1]; continue; }

    // Imports
    const impM = trimmed.match(/^import\s+(static\s+)?([\w.*]+)/);
    if (impM) { imports.push(impM[2]); continue; }

    // Annotations
    const annM = trimmed.match(/^@(\w+)/);
    if (annM) annotations.add(annM[1]);

    // Types: class, trait, interface, enum
    const typeM = trimmed.match(/^(?:(?:public|private|protected|abstract|final|static)\s+)*?(class|trait|interface|enum)\s+(\w+)/);
    if (typeM) {
      types.push({ kind: typeM[1], name: typeM[2] });
    }

    // Methods/defs: def name( or access def name(
    const methM = trimmed.match(/^(?:(public|private|protected|static|final|abstract|synchronized)\s+)*(?:def\s+(\w+)\s*\(|(\w+)\s+(\w+)\s*\()/);
    if (methM && !typeM) {
      const mods = [];
      // Collect modifiers from match
      const modRe = /^(public|private|protected|static|final|abstract|synchronized)\s+/g;
      let rest = trimmed;
      let mod;
      while ((mod = modRe.exec(rest)) !== null) {
        mods.push(mod[1]);
        rest = rest.slice(mod[0].length);
        modRe.lastIndex = 0;
      }
      const nameM = rest.match(/^(?:def\s+)?(\w+)\s*\(/);
      if (nameM && nameM[1] !== 'if' && nameM[1] !== 'while' && nameM[1] !== 'for' && nameM[1] !== 'switch') {
        methods.push({ name: nameM[1], mods });
      }
    }

    // Closures: { -> or { args ->
    const closureMatches = trimmed.match(/\{[^}]*->/g);
    if (closureMatches) closureCount += closureMatches.length;
  }

  return { pkg, imports, types, methods, annotations: [...annotations], closureCount };
}

function groupImports(imports) {
  const groups = {};
  for (const imp of imports) {
    const parts = imp.split('.');
    const prefix = parts.length >= 2 ? parts.slice(0, 2).join('.') : parts[0];
    if (!groups[prefix]) groups[prefix] = [];
    groups[prefix].push(imp);
  }
  return groups;
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'gr-section';
  const hd = document.createElement('div');
  hd.className = 'gr-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}

function makeList(sec) {
  const ul = document.createElement('ul');
  ul.className = 'gr-list';
  sec.appendChild(ul);
  return ul;
}

function tag(cls, text) {
  const span = document.createElement('span');
  span.className = 'gr-tag ' + (cls || '');
  span.textContent = text;
  return span;
}

export async function render(intake) {
  const text = intake.text || '';
  const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
  const isScript = name.endsWith('.gsh');
  const hasClass = /\bclass\b/.test(text);

  const { pkg, imports, types, methods, annotations, closureCount } = analyzeGroovy(text);

  const badgeLabel = isScript ? 'Groovy Script' : (hasClass ? 'Groovy Class' : 'Groovy');

  const host = document.createElement('div');
  host.className = 'gr-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  // Title
  const title = document.createElement('div');
  title.className = 'gr-title';
  const badge = document.createElement('span');
  badge.className = 'gr-badge';
  badge.textContent = badgeLabel;
  title.appendChild(badge);
  if (pkg) {
    const pkgSpan = document.createElement('span');
    pkgSpan.className = 'gr-pkg';
    pkgSpan.textContent = pkg;
    title.appendChild(pkgSpan);
  }
  host.appendChild(title);

  // Subtitle
  const sub = document.createElement('div');
  sub.className = 'gr-sub';
  const parts = [];
  parts.push(`${imports.length} import${imports.length !== 1 ? 's' : ''}`);
  parts.push(`${types.length} type${types.length !== 1 ? 's' : ''}`);
  parts.push(`${methods.length} method${methods.length !== 1 ? 's' : ''}`);
  if (closureCount > 0) parts.push(`${closureCount} closure${closureCount !== 1 ? 's' : ''}`);
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Cards
  const cards = document.createElement('div');
  cards.className = 'gr-cards';
  const cardItems = [
    { value: imports.length, label: 'Imports' },
    { value: types.length, label: 'Types' },
    { value: methods.length, label: 'Methods' },
    { value: closureCount, label: 'Closures' },
  ];
  if (annotations.length > 0) cardItems.push({ value: annotations.length, label: 'Annotations' });
  for (const { value, label } of cardItems) {
    const card = document.createElement('div');
    card.className = 'gr-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  // Imports (grouped by prefix)
  if (imports.length > 0) {
    const groups = groupImports(imports);
    const groupEntries = Object.entries(groups);
    const sec = makeSection(host, `Imports (${imports.length})`);
    const ul = makeList(sec);
    const MAX = 6;
    let shown = 0;
    for (const [prefix, imps] of groupEntries) {
      if (shown >= MAX) break;
      const li = document.createElement('li');
      li.textContent = imps.length > 1 ? `${prefix}.* (${imps.length})` : imps[0];
      ul.appendChild(li);
      shown++;
    }
    if (imports.length > MAX) {
      const li = document.createElement('li');
      li.textContent = `… and ${imports.length - shown} more`;
      li.style.color = 'var(--fg-2,#888)';
      ul.appendChild(li);
    }
  }

  // Types
  if (types.length > 0) {
    const sec = makeSection(host, `Types (${types.length})`);
    const ul = makeList(sec);
    for (const { kind, name: tname } of types) {
      const li = document.createElement('li');
      const cls = kind === 'trait' ? 'gr-tag-trait' : kind === 'interface' ? 'gr-tag-interface' : kind === 'enum' ? 'gr-tag-enum' : 'gr-tag-class';
      li.appendChild(tag(cls, kind));
      li.appendChild(document.createTextNode(' ' + tname));
      ul.appendChild(li);
    }
  }

  // Methods
  if (methods.length > 0) {
    const sec = makeSection(host, `Methods (${methods.length})`);
    const ul = makeList(sec);
    for (const { name: mname, mods } of methods) {
      const li = document.createElement('li');
      for (const mod of mods) {
        const cls = mod === 'private' ? 'gr-tag-private' : mod === 'protected' ? 'gr-tag-protected' : mod === 'static' ? 'gr-tag-static' : mod === 'public' ? 'gr-tag-public' : 'gr-tag';
        li.appendChild(tag(cls, mod));
        li.appendChild(document.createTextNode(' '));
      }
      li.appendChild(document.createTextNode(mname));
      ul.appendChild(li);
    }
  }

  // Annotations
  if (annotations.length > 0) {
    const sec = makeSection(host, `Annotations (${annotations.length})`);
    const ul = makeList(sec);
    for (const ann of annotations) {
      const li = document.createElement('li');
      const span = document.createElement('span');
      span.className = 'gr-ann';
      span.textContent = '@' + ann;
      li.appendChild(span);
      ul.appendChild(li);
    }
  }

  return { parentNode: host };
}
