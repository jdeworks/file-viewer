const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.lim-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.lim-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#7c3aed;color:#fff;vertical-align:middle;margin-right:8px;}
.lim-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.lim-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.lim-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.lim-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.lim-card strong{display:block;font-size:1.2rem;font-weight:700;}
.lim-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.lim-section{margin:16px 0;}
.lim-section h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.lim-table{width:100%;border-collapse:collapse;font-size:13px;}
.lim-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:5px 10px;border-bottom:2px solid var(--border,#e0e0e0);background:var(--bg,#fff);}
.lim-table td{padding:5px 10px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;}
.lim-table tr:last-child td{border-bottom:none;}
.lim-risk{color:#d97706;font-weight:700;}
.lim-risk-badge{display:inline-block;padding:1px 6px;border-radius:8px;font-size:10px;font-weight:700;background:#fef3c7;color:#d97706;margin-left:6px;}
`;

function parseLimits(text) {
  const lines = (text || '').split(/\r?\n/);
  const rules = [];

  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    // domain type item value
    const m = t.match(/^(\S+)\s+(soft|hard|-)\s+(\S+)\s+(\S+)/);
    if (m) {
      const value = m[4];
      const isRisk = value === 'unlimited' || value === '-1';
      rules.push({ domain: m[1], type: m[2], item: m[3], value, isRisk });
    }
  }

  return rules;
}

export function render(intake) {
  const rules = parseLimits(intake.text || '');
  const riskCount = rules.filter((r) => r.isRisk).length;

  const host = document.createElement('div');
  host.className = 'lim-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const title = document.createElement('div');
  title.className = 'lim-title';
  title.innerHTML = '<span class="lim-badge">Limits Config</span>PAM Resource Limits';
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'lim-sub';
  sub.textContent = `${rules.length} rule${rules.length !== 1 ? 's' : ''}` + (riskCount > 0 ? ` · ${riskCount} high-risk (unlimited)` : '');
  host.appendChild(sub);

  // Summary cards
  const domains = new Set(rules.map((r) => r.domain));
  const items = new Set(rules.map((r) => r.item));
  const summary = document.createElement('div');
  summary.className = 'lim-summary';
  for (const { value, label } of [
    { value: rules.length, label: 'Rules' },
    { value: domains.size, label: 'Domains' },
    { value: items.size, label: 'Item types' },
    { value: riskCount, label: 'Unlimited' },
  ]) {
    const card = document.createElement('div');
    card.className = 'lim-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    if (value > 0 && label === 'Unlimited') strong.style.color = '#d97706';
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    summary.appendChild(card);
  }
  host.appendChild(summary);

  if (rules.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'lim-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Rules';
    sec.appendChild(h3);

    const table = document.createElement('table');
    table.className = 'lim-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Domain</th><th>Type</th><th>Item</th><th>Value</th></tr>';
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (const rule of rules) {
      const tr = document.createElement('tr');
      const valCell = rule.isRisk
        ? `<span class="lim-risk">${esc(rule.value)}</span><span class="lim-risk-badge">HIGH RISK</span>`
        : esc(rule.value);
      tr.innerHTML = `<td>${esc(rule.domain)}</td><td>${esc(rule.type)}</td><td>${esc(rule.item)}</td><td>${valCell}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  return { parentNode: host };
}
