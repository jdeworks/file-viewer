const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.bicep-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.bicep-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0078D4;color:#fff;vertical-align:middle;margin-right:8px}
.bicep-title{font-size:18px;font-weight:700;margin:0 0 4px}
.bicep-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.bicep-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px}
.bicep-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px}
.bicep-card strong{display:block;font-size:1.2rem;font-weight:700}
.bicep-card span{font-size:.8rem;color:var(--fg-2,#5a6678)}
.bicep-section{margin:16px 0;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden}
.bicep-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0)}
.bicep-table{width:100%;border-collapse:collapse;font-size:13px}
.bicep-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:5px 10px;border-bottom:2px solid var(--border,#e0e0e0);background:var(--bg,#fff)}
.bicep-table td{padding:5px 10px;border-bottom:1px solid var(--border,#eaecf0);vertical-align:top}
.bicep-table tr:last-child td{border-bottom:none}
.bicep-mono{font-family:ui-monospace,monospace;font-size:12px}
.bicep-type-tag{font-size:11px;color:#005a9e;background:#e8f3ff;border-radius:4px;padding:1px 6px;margin-right:4px}
.bicep-res-type{font-size:11px;color:#7c3aed;background:#f5f0ff;border-radius:4px;padding:1px 6px;margin-right:4px;font-family:ui-monospace,monospace}
.bicep-scope{display:inline-block;background:#fff3cd;color:#856404;border-radius:4px;padding:2px 8px;font-size:11px;font-weight:600;margin-bottom:8px}
.bicep-chip-req{color:#b91c1c;font-weight:700;font-size:11px}
.bicep-chip-opt{color:#1a7f37;font-size:11px}
.bicep-pre{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:14px 16px;overflow:auto;font:12px/1.6 ui-monospace,monospace;white-space:pre;tab-size:2;margin:16px 0}
`;

function highlight(text) {
  const escaped = esc(text);
  return escaped
    .replace(/(\/\/[^\n]*)/g, '<span style="color:#6e7781;font-style:italic">$1</span>')
    .replace(/('(?:[^'\\]|\\.)*')/g, '<span style="color:#0a7d27">$1</span>')
    .replace(/\b(param|var|resource|module|output|targetScope|existing|import|using|type|object|array|string|int|bool|secure|decorator)\b/g,
      '<span style="color:#8250df">$1</span>')
    .replace(/\b(@description|@allowed|@minLength|@maxLength|@minValue|@maxValue|@secure|@metadata)\b/g,
      '<span style="color:#953800">$1</span>')
    .replace(/\b(true|false|null)\b/g, '<span style="color:#0550ae">$1</span>')
    .replace(/(\b\d+(\.\d+)?\b)/g, '<span style="color:#0550ae">$1</span>');
}

function parseBicep(text) {
  const resources = [];
  const params = [];
  const outputs = [];
  const modules = [];
  const vars = [];
  let targetScope = null;

  // targetScope
  const scopeMatch = text.match(/^targetScope\s*=\s*'([^']+)'/m);
  if (scopeMatch) targetScope = scopeMatch[1];

  // resource blocks: resource <name> '<type>@<version>' = {
  const resourceRe = /^resource\s+(\w+)\s+'([^'@]+)@([^']+)'/gm;
  let m;
  while ((m = resourceRe.exec(text)) !== null) {
    resources.push({ name: m[1], type: m[2], version: m[3] });
  }

  // param statements: (@decorator\n)*param <name> <type> [= <default>]
  const paramRe = /^(?:@[^\n]+\n)*param\s+(\w+)\s+(\w+)(.*)/gm;
  while ((m = paramRe.exec(text)) !== null) {
    const name = m[1];
    const type = m[2];
    const rest = m[3];
    const hasDefault = /\s*=\s*/.test(rest);
    // Check preceding lines for @description
    const beforeParam = text.slice(0, m.index);
    const descMatch = beforeParam.match(/@description\('([^']*)'\)\s*$/);
    const description = descMatch ? descMatch[1] : '';
    params.push({ name, type, hasDefault, description });
  }

  // output statements: output <name> <type> = <expr>
  const outputRe = /^output\s+(\w+)\s+(\w+)\s*=/gm;
  while ((m = outputRe.exec(text)) !== null) {
    outputs.push({ name: m[1], type: m[2] });
  }

  // module references: module <name> '<path>' = {
  const moduleRe = /^module\s+(\w+)\s+'([^']+)'/gm;
  while ((m = moduleRe.exec(text)) !== null) {
    modules.push({ name: m[1], path: m[2] });
  }

  // var declarations: var <name> = <expr>
  const varRe = /^var\s+(\w+)\s*=/gm;
  while ((m = varRe.exec(text)) !== null) {
    vars.push(m[1]);
  }

  // Resource type counts
  const typeCounts = {};
  for (const r of resources) {
    typeCounts[r.type] = (typeCounts[r.type] || 0) + 1;
  }

  return { resources, params, outputs, modules, vars, targetScope, typeCounts };
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const { resources, params, outputs, modules, vars, targetScope, typeCounts } = parseBicep(text);
  const filename = (intake.name || intake.filename || '').split('/').pop();
  const isBicepParam = filename.endsWith('.bicepparam');

  const host = document.createElement('div');
  host.className = 'bicep-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  // Title
  const title = document.createElement('div');
  title.className = 'bicep-title';
  const badge = document.createElement('span');
  badge.className = 'bicep-badge';
  badge.textContent = 'Bicep';
  title.appendChild(badge);
  title.appendChild(document.createTextNode(isBicepParam ? 'Parameters file' : 'Template'));
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'bicep-sub';
  const parts = [];
  if (resources.length) parts.push(`${resources.length} resource${resources.length !== 1 ? 's' : ''}`);
  if (params.length) parts.push(`${params.length} param${params.length !== 1 ? 's' : ''}`);
  if (outputs.length) parts.push(`${outputs.length} output${outputs.length !== 1 ? 's' : ''}`);
  if (modules.length) parts.push(`${modules.length} module${modules.length !== 1 ? 's' : ''}`);
  if (targetScope) parts.push(`scope: ${targetScope}`);
  sub.textContent = parts.length ? parts.join(' · ') : 'Azure Bicep';
  host.appendChild(sub);

  // Summary cards
  const summary = document.createElement('div');
  summary.className = 'bicep-summary';
  const cardData = [
    { value: resources.length, label: 'Resources' },
    { value: params.length, label: 'Parameters' },
    { value: outputs.length, label: 'Outputs' },
    { value: modules.length, label: 'Modules' },
  ];
  for (const { value, label } of cardData) {
    const card = document.createElement('div');
    card.className = 'bicep-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    summary.appendChild(card);
  }
  host.appendChild(summary);

  // Target scope
  if (targetScope) {
    const scopeDiv = document.createElement('div');
    scopeDiv.style.cssText = 'margin-bottom:12px';
    const scopeBadge = document.createElement('span');
    scopeBadge.className = 'bicep-scope';
    scopeBadge.textContent = `targetScope: ${targetScope}`;
    scopeDiv.appendChild(scopeBadge);
    host.appendChild(scopeDiv);
  }

  // Resources by type
  if (Object.keys(typeCounts).length) {
    const sec = document.createElement('div');
    sec.className = 'bicep-section';
    const hd = document.createElement('div');
    hd.className = 'bicep-section-hd';
    hd.textContent = `Resources (${resources.length})`;
    sec.appendChild(hd);
    const table = document.createElement('table');
    table.className = 'bicep-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Name</th><th>Resource type</th><th>API version</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const r of resources) {
      const tr = document.createElement('tr');
      const nameTd = document.createElement('td');
      nameTd.className = 'bicep-mono';
      nameTd.textContent = r.name;
      const typeTd = document.createElement('td');
      const typeSpan = document.createElement('span');
      typeSpan.className = 'bicep-res-type';
      typeSpan.textContent = r.type;
      typeTd.appendChild(typeSpan);
      const verTd = document.createElement('td');
      verTd.style.color = 'var(--fg-2,#888)';
      verTd.style.fontSize = '12px';
      verTd.textContent = r.version;
      tr.appendChild(nameTd);
      tr.appendChild(typeTd);
      tr.appendChild(verTd);
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Parameters
  if (params.length) {
    const sec = document.createElement('div');
    sec.className = 'bicep-section';
    const hd = document.createElement('div');
    hd.className = 'bicep-section-hd';
    hd.textContent = `Parameters (${params.length})`;
    sec.appendChild(hd);
    const table = document.createElement('table');
    table.className = 'bicep-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Name</th><th>Type</th><th>Required</th><th>Description</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const p of params) {
      const tr = document.createElement('tr');
      const nameTd = document.createElement('td');
      nameTd.className = 'bicep-mono';
      nameTd.textContent = p.name;
      const typeTd = document.createElement('td');
      const typeSpan = document.createElement('span');
      typeSpan.className = 'bicep-type-tag';
      typeSpan.textContent = p.type;
      typeTd.appendChild(typeSpan);
      const reqTd = document.createElement('td');
      reqTd.innerHTML = p.hasDefault
        ? '<span class="bicep-chip-opt">optional</span>'
        : '<span class="bicep-chip-req">required</span>';
      const descTd = document.createElement('td');
      descTd.style.color = 'var(--fg-2,#888)';
      descTd.style.fontSize = '12px';
      descTd.textContent = p.description || '';
      tr.appendChild(nameTd);
      tr.appendChild(typeTd);
      tr.appendChild(reqTd);
      tr.appendChild(descTd);
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Outputs
  if (outputs.length) {
    const sec = document.createElement('div');
    sec.className = 'bicep-section';
    const hd = document.createElement('div');
    hd.className = 'bicep-section-hd';
    hd.textContent = `Outputs (${outputs.length})`;
    sec.appendChild(hd);
    const table = document.createElement('table');
    table.className = 'bicep-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Name</th><th>Type</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const o of outputs) {
      const tr = document.createElement('tr');
      const nameTd = document.createElement('td');
      nameTd.className = 'bicep-mono';
      nameTd.textContent = o.name;
      const typeTd = document.createElement('td');
      const typeSpan = document.createElement('span');
      typeSpan.className = 'bicep-type-tag';
      typeSpan.textContent = o.type;
      typeTd.appendChild(typeSpan);
      tr.appendChild(nameTd);
      tr.appendChild(typeTd);
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Syntax-highlighted source
  const preHd = document.createElement('div');
  preHd.style.cssText = 'font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:16px 0 6px';
  preHd.textContent = 'Source';
  host.appendChild(preHd);
  const pre = document.createElement('pre');
  pre.className = 'bicep-pre';
  pre.innerHTML = highlight(text);
  host.appendChild(pre);

  return { parentNode: host };
}
