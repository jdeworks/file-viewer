const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.avro-doc{padding:16px 18px;max-width:960px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.avro-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#c45;color:#fff;vertical-align:middle;margin-right:8px;}
.avro-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.avro-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.avro-schema{margin:0 0 24px;}
.avro-schema-hd{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#d9e1ec);border-radius:8px 8px 0 0;padding:10px 14px;}
.avro-schema-name{font-size:15px;font-weight:700;}
.avro-schema-ns{font-size:11px;color:var(--fg-2,#888);font-family:ui-monospace,monospace;}
.avro-schema-doc{font-size:12px;color:var(--fg-2,#666);margin:4px 0 0;font-style:italic;}
.avro-table{width:100%;border-collapse:collapse;font-size:13px;border:1px solid var(--border,#d9e1ec);border-top:none;border-radius:0 0 8px 8px;overflow:hidden;}
.avro-table th{background:var(--bg-2,#f6f8fa);border-bottom:2px solid var(--border,#d9e1ec);padding:7px 10px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);font-weight:600;}
.avro-table td{border-bottom:1px solid var(--border,#eaecf0);padding:6px 10px;vertical-align:top;}
.avro-table tr:last-child td{border-bottom:none;}
.avro-field-name{font-family:ui-monospace,monospace;font-weight:600;font-size:12px;}
.avro-type{font-family:ui-monospace,monospace;font-size:11px;padding:2px 6px;border-radius:4px;background:var(--bg-2,#f1f5f9);border:1px solid var(--border,#e0e0e0);white-space:nowrap;}
.avro-type-complex{background:#eff6ff;border-color:#bfdbfe;color:#1e40af;}
.avro-type-null{color:var(--fg-2,#888);}
.avro-default{font-family:ui-monospace,monospace;font-size:11px;color:var(--fg-2,#666);}
.avro-doc-text{font-size:11px;color:var(--fg-2,#666);font-style:italic;}
.avro-tag{display:inline-block;font-size:10px;padding:1px 5px;border-radius:4px;background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d;margin-right:3px;font-weight:600;}
.avro-tag-enum{background:#fdf4ff;border-color:#e9d5ff;color:#7c3aed;}
.avro-tag-array{background:#fff7ed;border-color:#fed7aa;color:#c2410c;}
.avro-tag-record{background:#eff6ff;border-color:#bfdbfe;color:#1e40af;}
`;

function formatType(t) {
  if (t === null || t === undefined) return { label: 'null', cls: 'avro-type-null', tag: '' };
  if (typeof t === 'string') return { label: t, cls: '', tag: '' };
  if (Array.isArray(t)) {
    // Union type
    const parts = t.map((u) => typeof u === 'string' ? u : (u && u.type ? u.type : 'complex'));
    const nullable = parts.includes('null');
    const others = parts.filter((p) => p !== 'null');
    const label = nullable ? `${others.join('|')}?` : parts.join('|');
    return { label, cls: 'avro-type-complex', tag: nullable ? '<span class="avro-tag">nullable</span>' : '' };
  }
  if (typeof t === 'object') {
    if (t.type === 'record') return { label: `record:${t.name || '?'}`, cls: 'avro-type-complex', tag: '<span class="avro-tag avro-tag-record">record</span>' };
    if (t.type === 'array') {
      const items = typeof t.items === 'string' ? t.items : (t.items && t.items.type ? t.items.type : 'complex');
      return { label: `array<${items}>`, cls: 'avro-type-complex', tag: '<span class="avro-tag avro-tag-array">array</span>' };
    }
    if (t.type === 'map') {
      const values = typeof t.values === 'string' ? t.values : 'complex';
      return { label: `map<${values}>`, cls: 'avro-type-complex', tag: '' };
    }
    if (t.type === 'enum') {
      const symbols = Array.isArray(t.symbols) ? t.symbols.slice(0, 3).join('|') + (t.symbols.length > 3 ? '…' : '') : '';
      return { label: `enum:${t.name || '?'}${symbols ? ` (${symbols})` : ''}`, cls: 'avro-type-complex', tag: '<span class="avro-tag avro-tag-enum">enum</span>' };
    }
    if (t.type === 'fixed') return { label: `fixed(${t.size || '?'})`, cls: '', tag: '' };
    if (typeof t.type === 'string') return { label: t.type, cls: '', tag: '' };
  }
  return { label: JSON.stringify(t).slice(0, 40), cls: '', tag: '' };
}

function defaultStr(d) {
  if (d === undefined) return '';
  if (d === null) return 'null';
  if (typeof d === 'string') return JSON.stringify(d);
  if (typeof d === 'boolean' || typeof d === 'number') return String(d);
  if (Array.isArray(d)) return d.length === 0 ? '[]' : `[…${d.length}]`;
  return JSON.stringify(d).slice(0, 40);
}

function renderSchema(schema, host) {
  if (!schema || typeof schema !== 'object') return;

  const name = schema.name || 'Schema';
  const ns = schema.namespace || '';
  const doc = schema.doc || '';
  const fields = Array.isArray(schema.fields) ? schema.fields : [];

  const schemaEl = document.createElement('div');
  schemaEl.className = 'avro-schema';

  const hd = document.createElement('div');
  hd.className = 'avro-schema-hd';
  hd.innerHTML = `<div class="avro-schema-name"><span class="avro-badge">Avro Record</span>${esc(name)}</div>` +
    (ns ? `<div class="avro-schema-ns">${esc(ns)}</div>` : '') +
    (doc ? `<div class="avro-schema-doc">${esc(doc)}</div>` : '');
  schemaEl.appendChild(hd);

  const table = document.createElement('table');
  table.className = 'avro-table';
  const thead = document.createElement('thead');
  thead.innerHTML = '<tr><th>Name</th><th>Type</th><th>Default</th><th>Doc</th></tr>';
  table.appendChild(thead);
  const tbody = document.createElement('tbody');

  for (const field of fields) {
    const fName = field.name || '?';
    const { label, cls, tag } = formatType(field.type);
    const def = defaultStr(field.default);
    const fdoc = field.doc || '';
    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="avro-field-name">${esc(fName)}</td>` +
      `<td>${tag}<span class="avro-type ${cls}">${esc(label)}</span></td>` +
      `<td class="avro-default">${esc(def)}</td>` +
      `<td class="avro-doc-text">${esc(fdoc)}</td>`;
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  schemaEl.appendChild(table);
  host.appendChild(schemaEl);
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'avro-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  let obj;
  try {
    obj = intake.parsed ?? JSON.parse(intake.text || '{}');
  } catch {
    const err = document.createElement('p');
    err.textContent = 'Failed to parse Avro schema file.';
    host.appendChild(err);
    return { parentNode: host };
  }

  const schemas = Array.isArray(obj) ? obj : [obj];

  const title = document.createElement('div');
  title.className = 'avro-title';
  const firstName = (schemas[0] && schemas[0].name) || 'Avro Schema';
  title.innerHTML = `<span class="avro-badge">Avro</span>${esc(firstName)}`;
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'avro-sub';
  const ns = (schemas[0] && schemas[0].namespace) || '';
  const totalFields = schemas.reduce((n, s) => n + (Array.isArray(s && s.fields) ? s.fields.length : 0), 0);
  sub.textContent = [
    ns ? `namespace: ${ns}` : '',
    `${schemas.length} schema${schemas.length !== 1 ? 's' : ''}`,
    `${totalFields} field${totalFields !== 1 ? 's' : ''}`,
  ].filter(Boolean).join(' · ');
  host.appendChild(sub);

  for (const schema of schemas) {
    renderSchema(schema, host);
  }

  return { parentNode: host };
}
