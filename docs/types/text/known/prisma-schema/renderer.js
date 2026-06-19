// Enhanced Prisma schema view. Rendered in the parent pane (trusted DOM).
// Parses generator, datasource, models, and enums using regex (no external parser).
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.pr-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.pr-head{display:flex;align-items:center;gap:10px;margin-bottom:12px;}
.badge-pr{display:inline-block;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;background:#5a67d8;color:#fff;vertical-align:middle;}
.pr-title{font-size:18px;font-weight:700;margin:0;}
.pr-sec{margin-top:16px;}
.pr-sec h3{font-size:13px;font-weight:600;color:var(--fg-2,#888);text-transform:uppercase;letter-spacing:.05em;margin:0 0 6px;}
.pr-block{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e8eaed);border-radius:6px;padding:10px 14px;margin-bottom:8px;}
.pr-block-title{font-size:13px;font-weight:700;margin-bottom:4px;}
.pr-row{display:flex;gap:8px;font-size:12px;margin:2px 0;}
.pr-key{color:var(--fg-2,#888);min-width:80px;flex-shrink:0;}
.pr-val{font-family:ui-monospace,monospace;}
.pr-model-list{list-style:none;margin:0;padding:0;}
.pr-model-item{display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--border,#e8eaed);font-size:13px;}
.pr-model-item:last-child{border-bottom:none;}
.pr-model-name{font-family:ui-monospace,monospace;font-weight:600;color:#5a67d8;}
.pr-tag{display:inline-block;padding:1px 7px;border-radius:10px;font-size:11px;font-weight:600;background:#ebf4ff;color:#2b6cb0;border:1px solid #bee3f8;}
.pr-tag.enum{background:#faf5ff;color:#6b46c1;border-color:#d6bcfa;}
.pr-tag.model{background:#f0fff4;color:#276749;border-color:#9ae6b4;}
.pr-field-count{font-size:11px;color:var(--fg-2,#888);}
.pr-err{color:#c62828;font-size:13px;}
.pr-provider{font-family:ui-monospace,monospace;font-weight:700;color:#2d3748;}
`;

// Parse a block from Prisma schema: `type Name { ... }`
function parseBlocks(text, type) {
  const results = [];
  const re = new RegExp(`^${type}\\s+(\\w+)\\s*\\{([^}]*)\\}`, 'gm');
  let m;
  while ((m = re.exec(text)) !== null) {
    results.push({ name: m[1], body: m[2] });
  }
  return results;
}

// Extract a field value from a block body like `  key = "value"` or `  key = env("VAR")`
function extractField(body, key) {
  const re = new RegExp(`^\\s*${key}\\s*=\\s*(.+)$`, 'm');
  const m = re.exec(body);
  if (!m) return null;
  return m[1].trim().replace(/^"(.*)"$/, '$1');
}

// Count non-empty, non-comment lines (fields) in a block body
function countFields(body) {
  return body.split('\n').filter((l) => {
    const t = l.trim();
    return t && !t.startsWith('//') && !t.startsWith('@@');
  }).length;
}

export function render(intake) {
  const text = intake.text || '';
  const host = document.createElement('div');
  host.className = 'pr-doc';

  const generators = parseBlocks(text, 'generator');
  const datasources = parseBlocks(text, 'datasource');
  const models = parseBlocks(text, 'model');
  const enums = parseBlocks(text, 'enum');

  const genHtml = generators.map((g) => {
    const provider = extractField(g.body, 'provider');
    const output = extractField(g.body, 'output');
    const previewFeatures = extractField(g.body, 'previewFeatures');
    return `<div class="pr-block">
      <div class="pr-block-title">${esc(g.name)}</div>
      ${provider ? `<div class="pr-row"><span class="pr-key">provider</span><span class="pr-val pr-provider">${esc(provider)}</span></div>` : ''}
      ${output ? `<div class="pr-row"><span class="pr-key">output</span><span class="pr-val">${esc(output)}</span></div>` : ''}
      ${previewFeatures ? `<div class="pr-row"><span class="pr-key">preview</span><span class="pr-val">${esc(previewFeatures)}</span></div>` : ''}
    </div>`;
  }).join('');

  const dsHtml = datasources.map((ds) => {
    const provider = extractField(ds.body, 'provider');
    const url = extractField(ds.body, 'url');
    const shadowUrl = extractField(ds.body, 'shadowDatabaseUrl');
    return `<div class="pr-block">
      <div class="pr-block-title">${esc(ds.name)}</div>
      ${provider ? `<div class="pr-row"><span class="pr-key">provider</span><span class="pr-val pr-provider">${esc(provider)}</span></div>` : ''}
      ${url ? `<div class="pr-row"><span class="pr-key">url</span><span class="pr-val">${esc(url)}</span></div>` : ''}
      ${shadowUrl ? `<div class="pr-row"><span class="pr-key">shadowUrl</span><span class="pr-val">${esc(shadowUrl)}</span></div>` : ''}
    </div>`;
  }).join('');

  const modelItems = models.map((m) => {
    const fields = countFields(m.body);
    return `<li class="pr-model-item"><span class="pr-model-name">${esc(m.name)}</span><span class="pr-field-count">${fields} field${fields !== 1 ? 's' : ''}</span></li>`;
  }).join('');

  const enumItems = enums.map((e) => {
    const vals = e.body.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('//'));
    return `<li class="pr-model-item"><span class="pr-model-name pr-tag enum" style="border-radius:4px;">${esc(e.name)}</span><span class="pr-field-count">${vals.length} value${vals.length !== 1 ? 's' : ''}</span></li>`;
  }).join('');

  const summary = [
    models.length ? `<span class="pr-tag model">${models.length} model${models.length !== 1 ? 's' : ''}</span>` : '',
    enums.length ? `<span class="pr-tag enum">${enums.length} enum${enums.length !== 1 ? 's' : ''}</span>` : '',
    generators.length ? `<span class="pr-tag">${generators.length} generator${generators.length !== 1 ? 's' : ''}</span>` : '',
    datasources.length ? `<span class="pr-tag">${datasources.length} datasource${datasources.length !== 1 ? 's' : ''}</span>` : '',
  ].filter(Boolean).join(' ');

  host.innerHTML = `<style>${CSS}</style>
<div class="pr-head">
  <span class="badge-pr">Prisma</span>
  <div class="pr-title">${esc(intake.name || 'schema.prisma')}</div>
</div>
${summary ? `<div style="margin-bottom:14px;display:flex;gap:6px;flex-wrap:wrap;">${summary}</div>` : ''}
${generators.length ? `<div class="pr-sec"><h3>Generator</h3>${genHtml}</div>` : ''}
${datasources.length ? `<div class="pr-sec"><h3>Datasource</h3>${dsHtml}</div>` : ''}
${models.length ? `<div class="pr-sec"><h3>Models <span style="font-size:11px;font-weight:400;">(${models.length})</span></h3><ul class="pr-model-list">${modelItems}</ul></div>` : ''}
${enums.length ? `<div class="pr-sec"><h3>Enums <span style="font-size:11px;font-weight:400;">(${enums.length})</span></h3><ul class="pr-model-list">${enumItems}</ul></div>` : ''}
${!generators.length && !datasources.length && !models.length && !enums.length ? '<p style="color:var(--fg-2,#888);font-size:13px;">No Prisma schema blocks found.</p>' : ''}`;

  return { parentNode: host };
}
