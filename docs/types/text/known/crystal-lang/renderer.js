const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.crl-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.cr-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#000;color:#fff;vertical-align:middle;margin-right:8px;}
.cr-badge-sub{display:inline-block;padding:2px 7px;border-radius:8px;font-size:10px;font-weight:700;background:#f0f0f0;color:#333;vertical-align:middle;margin-left:6px;}
.cr-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.cr-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.cr-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.cr-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.cr-card strong{display:block;font-size:1.2rem;font-weight:700;}
.cr-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.cr-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.cr-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.cr-list{margin:0;padding:0;list-style:none;}
.cr-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;}
.cr-list li:last-child{border-bottom:none;}
.cr-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#f0f0f0;color:#333;font-weight:700;}
.cr-tag-class{background:#e0f2f7;color:#0d6e8a;}
.cr-tag-struct{background:#fef3c7;color:#92400e;}
.cr-tag-module{background:#dcfce7;color:#166534;}
.cr-tag-enum{background:#fce7f3;color:#9d174d;}
.cr-tag-abstract{background:#ede9fe;color:#7f52ff;}
.cr-tag-macro{background:#fff7ed;color:#c2410c;}
.cr-ann{color:#c026d3;font-family:ui-monospace,monospace;font-size:12px;}
.cr-alias{font-family:ui-monospace,monospace;font-size:12px;color:#0d6e8a;}
`;

function analyzeCrystal(text) {
  const lines = text.split(/\r?\n/);
  const requires = [];
  const types = [];
  const defs = [];
  const annotations = new Set();
  const aliases = [];
  let abstractCount = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) continue;

    // Requires
    const reqM = trimmed.match(/^require\s+"([^"]+)"/);
    if (reqM) { requires.push(reqM[1]); continue; }

    // Annotations @[Name]
    const annM = trimmed.match(/^@\[(\w+)/);
    if (annM) { annotations.add(annM[1]); continue; }

    // Type aliases
    const aliasM = trimmed.match(/^alias\s+(\w+)\s*=/);
    if (aliasM) { aliases.push(aliasM[1]); continue; }

    // Abstract marker
    const isAbstract = /^abstract\s+/.test(trimmed);
    if (isAbstract) abstractCount++;

    // Types: class, struct, module, enum
    const typeM = trimmed.match(/^(?:abstract\s+)?(class|struct|module|enum)\s+(\w[\w:]*)/);
    if (typeM) {
      types.push({ kind: isAbstract ? 'abstract ' + typeM[1] : typeM[1], name: typeM[2] });
      continue;
    }

    // Defs and macros
    const defM = trimmed.match(/^(?:abstract\s+)?(def|macro)\s+(self\.)?(\w+[?!]?)/);
    if (defM) {
      defs.push({ kind: defM[1], name: (defM[2] || '') + defM[3], isAbstract: /^abstract\s+def/.test(trimmed) });
    }
  }

  // Detect Crystal::VERSION hint
  const hasVersion = /Crystal::VERSION/.test(text);

  return { requires, types, defs, annotations: [...annotations], aliases, abstractCount, hasVersion };
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'cr-section';
  const hd = document.createElement('div');
  hd.className = 'cr-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}

function makeList(sec) {
  const ul = document.createElement('ul');
  ul.className = 'cr-list';
  sec.appendChild(ul);
  return ul;
}

function tag(cls, text) {
  const span = document.createElement('span');
  span.className = 'cr-tag ' + (cls || '');
  span.textContent = text;
  return span;
}

export async function render(intake) {
  const text = intake.text || '';
  const { requires, types, defs, annotations, aliases, abstractCount, hasVersion } = analyzeCrystal(text);

  const host = document.createElement('div');
  host.className = 'crl-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  // Title
  const title = document.createElement('div');
  title.className = 'cr-title';
  const badge = document.createElement('span');
  badge.className = 'cr-badge';
  badge.textContent = 'Crystal';
  title.appendChild(badge);
  if (hasVersion) {
    const sub2 = document.createElement('span');
    sub2.className = 'cr-badge-sub';
    sub2.textContent = 'uses Crystal::VERSION';
    title.appendChild(sub2);
  }
  host.appendChild(title);

  // Subtitle
  const sub = document.createElement('div');
  sub.className = 'cr-sub';
  const parts = [];
  parts.push(`${requires.length} require${requires.length !== 1 ? 's' : ''}`);
  parts.push(`${types.length} type${types.length !== 1 ? 's' : ''}`);
  const defCount = defs.filter((d) => d.kind === 'def').length;
  const macroCount = defs.filter((d) => d.kind === 'macro').length;
  parts.push(`${defCount} def${defCount !== 1 ? 's' : ''}`);
  if (macroCount > 0) parts.push(`${macroCount} macro${macroCount !== 1 ? 's' : ''}`);
  if (abstractCount > 0) parts.push(`${abstractCount} abstract`);
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Cards
  const cards = document.createElement('div');
  cards.className = 'cr-cards';
  const cardItems = [
    { value: requires.length, label: 'Requires' },
    { value: types.length, label: 'Types' },
    { value: defCount, label: 'Defs' },
    { value: macroCount, label: 'Macros' },
  ];
  if (annotations.length > 0) cardItems.push({ value: annotations.length, label: 'Annotations' });
  if (aliases.length > 0) cardItems.push({ value: aliases.length, label: 'Aliases' });
  for (const { value, label } of cardItems) {
    const card = document.createElement('div');
    card.className = 'cr-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  // Requires
  if (requires.length > 0) {
    const sec = makeSection(host, `Requires (${requires.length})`);
    const ul = makeList(sec);
    for (const req of requires) {
      const li = document.createElement('li');
      li.textContent = req;
      ul.appendChild(li);
    }
  }

  // Types
  if (types.length > 0) {
    const sec = makeSection(host, `Types (${types.length})`);
    const ul = makeList(sec);
    for (const { kind, name: tname } of types) {
      const li = document.createElement('li');
      const base = kind.replace('abstract ', '');
      const cls = base === 'struct' ? 'cr-tag-struct' : base === 'module' ? 'cr-tag-module' : base === 'enum' ? 'cr-tag-enum' : 'cr-tag-class';
      if (kind.startsWith('abstract')) {
        li.appendChild(tag('cr-tag-abstract', 'abstract'));
        li.appendChild(document.createTextNode(' '));
      }
      li.appendChild(tag(cls, base));
      li.appendChild(document.createTextNode(' ' + tname));
      ul.appendChild(li);
    }
  }

  // Defs
  const defList = defs.filter((d) => d.kind === 'def');
  if (defList.length > 0) {
    const absCt = defList.filter((d) => d.isAbstract).length;
    const sec = makeSection(host, `Defs (${defList.length}${absCt ? `, ${absCt} abstract` : ''})`);
    const ul = makeList(sec);
    for (const { name: dname, isAbstract } of defList) {
      const li = document.createElement('li');
      if (isAbstract) {
        li.appendChild(tag('cr-tag-abstract', 'abstract'));
        li.appendChild(document.createTextNode(' '));
      }
      li.appendChild(document.createTextNode(dname));
      ul.appendChild(li);
    }
  }

  // Macros
  const macroList = defs.filter((d) => d.kind === 'macro');
  if (macroList.length > 0) {
    const sec = makeSection(host, `Macros (${macroList.length})`);
    const ul = makeList(sec);
    for (const { name: mname } of macroList) {
      const li = document.createElement('li');
      li.appendChild(tag('cr-tag-macro', 'macro'));
      li.appendChild(document.createTextNode(' ' + mname));
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
      span.className = 'cr-ann';
      span.textContent = '@[' + ann + ']';
      li.appendChild(span);
      ul.appendChild(li);
    }
  }

  // Type aliases
  if (aliases.length > 0) {
    const sec = makeSection(host, `Type Aliases (${aliases.length})`);
    const ul = makeList(sec);
    for (const al of aliases) {
      const li = document.createElement('li');
      const span = document.createElement('span');
      span.className = 'cr-alias';
      span.textContent = al;
      li.appendChild(span);
      ul.appendChild(li);
    }
  }

  return { parentNode: host };
}
