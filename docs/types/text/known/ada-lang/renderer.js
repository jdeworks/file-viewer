const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.ada-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.ada-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#00558b;color:#fff;vertical-align:middle;margin-right:8px;}
.ada-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.ada-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.ada-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.ada-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.ada-card strong{display:block;font-size:1.2rem;font-weight:700;}
.ada-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.ada-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.ada-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.ada-list{margin:0;padding:0;list-style:none;}
.ada-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;}
.ada-list li:last-child{border-bottom:none;}
.ada-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#e0f2fe;color:#0369a1;font-weight:700;}
.ada-tag-with{background:#dcfce7;color:#166534;}
.ada-tag-proc{background:#ede9fe;color:#7c3aed;}
.ada-tag-func{background:#dbeafe;color:#1d4ed8;}
.ada-tag-type{background:#fef9c3;color:#854d0e;}
.ada-tag-pragma{background:#ffe4e6;color:#9f1239;}
.ada-tag-generic{background:#f0fdf4;color:#15803d;}
.ada-pkg{font-family:ui-monospace,monospace;font-size:13px;color:#00558b;font-weight:700;}
`;

function analyzeAda(text, isSpec) {
  const lines = text.split(/\r?\n/);
  let unitName = null;
  const withs = [];
  const procedures = [];
  const functions = [];
  const types = [];
  const pragmas = [];
  const generics = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip comments
    if (trimmed.startsWith('--')) continue;

    // with clause (case-insensitive)
    const withM = trimmed.match(/^with\s+([\w.]+)\s*;/i);
    if (withM) { withs.push(withM[1]); continue; }

    // generic (mark next subprogram as generic)
    if (/^generic\b/i.test(trimmed)) { generics.push(i); continue; }

    // package declaration
    const pkgM = trimmed.match(/^package\s+([\w.]+)\s+is\b/i);
    if (pkgM && !unitName) { unitName = pkgM[1]; continue; }

    // package body
    const pkgBodyM = trimmed.match(/^package\s+body\s+([\w.]+)\s+is\b/i);
    if (pkgBodyM && !unitName) { unitName = pkgBodyM[1]; continue; }

    // standalone procedure declaration/definition
    const procM = trimmed.match(/^procedure\s+([\w.]+)/i);
    if (procM) {
      const isGeneric = generics.some(gi => gi === i - 1 || gi === i - 2);
      procedures.push({ name: procM[1], generic: isGeneric });
      continue;
    }

    // function declaration/definition
    const funcM = trimmed.match(/^function\s+([\w."]+)/i);
    if (funcM) {
      const isGeneric = generics.some(gi => gi === i - 1 || gi === i - 2);
      functions.push({ name: funcM[1], generic: isGeneric });
      continue;
    }

    // type declaration
    const typeM = trimmed.match(/^type\s+(\w+)/i);
    if (typeM) {
      let kind = 'type';
      if (/\brecord\b/i.test(trimmed)) kind = 'record';
      else if (/\bnew\b/i.test(trimmed)) kind = 'derived';
      else if (/\baccess\b/i.test(trimmed)) kind = 'access';
      else if (/\brange\b/i.test(trimmed)) kind = 'range';
      types.push({ name: typeM[1], kind });
      continue;
    }

    // pragma
    const pragmaM = trimmed.match(/^pragma\s+(\w+)/i);
    if (pragmaM) { pragmas.push(pragmaM[1]); continue; }
  }

  return { unitName, withs, procedures, functions, types, pragmas, genericCount: generics.length };
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'ada-section';
  const hd = document.createElement('div');
  hd.className = 'ada-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}

function makeList(sec) {
  const ul = document.createElement('ul');
  ul.className = 'ada-list';
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
  const filename = (intake.name || intake.filename || '').toLowerCase();
  const isSpec = filename.endsWith('.ads');

  // Content guard
  const preview = text.slice(0, 3000);
  if (!/package\s/i.test(preview) && !/procedure\s/i.test(preview) && !/function\s/i.test(preview)) {
    return null;
  }

  const { unitName, withs, procedures, functions, types, pragmas, genericCount } = analyzeAda(text, isSpec);

  const host = document.createElement('div');
  host.className = 'ada-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const badgeText = isSpec ? 'Ada Spec' : 'Ada Body';

  // Title
  const title = document.createElement('div');
  title.className = 'ada-title';
  const badge = document.createElement('span');
  badge.className = 'ada-badge';
  badge.textContent = badgeText;
  title.appendChild(badge);
  if (unitName) {
    const nameSpan = document.createElement('span');
    nameSpan.className = 'ada-pkg';
    nameSpan.textContent = unitName;
    title.appendChild(nameSpan);
  }
  host.appendChild(title);

  // Sub
  const sub = document.createElement('div');
  sub.className = 'ada-sub';
  const parts = [];
  if (unitName) parts.push(unitName);
  if (withs.length > 0) parts.push(`${withs.length} with clause${withs.length !== 1 ? 's' : ''}`);
  if (procedures.length > 0) parts.push(`${procedures.length} procedure${procedures.length !== 1 ? 's' : ''}`);
  if (functions.length > 0) parts.push(`${functions.length} function${functions.length !== 1 ? 's' : ''}`);
  if (types.length > 0) parts.push(`${types.length} type${types.length !== 1 ? 's' : ''}`);
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Cards
  const cards = document.createElement('div');
  cards.className = 'ada-cards';
  const cardItems = [
    { value: withs.length, label: 'With Clauses' },
    { value: procedures.length, label: 'Procedures' },
    { value: functions.length, label: 'Functions' },
    { value: types.length, label: 'Types' },
  ];
  for (const { value, label } of cardItems) {
    const card = document.createElement('div');
    card.className = 'ada-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  // With clauses (like imports)
  if (withs.length > 0) {
    const MAX = 6;
    const shown = withs.slice(0, MAX);
    const sec = makeSection(host, `With Clauses (${withs.length})`);
    const ul = makeList(sec);
    for (const w of shown) {
      const li = document.createElement('li');
      li.appendChild(makeTag('ada-tag ada-tag-with', 'with'));
      li.appendChild(document.createTextNode(' ' + w));
      ul.appendChild(li);
    }
    if (withs.length > MAX) {
      const li = document.createElement('li');
      li.textContent = `… and ${withs.length - MAX} more`;
      li.style.color = 'var(--fg-2,#888)';
      ul.appendChild(li);
    }
  }

  // Procedures
  if (procedures.length > 0) {
    const sec = makeSection(host, `Procedures (${procedures.length})`);
    const ul = makeList(sec);
    for (const { name, generic } of procedures) {
      const li = document.createElement('li');
      if (generic) { li.appendChild(makeTag('ada-tag ada-tag-generic', 'generic')); li.appendChild(document.createTextNode(' ')); }
      li.appendChild(makeTag('ada-tag ada-tag-proc', 'procedure'));
      li.appendChild(document.createTextNode(' ' + name));
      ul.appendChild(li);
    }
  }

  // Functions
  if (functions.length > 0) {
    const sec = makeSection(host, `Functions (${functions.length})`);
    const ul = makeList(sec);
    for (const { name, generic } of functions) {
      const li = document.createElement('li');
      if (generic) { li.appendChild(makeTag('ada-tag ada-tag-generic', 'generic')); li.appendChild(document.createTextNode(' ')); }
      li.appendChild(makeTag('ada-tag ada-tag-func', 'function'));
      li.appendChild(document.createTextNode(' ' + name));
      ul.appendChild(li);
    }
  }

  // Types
  if (types.length > 0) {
    const sec = makeSection(host, `Types (${types.length})`);
    const ul = makeList(sec);
    for (const { name, kind } of types) {
      const li = document.createElement('li');
      li.appendChild(makeTag('ada-tag ada-tag-type', kind));
      li.appendChild(document.createTextNode(' ' + name));
      ul.appendChild(li);
    }
  }

  // Pragmas
  if (pragmas.length > 0) {
    const sec = makeSection(host, `Pragmas (${pragmas.length})`);
    const ul = makeList(sec);
    for (const name of pragmas) {
      const li = document.createElement('li');
      li.appendChild(makeTag('ada-tag ada-tag-pragma', 'pragma'));
      li.appendChild(document.createTextNode(' ' + name));
      ul.appendChild(li);
    }
  }

  return { parentNode: host };
}
