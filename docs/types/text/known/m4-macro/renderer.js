const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.m4-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.m4-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#b45309;color:#fff;vertical-align:middle;margin-right:8px;}
.m4-badge-ac{display:inline-block;padding:2px 7px;border-radius:8px;font-size:10px;font-weight:700;background:#fef3c7;color:#92400e;vertical-align:middle;margin-left:6px;}
.m4-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.m4-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.m4-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.m4-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:100px;}
.m4-card strong{display:block;font-size:1.2rem;font-weight:700;}
.m4-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.m4-card.m4-card-wide{min-width:160px;}
.m4-card strong.m4-val-sm{font-size:.95rem;}
.m4-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.m4-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.m4-list{margin:0;padding:0;list-style:none;}
.m4-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.m4-list li:last-child{border-bottom:none;}
.m4-tag{font-size:10px;padding:1px 5px;border-radius:4px;font-weight:700;}
.m4-tag-def{background:#dbeafe;color:#1d4ed8;}
.m4-tag-ac{background:#fef3c7;color:#92400e;}
.m4-tag-am{background:#d1fae5;color:#065f46;}
.m4-tag-check{background:#f3e8ff;color:#6b21a8;}
.m4-pill{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f1f5f9);border:1px solid var(--border,#cbd5e1);font-family:ui-monospace,monospace;margin:2px 2px;}
.m4-pre{margin:0;background:var(--bg,#fff);padding:14px 16px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre;}
`;

function analyzeM4(text) {
  const lines = text.split(/\r?\n/);

  let projectName = null;
  let projectVersion = null;
  let acPrereq = null;
  const defines = [];
  const acChecks = [];
  const amMacros = [];
  const includeFiles = [];
  let dnlCount = 0;
  let isAutoconf = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // dnl (M4 comments)
    if (/\bdnl\b/.test(trimmed)) { dnlCount++; continue; }
    if (trimmed.startsWith('dnl')) { dnlCount++; continue; }

    // AC_INIT(package, version, ...)
    const acInitM = trimmed.match(/AC_INIT\s*\(\s*\[?([^\],)]+)\]?\s*,\s*\[?([^\],)]+)\]?/);
    if (acInitM) {
      projectName = acInitM[1].trim().replace(/^\[|\]$/g, '');
      projectVersion = acInitM[2].trim().replace(/^\[|\]$/g, '');
      isAutoconf = true;
    }

    // AC_PREREQ
    const prereqM = trimmed.match(/AC_PREREQ\s*\(\s*\[?([^\])\s]+)/);
    if (prereqM) { acPrereq = prereqM[1].replace(/^\[|\]$/g, ''); isAutoconf = true; }

    // m4_define or plain define
    const defM = trimmed.match(/^(?:m4_)?define\s*\(\s*\[?([A-Za-z_][A-Za-z0-9_]*)\]?/);
    if (defM) { defines.push(defM[1]); continue; }

    // AC_ macros (Autoconf checks)
    const acM = trimmed.match(/^(AC_[A-Z_]+)\s*\(/);
    if (acM && acM[1] !== 'AC_INIT' && acM[1] !== 'AC_PREREQ') {
      isAutoconf = true;
      acChecks.push(acM[1]);
    }

    // AM_ macros (Automake)
    const amM = trimmed.match(/^(AM_[A_Z_]+)\s*\(/);
    if (amM) { amMacros.push(amM[1]); isAutoconf = true; }

    // m4_include
    const inclM = trimmed.match(/^m4_include\s*\(\s*\[?([^\])\s]+)/);
    if (inclM) { includeFiles.push(inclM[1].replace(/^\[|\]$/g, '')); }

    // include() builtin
    const inclM2 = trimmed.match(/^include\s*\(\s*\[?([^\])\s]+)/);
    if (inclM2) { includeFiles.push(inclM2[1].replace(/^\[|\]$/g, '')); }
  }

  return { projectName, projectVersion, acPrereq, defines, acChecks, amMacros, includeFiles, dnlCount, isAutoconf };
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'm4-section';
  const hd = document.createElement('div');
  hd.className = 'm4-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}

function makeList(sec) {
  const ul = document.createElement('ul');
  ul.className = 'm4-list';
  sec.appendChild(ul);
  return ul;
}

export function render(intake) {
  const text = intake.text || '';
  const name = (intake.name || intake.filename || '').split('/').pop();
  const { projectName, projectVersion, acPrereq, defines, acChecks, amMacros, includeFiles, dnlCount, isAutoconf } = analyzeM4(text);

  const host = document.createElement('div');
  host.className = 'm4-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  // Title
  const title = document.createElement('div');
  title.className = 'm4-title';
  let titleHtml = '<span class="m4-badge">M4 Macro</span>';
  if (isAutoconf) titleHtml += '<span class="m4-badge-ac">Autoconf</span>';
  title.innerHTML = titleHtml + esc(name);
  host.appendChild(title);

  // Sub
  const sub = document.createElement('div');
  sub.className = 'm4-sub';
  const parts = [];
  if (projectName) parts.push(`project: ${projectName}`);
  if (projectVersion) parts.push(`v${projectVersion}`);
  parts.push(`${defines.length} define${defines.length !== 1 ? 's' : ''}`);
  parts.push(`${acChecks.length} AC macro${acChecks.length !== 1 ? 's' : ''}`);
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Cards
  const cards = document.createElement('div');
  cards.className = 'm4-cards';

  if (projectName) {
    const card = document.createElement('div');
    card.className = 'm4-card m4-card-wide';
    const strong = document.createElement('strong');
    strong.className = 'm4-val-sm';
    strong.textContent = projectName;
    const span = document.createElement('span');
    span.textContent = 'Project';
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }

  const cardItems = [
    projectVersion ? { value: projectVersion, label: 'Version' } : null,
    acPrereq ? { value: acPrereq, label: 'AC prereq' } : null,
    { value: defines.length, label: 'Defines' },
    { value: acChecks.length, label: 'AC checks' },
    { value: includeFiles.length, label: 'Includes' },
  ].filter(Boolean);

  for (const { value, label } of cardItems) {
    const card = document.createElement('div');
    card.className = 'm4-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  // Defines
  if (defines.length > 0) {
    const MAX = 20;
    const shown = defines.slice(0, MAX);
    const extra = defines.length - shown.length;
    const sec = makeSection(host, `Macro Definitions (${defines.length})`);
    const ul = makeList(sec);
    for (const def of shown) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'm4-tag m4-tag-def';
      tag.textContent = 'define';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + def));
      ul.appendChild(li);
    }
    if (extra > 0) {
      const li = document.createElement('li');
      li.textContent = `… and ${extra} more`;
      li.style.color = 'var(--fg-2,#888)';
      ul.appendChild(li);
    }
  }

  // AC_ checks
  if (acChecks.length > 0) {
    const unique = [...new Set(acChecks)];
    const MAX = 20;
    const shown = unique.slice(0, MAX);
    const extra = unique.length - shown.length;
    const sec = makeSection(host, `Autoconf Macros (${acChecks.length} calls, ${unique.length} unique)`);
    const ul = makeList(sec);
    for (const check of shown) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'm4-tag m4-tag-ac';
      tag.textContent = 'AC';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + check));
      ul.appendChild(li);
    }
    if (extra > 0) {
      const li = document.createElement('li');
      li.textContent = `… and ${extra} more`;
      li.style.color = 'var(--fg-2,#888)';
      ul.appendChild(li);
    }
  }

  // AM_ macros
  if (amMacros.length > 0) {
    const unique = [...new Set(amMacros)];
    const sec = makeSection(host, `Automake Macros (${amMacros.length})`);
    const ul = makeList(sec);
    for (const am of unique) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'm4-tag m4-tag-am';
      tag.textContent = 'AM';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + am));
      ul.appendChild(li);
    }
  }

  // Includes
  if (includeFiles.length > 0) {
    const sec = makeSection(host, `Includes (${includeFiles.length})`);
    const ul = makeList(sec);
    for (const inc of includeFiles) {
      const li = document.createElement('li');
      li.textContent = inc;
      ul.appendChild(li);
    }
  }

  // Source
  const srcSec = makeSection(host, 'Source');
  const pre = document.createElement('pre');
  pre.className = 'm4-pre';
  pre.textContent = text;
  srcSec.appendChild(pre);

  return { parentNode: host };
}
