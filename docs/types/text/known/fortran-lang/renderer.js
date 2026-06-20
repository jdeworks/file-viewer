const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.f90-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.f90-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#2e7d32;color:#fff;vertical-align:middle;margin-right:8px;}
.f90-badge-sub{display:inline-block;padding:2px 7px;border-radius:8px;font-size:10px;font-weight:700;background:#e8f5e9;color:#2e7d32;vertical-align:middle;margin-left:6px;}
.f90-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.f90-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.f90-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.f90-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.f90-card strong{display:block;font-size:1.2rem;font-weight:700;}
.f90-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.f90-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.f90-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.f90-list{margin:0;padding:0;list-style:none;}
.f90-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.f90-list li:last-child{border-bottom:none;}
.f90-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#e8f5e9;color:#2e7d32;font-weight:700;}
.f90-tag-sub{background:#e3f2fd;color:#1565c0;}
.f90-tag-fn{background:#f3e5f5;color:#6a1b9a;}
.f90-tag-use{background:#fff8e1;color:#f57f17;}
.f90-tag-param{background:#fce4ec;color:#880e4f;}
.f90-tag-common{background:#e0f2f1;color:#00695c;}
`;

function analyzeFortran(text) {
  const lines = text.split(/\r?\n/);
  let programName = null;
  const moduleNames = [];
  const subroutines = [];
  const functions = [];
  const useStmts = [];
  let implicitNoneCount = 0;
  const commonBlocks = [];
  const parameters = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip comment lines (! in free form, C/c/* in fixed form at column 1)
    if (trimmed.startsWith('!') || /^[Cc*]/.test(line[0] || '')) continue;
    // Strip inline comments
    const codePart = trimmed.split('!')[0].trim();
    if (!codePart) continue;

    // PROGRAM name
    const progM = codePart.match(/^PROGRAM\s+(\w+)/i);
    if (progM && !programName) { programName = progM[1]; continue; }

    // MODULE name (not MODULE PROCEDURE)
    const modM = codePart.match(/^MODULE\s+(?!PROCEDURE\b)(\w+)/i);
    if (modM) { moduleNames.push(modM[1]); continue; }

    // SUBROUTINE name
    const subM = codePart.match(/^(?:(?:PURE|ELEMENTAL|RECURSIVE)\s+)?SUBROUTINE\s+(\w+)/i);
    if (subM) { subroutines.push(subM[1]); continue; }

    // FUNCTION name
    const fnM = codePart.match(/^(?:(?:PURE|ELEMENTAL|RECURSIVE|(?:INTEGER|REAL|DOUBLE\s+PRECISION|COMPLEX|LOGICAL|CHARACTER|TYPE\s*\(\w+\))\s+))?FUNCTION\s+(\w+)/i);
    if (fnM) { functions.push(fnM[1]); continue; }

    // USE module
    const useM = codePart.match(/^USE\s+(?:::)?\s*(\w+)/i);
    if (useM) { useStmts.push(useM[1]); continue; }

    // IMPLICIT NONE
    if (/^IMPLICIT\s+NONE/i.test(codePart)) { implicitNoneCount++; continue; }

    // COMMON blocks
    const commonM = codePart.match(/^COMMON\s*\/(\w+)\//i);
    if (commonM) { commonBlocks.push(commonM[1]); continue; }
    const commonAnon = codePart.match(/^COMMON\s+(?!\/)/i);
    if (commonAnon) { commonBlocks.push('(unnamed)'); continue; }

    // PARAMETER declarations
    const paramM = codePart.match(/^(?:(?:INTEGER|REAL|DOUBLE\s+PRECISION|COMPLEX|LOGICAL|CHARACTER)\s*,\s*)?PARAMETER\s*::\s*(.+)/i);
    if (paramM) {
      const names = paramM[1].match(/\w+\s*=/g) || [];
      for (const n of names) parameters.push(n.replace(/\s*=$/, '').trim());
      continue;
    }
  }

  return {
    programName,
    moduleNames: [...new Set(moduleNames)],
    subroutines,
    functions,
    useStmts: [...new Set(useStmts)],
    implicitNoneCount,
    commonBlocks: [...new Set(commonBlocks)],
    parameters,
  };
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'f90-section';
  const hd = document.createElement('div');
  hd.className = 'f90-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}

function makeList(sec) {
  const ul = document.createElement('ul');
  ul.className = 'f90-list';
  sec.appendChild(ul);
  return ul;
}

export async function render(intake, _ctx) {
  const text = intake.text || '';
  const filename = (intake.name || intake.filename || '').split('/').pop();
  const ext = filename.includes('.') ? filename.slice(filename.lastIndexOf('.')).toLowerCase() : '';
  const isLegacy = ext === '.f' || ext === '.for' || ext === '.f77';
  const badgeLabel = isLegacy ? 'Fortran 77' : 'Free Form Fortran';

  const { programName, moduleNames, subroutines, functions, useStmts, implicitNoneCount, commonBlocks, parameters } = analyzeFortran(text);

  const host = document.createElement('div');
  host.className = 'f90-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  // Title
  const title = document.createElement('div');
  title.className = 'f90-title';
  const badge = document.createElement('span');
  badge.className = 'f90-badge';
  badge.textContent = badgeLabel;
  title.appendChild(badge);
  const sub1 = document.createElement('span');
  sub1.className = 'f90-badge-sub';
  sub1.textContent = programName || (moduleNames.length ? moduleNames[0] : filename);
  title.appendChild(sub1);
  host.appendChild(title);

  // Sub line
  const sub = document.createElement('div');
  sub.className = 'f90-sub';
  const parts = [];
  if (programName) parts.push('program: ' + programName);
  if (moduleNames.length) parts.push(`${moduleNames.length} module${moduleNames.length !== 1 ? 's' : ''}`);
  parts.push(`${subroutines.length} subroutine${subroutines.length !== 1 ? 's' : ''}`);
  parts.push(`${functions.length} function${functions.length !== 1 ? 's' : ''}`);
  if (useStmts.length) parts.push(`${useStmts.length} USE import${useStmts.length !== 1 ? 's' : ''}`);
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Cards
  const cards = document.createElement('div');
  cards.className = 'f90-cards';
  const cardItems = [
    { value: subroutines.length, label: 'Subroutines' },
    { value: functions.length, label: 'Functions' },
    { value: useStmts.length, label: 'USE imports' },
    { value: implicitNoneCount, label: 'IMPLICIT NONE' },
  ];
  for (const { value, label } of cardItems) {
    const card = document.createElement('div');
    card.className = 'f90-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  // Program / Module names
  if (programName || moduleNames.length > 0) {
    const items = [];
    if (programName) items.push({ kind: 'PROGRAM', name: programName });
    for (const m of moduleNames) items.push({ kind: 'MODULE', name: m });
    const sec = makeSection(host, 'Program Units');
    const ul = makeList(sec);
    for (const { kind, name } of items) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'f90-tag';
      tag.textContent = kind;
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + name));
      ul.appendChild(li);
    }
  }

  // USE statements
  if (useStmts.length > 0) {
    const sec = makeSection(host, `USE Imports (${useStmts.length})`);
    const ul = makeList(sec);
    for (const u of useStmts) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'f90-tag f90-tag-use';
      tag.textContent = 'USE';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + u));
      ul.appendChild(li);
    }
  }

  // Subroutines
  if (subroutines.length > 0) {
    const MAX = 20;
    const sec = makeSection(host, `Subroutines (${subroutines.length})`);
    const ul = makeList(sec);
    for (const s of subroutines.slice(0, MAX)) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'f90-tag f90-tag-sub';
      tag.textContent = 'SUBROUTINE';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + s));
      ul.appendChild(li);
    }
    if (subroutines.length > MAX) {
      const li = document.createElement('li');
      li.textContent = `… and ${subroutines.length - MAX} more`;
      li.style.color = 'var(--fg-2,#888)';
      ul.appendChild(li);
    }
  }

  // Functions
  if (functions.length > 0) {
    const MAX = 20;
    const sec = makeSection(host, `Functions (${functions.length})`);
    const ul = makeList(sec);
    for (const f of functions.slice(0, MAX)) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'f90-tag f90-tag-fn';
      tag.textContent = 'FUNCTION';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + f));
      ul.appendChild(li);
    }
    if (functions.length > MAX) {
      const li = document.createElement('li');
      li.textContent = `… and ${functions.length - MAX} more`;
      li.style.color = 'var(--fg-2,#888)';
      ul.appendChild(li);
    }
  }

  // COMMON blocks
  if (commonBlocks.length > 0) {
    const sec = makeSection(host, `COMMON Blocks (${commonBlocks.length})`);
    const ul = makeList(sec);
    for (const c of commonBlocks) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'f90-tag f90-tag-common';
      tag.textContent = 'COMMON';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' /' + c + '/'));
      ul.appendChild(li);
    }
  }

  // PARAMETER declarations
  if (parameters.length > 0) {
    const MAX = 15;
    const sec = makeSection(host, `Parameters (${parameters.length})`);
    const ul = makeList(sec);
    for (const p of parameters.slice(0, MAX)) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'f90-tag f90-tag-param';
      tag.textContent = 'PARAMETER';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + p));
      ul.appendChild(li);
    }
    if (parameters.length > MAX) {
      const li = document.createElement('li');
      li.textContent = `… and ${parameters.length - MAX} more`;
      li.style.color = 'var(--fg-2,#888)';
      ul.appendChild(li);
    }
  }

  return { parentNode: host };
}
