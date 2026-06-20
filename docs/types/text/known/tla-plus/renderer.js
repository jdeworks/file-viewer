const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.tla-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.tla-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#2c3e50;color:#fff;vertical-align:middle;margin-right:8px;}
.tla-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.tla-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.tla-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.tla-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.tla-card strong{display:block;font-size:1.2rem;font-weight:700;}
.tla-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.tla-section{margin:16px 0;}
.tla-section h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.tla-table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px;}
.tla-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:5px 10px;border-bottom:2px solid var(--border,#e0e0e0);background:var(--bg,#fff);}
.tla-table td{padding:5px 10px;border-bottom:1px solid var(--border,#eaecf0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
.tla-table tr:last-child td{border-bottom:none;}
.tla-tag{display:inline-block;background:var(--bg-2,#eef2f7);border:1px solid var(--border,#d9e1ec);border-radius:4px;padding:1px 7px;font-family:ui-monospace,monospace;font-size:12px;margin:2px 3px 2px 0;}
`;

function parseTla(text) {
  const lines = (text || '').split(/\r?\n/);
  let moduleName = null;
  const variables = [];
  const constants = [];
  let assumeCount = 0;
  let theoremCount = 0;
  let opDefCount = 0;   // lines with == (operator definitions)
  const theorems = [];

  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('\\*')) continue;  // skip empty + line comments

    // Module name: ---- MODULE Foo ----
    const modMatch = t.match(/^-{4,}\s*MODULE\s+(\w+)/);
    if (modMatch) moduleName = modMatch[1];

    // VARIABLES a, b, c
    const varMatch = t.match(/^VARIABLES?\s+(.+)/);
    if (varMatch) {
      const vars = varMatch[1].split(/,/).map((v) => v.trim()).filter(Boolean);
      variables.push(...vars);
    }

    // CONSTANTS A, B
    const constMatch = t.match(/^CONSTANTS?\s+(.+)/);
    if (constMatch) {
      const consts = constMatch[1].split(/,/).map((c) => c.trim()).filter(Boolean);
      constants.push(...consts);
    }

    // ASSUME declarations
    if (/^ASSUME\b/.test(t)) assumeCount++;

    // THEOREM declarations
    if (/^THEOREM\b/.test(t)) {
      theoremCount++;
      // Try to extract theorem name or body snippet
      const thmMatch = t.match(/^THEOREM\s+(\w+)\s*==/) || t.match(/^THEOREM\s+(.{1,60})/);
      if (thmMatch) theorems.push(thmMatch[1]);
    }

    // Operator definitions: Name == ...
    // Avoid counting module delimiters, THEOREM/ASSUME lines
    if (/\w+\s*==/.test(t) && !/^THEOREM\b/.test(t) && !/^ASSUME\b/.test(t)) {
      opDefCount++;
    }
  }

  return { moduleName, variables, constants, assumeCount, theoremCount, theorems, opDefCount };
}

export function render(intake) {
  const parsed = parseTla(intake.text || '');
  const { moduleName, variables, constants, assumeCount, theoremCount, theorems, opDefCount } = parsed;

  const host = document.createElement('div');
  host.className = 'tla-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const titleEl = document.createElement('div');
  titleEl.className = 'tla-title';
  titleEl.innerHTML = `<span class="tla-badge">TLA+</span>${moduleName ? esc(moduleName) : 'Module'}`;
  host.appendChild(titleEl);

  const parts = [];
  if (variables.length) parts.push(`${variables.length} variable${variables.length !== 1 ? 's' : ''}`);
  if (constants.length) parts.push(`${constants.length} constant${constants.length !== 1 ? 's' : ''}`);
  if (opDefCount) parts.push(`${opDefCount} operator def${opDefCount !== 1 ? 's' : ''}`);
  if (theoremCount) parts.push(`${theoremCount} theorem${theoremCount !== 1 ? 's' : ''}`);

  const sub = document.createElement('div');
  sub.className = 'tla-sub';
  sub.textContent = parts.length ? parts.join(' · ') : 'TLA+ specification';
  host.appendChild(sub);

  // Summary cards
  const summary = document.createElement('div');
  summary.className = 'tla-summary';
  const cards = [
    { value: variables.length, label: 'Variables' },
    { value: constants.length, label: 'Constants' },
    { value: opDefCount, label: 'Operators' },
    { value: assumeCount, label: 'Assumes' },
    { value: theoremCount, label: 'Theorems' },
  ];
  for (const { value, label } of cards) {
    const card = document.createElement('div');
    card.className = 'tla-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    summary.appendChild(card);
  }
  host.appendChild(summary);

  // Variables list
  if (variables.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'tla-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Variables';
    sec.appendChild(h3);
    const div = document.createElement('div');
    for (const v of variables.slice(0, 50)) {
      const span = document.createElement('span');
      span.className = 'tla-tag';
      span.textContent = v;
      div.appendChild(span);
    }
    sec.appendChild(div);
    host.appendChild(sec);
  }

  // Constants list
  if (constants.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'tla-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Constants';
    sec.appendChild(h3);
    const div = document.createElement('div');
    for (const c of constants.slice(0, 50)) {
      const span = document.createElement('span');
      span.className = 'tla-tag';
      span.textContent = c;
      div.appendChild(span);
    }
    sec.appendChild(div);
    host.appendChild(sec);
  }

  // Theorems
  if (theorems.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'tla-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Theorems';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'tla-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Statement</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const thm of theorems.slice(0, 20)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(thm)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  return { parentNode: host };
}
