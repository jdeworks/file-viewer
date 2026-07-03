import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.dbt-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-dbt{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0366d6;color:#fff;vertical-align:middle;margin-right:8px;}
.dbt-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.dbt-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.dbt-sec{margin:12px 0;}
.dbt-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.dbt-table{width:100%;border-collapse:collapse;font-size:13px;}
.dbt-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.dbt-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.dbt-eco{font:12px/1.4 ui-monospace,monospace;font-weight:600;color:var(--fg,#24292f);}
.dbt-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;}
.dbt-chip.daily{background:#eff6ff;border-color:#93c5fd;color:#1d4ed8;}
.dbt-chip.weekly{background:#f0fdf4;border-color:#86efac;color:#166534;}
.dbt-chip.monthly{background:#faf5ff;border-color:#d8b4fe;color:#7e22ce;}
.dbt-dir{font:11px/1.4 ui-monospace,monospace;color:var(--fg-2,#888);}
`;

function scheduleChip(interval) {
  if (!interval) return '—';
  const cls = interval === 'daily' ? 'daily' : interval === 'weekly' ? 'weekly' : interval === 'monthly' ? 'monthly' : '';
  return `<span class="dbt-chip ${cls}">${esc(interval)}</span>`;
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = {}; }
  const updates = Array.isArray(cfg.updates) ? cfg.updates : [];
  const version = cfg.version;

  const rows = updates.map((u) => {
    const eco = u['package-ecosystem'] || '?';
    const dir = u.directory || '/';
    const interval = u.schedule && u.schedule.interval;
    const labels = Array.isArray(u.labels) ? u.labels : [];
    return `<tr>
      <td><span class="dbt-eco">${esc(eco)}</span></td>
      <td><span class="dbt-dir">${esc(dir)}</span></td>
      <td>${scheduleChip(interval)}</td>
      <td>${labels.slice(0, 4).map((l) => `<span class="dbt-chip">${esc(l)}</span>`).join('') || '—'}</td>
    </tr>`;
  }).join('');

  const host = document.createElement('div');
  host.className = 'dbt-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="dbt-title"><span class="badge-dbt">Dependabot</span>Dependabot config</div>
<div class="dbt-sub">${updates.length} update configuration${updates.length !== 1 ? 's' : ''}${version ? ` · version ${esc(String(version))}` : ''}</div>
${updates.length ? `<div class="dbt-sec"><h3>Update configurations</h3>
  <table class="dbt-table">
    <thead><tr><th>Ecosystem</th><th>Directory</th><th>Schedule</th><th>Labels</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</div>` : '<div style="color:var(--fg-2,#888);font-size:13px;">No update configurations found.</div>'}`;

  return { parentNode: host };
}
