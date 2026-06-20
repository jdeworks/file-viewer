const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.gql-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-gql{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#E535AB;color:#fff;vertical-align:middle;margin-right:8px}
.gql-title{font-size:18px;font-weight:700;margin:0 0 4px}
.gql-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.gql-sec{margin:14px 0}
.gql-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px}
.gql-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);margin:6px 0}
.gql-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px}
.gql-kv-k{color:var(--fg-2,#888);min-width:140px;flex-shrink:0}
.gql-kv-v{font-family:ui-monospace,monospace;word-break:break-all}
.gql-pills{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0}
.gql-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.gql-op-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:#fdf0f9;border:1px solid #f0b7e0;font-family:ui-monospace,monospace}
.gql-field{margin:3px 0 3px 4px;font-size:13px;font-family:ui-monospace,monospace;color:var(--fg,#24292f)}
.gql-field-name{font-weight:600}
.gql-field-type{color:var(--fg-2,#888);margin-left:4px}
.gql-tag-type{display:inline-block;font-size:10px;font-weight:700;padding:1px 5px;border-radius:4px;margin-right:4px;vertical-align:middle}
.gql-tag-query{background:#e6f4ea;color:#1a7f37}
.gql-tag-mutation{background:#fde8e8;color:#b91c1c}
.gql-tag-subscription{background:#ede9fe;color:#6d28d9}
`;

// Extract top-level type blocks: type/interface/input NAME { ... }
// Also handles scalar NAME and enum NAME { ... }
function parseBlocks(text) {
  const types = [];
  const interfaces = [];
  const inputs = [];
  const enums = [];
  const scalars = [];
  let queryFields = [];
  let mutationFields = [];
  let subscriptionFields = [];

  // Match blocks: keyword NAME [implements ...] { body }
  // Using a simple iterative approach to handle multi-line
  const blockRe = /\b(type|interface|input|enum)\s+(\w+)(?:\s+implements\s+[\w\s&]+?)?\s*\{([^}]*)\}/g;
  let m;
  while ((m = blockRe.exec(text)) !== null) {
    const [, keyword, name, body] = m;
    const fields = body.split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'));

    if (keyword === 'type') {
      if (name === 'Query') {
        queryFields = fields.map((f) => f.split('(')[0].split(':')[0].trim()).filter(Boolean);
      } else if (name === 'Mutation') {
        mutationFields = fields.map((f) => f.split('(')[0].split(':')[0].trim()).filter(Boolean);
      } else if (name === 'Subscription') {
        subscriptionFields = fields.map((f) => f.split('(')[0].split(':')[0].trim()).filter(Boolean);
      } else {
        types.push(name);
      }
    } else if (keyword === 'interface') {
      interfaces.push(name);
    } else if (keyword === 'input') {
      inputs.push(name);
    } else if (keyword === 'enum') {
      enums.push(name);
    }
  }

  // Scalar declarations (no body)
  const scalarRe = /\bscalar\s+(\w+)/g;
  let sm;
  while ((sm = scalarRe.exec(text)) !== null) {
    scalars.push(sm[1]);
  }

  return { types, interfaces, inputs, enums, scalars, queryFields, mutationFields, subscriptionFields };
}

export function render(intake) {
  const text = intake.text || intake.textSample || '';

  const { types, interfaces, inputs, enums, scalars, queryFields, mutationFields, subscriptionFields } = parseBlocks(text);

  const totalTypes = types.length + interfaces.length + inputs.length + enums.length;
  const hasOps = queryFields.length || mutationFields.length || subscriptionFields.length;

  const subParts = [
    `${totalTypes} type${totalTypes !== 1 ? 's' : ''}`,
    queryFields.length ? `${queryFields.length} quer${queryFields.length !== 1 ? 'ies' : 'y'}` : '',
    mutationFields.length ? `${mutationFields.length} mutation${mutationFields.length !== 1 ? 's' : ''}` : '',
    subscriptionFields.length ? `${subscriptionFields.length} subscription${subscriptionFields.length !== 1 ? 's' : ''}` : '',
  ].filter(Boolean);

  // Summary card
  const summaryHtml = `<div class="gql-sec"><h3>Schema Summary</h3><div class="gql-card">
${types.length ? `<div class="gql-kv"><span class="gql-kv-k">Object types</span><span class="gql-kv-v">${types.length}</span></div>` : ''}
${interfaces.length ? `<div class="gql-kv"><span class="gql-kv-k">Interfaces</span><span class="gql-kv-v">${interfaces.length}</span></div>` : ''}
${inputs.length ? `<div class="gql-kv"><span class="gql-kv-k">Input types</span><span class="gql-kv-v">${inputs.length}</span></div>` : ''}
${enums.length ? `<div class="gql-kv"><span class="gql-kv-k">Enums</span><span class="gql-kv-v">${enums.length}</span></div>` : ''}
${scalars.length ? `<div class="gql-kv"><span class="gql-kv-k">Custom scalars</span><span class="gql-kv-v">${scalars.length}</span></div>` : ''}
${queryFields.length ? `<div class="gql-kv"><span class="gql-kv-k">Query fields</span><span class="gql-kv-v">${queryFields.length}</span></div>` : ''}
${mutationFields.length ? `<div class="gql-kv"><span class="gql-kv-k">Mutations</span><span class="gql-kv-v">${mutationFields.length}</span></div>` : ''}
${subscriptionFields.length ? `<div class="gql-kv"><span class="gql-kv-k">Subscriptions</span><span class="gql-kv-v">${subscriptionFields.length}</span></div>` : ''}
</div></div>`;

  // Operations
  const opsHtml = hasOps ? `<div class="gql-sec"><h3>Operations</h3><div class="gql-card">
${queryFields.length ? `<div style="margin-bottom:8px"><div style="font-size:11px;font-weight:700;margin-bottom:4px"><span class="gql-tag-type gql-tag-query">QUERY</span></div>
<div class="gql-pills">${queryFields.map((f) => `<span class="gql-op-pill">${esc(f)}</span>`).join('')}</div></div>` : ''}
${mutationFields.length ? `<div style="margin-bottom:8px"><div style="font-size:11px;font-weight:700;margin-bottom:4px"><span class="gql-tag-type gql-tag-mutation">MUTATION</span></div>
<div class="gql-pills">${mutationFields.map((f) => `<span class="gql-op-pill">${esc(f)}</span>`).join('')}</div></div>` : ''}
${subscriptionFields.length ? `<div style="margin-bottom:8px"><div style="font-size:11px;font-weight:700;margin-bottom:4px"><span class="gql-tag-type gql-tag-subscription">SUBSCRIPTION</span></div>
<div class="gql-pills">${subscriptionFields.map((f) => `<span class="gql-op-pill">${esc(f)}</span>`).join('')}</div></div>` : ''}
</div></div>` : '';

  // Type browser
  const typeBrowserHtml = (types.length || interfaces.length || enums.length || inputs.length || scalars.length) ? `<div class="gql-sec"><h3>Type Browser</h3>
${types.length ? `<div style="margin-bottom:8px"><div class="gql-sub" style="margin:0 0 4px">Object Types</div><div class="gql-pills">${types.map((t) => `<span class="gql-pill">${esc(t)}</span>`).join('')}</div></div>` : ''}
${interfaces.length ? `<div style="margin-bottom:8px"><div class="gql-sub" style="margin:0 0 4px">Interfaces</div><div class="gql-pills">${interfaces.map((t) => `<span class="gql-pill">${esc(t)}</span>`).join('')}</div></div>` : ''}
${enums.length ? `<div style="margin-bottom:8px"><div class="gql-sub" style="margin:0 0 4px">Enums</div><div class="gql-pills">${enums.map((t) => `<span class="gql-pill">${esc(t)}</span>`).join('')}</div></div>` : ''}
${inputs.length ? `<div style="margin-bottom:8px"><div class="gql-sub" style="margin:0 0 4px">Input Types</div><div class="gql-pills">${inputs.map((t) => `<span class="gql-pill">${esc(t)}</span>`).join('')}</div></div>` : ''}
${scalars.length ? `<div style="margin-bottom:8px"><div class="gql-sub" style="margin:0 0 4px">Custom Scalars</div><div class="gql-pills">${scalars.map((t) => `<span class="gql-pill">${esc(t)}</span>`).join('')}</div></div>` : ''}
</div>` : '';

  const host = document.createElement('div');
  host.className = 'gql-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-gql">GraphQL</span>
  <span class="gql-title">GraphQL Schema</span>
</div>
<div class="gql-sub">${esc(subParts.join(' · '))}</div>
${summaryHtml}${opsHtml}${typeBrowserHtml}`;
  return { parentNode: host };
}
