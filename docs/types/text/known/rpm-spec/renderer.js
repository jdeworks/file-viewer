const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.rpmspec-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.rpmspec-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#c0392b;color:#fff;vertical-align:middle;margin-right:8px;}
.rpmspec-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.rpmspec-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.rpmspec-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.rpmspec-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.rpmspec-card strong{display:block;font-size:1.2rem;font-weight:700;}
.rpmspec-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.rpmspec-section{margin:16px 0;}
.rpmspec-section h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.rpmspec-table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px;}
.rpmspec-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:5px 10px;border-bottom:2px solid var(--border,#e0e0e0);background:var(--bg,#fff);}
.rpmspec-table td{padding:5px 10px;border-bottom:1px solid var(--border,#eaecf0);vertical-align:top;font-size:13px;}
.rpmspec-table tr:last-child td{border-bottom:none;}
.rpmspec-mono{font-family:ui-monospace,monospace;}
.rpmspec-pill{display:inline-block;padding:1px 7px;border-radius:8px;font-size:11px;font-weight:600;background:var(--bg-2,#eef2f7);border:1px solid var(--border,#d0d7de);margin:1px;}
.rpmspec-check-yes{color:#16a34a;font-weight:700;}
.rpmspec-check-no{color:var(--fg-2,#888);}
`;

function parseSpec(text) {
  const lines = (text || '').split(/\r?\n/);
  const meta = {};
  const macros = [];
  const changelogEntries = [];
  let inChangelog = false;
  let buildRequiresCount = 0;
  let requiresCount = 0;
  let hasCheck = false;

  for (const line of lines) {
    const t = line.trim();

    // Section detection
    if (/^%changelog\b/i.test(t)) { inChangelog = true; continue; }
    if (/^%[a-z]/i.test(t) && !/^%changelog/i.test(t)) {
      if (/^%check\b/i.test(t)) hasCheck = true;
      if (inChangelog) inChangelog = false;
    }

    if (inChangelog) {
      if (t.startsWith('*') && changelogEntries.length < 3) {
        changelogEntries.push(t);
      }
      continue;
    }

    // Header fields
    const fieldMatch = line.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/);
    if (fieldMatch) {
      const key = fieldMatch[1].toLowerCase();
      const val = fieldMatch[2].trim();
      if (key === 'name' && !meta.name) meta.name = val;
      else if (key === 'version' && !meta.version) meta.version = val;
      else if (key === 'release' && !meta.release) meta.release = val;
      else if (key === 'summary' && !meta.summary) meta.summary = val;
      else if (key === 'license' && !meta.license) meta.license = val;
      else if (key === 'url' && !meta.url) meta.url = val;
      else if (key === 'buildrequires') buildRequiresCount++;
      else if (key === 'requires') requiresCount++;
    }

    // Macros: %define or %global
    const macroMatch = line.match(/^%(?:define|global)\s+(\w+)\s+(.+)$/);
    if (macroMatch) {
      macros.push({ name: macroMatch[1], value: macroMatch[2].trim() });
    }
  }

  return { meta, macros, changelogEntries, buildRequiresCount, requiresCount, hasCheck };
}

export function render(intake) {
  const { meta, macros, changelogEntries, buildRequiresCount, requiresCount, hasCheck } = parseSpec(intake.text || '');

  const host = document.createElement('div');
  host.className = 'rpmspec-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'rpmspec-title';
  title.innerHTML = `<span class="rpmspec-badge">RPM Spec</span>${esc(meta.name || 'Package Specification')}`;
  host.appendChild(title);

  const parts = [];
  if (meta.version) parts.push(`v${meta.version}`);
  if (meta.license) parts.push(meta.license);
  if (meta.summary) parts.push(meta.summary);

  const sub = document.createElement('div');
  sub.className = 'rpmspec-sub';
  sub.textContent = parts.join(' · ') || 'RPM Specification';
  host.appendChild(sub);

  // Summary cards
  const summary = document.createElement('div');
  summary.className = 'rpmspec-summary';
  const cards = [
    { value: buildRequiresCount, label: 'BuildRequires' },
    { value: requiresCount, label: 'Requires' },
    { value: macros.length, label: 'Macros' },
    { value: changelogEntries.length, label: 'Changelog entries' },
  ];
  for (const { value, label } of cards) {
    const card = document.createElement('div');
    card.className = 'rpmspec-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    summary.appendChild(card);
  }
  host.appendChild(summary);

  // Package metadata table
  const metaSec = document.createElement('div');
  metaSec.className = 'rpmspec-section';
  const metaH3 = document.createElement('h3');
  metaH3.textContent = 'Package Metadata';
  metaSec.appendChild(metaH3);
  const metaTable = document.createElement('table');
  metaTable.className = 'rpmspec-table';
  const rows = [
    ['Name', meta.name],
    ['Version', meta.version],
    ['Release', meta.release],
    ['License', meta.license],
    ['URL', meta.url],
    ['%check section', hasCheck ? '✓ Present' : '✗ Absent'],
  ].filter(([, v]) => v != null);

  const tbody = document.createElement('tbody');
  for (const [label, value] of rows) {
    const tr = document.createElement('tr');
    const tdLabel = document.createElement('td');
    tdLabel.style.cssText = 'font-weight:600;width:140px;color:var(--fg-2,#666);';
    tdLabel.textContent = label;
    const tdVal = document.createElement('td');
    if (label === '%check section') {
      tdVal.innerHTML = hasCheck
        ? '<span class="rpmspec-check-yes">✓ Present</span>'
        : '<span class="rpmspec-check-no">✗ Absent</span>';
    } else {
      tdVal.className = 'rpmspec-mono';
      tdVal.textContent = value;
    }
    tr.appendChild(tdLabel);
    tr.appendChild(tdVal);
    tbody.appendChild(tr);
  }
  metaTable.appendChild(tbody);
  metaSec.appendChild(metaTable);
  host.appendChild(metaSec);

  // Macros
  if (macros.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'rpmspec-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Defined Macros';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'rpmspec-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Macro</th><th>Value</th></tr>';
    table.appendChild(thead);
    const tb = document.createElement('tbody');
    for (const { name, value } of macros.slice(0, 20)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td class="rpmspec-mono">%${esc(name)}</td><td class="rpmspec-mono">${esc(value)}</td>`;
      tb.appendChild(tr);
    }
    table.appendChild(tb);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Changelog
  if (changelogEntries.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'rpmspec-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Recent Changelog';
    sec.appendChild(h3);
    const ul = document.createElement('ul');
    ul.style.cssText = 'margin:0;padding:0 0 0 18px;font-size:13px;';
    for (const entry of changelogEntries) {
      const li = document.createElement('li');
      li.style.cssText = 'margin-bottom:4px;font-family:ui-monospace,monospace;font-size:12px;';
      li.textContent = entry;
      ul.appendChild(li);
    }
    sec.appendChild(ul);
    host.appendChild(sec);
  }

  return { parentNode: host };
}
