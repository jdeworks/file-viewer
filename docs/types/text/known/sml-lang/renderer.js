const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.sml-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.sml-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1d4ed8;color:#fff;vertical-align:middle;margin-right:8px;}
.sml-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.sml-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.sml-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.sml-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.sml-card strong{display:block;font-size:1.2rem;font-weight:700;}
.sml-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.sml-section{margin:16px 0;}
.sml-section h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.sml-table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px;}
.sml-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:5px 10px;border-bottom:2px solid var(--border,#e0e0e0);background:var(--bg,#fff);}
.sml-table td{padding:5px 10px;border-bottom:1px solid var(--border,#eaecf0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
.sml-table tr:last-child td{border-bottom:none;}
.sml-tag{display:inline-block;padding:1px 7px;border-radius:10px;font-size:11px;font-weight:600;margin-right:4px;}
.sml-tag.structure{background:#dbeafe;color:#1d4ed8;}
.sml-tag.signature{background:#e0e7ff;color:#4338ca;}
.sml-tag.functor{background:#fce7f3;color:#be185d;}
`;

function parseSml(text) {
  const lines = (text || '').split(/\r?\n/);
  const modules = []; // { name, kind: 'structure'|'signature'|'functor' }
  let valCount = 0;
  let funCount = 0;

  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('(*')) continue; // block comment start, ignore for simplicity
    if (t.startsWith('--')) continue;

    // structure Foo = struct / structure Foo : SIG
    const structMatch = t.match(/^structure\s+(\w+)/);
    if (structMatch) { modules.push({ name: structMatch[1], kind: 'structure' }); continue; }

    // signature FOO
    const sigMatch = t.match(/^signature\s+(\w+)/);
    if (sigMatch) { modules.push({ name: sigMatch[1], kind: 'signature' }); continue; }

    // functor Foo
    const functorMatch = t.match(/^functor\s+(\w+)/);
    if (functorMatch) { modules.push({ name: functorMatch[1], kind: 'functor' }); continue; }

    // val bindings (val x = ...)
    if (/^val\s+\w+/.test(t)) valCount++;

    // fun bindings (fun foo ...)
    if (/^fun\s+\w+/.test(t)) funCount++;
  }

  return { modules, valCount, funCount };
}

export function render(intake) {
  const { modules, valCount, funCount } = parseSml(intake.text || '');

  const structures = modules.filter((m) => m.kind === 'structure');
  const signatures = modules.filter((m) => m.kind === 'signature');
  const functors = modules.filter((m) => m.kind === 'functor');

  const host = document.createElement('div');
  host.className = 'sml-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'sml-title';
  title.innerHTML = '<span class="sml-badge">Standard ML</span>Source File';
  host.appendChild(title);

  const parts = [];
  if (structures.length) parts.push(`${structures.length} structure${structures.length !== 1 ? 's' : ''}`);
  if (signatures.length) parts.push(`${signatures.length} signature${signatures.length !== 1 ? 's' : ''}`);
  if (functors.length) parts.push(`${functors.length} functor${functors.length !== 1 ? 's' : ''}`);
  if (valCount) parts.push(`${valCount} val binding${valCount !== 1 ? 's' : ''}`);
  if (funCount) parts.push(`${funCount} fun binding${funCount !== 1 ? 's' : ''}`);

  const sub = document.createElement('div');
  sub.className = 'sml-sub';
  sub.textContent = parts.join(' · ') || 'Standard ML source';
  host.appendChild(sub);

  // Summary cards
  const summary = document.createElement('div');
  summary.className = 'sml-summary';
  const cards = [
    { value: structures.length, label: 'Structures' },
    { value: signatures.length, label: 'Signatures' },
    { value: functors.length, label: 'Functors' },
    { value: valCount + funCount, label: 'Bindings' },
  ];
  for (const { value, label } of cards) {
    const card = document.createElement('div');
    card.className = 'sml-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    summary.appendChild(card);
  }
  host.appendChild(summary);

  // Modules table
  if (modules.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'sml-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Modules';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'sml-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Name</th><th>Kind</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const m of modules.slice(0, 40)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(m.name)}</td><td><span class="sml-tag ${esc(m.kind)}">${esc(m.kind)}</span></td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Binding counts section
  if (valCount > 0 || funCount > 0) {
    const sec = document.createElement('div');
    sec.className = 'sml-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Top-level Bindings';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'sml-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Kind</th><th>Count</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    if (valCount > 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>val</td><td>${valCount}</td>`;
      tbody.appendChild(tr);
    }
    if (funCount > 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>fun</td><td>${funCount}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  return { parentNode: host };
}
