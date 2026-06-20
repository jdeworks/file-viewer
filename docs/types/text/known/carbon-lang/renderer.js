const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.cbn-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.cbn-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1d4ed8;color:#fff;vertical-align:middle;margin-right:8px;}
.cbn-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.cbn-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.cbn-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.cbn-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.cbn-card strong{display:block;font-size:1.2rem;font-weight:700;}
.cbn-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.cbn-section{margin:16px 0;}
.cbn-section h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.cbn-table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px;}
.cbn-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:5px 10px;border-bottom:2px solid var(--border,#e0e0e0);background:var(--bg,#fff);}
.cbn-table td{padding:5px 10px;border-bottom:1px solid var(--border,#eaecf0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
.cbn-table tr:last-child td{border-bottom:none;}
.cbn-pre{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:14px;overflow:auto;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;margin-top:16px;white-space:pre-wrap;word-break:break-word;}
.cbn-kw{color:#1d4ed8;font-weight:700;}
.cbn-str{color:#b91c1c;}
.cbn-comment{color:#888;font-style:italic;}
.cbn-type{color:#0f766e;}
`;

function parseCarbon(text) {
  const lines = (text || '').split(/\r?\n/);
  let packageName = '';
  const fns = [];
  const classes = [];
  const interfaces = [];
  const impls = [];

  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('//')) continue;

    // package declaration
    const pkgMatch = t.match(/^package\s+(\S+)/);
    if (pkgMatch && !packageName) packageName = pkgMatch[1].replace(/;$/, '');

    // fn declarations
    const fnMatch = t.match(/^(?:private\s+)?fn\s+(\w+)\s*[(<(]/);
    if (fnMatch) fns.push(fnMatch[1]);

    // class declarations
    const classMatch = t.match(/^(?:abstract\s+|base\s+)?class\s+(\w+)/);
    if (classMatch) classes.push(classMatch[1]);

    // interface declarations
    const ifaceMatch = t.match(/^interface\s+(\w+)/);
    if (ifaceMatch) interfaces.push(ifaceMatch[1]);

    // impl blocks
    const implMatch = t.match(/^impl\s+(.+)/);
    if (implMatch) impls.push(implMatch[1].replace(/\s*\{.*$/, '').trim());
  }

  return { packageName, fns, classes, interfaces, impls };
}

function highlightCarbon(text) {
  const KWS = ['package', 'fn', 'class', 'interface', 'impl', 'var', 'let', 'return', 'if', 'else', 'while', 'for', 'match', 'import', 'api', 'abstract', 'base', 'extend', 'final', 'private', 'protected', 'Self', 'auto', 'and', 'or', 'not', 'true', 'false'];
  const lines = text.split(/\r?\n/);
  return lines.map(line => {
    const ciIdx = line.indexOf('//');
    if (ciIdx >= 0) {
      return highlightCarbonLine(line.slice(0, ciIdx), KWS) + `<span class="cbn-comment">${esc(line.slice(ciIdx))}</span>`;
    }
    return highlightCarbonLine(line, KWS);
  }).join('\n');
}

function highlightCarbonLine(line, KWS) {
  let out = esc(line);
  out = out.replace(/(&quot;(?:[^&]|&(?!quot;))*?&quot;)/g, '<span class="cbn-str">$1</span>');
  out = out.replace(/\b(i8|i16|i32|i64|i128|u8|u16|u32|u64|u128|f32|f64|bool|String|Type)\b/g, '<span class="cbn-type">$1</span>');
  const sorted = [...KWS].sort((a, b) => b.length - a.length);
  for (const kw of sorted) {
    const re = new RegExp(`(?<![\\w])(${kw})(?![\\w])`, 'g');
    out = out.replace(re, '<span class="cbn-kw">$1</span>');
  }
  return out;
}

export function render(intake) {
  const { packageName, fns, classes, interfaces, impls } = parseCarbon(intake.text || '');

  const host = document.createElement('div');
  host.className = 'cbn-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'cbn-title';
  title.innerHTML = `<span class="cbn-badge">Carbon</span>${esc(packageName || 'Source File')}`;
  host.appendChild(title);

  const parts = [`${fns.length} fn`];
  if (classes.length) parts.push(`${classes.length} class${classes.length !== 1 ? 'es' : ''}`);
  if (interfaces.length) parts.push(`${interfaces.length} interface${interfaces.length !== 1 ? 's' : ''}`);
  if (impls.length) parts.push(`${impls.length} impl${impls.length !== 1 ? 's' : ''}`);

  const sub = document.createElement('div');
  sub.className = 'cbn-sub';
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Summary cards
  const summary = document.createElement('div');
  summary.className = 'cbn-summary';
  const cards = [
    { value: fns.length, label: 'Functions' },
    { value: classes.length + interfaces.length, label: 'Classes/Ifaces' },
    { value: impls.length, label: 'Impls' },
  ];
  for (const { value, label } of cards) {
    const card = document.createElement('div');
    card.className = 'cbn-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    summary.appendChild(card);
  }
  host.appendChild(summary);

  // Functions
  if (fns.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'cbn-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Functions';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'cbn-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Name</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const name of fns.slice(0, 40)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(name)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Classes & Interfaces
  const types = [...classes.map(n => ({ name: n, kind: 'class' })), ...interfaces.map(n => ({ name: n, kind: 'interface' }))];
  if (types.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'cbn-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Classes & Interfaces';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'cbn-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Name</th><th>Kind</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const { name, kind } of types.slice(0, 30)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(name)}</td><td>${esc(kind)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Impl blocks
  if (impls.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'cbn-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Impl Blocks';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'cbn-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Declaration</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const decl of impls.slice(0, 20)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(decl)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Source
  const pre = document.createElement('pre');
  pre.className = 'cbn-pre';
  pre.innerHTML = highlightCarbon(intake.text || '');
  host.appendChild(pre);

  return { parentNode: host };
}
