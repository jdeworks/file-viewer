const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.gd-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-gd{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#f46800;color:#fff;vertical-align:middle;margin-right:8px}
.gd-title{font-size:18px;font-weight:700;margin:0 0 4px}
.gd-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.gd-sec{margin:14px 0}
.gd-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px}
.gd-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);margin:6px 0}
.gd-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px}
.gd-kv-k{color:var(--fg-2,#888);min-width:120px;flex-shrink:0}
.gd-kv-v{font-family:ui-monospace,monospace;word-break:break-all}
.gd-pills{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0}
.gd-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.gd-tag{display:inline-block;font-size:11px;padding:2px 7px;border-radius:5px;background:#fff4ec;border:1px solid #fcd09a;color:#b45309;margin-left:4px}
`;

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<div class="gd-kv"><span class="gd-kv-k">${esc(label)}</span><span class="gd-kv-v">${esc(value)}</span></div>`;
}

export function render(intake) {
  let cfg;
  try { cfg = JSON.parse(intake.text || '{}'); } catch {
    return { parentNode: Object.assign(document.createElement('div'), { textContent: 'Invalid Grafana Dashboard JSON.' }) };
  }

  const panels = Array.isArray(cfg.panels) ? cfg.panels : [];
  const tags = Array.isArray(cfg.tags) ? cfg.tags : [];
  const templateVars = Array.isArray(cfg.templating?.list) ? cfg.templating.list : [];

  // Count panels by type
  const typeCounts = {};
  panels.forEach((p) => {
    const t = p.type || 'unknown';
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  });

  const timeRange = (cfg.time?.from && cfg.time?.to) ? `${cfg.time.from} → ${cfg.time.to}` : '';

  const subParts = [
    `schemaVersion ${cfg.schemaVersion ?? '?'}`,
    `${panels.length} panel${panels.length !== 1 ? 's' : ''}`,
    tags.length ? `${tags.length} tag${tags.length !== 1 ? 's' : ''}` : '',
  ].filter(Boolean);

  // Settings section
  const settingsHtml = `<div class="gd-sec"><h3>Settings</h3><div class="gd-card">
${kv('Title', cfg.title)}
${kv('UID', cfg.uid)}
${kv('Schema version', cfg.schemaVersion)}
${timeRange ? kv('Time range', timeRange) : ''}
${kv('Refresh', cfg.refresh)}
${kv('Timezone', cfg.timezone)}
</div></div>`;

  // Panels section
  const panelTypeRows = Object.entries(typeCounts).map(([type, count]) =>
    `<div class="gd-kv"><span class="gd-kv-k">${esc(type)}</span><span class="gd-kv-v">${count}</span></div>`
  ).join('');
  const panelsHtml = `<div class="gd-sec"><h3>Panels (${panels.length})</h3><div class="gd-card">${panelTypeRows}</div></div>`;

  // Templating section
  const templatingHtml = templateVars.length ? `<div class="gd-sec"><h3>Variables (${templateVars.length})</h3>
<div class="gd-pills">${templateVars.map((v) => `<span class="gd-pill">${esc(v.name || v.label || '?')}</span>`).join('')}</div>
</div>` : '';

  // Tags section
  const tagsHtml = tags.length ? `<div class="gd-sec"><h3>Tags</h3>
<div class="gd-pills">${tags.map((t) => `<span class="gd-pill">${esc(t)}</span>`).join('')}</div>
</div>` : '';

  const host = document.createElement('div');
  host.className = 'gd-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-gd">Grafana Dashboard</span>
  <span class="gd-title">${esc(cfg.title || 'Dashboard')}</span>
</div>
<div class="gd-sub">${esc(subParts.join(' · '))}</div>
${settingsHtml}${panelsHtml}${templatingHtml}${tagsHtml}`;
  return { parentNode: host };
}
