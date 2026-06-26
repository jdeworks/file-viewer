import { chip, ensureKnownUiStyle, esc, issueList, sourceButton, sourcePreview, wireSourceLinks } from '../../../../core/known-ui.js';

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
.f90-sig{font-family:ui-monospace,monospace;white-space:normal;overflow-wrap:anywhere;}
.f90-source-keyword{color:#2e7d32;font-weight:700;}
.f90-source-type{color:#1565c0;font-weight:600;}
.f90-source-string{color:#b45309;}
.f90-source-comment{color:var(--fg-2,#6e7681);font-style:italic;}
`;

function analyzeFortran(text) {
  const lines = text.split(/\r?\n/);
  let program = null;
  const modules = [];
  const subroutines = [];
  const functions = [];
  const useStmts = [];
  let implicitNoneCount = 0;
  const commonBlocks = [];
  const parameters = [];
  const issues = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    // Skip comment lines (! in free form, C/c/* in fixed form at column 1)
    if (trimmed.startsWith('!') || /^[Cc*]/.test(line[0] || '')) continue;
    // Strip inline comments
    const codePart = trimmed.split('!')[0].trim();
    if (!codePart) continue;

    // PROGRAM name
    const progM = codePart.match(/^PROGRAM\s+(\w+)/i);
    if (progM && !program) { program = { name: progM[1], line: i + 1 }; continue; }

    // MODULE name (not MODULE PROCEDURE)
    const modM = codePart.match(/^MODULE\s+(?!PROCEDURE\b)(\w+)/i);
    if (modM) { modules.push({ name: modM[1], line: i + 1 }); continue; }

    // SUBROUTINE name
    const subM = codePart.match(/^((?:(?:PURE|ELEMENTAL|RECURSIVE)\s+)*)SUBROUTINE\s+(\w+)\s*(?:\(([^)]*)\))?/i);
    if (subM) {
      subroutines.push({
        name: subM[2],
        qualifiers: words(subM[1]),
        args: splitArgs(subM[3] || ''),
        signature: codePart,
        line: i + 1,
        bodyLines: procedureLength(lines, i),
      });
      continue;
    }

    // FUNCTION name
    const fnM = codePart.match(/^((?:(?:PURE|ELEMENTAL|RECURSIVE)\s+)*(?:(?:INTEGER|REAL|DOUBLE\s+PRECISION|COMPLEX|LOGICAL|CHARACTER|TYPE\s*\(\w+\))\s+)?)FUNCTION\s+(\w+)\s*(?:\(([^)]*)\))?(?:\s+RESULT\s*\((\w+)\))?/i);
    if (fnM) {
      functions.push({
        name: fnM[2],
        qualifiers: words(fnM[1]).filter((w) => !/^(INTEGER|REAL|DOUBLE|PRECISION|COMPLEX|LOGICAL|CHARACTER|TYPE)$/i.test(w)),
        result: fnM[4] || '',
        args: splitArgs(fnM[3] || ''),
        signature: codePart,
        line: i + 1,
        bodyLines: procedureLength(lines, i),
      });
      continue;
    }

    // USE module
    const useM = codePart.match(/^USE\s+(?:::)?\s*(\w+)(?:\s*,\s*ONLY\s*:\s*(.+))?/i);
    if (useM) { useStmts.push({ module: useM[1], only: useM[2] ? useM[2].split(',').map((s) => s.trim()).filter(Boolean) : [], line: i + 1 }); continue; }

    // IMPLICIT NONE
    if (/^IMPLICIT\s+NONE/i.test(codePart)) { implicitNoneCount++; continue; }

    // COMMON blocks
    const commonM = codePart.match(/^COMMON\s*\/(\w+)\//i);
    if (commonM) { commonBlocks.push({ name: commonM[1], line: i + 1 }); continue; }
    const commonAnon = codePart.match(/^COMMON\s+(?!\/)/i);
    if (commonAnon) { commonBlocks.push({ name: '(unnamed)', line: i + 1 }); continue; }

    // PARAMETER declarations
    const paramM = codePart.match(/^(?:(?:INTEGER|REAL|DOUBLE\s+PRECISION|COMPLEX|LOGICAL|CHARACTER)\s*,\s*)?PARAMETER\s*::\s*(.+)/i);
    if (paramM) {
      const names = paramM[1].match(/\w+\s*=/g) || [];
      for (const n of names) parameters.push({ name: n.replace(/\s*=$/, '').trim(), line: i + 1 });
      continue;
    }
  }

  if (implicitNoneCount === 0) {
    issues.push({ severity: 'warning', label: 'implicit typing', message: 'No IMPLICIT NONE declaration was found; undeclared names may become implicit variables.' });
  }
  if (commonBlocks.length) {
    issues.push({ severity: 'info', label: 'COMMON block', line: commonBlocks[0].line, message: 'COMMON shares storage across program units and is legacy global state; verify callers agree on layout and type.' });
  }

  return {
    program,
    modules: uniqueByName(modules),
    subroutines,
    functions,
    useStmts: uniqueByName(useStmts, 'module'),
    implicitNoneCount,
    commonBlocks: uniqueByName(commonBlocks),
    parameters,
    issues,
  };
}

function words(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean);
}

function splitArgs(text) {
  return String(text || '').split(',').map((s) => s.trim()).filter(Boolean);
}

function uniqueByName(items, key = 'name') {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const value = String(item[key]).toLowerCase();
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(item);
  }
  return out;
}

function procedureLength(lines, start) {
  let count = 0;
  for (let i = start + 1; i < lines.length; i++) {
    const code = lines[i].trim().split('!')[0].trim();
    if (/^END\s+(SUBROUTINE|FUNCTION)\b/i.test(code)) return count;
    if (code) count++;
  }
  return count;
}

function tag(text, cls = 'f90-tag') {
  const span = document.createElement('span');
  span.className = cls;
  span.textContent = text;
  span.title = tagHint(text);
  return span;
}

function tagHint(text) {
  const hints = {
    PROGRAM: 'Executable Fortran program unit.',
    MODULE: 'Reusable namespace for procedures, types, and constants.',
    USE: 'Imports symbols from another module.',
    SUBROUTINE: 'Procedure called for side effects; it does not return a value directly.',
    FUNCTION: 'Procedure that returns a value, optionally through RESULT(name).',
    PARAMETER: 'Named compile-time constant.',
    COMMON: 'Legacy shared storage block; check layout consistency across program units.',
    PURE: 'Procedure should have no side effects visible outside its arguments/result.',
    RECURSIVE: 'Procedure may call itself.',
    ELEMENTAL: 'Procedure can apply element-wise to arrays.',
  };
  return hints[text] || '';
}

function highlightFortranLine(line) {
  if (/^\s*!/.test(line)) return `<span class="f90-source-comment">${esc(line)}</span>`;
  let out = esc(line);
  out = out.replace(/(&#39;[^&]*?&#39;|&quot;[^&]*?&quot;)/g, '<span class="f90-source-string">$1</span>');
  out = out.replace(/\b(PROGRAM|MODULE|USE|ONLY|IMPLICIT|NONE|CONTAINS|SUBROUTINE|FUNCTION|RESULT|END|DO|IF|THEN|ELSE|CALL|PARAMETER|COMMON|PURE|RECURSIVE|ELEMENTAL)\b/gi, '<span class="f90-source-keyword">$1</span>');
  out = out.replace(/\b(INTEGER|REAL|DOUBLE PRECISION|COMPLEX|LOGICAL|CHARACTER|TYPE)\b/gi, '<span class="f90-source-type">$1</span>');
  return out;
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

  const { program, modules, subroutines, functions, useStmts, implicitNoneCount, commonBlocks, parameters, issues } = analyzeFortran(text);

  const host = document.createElement('div');
  host.className = 'f90-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);
  ensureKnownUiStyle(host);

  // Title
  const title = document.createElement('div');
  title.className = 'f90-title';
  const badge = document.createElement('span');
  badge.className = 'f90-badge';
  badge.textContent = badgeLabel;
  title.appendChild(badge);
  const sub1 = document.createElement('span');
  sub1.className = 'f90-badge-sub';
  sub1.textContent = program?.name || (modules.length ? modules[0].name : filename);
  title.appendChild(sub1);
  host.appendChild(title);

  // Sub line
  const sub = document.createElement('div');
  sub.className = 'f90-sub';
  const parts = [];
  if (program) parts.push('program: ' + program.name);
  if (modules.length) parts.push(`${modules.length} module${modules.length !== 1 ? 's' : ''}`);
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
  if (program || modules.length > 0) {
    const items = [];
    if (program) items.push({ kind: 'PROGRAM', name: program.name, line: program.line });
    for (const m of modules) items.push({ kind: 'MODULE', name: m.name, line: m.line });
    const sec = makeSection(host, 'Program Units');
    const ul = makeList(sec);
    for (const { kind, name, line } of items) {
      const li = document.createElement('li');
      li.appendChild(tag(kind));
      li.appendChild(sourceButton(name, line, 'Open program unit in source'));
      ul.appendChild(li);
    }
  }

  // USE statements
  if (useStmts.length > 0) {
    const sec = makeSection(host, `USE Imports (${useStmts.length})`);
    const ul = makeList(sec);
    for (const u of useStmts) {
      const li = document.createElement('li');
      li.appendChild(tag('USE', 'f90-tag f90-tag-use'));
      li.appendChild(sourceButton(u.module, u.line, 'Open USE statement in source'));
      if (u.only.length) li.appendChild(chip(`ONLY: ${u.only.join(', ')}`, 'info'));
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
      li.appendChild(tag('SUBROUTINE', 'f90-tag f90-tag-sub'));
      for (const q of s.qualifiers) li.appendChild(chip(q, 'info', tagHint(q.toUpperCase())));
      li.appendChild(sourceButton(s.name, s.line, 'Open subroutine in source'));
      li.appendChild(chip(`arity ${s.args.length}`, 'muted'));
      li.appendChild(chip(`${s.bodyLines} lines`, s.bodyLines > 25 ? 'warn' : 'muted'));
      const sig = document.createElement('span');
      sig.className = 'f90-sig';
      sig.textContent = s.signature;
      li.appendChild(sig);
      for (const arg of s.args) li.appendChild(chip(arg, 'muted', 'Dummy argument from the subroutine signature.'));
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
      li.appendChild(tag('FUNCTION', 'f90-tag f90-tag-fn'));
      for (const q of f.qualifiers) li.appendChild(chip(q, 'info', tagHint(q.toUpperCase())));
      li.appendChild(sourceButton(f.name, f.line, 'Open function in source'));
      li.appendChild(chip(`arity ${f.args.length}`, 'muted'));
      if (f.result) li.appendChild(chip(`RESULT(${f.result})`, 'info'));
      li.appendChild(chip(`${f.bodyLines} lines`, f.bodyLines > 25 ? 'warn' : 'muted'));
      const sig = document.createElement('span');
      sig.className = 'f90-sig';
      sig.textContent = f.signature;
      li.appendChild(sig);
      for (const arg of f.args) li.appendChild(chip(arg, 'muted', 'Dummy argument from the function signature.'));
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
      li.appendChild(tag('COMMON', 'f90-tag f90-tag-common'));
      li.appendChild(sourceButton('/' + c.name + '/', c.line, 'Open COMMON block in source'));
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
      li.appendChild(tag('PARAMETER', 'f90-tag f90-tag-param'));
      li.appendChild(sourceButton(p.name, p.line, 'Open parameter declaration in source'));
      ul.appendChild(li);
    }
    if (parameters.length > MAX) {
      const li = document.createElement('li');
      li.textContent = `… and ${parameters.length - MAX} more`;
      li.style.color = 'var(--fg-2,#888)';
      ul.appendChild(li);
    }
  }

  const issueEl = issueList(issues, { title: 'Review Notes' });
  if (issueEl) host.appendChild(issueEl);

  host.appendChild(sourcePreview(text, { title: 'Source', collapsed: true, idPrefix: 'f90-line', highlighter: highlightFortranLine }));
  wireSourceLinks(host, { idPrefix: 'f90-line' });

  return { parentNode: host };
}
