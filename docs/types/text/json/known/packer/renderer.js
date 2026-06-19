const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const BUILDER_COLORS = {
  'amazon-ebs': '#ff9900', 'amazon-instance': '#ff9900', 'googlecompute': '#4285f4',
  'azure-arm': '#0078d4', 'vmware-iso': '#607d8b', 'virtualbox-iso': '#183a61',
  'docker': '#2496ed', 'qemu': '#ff6600', 'null': '#888',
};

const CSS = `
.pkr-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-pkr{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#02a8ef;color:#fff;vertical-align:middle;margin-right:8px;}
.pkr-title{font-size:18px;font-weight:700;margin:0 0 12px;}
.pkr-sec{margin:12px 0;}
.pkr-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.pkr-builders{display:flex;flex-wrap:wrap;gap:6px;}
.pkr-builder{display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-size:13px;}
.pkr-builder .dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
.pkr-builder .name{font:12px ui-monospace,monospace;font-weight:600;}
.pkr-table{width:100%;border-collapse:collapse;font-size:13px;}
.pkr-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.pkr-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);}
.pkr-mono{font:12px ui-monospace,monospace;}
.pkr-tag{font-size:11px;padding:1px 6px;border-radius:4px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
`;

export function render(intake) {
  let cfg = {};
  try { cfg = JSON.parse(intake.text || '{}'); } catch { cfg = {}; }

  const builders = Array.isArray(cfg.builders) ? cfg.builders : [];
  const provisioners = Array.isArray(cfg.provisioners) ? cfg.provisioners : [];
  const variables = cfg.variables && typeof cfg.variables === 'object' ? cfg.variables : {};
  const varKeys = Object.keys(variables);

  const host = document.createElement('div');
  host.className = 'pkr-doc';

  const buildersHtml = builders.length
    ? `<div class="pkr-sec"><h3>Builders (${builders.length})</h3><div class="pkr-builders">
${builders.map((b) => {
  const t = b.type || 'unknown';
  const color = BUILDER_COLORS[t] || '#666';
  const label = b.name ? `${t} (${b.name})` : t;
  return `<span class="pkr-builder"><span class="dot" style="background:${color}"></span><span class="name">${esc(label)}</span></span>`;
}).join('')}
</div></div>`
    : '';

  const provisionersHtml = provisioners.length
    ? `<div class="pkr-sec"><h3>Provisioners (${provisioners.length})</h3><table class="pkr-table">
<thead><tr><th>Type</th><th>Details</th></tr></thead>
<tbody>${provisioners.slice(0, 8).map((p) => {
  const t = p.type || '—';
  let detail = '';
  if (p.inline) detail = `inline (${Array.isArray(p.inline) ? p.inline.length : 1} cmd)`;
  else if (p.script) detail = p.script;
  else if (p.scripts) detail = `${Array.isArray(p.scripts) ? p.scripts.length : '?'} scripts`;
  else if (p.source) detail = p.source;
  return `<tr><td><span class="pkr-mono">${esc(t)}</span></td><td>${esc(detail)}</td></tr>`;
}).join('')}${provisioners.length > 8 ? `<tr><td colspan="2" style="color:var(--fg-2,#888);font-size:12px">…and ${provisioners.length - 8} more</td></tr>` : ''}
</tbody></table></div>`
    : '';

  const varsHtml = varKeys.length
    ? `<div class="pkr-sec"><h3>Variables (${varKeys.length})</h3><div style="display:flex;flex-wrap:wrap;gap:4px">
${varKeys.slice(0, 16).map((k) => `<span class="pkr-tag pkr-mono">${esc(k)}</span>`).join('')}
${varKeys.length > 16 ? `<span style="font-size:11px;color:var(--fg-2,#888)">+${varKeys.length - 16} more</span>` : ''}
</div></div>`
    : '';

  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
  <span class="badge-pkr">Packer</span>
  <span class="pkr-title">Machine image template</span>
</div>
${buildersHtml}
${provisionersHtml}
${varsHtml}`;

  return { parentNode: host };
}
