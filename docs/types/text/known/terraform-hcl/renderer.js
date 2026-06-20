const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.tf-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.tf-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#5C4EE5;color:#fff;vertical-align:middle;margin-right:8px}
.tf-title{font-size:18px;font-weight:700;margin:0 0 4px}
.tf-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.tf-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px}
.tf-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px}
.tf-card strong{display:block;font-size:1.2rem;font-weight:700}
.tf-card span{font-size:.8rem;color:var(--fg-2,#5a6678)}
.tf-section{margin:16px 0;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden}
.tf-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0)}
.tf-table{width:100%;border-collapse:collapse;font-size:13px}
.tf-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:5px 10px;border-bottom:2px solid var(--border,#e0e0e0);background:var(--bg,#fff)}
.tf-table td{padding:5px 10px;border-bottom:1px solid var(--border,#eaecf0);vertical-align:top}
.tf-table tr:last-child td{border-bottom:none}
.tf-mono{font-family:ui-monospace,monospace;font-size:12px}
.tf-tag{display:inline-block;background:var(--bg-2,#f0f4fa);border-radius:4px;padding:1px 6px;font-size:11px;margin-left:4px;color:var(--fg-2,#5a6678)}
.tf-chip-req{color:#1a7f37;font-weight:700;font-size:11px}
.tf-chip-opt{color:var(--fg-2,#888);font-size:11px}
.tf-resource-type{font-size:11px;color:#7c3aed;background:#f5f0ff;border-radius:4px;padding:1px 6px;margin-right:4px}
.tf-resource-counts{margin:16px 0}
.tf-rc-row{display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid var(--border,#eaecf0);font-size:13px}
.tf-rc-count{font-weight:700;min-width:28px;text-align:right;font-family:ui-monospace,monospace}
.tf-pre-wrap{margin:16px 0}
.tf-pre{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:14px 16px;overflow:auto;font:12px/1.6 ui-monospace,monospace;white-space:pre;tab-size:2}
`;

const KEYWORDS = /\b(terraform|required_providers|required_version|provider|resource|variable|output|locals|local|data|module|source|version|default|description|type|value|backend|cloud|sensitive|nullable|validation|condition|error_message|depends_on|for_each|count|lifecycle|create_before_destroy|prevent_destroy|ignore_changes|replace_triggered_by)\b/g;

function highlight(text) {
  const escaped = esc(text);
  return escaped
    .replace(/(&quot;[^&]*&quot;)/g, '<span style="color:#0a7d27">$1</span>')
    .replace(/\b(terraform|required_providers|required_version|provider|resource|variable|output|locals|local|data|module|source|version|default|description|type|value|backend|cloud|sensitive|nullable|validation|condition|error_message|depends_on|for_each|count|lifecycle|create_before_destroy|prevent_destroy|ignore_changes|replace_triggered_by|null|true|false)\b/g,
      '<span style="color:#8250df">$1</span>')
    .replace(/(#[^\n]*)/g, '<span style="color:#6e7781;font-style:italic">$1</span>')
    .replace(/(\b\d+(\.\d+)?\b)/g, '<span style="color:#0550ae">$1</span>');
}

function parseTerraform(text) {
  const resources = {};
  const variables = [];
  const outputs = [];
  const providers = [];
  const modules = [];
  const dataBlocks = [];
  let requiredProviders = [];

  // Parse resource blocks: resource "type" "name"
  const resourceRe = /^resource\s+"([^"]+)"\s+"([^"]+)"/gm;
  let m;
  while ((m = resourceRe.exec(text)) !== null) {
    const type = m[1];
    resources[type] = (resources[type] || 0) + 1;
  }

  // Parse variable blocks
  const varRe = /^variable\s+"([^"]+)"\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/gm;
  while ((m = varRe.exec(text)) !== null) {
    const name = m[1];
    const body = m[2];
    const descMatch = body.match(/description\s*=\s*"([^"]*)"/);
    const typeMatch = body.match(/type\s*=\s*(\S+)/);
    const hasDefault = /default\s*=/.test(body);
    variables.push({ name, description: descMatch ? descMatch[1] : '', type: typeMatch ? typeMatch[1] : '', hasDefault });
  }

  // Parse output blocks
  const outRe = /^output\s+"([^"]+)"\s*\{([^}]*)\}/gm;
  while ((m = outRe.exec(text)) !== null) {
    const name = m[1];
    const body = m[2];
    const descMatch = body.match(/description\s*=\s*"([^"]*)"/);
    outputs.push({ name, description: descMatch ? descMatch[1] : '' });
  }

  // Parse provider blocks
  const provRe = /^provider\s+"([^"]+)"/gm;
  while ((m = provRe.exec(text)) !== null) {
    providers.push(m[1]);
  }

  // Parse module blocks
  const modRe = /^module\s+"([^"]+)"/gm;
  while ((m = modRe.exec(text)) !== null) {
    modules.push(m[1]);
  }

  // Parse data blocks
  const dataRe = /^data\s+"([^"]+)"\s+"([^"]+)"/gm;
  while ((m = dataRe.exec(text)) !== null) {
    dataBlocks.push({ type: m[1], name: m[2] });
  }

  // Parse required_providers
  const reqProvRe = /required_providers\s*\{([^}]+)\}/s;
  const rpMatch = text.match(reqProvRe);
  if (rpMatch) {
    const rpBody = rpMatch[1];
    const rpNames = [...rpBody.matchAll(/^\s*([a-zA-Z0-9_-]+)\s*=/gm)].map((r) => r[1]);
    requiredProviders = rpNames;
  }

  return { resources, variables, outputs, providers, modules, dataBlocks, requiredProviders };
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const { resources, variables, outputs, providers, modules, dataBlocks, requiredProviders } = parseTerraform(text);

  const totalResources = Object.values(resources).reduce((a, b) => a + b, 0);

  const host = document.createElement('div');
  host.className = 'tf-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  // Title
  const title = document.createElement('div');
  title.className = 'tf-title';
  const badge = document.createElement('span');
  badge.className = 'tf-badge';
  badge.textContent = 'terraform';
  title.appendChild(badge);
  title.appendChild(document.createTextNode('HCL configuration'));
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'tf-sub';
  const parts = [];
  if (totalResources) parts.push(`${totalResources} resource${totalResources !== 1 ? 's' : ''}`);
  if (variables.length) parts.push(`${variables.length} variable${variables.length !== 1 ? 's' : ''}`);
  if (outputs.length) parts.push(`${outputs.length} output${outputs.length !== 1 ? 's' : ''}`);
  if (modules.length) parts.push(`${modules.length} module${modules.length !== 1 ? 's' : ''}`);
  sub.textContent = parts.length ? parts.join(' · ') : 'Terraform HCL';
  host.appendChild(sub);

  // Summary cards
  const summary = document.createElement('div');
  summary.className = 'tf-summary';
  const cardData = [
    { value: totalResources, label: 'Resources' },
    { value: variables.length, label: 'Variables' },
    { value: outputs.length, label: 'Outputs' },
    { value: modules.length, label: 'Modules' },
  ];
  for (const { value, label } of cardData) {
    const card = document.createElement('div');
    card.className = 'tf-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    summary.appendChild(card);
  }
  host.appendChild(summary);

  // Resource breakdown by type
  if (Object.keys(resources).length) {
    const sec = document.createElement('div');
    sec.className = 'tf-section';
    const hd = document.createElement('div');
    hd.className = 'tf-section-hd';
    hd.textContent = 'Resources by type';
    sec.appendChild(hd);
    const list = document.createElement('div');
    list.style.cssText = 'padding:8px 14px';
    const sorted = Object.entries(resources).sort((a, b) => b[1] - a[1]);
    for (const [type, count] of sorted) {
      const row = document.createElement('div');
      row.className = 'tf-rc-row';
      const countEl = document.createElement('span');
      countEl.className = 'tf-rc-count';
      countEl.textContent = count;
      const typeEl = document.createElement('span');
      typeEl.className = 'tf-resource-type tf-mono';
      typeEl.textContent = type;
      row.appendChild(countEl);
      row.appendChild(typeEl);
      list.appendChild(row);
    }
    sec.appendChild(list);
    host.appendChild(sec);
  }

  // Required providers
  if (requiredProviders.length) {
    const sec = document.createElement('div');
    sec.className = 'tf-section';
    const hd = document.createElement('div');
    hd.className = 'tf-section-hd';
    hd.textContent = 'Required providers';
    sec.appendChild(hd);
    const table = document.createElement('table');
    table.className = 'tf-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Provider</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const p of requiredProviders) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.className = 'tf-mono';
      td.textContent = p;
      tr.appendChild(td);
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Variables table
  if (variables.length) {
    const sec = document.createElement('div');
    sec.className = 'tf-section';
    const hd = document.createElement('div');
    hd.className = 'tf-section-hd';
    hd.textContent = `Variables (${variables.length})`;
    sec.appendChild(hd);
    const table = document.createElement('table');
    table.className = 'tf-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Name</th><th>Type</th><th>Default</th><th>Description</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const v of variables) {
      const tr = document.createElement('tr');
      const nameTd = document.createElement('td');
      nameTd.className = 'tf-mono';
      nameTd.textContent = v.name;
      const typeTd = document.createElement('td');
      typeTd.className = 'tf-mono';
      typeTd.textContent = v.type || '—';
      const defTd = document.createElement('td');
      defTd.innerHTML = v.hasDefault
        ? '<span class="tf-chip-opt">optional</span>'
        : '<span class="tf-chip-req">required</span>';
      const descTd = document.createElement('td');
      descTd.style.color = 'var(--fg-2,#888)';
      descTd.style.fontSize = '12px';
      descTd.textContent = v.description || '';
      tr.appendChild(nameTd);
      tr.appendChild(typeTd);
      tr.appendChild(defTd);
      tr.appendChild(descTd);
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Outputs table
  if (outputs.length) {
    const sec = document.createElement('div');
    sec.className = 'tf-section';
    const hd = document.createElement('div');
    hd.className = 'tf-section-hd';
    hd.textContent = `Outputs (${outputs.length})`;
    sec.appendChild(hd);
    const table = document.createElement('table');
    table.className = 'tf-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Name</th><th>Description</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const o of outputs) {
      const tr = document.createElement('tr');
      const nameTd = document.createElement('td');
      nameTd.className = 'tf-mono';
      nameTd.textContent = o.name;
      const descTd = document.createElement('td');
      descTd.style.color = 'var(--fg-2,#888)';
      descTd.style.fontSize = '12px';
      descTd.textContent = o.description || '';
      tr.appendChild(nameTd);
      tr.appendChild(descTd);
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Syntax-highlighted source
  const preWrap = document.createElement('div');
  preWrap.className = 'tf-pre-wrap';
  const preHd = document.createElement('div');
  preHd.style.cssText = 'font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin-bottom:6px';
  preHd.textContent = 'Source';
  preWrap.appendChild(preHd);
  const pre = document.createElement('pre');
  pre.className = 'tf-pre';
  pre.innerHTML = highlight(text);
  preWrap.appendChild(pre);
  host.appendChild(preWrap);

  return { parentNode: host };
}
