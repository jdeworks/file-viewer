const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.stata-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.stata-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1a5276;color:#fff;vertical-align:middle;margin-right:8px;}
.stata-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.stata-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.stata-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.stata-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.stata-card strong{display:block;font-size:1.2rem;font-weight:700;}
.stata-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.stata-section{margin:16px 0;}
.stata-section h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.stata-table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px;}
.stata-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:5px 10px;border-bottom:2px solid var(--border,#e0e0e0);background:var(--bg,#fff);}
.stata-table td{padding:5px 10px;border-bottom:1px solid var(--border,#eaecf0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
.stata-table tr:last-child td{border-bottom:none;}
`;

function parseStata(text) {
  const lines = (text || '').split(/\r?\n/);
  let dataCount = 0;         // use / merge / append
  let varOpCount = 0;        // gen / replace / drop / keep
  let estimCount = 0;        // reg / logit / probit / xtset / ivregress / etc.
  let outputCount = 0;       // summarize / tabulate / list / describe
  const commands = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith('*') || line.startsWith('//')) continue;
    if (!line) continue;

    const cmd = line.split(/\s+/)[0].toLowerCase();
    commands.push(cmd);

    if (['use', 'merge', 'append', 'import'].includes(cmd)) dataCount++;
    if (['gen', 'generate', 'replace', 'drop', 'keep', 'rename', 'recode'].includes(cmd)) varOpCount++;
    if (['reg', 'regress', 'logit', 'probit', 'xtset', 'xtreg', 'ivregress', 'areg', 'logistic', 'poisson', 'tobit'].includes(cmd)) estimCount++;
    if (['summarize', 'sum', 'tabulate', 'tab', 'list', 'describe', 'des', 'codebook'].includes(cmd)) outputCount++;
  }

  return { dataCount, varOpCount, estimCount, outputCount, commands };
}

export function render(intake) {
  const parsed = parseStata(intake.text || '');
  const { dataCount, varOpCount, estimCount, outputCount, commands } = parsed;

  const host = document.createElement('div');
  host.className = 'stata-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const titleEl = document.createElement('div');
  titleEl.className = 'stata-title';
  titleEl.innerHTML = '<span class="stata-badge">Stata</span>Do-file';
  host.appendChild(titleEl);

  const parts = [`${commands.length} command${commands.length !== 1 ? 's' : ''}`];
  if (dataCount) parts.push(`${dataCount} data op${dataCount !== 1 ? 's' : ''}`);
  if (estimCount) parts.push(`${estimCount} estimation`);

  const sub = document.createElement('div');
  sub.className = 'stata-sub';
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Summary cards
  const summary = document.createElement('div');
  summary.className = 'stata-summary';
  const cards = [
    { value: dataCount, label: 'Data ops' },
    { value: varOpCount, label: 'Var ops' },
    { value: estimCount, label: 'Estimations' },
    { value: outputCount, label: 'Output cmds' },
  ];
  for (const { value, label } of cards) {
    const card = document.createElement('div');
    card.className = 'stata-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    summary.appendChild(card);
  }
  host.appendChild(summary);

  // Command frequency table
  if (commands.length > 0) {
    const freq = {};
    for (const cmd of commands) freq[cmd] = (freq[cmd] || 0) + 1;
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);

    const sec = document.createElement('div');
    sec.className = 'stata-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Command Frequency';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'stata-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Command</th><th>Count</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const [cmd, count] of sorted.slice(0, 20)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(cmd)}</td><td>${esc(count)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  return { parentNode: host };
}
