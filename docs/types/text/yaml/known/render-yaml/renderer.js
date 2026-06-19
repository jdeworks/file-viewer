import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.rdr-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-rdr{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#46E3B7;color:#0f3630;vertical-align:middle;margin-right:8px}
.rdr-title{font-size:18px;font-weight:700;margin:0 0 4px}
.rdr-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.rdr-sec{margin:12px 0}
.rdr-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.rdr-table{width:100%;border-collapse:collapse;font-size:13px}
.rdr-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0)}
.rdr-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;font-size:12px}
.rdr-name{font-family:ui-monospace,monospace;font-weight:600}
.rdr-type{display:inline-block;padding:1px 7px;border-radius:8px;font-size:11px;font-weight:600;border:1px solid}
.rdr-type-web{background:#eff6ff;border-color:#93c5fd;color:#1d4ed8}
.rdr-type-worker{background:#f5f3ff;border-color:#c4b5fd;color:#5b21b6}
.rdr-type-cron{background:#fff7ed;border-color:#fdba74;color:#9a3412}
.rdr-type-job{background:#f0fdf4;border-color:#86efac;color:#166534}
.rdr-type-other{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg-2,#888)}
.rdr-cmd{font:11px/1.4 ui-monospace,monospace;color:var(--fg-2,#666);word-break:break-all}
.rdr-pill{display:inline-block;font-size:11px;padding:2px 8px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);margin:2px 2px 2px 0}
.rdr-plan{font-size:11px;color:var(--fg-2,#888)}
`;

function typeClass(type) {
  const t = (type || '').toLowerCase();
  if (t === 'web') return 'rdr-type-web';
  if (t === 'worker' || t === 'private_service') return 'rdr-type-worker';
  if (t === 'cron') return 'rdr-type-cron';
  if (t === 'job') return 'rdr-type-job';
  return 'rdr-type-other';
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = jsyaml.load(intake.text || '') || {};
  } catch { cfg = intake.parsed || {}; }

  const services = Array.isArray(cfg.services) ? cfg.services : [];
  const databases = Array.isArray(cfg.databases) ? cfg.databases : [];

  const typeCounts = {};
  for (const svc of services) {
    const t = (svc.type || 'unknown').toLowerCase();
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  }

  const subParts = [];
  if (services.length) subParts.push(`${services.length} service${services.length !== 1 ? 's' : ''}`);
  if (databases.length) subParts.push(`${databases.length} database${databases.length !== 1 ? 's' : ''}`);
  const sub = subParts.join(' · ') || 'Render.com config';

  const svcRows = services.map((svc) => {
    const type = svc.type || '—';
    const name = svc.name || '—';
    const runtime = svc.runtime || svc.env || '—';
    const plan = svc.plan || '';
    const envCount = Array.isArray(svc.envVars) ? svc.envVars.length : (svc.envVars ? Object.keys(svc.envVars).length : 0);
    const cmd = svc.startCommand || svc.buildCommand || '';
    return `<tr>
      <td><span class="rdr-name">${esc(name)}</span></td>
      <td><span class="rdr-type ${typeClass(type)}">${esc(type)}</span></td>
      <td><span style="font-family:ui-monospace,monospace;font-size:12px">${esc(runtime)}</span></td>
      <td>${plan ? `<span class="rdr-plan">${esc(plan)}</span>` : '—'}${envCount ? `<span style="margin-left:6px;font-size:11px;color:var(--fg-2,#888)">${envCount} env var${envCount !== 1 ? 's' : ''}</span>` : ''}</td>
      <td>${cmd ? `<span class="rdr-cmd">${esc(cmd.length > 50 ? cmd.slice(0, 48) + '…' : cmd)}</span>` : '—'}</td>
    </tr>`;
  }).join('');

  const svcHtml = services.length
    ? `<div class="rdr-sec"><h3>Services (${services.length})</h3>
      <table class="rdr-table">
        <thead><tr><th>Name</th><th>Type</th><th>Runtime</th><th>Plan / Env</th><th>Command</th></tr></thead>
        <tbody>${svcRows}</tbody>
      </table></div>`
    : '';

  const dbHtml = databases.length
    ? `<div class="rdr-sec"><h3>Databases (${databases.length})</h3>
      <div>${databases.map((db) => {
        const label = db.name || '—';
        const dbName = db.databaseName ? ` · <span style="font-size:11px;color:var(--fg-2,#888)">${esc(db.databaseName)}</span>` : '';
        return `<span class="rdr-pill"><span style="font-family:ui-monospace,monospace">${esc(label)}</span>${dbName}</span>`;
      }).join('')}</div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'rdr-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="rdr-title"><span class="badge-rdr">Render</span>render.yaml</div>
<div class="rdr-sub">${esc(sub)}</div>
${svcHtml}${dbHtml}`;
  return { parentNode: host };
}
