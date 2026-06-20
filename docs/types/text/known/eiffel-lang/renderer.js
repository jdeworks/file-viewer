const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.efl-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.efl-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#059669;color:#fff;vertical-align:middle;margin-right:8px;}
.efl-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.efl-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.efl-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.efl-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.efl-card strong{display:block;font-size:1.2rem;font-weight:700;}
.efl-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.efl-section{margin:16px 0;}
.efl-section h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.efl-tag{display:inline-block;padding:1px 7px;border-radius:8px;font-size:11px;font-weight:600;background:var(--bg-3,#e5e7eb);color:var(--fg-2,#555);margin:0 3px 3px 0;}
.efl-table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px;}
.efl-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:5px 10px;border-bottom:2px solid var(--border,#e0e0e0);background:var(--bg,#fff);}
.efl-table td{padding:5px 10px;border-bottom:1px solid var(--border,#eaecf0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
.efl-table tr:last-child td{border-bottom:none;}
.efl-contract{background:#f0fdf4;border:1px solid #86efac;border-radius:6px;padding:6px 12px;margin-bottom:6px;font-size:12px;font-family:ui-monospace,monospace;}
`;

function parseEiffel(text) {
  const lines = (text || '').split(/\r?\n/);
  let className = null;
  let isDeferred = false;
  const inherits = [];
  const createProcedures = [];
  const features = [];
  let requireCount = 0;
  let ensureCount = 0;
  let inCreate = false;
  let inInherit = false;
  let currentFeatureSection = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    // Skip comments
    if (line.startsWith('--')) continue;

    // class declaration
    const classMatch = line.match(/^(?:(deferred|expanded|frozen)\s+)?class\s+(\w+)/i);
    if (classMatch && !className) {
      isDeferred = !!(classMatch[1] && classMatch[1].toLowerCase() === 'deferred');
      className = classMatch[2];
    }

    // inherit block
    if (/^inherit\s*$/i.test(line) || /^inherit\s+\w/i.test(line)) {
      inInherit = true;
      inCreate = false;
      const inlineMatch = line.match(/^inherit\s+(\w+)/i);
      if (inlineMatch) inherits.push(inlineMatch[1]);
    }

    if (inInherit) {
      const inheritMatch = line.match(/^(\w+)(?:\s+rename|\s+redefine|\s+undefine|\s+select|\s+export|$)/i);
      if (inheritMatch && inheritMatch[1] !== 'inherit' && !inherits.includes(inheritMatch[1])) {
        inherits.push(inheritMatch[1]);
      }
      if (/^(create|feature|class|end)\b/i.test(line)) inInherit = false;
    }

    // create clause
    if (/^create\s*$/i.test(line) || /^create\s+\w/i.test(line)) {
      inCreate = true;
      inInherit = false;
      const inlineMatch = line.match(/^create\s+(.+)/i);
      if (inlineMatch) {
        const names = inlineMatch[1].split(',').map((s) => s.trim()).filter((s) => /^\w+$/.test(s));
        for (const n of names) if (!createProcedures.includes(n)) createProcedures.push(n);
      }
    }

    if (inCreate && !/^create\b/i.test(line)) {
      if (/^(feature|class|inherit|end)\b/i.test(line)) {
        inCreate = false;
      } else {
        const names = line.split(',').map((s) => s.trim()).filter((s) => /^\w+$/.test(s));
        for (const n of names) if (!createProcedures.includes(n)) createProcedures.push(n);
      }
    }

    // feature sections
    const featSectionMatch = line.match(/^feature\s*(?:--\s*(.+))?$/i);
    if (featSectionMatch) {
      currentFeatureSection = featSectionMatch[1] ? featSectionMatch[1].trim() : 'Features';
      inCreate = false;
      inInherit = false;
    }

    // individual features (routine/attribute)
    const featureMatch = line.match(/^(\w+)\s*(?:\([^)]*\))?\s*(?::\s*[\w\[\],\s]+)?\s*(?:do|deferred|once|external|is\s+do|is\s+deferred|\s*$)/i);
    if (featureMatch && currentFeatureSection && !['class', 'create', 'inherit', 'feature', 'do', 'ensure', 'require', 'end'].includes(featureMatch[1].toLowerCase())) {
      const name = featureMatch[1];
      if (!features.some((f) => f.name === name)) {
        features.push({ name, section: currentFeatureSection });
      }
    }

    // contracts
    if (/^require\b/i.test(line)) requireCount++;
    if (/^ensure\b/i.test(line)) ensureCount++;
  }

  return { className, isDeferred, inherits, createProcedures, features, requireCount, ensureCount };
}

export function render(intake) {
  const { className, isDeferred, inherits, createProcedures, features, requireCount, ensureCount } = parseEiffel(intake.text || '');
  const contractCount = requireCount + ensureCount;

  const host = document.createElement('div');
  host.className = 'efl-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'efl-title';
  const classLabel = isDeferred ? `${esc(className || 'CLASS')} (deferred)` : esc(className || 'CLASS');
  title.innerHTML = `<span class="efl-badge">Eiffel</span>${classLabel}`;
  host.appendChild(title);

  const subParts = [];
  if (inherits.length) subParts.push(`inherits ${inherits.join(', ')}`);
  if (features.length) subParts.push(`${features.length} feature${features.length !== 1 ? 's' : ''}`);
  if (contractCount) subParts.push(`${contractCount} contract${contractCount !== 1 ? 's' : ''}`);

  const sub = document.createElement('div');
  sub.className = 'efl-sub';
  sub.textContent = subParts.join(' · ') || 'Eiffel class';
  host.appendChild(sub);

  // Summary cards
  const summary = document.createElement('div');
  summary.className = 'efl-summary';
  const cards = [
    { value: inherits.length, label: 'Parents' },
    { value: features.length, label: 'Features' },
    { value: createProcedures.length, label: 'Creators' },
    { value: contractCount, label: 'Contracts' },
  ];
  for (const { value, label } of cards) {
    const card = document.createElement('div');
    card.className = 'efl-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    summary.appendChild(card);
  }
  host.appendChild(summary);

  // Inheritance
  if (inherits.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'efl-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Inheritance';
    sec.appendChild(h3);
    const div = document.createElement('div');
    for (const parent of inherits) {
      const tag = document.createElement('span');
      tag.className = 'efl-tag';
      tag.textContent = parent;
      div.appendChild(tag);
    }
    sec.appendChild(div);
    host.appendChild(sec);
  }

  // Create procedures
  if (createProcedures.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'efl-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Create Procedures';
    sec.appendChild(h3);
    const div = document.createElement('div');
    for (const proc of createProcedures) {
      const tag = document.createElement('span');
      tag.className = 'efl-tag';
      tag.textContent = proc;
      div.appendChild(tag);
    }
    sec.appendChild(div);
    host.appendChild(sec);
  }

  // Features
  if (features.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'efl-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Features';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'efl-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Feature</th><th>Section</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const { name, section } of features.slice(0, 50)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(name)}</td><td>${esc(section)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Contract summary
  if (contractCount > 0) {
    const sec = document.createElement('div');
    sec.className = 'efl-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Design by Contract';
    sec.appendChild(h3);
    const div = document.createElement('div');
    div.className = 'efl-contract';
    div.textContent = `${requireCount} require block${requireCount !== 1 ? 's' : ''} (preconditions) · ${ensureCount} ensure block${ensureCount !== 1 ? 's' : ''} (postconditions)`;
    sec.appendChild(div);
    host.appendChild(sec);
  }

  return { parentNode: host };
}
