const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.gnuplot-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.gnuplot-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#e05300;color:#fff;vertical-align:middle;margin-right:8px;}
.gnuplot-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.gnuplot-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.gnuplot-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.gnuplot-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.gnuplot-card strong{display:block;font-size:1.2rem;font-weight:700;}
.gnuplot-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.gnuplot-section{margin:16px 0;}
.gnuplot-section h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.gnuplot-table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px;}
.gnuplot-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:5px 10px;border-bottom:2px solid var(--border,#e0e0e0);background:var(--bg,#fff);}
.gnuplot-table td{padding:5px 10px;border-bottom:1px solid var(--border,#eaecf0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
.gnuplot-table tr:last-child td{border-bottom:none;}
.gnuplot-meta{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:10px 14px;font-family:ui-monospace,monospace;font-size:12px;margin-bottom:16px;}
.gnuplot-meta-row{display:flex;gap:8px;margin-bottom:4px;}
.gnuplot-meta-label{color:var(--fg-2,#888);min-width:110px;flex-shrink:0;}
.gnuplot-meta-value{font-weight:600;}
`;

function parseGnuplot(text) {
  const lines = (text || '').split(/\r?\n/);
  let terminal = null;
  let output = null;
  let title = null;
  let xlabel = null;
  let ylabel = null;
  let xrange = null;
  let yrange = null;
  let keySettings = null;
  let plotCount = 0;
  const setKeys = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith('#')) continue;

    // Terminal
    const termMatch = line.match(/^set\s+terminal\s+(\S+)/i);
    if (termMatch) terminal = termMatch[1];

    // Output
    const outMatch = line.match(/^set\s+output\s+['"]?([^'"]+)['"]?/i);
    if (outMatch) output = outMatch[1].trim();

    // Title
    const titleMatch = line.match(/^set\s+title\s+['"]([^'"]+)['"]/i);
    if (titleMatch) title = titleMatch[1];

    // xlabel
    const xlabelMatch = line.match(/^set\s+xlabel\s+['"]([^'"]+)['"]/i);
    if (xlabelMatch) xlabel = xlabelMatch[1];

    // ylabel
    const ylabelMatch = line.match(/^set\s+ylabel\s+['"]([^'"]+)['"]/i);
    if (ylabelMatch) ylabel = ylabelMatch[1];

    // xrange
    const xrangeMatch = line.match(/^set\s+xrange\s+(\[[^\]]+\])/i);
    if (xrangeMatch) xrange = xrangeMatch[1];

    // yrange
    const yrangeMatch = line.match(/^set\s+yrange\s+(\[[^\]]+\])/i);
    if (yrangeMatch) yrange = yrangeMatch[1];

    // key settings
    const keyMatch = line.match(/^set\s+key\s+(.+)/i);
    if (keyMatch) keySettings = keyMatch[1];

    // Track interesting set commands
    const setMatch = line.match(/^set\s+(\w+)/i);
    if (setMatch) {
      const kw = setMatch[1].toLowerCase();
      if (!['terminal', 'output', 'title', 'xlabel', 'ylabel', 'xrange', 'yrange', 'key'].includes(kw)) {
        setKeys.push(kw);
      }
    }

    // Plot commands
    if (/^(?:plot|splot)\b/i.test(line)) plotCount++;
  }

  return { terminal, output, title, xlabel, ylabel, xrange, yrange, keySettings, plotCount, setKeys };
}

export function render(intake) {
  const parsed = parseGnuplot(intake.text || '');
  const { terminal, output, title, xlabel, ylabel, xrange, yrange, keySettings, plotCount, setKeys } = parsed;

  const host = document.createElement('div');
  host.className = 'gnuplot-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const titleEl = document.createElement('div');
  titleEl.className = 'gnuplot-title';
  titleEl.innerHTML = '<span class="gnuplot-badge">gnuplot</span>Script';
  host.appendChild(titleEl);

  const parts = [`${plotCount} plot command${plotCount !== 1 ? 's' : ''}`];
  if (terminal) parts.push(`terminal: ${terminal}`);

  const sub = document.createElement('div');
  sub.className = 'gnuplot-sub';
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Summary cards
  const summary = document.createElement('div');
  summary.className = 'gnuplot-summary';
  const cards = [
    { value: plotCount, label: 'Plot cmds' },
    { value: terminal || '—', label: 'Terminal' },
    { value: output || '—', label: 'Output file' },
  ];
  for (const { value, label } of cards) {
    const card = document.createElement('div');
    card.className = 'gnuplot-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    summary.appendChild(card);
  }
  host.appendChild(summary);

  // Plot settings
  const metaRows = [
    title && ['Title', title],
    xlabel && ['X label', xlabel],
    ylabel && ['Y label', ylabel],
    xrange && ['X range', xrange],
    yrange && ['Y range', yrange],
    keySettings && ['Key', keySettings],
  ].filter(Boolean);

  if (metaRows.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'gnuplot-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Plot Settings';
    sec.appendChild(h3);
    const meta = document.createElement('div');
    meta.className = 'gnuplot-meta';
    for (const [label, value] of metaRows) {
      const row = document.createElement('div');
      row.className = 'gnuplot-meta-row';
      const lbl = document.createElement('span');
      lbl.className = 'gnuplot-meta-label';
      lbl.textContent = label;
      const val = document.createElement('span');
      val.className = 'gnuplot-meta-value';
      val.textContent = value;
      row.appendChild(lbl);
      row.appendChild(val);
      meta.appendChild(row);
    }
    sec.appendChild(meta);
    host.appendChild(sec);
  }

  // Other set keys
  if (setKeys.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'gnuplot-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Other Settings';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'gnuplot-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Setting</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const key of [...new Set(setKeys)].slice(0, 30)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(key)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  return { parentNode: host };
}
