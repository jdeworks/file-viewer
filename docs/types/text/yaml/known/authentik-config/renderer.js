import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.atk-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-atk{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#FD4B2D;color:#fff;vertical-align:middle;margin-right:8px;}
.atk-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.atk-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.atk-sec{margin:14px 0;}
.atk-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.atk-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.atk-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px;}
.atk-kv-k{color:var(--fg-2,#888);min-width:180px;flex-shrink:0;}
.atk-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.atk-masked{font-family:ui-monospace,monospace;color:var(--fg-2,#999);letter-spacing:2px;}
.atk-table{width:100%;border-collapse:collapse;font-size:13px;}
.atk-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);font-weight:600;padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);}
.atk-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e8eaed);vertical-align:top;}
.atk-pill{display:inline-flex;align-items:center;font-size:11px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:2px;}
.atk-model-app{background:#eff6ff;border-color:#93c5fd;color:#1e40af;}
.atk-model-provider{background:#f5f3ff;border-color:#c4b5fd;color:#5b21b6;}
.atk-model-flow{background:#dcfce7;border-color:#86efac;color:#166534;}
.atk-model-stage{background:#fef9c3;border-color:#fde047;color:#713f12;}
.atk-model-policy{background:#fff7ed;border-color:#fdba74;color:#9a3412;}
.atk-model-group{background:#f0fdf4;border-color:#86efac;color:#14532d;}
`;

function modelClass(model) {
  if (/application/.test(model)) return 'atk-model-app';
  if (/provider/.test(model)) return 'atk-model-provider';
  if (/flow/.test(model)) return 'atk-model-flow';
  if (/stage/.test(model)) return 'atk-model-stage';
  if (/policy/.test(model)) return 'atk-model-policy';
  if (/group|user/.test(model)) return 'atk-model-group';
  return '';
}

function modelShortName(model) {
  // authentik_core.application -> application
  return model ? model.replace(/^[^.]+\./, '') : model;
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = {}; }

  const version = cfg.version;
  const entries = Array.isArray(cfg.entries) ? cfg.entries : [];
  const metadata = cfg.metadata || {};

  // Group entries by model
  const byModel = {};
  for (const entry of entries) {
    const model = entry.model || 'unknown';
    if (!byModel[model]) byModel[model] = [];
    byModel[model].push(entry);
  }
  const modelGroups = Object.entries(byModel).sort((a, b) => b[1].length - a[1].length);

  // Summary
  const subParts = [
    version != null ? `version ${version}` : null,
    `${entries.length} entr${entries.length !== 1 ? 'ies' : 'y'}`,
    `${modelGroups.length} model type${modelGroups.length !== 1 ? 's' : ''}`,
    metadata.name ? `blueprint: ${metadata.name}` : null,
  ].filter(Boolean).join(' · ');

  // Blueprint info section
  const infoHtml = `<div class="atk-sec"><h3>Blueprint Info</h3><div class="atk-card">
${version != null ? `<div class="atk-kv"><span class="atk-kv-k">Version</span><span class="atk-kv-v">${esc(String(version))}</span></div>` : ''}
${metadata.name ? `<div class="atk-kv"><span class="atk-kv-k">Name</span><span class="atk-kv-v">${esc(metadata.name)}</span></div>` : ''}
${metadata.description ? `<div class="atk-kv"><span class="atk-kv-k">Description</span><span class="atk-kv-v">${esc(metadata.description)}</span></div>` : ''}
${metadata.labels && typeof metadata.labels === 'object' ? Object.entries(metadata.labels).slice(0, 5).map(([k, v]) =>
  `<div class="atk-kv"><span class="atk-kv-k">label: ${esc(k)}</span><span class="atk-kv-v">${esc(String(v))}</span></div>`
).join('') : ''}
</div></div>`;

  // Entries by model type
  const modelSummaryHtml = modelGroups.length ? `<div class="atk-sec"><h3>Entry Types</h3>
<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;">
${modelGroups.map(([model, items]) =>
  `<span class="atk-pill ${modelClass(model)}">${esc(modelShortName(model))} <strong style="margin-left:4px">${items.length}</strong></span>`
).join('')}
</div></div>` : '';

  // Entries table
  const entriesHtml = entries.length ? `<div class="atk-sec"><h3>Entries (${entries.length})</h3>
<table class="atk-table">
  <thead><tr><th>Model</th><th>Identifier</th><th>State</th></tr></thead>
  <tbody>${entries.slice(0, 20).map((entry) => {
    const model = entry.model || '—';
    const attrs = entry.attrs || entry.fields || {};
    const id = attrs.slug || attrs.name || attrs.username || attrs.pk || entry.id || '—';
    const state = entry.state || '—';
    const hasSecret = attrs.client_secret != null || attrs.secret != null || attrs.password != null;
    return `<tr>
      <td><span class="atk-pill ${modelClass(model)}">${esc(modelShortName(model))}</span></td>
      <td style="font:12px ui-monospace,monospace">${esc(String(id))}${hasSecret ? ` <span class="atk-masked" title="secret masked">••••••••</span>` : ''}</td>
      <td style="font-size:12px;color:var(--fg-2,#888)">${esc(state)}</td>
    </tr>`;
  }).join('')}${entries.length > 20 ? `<tr><td colspan="3" style="font-size:12px;color:var(--fg-2,#888)">…and ${entries.length - 20} more</td></tr>` : ''}
  </tbody>
</table></div>` : '';

  const host = document.createElement('div');
  host.className = 'atk-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-atk">Authentik</span>
  <span class="atk-title">Blueprint</span>
</div>
<div class="atk-sub">${esc(subParts)}</div>
${infoHtml}${modelSummaryHtml}${entriesHtml}`;
  return { parentNode: host };
}
