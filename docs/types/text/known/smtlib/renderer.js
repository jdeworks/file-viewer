const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.smt-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.smt-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1d4ed8;color:#fff;vertical-align:middle;margin-right:8px;}
.smt-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.smt-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.smt-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.smt-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:120px;}
.smt-card strong{display:block;font-size:1.2rem;font-weight:700;}
.smt-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.smt-sec{margin:16px 0;}
.smt-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.smt-table{width:100%;border-collapse:collapse;font-size:13px;}
.smt-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:4px 10px;border-bottom:2px solid var(--border,#e0e0e0);background:var(--bg,#fff);}
.smt-table td{padding:5px 10px;border-bottom:1px solid var(--border,#eaecf0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
.smt-table tr:last-child td{border-bottom:none;}
.smt-logic{display:inline-block;padding:2px 10px;border-radius:8px;font-size:12px;font-weight:700;background:#eff6ff;border:1px solid #93c5fd;color:#1d4ed8;font-family:ui-monospace,monospace;}
.smt-pill{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;}
.smt-yes{color:#166534;font-weight:700;}
`;

function parseSmtLib(text) {
  const lines = text.split(/\r?\n/);
  let logic = '';
  const options = [];
  let declareFunCount = 0;
  let declareConstCount = 0;
  let declareSortCount = 0;
  let assertCount = 0;
  let checkSatCount = 0;
  let hasGetModel = false;

  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith(';')) continue;

    // set-logic
    const logicMatch = t.match(/^\(set-logic\s+(\S+)\s*\)/);
    if (logicMatch && !logic) logic = logicMatch[1];

    // set-option
    const optMatch = t.match(/^\(set-option\s+(\S+)\s+(\S+.*?)\s*\)/);
    if (optMatch) options.push({ key: optMatch[1], value: optMatch[2].replace(/\)$/, '').trim() });

    // declare-fun
    if (/^\(declare-fun\s/.test(t)) declareFunCount++;

    // declare-const
    if (/^\(declare-const\s/.test(t)) declareConstCount++;

    // declare-sort
    if (/^\(declare-sort\s/.test(t)) declareSortCount++;

    // assert
    if (/^\(assert\s/.test(t) || t === '(assert') assertCount++;

    // check-sat
    if (/^\(check-sat/.test(t)) checkSatCount++;

    // get-model
    if (/^\(get-model/.test(t)) hasGetModel = true;
  }

  return { logic, options, declareFunCount, declareConstCount, declareSortCount, assertCount, checkSatCount, hasGetModel };
}

export function render(intake) {
  const text = intake.text || '';
  const info = parseSmtLib(text);

  const host = document.createElement('div');
  host.className = 'smt-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const titleEl = document.createElement('div');
  titleEl.className = 'smt-title';
  titleEl.innerHTML = `<span class="smt-badge">SMT-LIB 2</span>${info.logic ? `<span class="smt-logic">${esc(info.logic)}</span>` : 'SMT-LIB 2 Formula'}`;
  host.appendChild(titleEl);

  const subParts = [
    info.logic && `Logic: ${info.logic}`,
    `${info.assertCount} assertion${info.assertCount !== 1 ? 's' : ''}`,
    `${info.checkSatCount} check-sat`,
  ].filter(Boolean);
  const subEl = document.createElement('div');
  subEl.className = 'smt-sub';
  subEl.textContent = subParts.join(' · ');
  host.appendChild(subEl);

  // Summary cards
  const summary = document.createElement('div');
  summary.className = 'smt-summary';
  const cards = [
    { value: info.assertCount, label: 'Assertions' },
    { value: info.declareFunCount, label: 'declare-fun' },
    { value: info.declareConstCount, label: 'declare-const' },
    { value: info.declareSortCount, label: 'declare-sort' },
    { value: info.checkSatCount, label: 'check-sat' },
  ];
  for (const { value, label } of cards) {
    const card = document.createElement('div');
    card.className = 'smt-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    summary.appendChild(card);
  }
  host.appendChild(summary);

  // Get-model indicator
  if (info.hasGetModel) {
    const note = document.createElement('div');
    note.style.cssText = 'font-size:13px;margin-bottom:14px;';
    note.innerHTML = '<span class="smt-yes">get-model</span> <span style="color:var(--fg-2,#888);">— model values requested after satisfiability check</span>';
    host.appendChild(note);
  }

  // Solver options
  if (info.options.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'smt-sec';
    const h3 = document.createElement('h3');
    h3.textContent = `Solver Options (${info.options.length})`;
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'smt-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Option</th><th>Value</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const opt of info.options.slice(0, 20)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(opt.key)}</td><td>${esc(opt.value)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  return { parentNode: host };
}
