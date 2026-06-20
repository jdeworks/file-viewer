const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.nut-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.nut-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#e67e22;color:#fff;vertical-align:middle;margin-right:8px;}
.nut-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.nut-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.nut-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.nut-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.nut-card strong{display:block;font-size:1.2rem;font-weight:700;}
.nut-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.nut-section{margin:16px 0;}
.nut-section h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.nut-table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px;}
.nut-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:5px 10px;border-bottom:2px solid var(--border,#e0e0e0);background:var(--bg,#fff);}
.nut-table td{padding:5px 10px;border-bottom:1px solid var(--border,#eaecf0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
.nut-table tr:last-child td{border-bottom:none;}
.nut-tag{display:inline-block;padding:1px 6px;border-radius:4px;font-size:11px;background:var(--bg-2,#f0f0f0);margin:1px 2px;font-family:ui-monospace,monospace;}
`;

function parseNut(text) {
  const lines = (text || '').split(/\r?\n/);
  const classes = [];
  const functions = [];
  const namespaces = [];

  for (const line of lines) {
    const t = line.trim();
    // Skip line comments
    if (t.startsWith('//') || t.startsWith('#')) continue;

    // class Name [extends Base] {
    const classMatch = t.match(/^class\s+(\w+)/);
    if (classMatch) {
      if (!classes.includes(classMatch[1])) classes.push(classMatch[1]);
    }

    // function name(...) {  or  Name.method <- function(...) {
    const funcMatch = t.match(/^function\s+(\w+)\s*\(/);
    if (funcMatch) functions.push(funcMatch[1]);

    // Method assignment: SomeName.method <- function(...)
    const methodMatch = t.match(/^(\w+)\.(\w+)\s*<-\s*function\s*\(/);
    if (methodMatch) functions.push(`${methodMatch[1]}.${methodMatch[2]}`);

    // Namespace :: declarations: ::SomeName <- ...
    const nsMatch = t.match(/^::(\w+)\s*<-/);
    if (nsMatch) {
      if (!namespaces.includes(nsMatch[1])) namespaces.push(nsMatch[1]);
    }
  }

  return { classes, functions, namespaces };
}

export function render(intake) {
  const parsed = parseNut(intake.text || '');
  const { classes, functions, namespaces } = parsed;

  const host = document.createElement('div');
  host.className = 'nut-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'nut-title';
  title.innerHTML = '<span class="nut-badge">Squirrel</span>Script File';
  host.appendChild(title);

  const parts = [`${functions.length} function${functions.length !== 1 ? 's' : ''}`];
  if (classes.length) parts.push(`${classes.length} class${classes.length !== 1 ? 'es' : ''}`);
  if (namespaces.length) parts.push(`${namespaces.length} namespace declaration${namespaces.length !== 1 ? 's' : ''}`);

  const sub = document.createElement('div');
  sub.className = 'nut-sub';
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Summary cards
  const summary = document.createElement('div');
  summary.className = 'nut-summary';
  const cards = [
    { value: functions.length, label: 'Functions' },
    { value: classes.length, label: 'Classes' },
    { value: namespaces.length, label: 'Namespaces' },
  ];
  for (const { value, label } of cards) {
    const card = document.createElement('div');
    card.className = 'nut-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    summary.appendChild(card);
  }
  host.appendChild(summary);

  // Classes
  if (classes.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'nut-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Classes';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'nut-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Name</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const name of classes.slice(0, 30)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(name)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Functions
  if (functions.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'nut-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Functions';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'nut-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Name</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const name of functions.slice(0, 40)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(name)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Namespaces
  if (namespaces.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'nut-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Namespace (::) Declarations';
    sec.appendChild(h3);
    const wrap = document.createElement('div');
    for (const ns of namespaces.slice(0, 30)) {
      const tag = document.createElement('span');
      tag.className = 'nut-tag';
      tag.textContent = `::${ns}`;
      wrap.appendChild(tag);
    }
    sec.appendChild(wrap);
    host.appendChild(sec);
  }

  return { parentNode: host };
}
