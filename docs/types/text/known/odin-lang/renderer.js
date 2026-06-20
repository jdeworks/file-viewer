const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.odin-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.odin-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#3d8bc9;color:#fff;vertical-align:middle;margin-right:8px;}
.odin-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.odin-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.odin-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.odin-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.odin-card strong{display:block;font-size:1.2rem;font-weight:700;}
.odin-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.odin-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.odin-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.odin-list{margin:0;padding:0;list-style:none;}
.odin-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;}
.odin-list li:last-child{border-bottom:none;}
.odin-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#e0f2fe;color:#0369a1;font-weight:700;}
.odin-tag-proc{background:#dcfce7;color:#166534;}
.odin-tag-struct{background:#ede9fe;color:#7c3aed;}
.odin-tag-enum{background:#fef9c3;color:#854d0e;}
.odin-tag-union{background:#ffe4e6;color:#9f1239;}
.odin-tag-cc{background:#f1f5f9;color:#475569;font-style:italic;}
.odin-pkg{font-family:ui-monospace,monospace;font-size:13px;color:#3d8bc9;font-weight:700;}
`;

function analyzeOdin(text) {
  const lines = text.split(/\r?\n/);
  let pkg = null;
  const imports = [];
  const procs = [];
  const structs = [];
  const unions = [];
  const enums = [];
  let whenCount = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('//')) continue;

    // Package
    const pkgM = trimmed.match(/^package\s+(\w+)/);
    if (pkgM && !pkg) { pkg = pkgM[1]; continue; }

    // Import
    const impM = trimmed.match(/^import\s+(?:(\w+)\s+)?"([^"]+)"/);
    if (impM) { imports.push({ alias: impM[1] || null, path: impM[2] }); continue; }

    // Proc definitions — detect calling convention: proc "c" { or proc(...)
    const procM = trimmed.match(/^(\w+)\s*::\s*proc(?:\s*"([^"]+)")?/);
    if (procM) {
      procs.push({ name: procM[1], cc: procM[2] || null });
      continue;
    }

    // Struct
    const structM = trimmed.match(/^(\w+)\s*::\s*struct/);
    if (structM) { structs.push(structM[1]); continue; }

    // Union
    const unionM = trimmed.match(/^(\w+)\s*::\s*union/);
    if (unionM) { unions.push(unionM[1]); continue; }

    // Enum
    const enumM = trimmed.match(/^(\w+)\s*::\s*enum/);
    if (enumM) { enums.push(enumM[1]); continue; }

    // when compile-time condition
    if (/^when\s+/.test(trimmed)) { whenCount++; continue; }
  }

  return { pkg, imports, procs, structs, unions, enums, whenCount };
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'odin-section';
  const hd = document.createElement('div');
  hd.className = 'odin-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}

function makeList(sec) {
  const ul = document.createElement('ul');
  ul.className = 'odin-list';
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
  const { pkg, imports, procs, structs, unions, enums, whenCount } = analyzeOdin(text);

  const host = document.createElement('div');
  host.className = 'odin-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  // Title
  const title = document.createElement('div');
  title.className = 'odin-title';
  const badge = document.createElement('span');
  badge.className = 'odin-badge';
  badge.textContent = 'Odin Package';
  title.appendChild(badge);
  if (pkg) {
    const pkgSpan = document.createElement('span');
    pkgSpan.className = 'odin-pkg';
    pkgSpan.textContent = pkg;
    title.appendChild(pkgSpan);
  }
  host.appendChild(title);

  // Sub
  const sub = document.createElement('div');
  sub.className = 'odin-sub';
  const parts = [];
  if (pkg) parts.push('package ' + pkg);
  parts.push(`${imports.length} import${imports.length !== 1 ? 's' : ''}`);
  parts.push(`${procs.length} proc${procs.length !== 1 ? 's' : ''}`);
  parts.push(`${structs.length} struct${structs.length !== 1 ? 's' : ''}`);
  if (whenCount > 0) parts.push(`${whenCount} when condition${whenCount !== 1 ? 's' : ''}`);
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Cards
  const cards = document.createElement('div');
  cards.className = 'odin-cards';
  const cardItems = [
    { value: pkg || '—', label: 'Package' },
    { value: imports.length, label: 'Imports' },
    { value: procs.length, label: 'Procs' },
    { value: structs.length, label: 'Structs' },
  ];
  for (const { value, label } of cardItems) {
    const card = document.createElement('div');
    card.className = 'odin-card';
    const strong = document.createElement('strong');
    if (label === 'Package' && pkg) strong.className = 'odin-pkg';
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
    for (const { alias, path } of shown) {
      const li = document.createElement('li');
      if (alias) {
        li.appendChild(makeTag('odin-tag', alias));
        li.appendChild(document.createTextNode(' '));
      }
      li.appendChild(document.createTextNode(path));
      ul.appendChild(li);
    }
    if (imports.length > MAX) {
      const li = document.createElement('li');
      li.textContent = `… and ${imports.length - MAX} more`;
      li.style.color = 'var(--fg-2,#888)';
      ul.appendChild(li);
    }
  }

  // Procs
  if (procs.length > 0) {
    const sec = makeSection(host, `Procedures (${procs.length})`);
    const ul = makeList(sec);
    for (const { name, cc } of procs) {
      const li = document.createElement('li');
      li.appendChild(makeTag('odin-tag odin-tag-proc', 'proc'));
      li.appendChild(document.createTextNode(' ' + name));
      if (cc) {
        li.appendChild(document.createTextNode(' '));
        li.appendChild(makeTag('odin-tag odin-tag-cc', '"' + cc + '"'));
      }
      ul.appendChild(li);
    }
  }

  // Structs
  if (structs.length > 0) {
    const sec = makeSection(host, `Structs (${structs.length})`);
    const ul = makeList(sec);
    for (const name of structs) {
      const li = document.createElement('li');
      li.appendChild(makeTag('odin-tag odin-tag-struct', 'struct'));
      li.appendChild(document.createTextNode(' ' + name));
      ul.appendChild(li);
    }
  }

  // Unions
  if (unions.length > 0) {
    const sec = makeSection(host, `Unions (${unions.length})`);
    const ul = makeList(sec);
    for (const name of unions) {
      const li = document.createElement('li');
      li.appendChild(makeTag('odin-tag odin-tag-union', 'union'));
      li.appendChild(document.createTextNode(' ' + name));
      ul.appendChild(li);
    }
  }

  // Enums
  if (enums.length > 0) {
    const sec = makeSection(host, `Enums (${enums.length})`);
    const ul = makeList(sec);
    for (const name of enums) {
      const li = document.createElement('li');
      li.appendChild(makeTag('odin-tag odin-tag-enum', 'enum'));
      li.appendChild(document.createTextNode(' ' + name));
      ul.appendChild(li);
    }
  }

  // When conditions
  if (whenCount > 0) {
    const note = document.createElement('div');
    note.style.cssText = 'font-size:12px;color:var(--fg-2,#888);margin-top:4px;padding:6px 14px;border:1px solid var(--border,#e0e0e0);border-radius:8px;';
    note.textContent = `${whenCount} compile-time when condition${whenCount !== 1 ? 's' : ''} found`;
    host.appendChild(note);
  }

  return { parentNode: host };
}
