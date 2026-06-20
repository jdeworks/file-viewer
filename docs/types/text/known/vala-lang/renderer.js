const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.vla-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.vla-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#6a0dad;color:#fff;vertical-align:middle;margin-right:8px;}
.vla-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.vla-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.vla-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.vla-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.vla-card strong{display:block;font-size:1.2rem;font-weight:700;}
.vla-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.vla-section{margin:16px 0;}
.vla-section h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.vla-table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px;}
.vla-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:5px 10px;border-bottom:2px solid var(--border,#e0e0e0);background:var(--bg,#fff);}
.vla-table td{padding:5px 10px;border-bottom:1px solid var(--border,#eaecf0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
.vla-table tr:last-child td{border-bottom:none;}
.vla-tag{display:inline-block;padding:1px 7px;border-radius:10px;font-size:11px;font-weight:600;margin-right:4px;background:#e9d8fd;color:#6a0dad;}
.vla-tag.interface{background:#d8edfd;color:#1a56db;}
.vla-tag.enum{background:#d8fde9;color:#0a7440;}
.vla-main-yes{color:#0a7440;font-weight:700;}
`;

function parseVala(text) {
  const lines = (text || '').split(/\r?\n/);
  const usings = [];
  const types = []; // { name, kind: 'class'|'interface'|'enum' }
  let hasMain = false;

  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('//')) continue;

    // using Namespace;
    const usingMatch = t.match(/^using\s+([\w.]+)\s*;/);
    if (usingMatch && !usings.includes(usingMatch[1])) usings.push(usingMatch[1]);

    // class/interface/enum declarations
    const classMatch = t.match(/^(?:public\s+|private\s+|protected\s+|internal\s+|abstract\s+|sealed\s+)*(?:(class|interface|enum))\s+(\w+)/);
    if (classMatch) {
      types.push({ name: classMatch[2], kind: classMatch[1] });
    }

    // main function
    if (/public\s+static\s+int\s+main\s*\(/.test(t)) hasMain = true;
  }

  return { usings, types, hasMain };
}

export function render(intake) {
  const { usings, types, hasMain } = parseVala(intake.text || '');

  const classes = types.filter((t) => t.kind === 'class');
  const interfaces = types.filter((t) => t.kind === 'interface');
  const enums = types.filter((t) => t.kind === 'enum');

  const host = document.createElement('div');
  host.className = 'vla-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'vla-title';
  title.innerHTML = '<span class="vla-badge">Vala</span>Source File';
  host.appendChild(title);

  const parts = [];
  if (classes.length) parts.push(`${classes.length} class${classes.length !== 1 ? 'es' : ''}`);
  if (interfaces.length) parts.push(`${interfaces.length} interface${interfaces.length !== 1 ? 's' : ''}`);
  if (enums.length) parts.push(`${enums.length} enum${enums.length !== 1 ? 's' : ''}`);
  if (usings.length) parts.push(`${usings.length} namespace${usings.length !== 1 ? 's' : ''}`);
  if (hasMain) parts.push('has main()');

  const sub = document.createElement('div');
  sub.className = 'vla-sub';
  sub.textContent = parts.join(' · ') || 'Vala source';
  host.appendChild(sub);

  // Summary cards
  const summary = document.createElement('div');
  summary.className = 'vla-summary';
  const cards = [
    { value: classes.length, label: 'Classes' },
    { value: interfaces.length, label: 'Interfaces' },
    { value: enums.length, label: 'Enums' },
    { value: usings.length, label: 'Namespaces' },
  ];
  for (const { value, label } of cards) {
    const card = document.createElement('div');
    card.className = 'vla-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    summary.appendChild(card);
  }
  host.appendChild(summary);

  // Main entry point notice
  if (hasMain) {
    const notice = document.createElement('div');
    notice.className = 'vla-section';
    notice.innerHTML = '<span class="vla-main-yes">&#10003; Defines public static int main() — application entry point</span>';
    host.appendChild(notice);
  }

  // Types table
  if (types.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'vla-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Types';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'vla-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Name</th><th>Kind</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const t of types.slice(0, 40)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(t.name)}</td><td><span class="vla-tag ${esc(t.kind)}">${esc(t.kind)}</span></td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Using namespaces
  if (usings.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'vla-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Using Namespaces';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'vla-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Namespace</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const ns of usings) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(ns)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  return { parentNode: host };
}
