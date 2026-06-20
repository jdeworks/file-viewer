const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.pml-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.pml-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#7c3aed;color:#fff;vertical-align:middle;margin-right:8px;}
.pml-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.pml-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.pml-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.pml-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.pml-card strong{display:block;font-size:1.2rem;font-weight:700;}
.pml-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.pml-sec{margin:16px 0;}
.pml-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.pml-table{width:100%;border-collapse:collapse;font-size:13px;}
.pml-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:4px 10px;border-bottom:2px solid var(--border,#e0e0e0);background:var(--bg,#fff);}
.pml-table td{padding:5px 10px;border-bottom:1px solid var(--border,#eaecf0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
.pml-table tr:last-child td{border-bottom:none;}
.pml-pill{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;}
.pml-yes{color:#166534;font-weight:700;}
`;

function parsePromela(text) {
  const lines = text.split(/\r?\n/);
  const proctypes = [];
  const channels = [];
  const ltlClaims = [];
  let atomicCount = 0;
  let hasInit = false;
  let hasNeverClaim = false;

  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t || t.startsWith('/*') || t.startsWith('//') || t.startsWith('*')) continue;

    // proctype definitions
    const proctypeMatch = t.match(/^(?:active\s+(?:proctype|)\s*)?proctype\s+(\w+)\s*\(/);
    if (proctypeMatch) proctypes.push(proctypeMatch[1]);

    // init
    if (/^init\s*\{/.test(t)) hasInit = true;

    // channel declarations: chan name = [capacity] of { type }
    const chanMatch = t.match(/^chan\s+(\w+)\s*=\s*\[(\d+)\]\s*of\s*\{([^}]*)\}/);
    if (chanMatch) {
      channels.push({
        name: chanMatch[1],
        capacity: parseInt(chanMatch[2], 10),
        types: chanMatch[3].trim(),
      });
    }

    // ltl claims
    const ltlMatch = t.match(/^ltl\s+(\w+)\s*\{/);
    if (ltlMatch) ltlClaims.push(ltlMatch[1]);

    // never claim
    if (/^never\s*\{/.test(t)) hasNeverClaim = true;

    // atomic blocks
    if (/\batomic\s*\{/.test(t)) atomicCount++;
  }

  return { proctypes, channels, ltlClaims, atomicCount, hasInit, hasNeverClaim };
}

export function render(intake) {
  const text = intake.text || '';
  const info = parsePromela(text);

  const host = document.createElement('div');
  host.className = 'pml-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const titleEl = document.createElement('div');
  titleEl.className = 'pml-title';
  titleEl.innerHTML = '<span class="pml-badge">PROMELA</span>PROMELA Model';
  host.appendChild(titleEl);

  const subParts = [
    `${info.proctypes.length} proctype${info.proctypes.length !== 1 ? 's' : ''}`,
    info.channels.length && `${info.channels.length} channel${info.channels.length !== 1 ? 's' : ''}`,
    info.ltlClaims.length && `${info.ltlClaims.length} LTL claim${info.ltlClaims.length !== 1 ? 's' : ''}`,
    info.hasInit && 'has init',
  ].filter(Boolean);
  const subEl = document.createElement('div');
  subEl.className = 'pml-sub';
  subEl.textContent = subParts.join(' · ');
  host.appendChild(subEl);

  // Summary cards
  const summary = document.createElement('div');
  summary.className = 'pml-summary';
  const cards = [
    { value: info.proctypes.length, label: 'Proctypes' },
    { value: info.channels.length, label: 'Channels' },
    { value: info.ltlClaims.length, label: 'LTL claims' },
    { value: info.atomicCount, label: 'Atomic blocks' },
  ];
  for (const { value, label } of cards) {
    const card = document.createElement('div');
    card.className = 'pml-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    summary.appendChild(card);
  }
  host.appendChild(summary);

  // init / never claim flags
  if (info.hasInit || info.hasNeverClaim) {
    const flags = document.createElement('div');
    flags.style.cssText = 'font-size:13px;margin-bottom:14px;';
    const items = [];
    if (info.hasInit) items.push('<span class="pml-yes">init</span> <span style="color:var(--fg-2,#888);">— initial process defined</span>');
    if (info.hasNeverClaim) items.push('<span class="pml-yes">never</span> <span style="color:var(--fg-2,#888);">— never claim defined</span>');
    flags.innerHTML = items.join(' &nbsp;·&nbsp; ');
    host.appendChild(flags);
  }

  // Proctypes table
  if (info.proctypes.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'pml-sec';
    const h3 = document.createElement('h3');
    h3.textContent = `Proctype Definitions (${info.proctypes.length})`;
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'pml-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>#</th><th>Name</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (let i = 0; i < Math.min(info.proctypes.length, 40); i++) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${i + 1}</td><td>${esc(info.proctypes[i])}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Channels table
  if (info.channels.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'pml-sec';
    const h3 = document.createElement('h3');
    h3.textContent = `Channel Declarations (${info.channels.length})`;
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'pml-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Name</th><th>Capacity</th><th>Type(s)</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const ch of info.channels.slice(0, 30)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(ch.name)}</td><td>${ch.capacity}</td><td>${esc(ch.types)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // LTL claims
  if (info.ltlClaims.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'pml-sec';
    const h3 = document.createElement('h3');
    h3.textContent = `LTL / Never Claims (${info.ltlClaims.length})`;
    sec.appendChild(h3);
    const pills = document.createElement('div');
    for (const cl of info.ltlClaims) {
      const pill = document.createElement('span');
      pill.className = 'pml-pill';
      pill.textContent = cl;
      pills.appendChild(pill);
    }
    sec.appendChild(pills);
    host.appendChild(sec);
  }

  return { parentNode: host };
}
