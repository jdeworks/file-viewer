const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.wlang-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.wlang-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#d10;color:#fff;vertical-align:middle;margin-right:8px;}
.wlang-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.wlang-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.wlang-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.wlang-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.wlang-card strong{display:block;font-size:1.2rem;font-weight:700;}
.wlang-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.wlang-section{margin:16px 0;}
.wlang-section h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.wlang-table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px;}
.wlang-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:5px 10px;border-bottom:2px solid var(--border,#e0e0e0);background:var(--bg,#fff);}
.wlang-table td{padding:5px 10px;border-bottom:1px solid var(--border,#eaecf0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
.wlang-table tr:last-child td{border-bottom:none;}
`;

function parseWolfram(text) {
  const lines = (text || '').split(/\r?\n/);
  let defCount = 0;          // lines with :=
  let moduleCount = 0;       // Module[ or Block[
  let vizCount = 0;          // Plot[, ListPlot[, BarChart[, etc.
  let outputCount = 0;       // Print[, Echo[
  const defs = [];

  for (const line of lines) {
    const t = line.trim();
    // Skip Wolfram comments (* ... *) — simple single-line detection
    if (t.startsWith('(*') && t.endsWith('*)')) continue;

    if (t.includes(':=')) {
      defCount++;
      // Extract name before :=
      const nameMatch = t.match(/^(\w+)/);
      if (nameMatch) defs.push(nameMatch[1]);
    }

    if (/Module\[|Block\[/.test(t)) moduleCount++;
    if (/\b(?:Plot|ListPlot|BarChart|PieChart|Histogram|Plot3D|ContourPlot|ListLinePlot)\s*\[/.test(t)) vizCount++;
    if (/\b(?:Print|Echo)\s*\[/.test(t)) outputCount++;
  }

  return { defCount, moduleCount, vizCount, outputCount, defs };
}

export function render(intake) {
  const parsed = parseWolfram(intake.text || '');
  const { defCount, moduleCount, vizCount, outputCount, defs } = parsed;

  const host = document.createElement('div');
  host.className = 'wlang-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const titleEl = document.createElement('div');
  titleEl.className = 'wlang-title';
  titleEl.innerHTML = '<span class="wlang-badge">Wolfram Language</span>Script';
  host.appendChild(titleEl);

  const parts = [`${defCount} definition${defCount !== 1 ? 's' : ''}`];
  if (moduleCount) parts.push(`${moduleCount} module/block`);
  if (vizCount) parts.push(`${vizCount} visualization`);

  const sub = document.createElement('div');
  sub.className = 'wlang-sub';
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Summary cards
  const summary = document.createElement('div');
  summary.className = 'wlang-summary';
  const cards = [
    { value: defCount, label: 'Definitions (:=)' },
    { value: moduleCount, label: 'Module/Block' },
    { value: vizCount, label: 'Viz calls' },
    { value: outputCount, label: 'Output calls' },
  ];
  for (const { value, label } of cards) {
    const card = document.createElement('div');
    card.className = 'wlang-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    summary.appendChild(card);
  }
  host.appendChild(summary);

  // Function definitions table
  if (defs.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'wlang-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Function Definitions';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'wlang-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Name</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    const unique = [...new Set(defs)];
    for (const name of unique.slice(0, 40)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(name)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  return { parentNode: host };
}
