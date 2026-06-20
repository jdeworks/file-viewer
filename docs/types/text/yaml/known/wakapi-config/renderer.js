import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.wakapi-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.wakapi-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#2563eb;color:#fff;vertical-align:middle;margin-right:8px;}
.wakapi-title{font-size:20px;font-weight:700;margin:0 0 2px;font-family:ui-monospace,monospace;}
.wakapi-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 16px;}
.wakapi-sec{margin:14px 0;}
.wakapi-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.wakapi-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.wakapi-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px;}
.wakapi-kv-k{color:var(--fg-2,#888);min-width:180px;flex-shrink:0;}
.wakapi-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.wakapi-masked{font-family:ui-monospace,monospace;color:var(--fg-2,#999);font-style:italic;}
.wakapi-enabled{color:#1b5e20;font-weight:600;}
.wakapi-disabled{color:#b71c1c;font-weight:600;}
.wakapi-chip{display:inline-block;padding:1px 7px;border-radius:8px;font-size:11px;font-weight:600;background:#dbeafe;color:#1e40af;}
`;

function kv(label, value, masked) {
  if (value == null || value === '') return '';
  const valHtml = masked
    ? `<span class="wakapi-masked">[configured]</span>`
    : `<span class="wakapi-kv-v">${esc(String(value))}</span>`;
  return `<div class="wakapi-kv"><span class="wakapi-kv-k">${esc(label)}</span>${valHtml}</div>`;
}

function bool(label, value) {
  if (value == null) return '';
  const on = value === true || value === 'true';
  return `<div class="wakapi-kv"><span class="wakapi-kv-k">${esc(label)}</span><span class="${on ? 'wakapi-enabled' : 'wakapi-disabled'}">${on ? 'yes' : 'no'}</span></div>`;
}

function chip(value) {
  if (!value) return '';
  return `<span class="wakapi-chip">${esc(String(value))}</span>`;
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  const server = cfg.server || {};
  const db = cfg.db || {};
  const security = cfg.security || {};
  const mail = cfg.mail || {};
  const app = cfg.app || {};

  const subParts = [
    server.public_url ? server.public_url : null,
    db.dialect ? `db: ${db.dialect}` : null,
    server.port ? `port: ${server.port}` : null,
  ].filter(Boolean).join(' · ');

  // Server section
  const serverHtml = `<div class="wakapi-sec"><h3>Server</h3><div class="wakapi-card">
${kv('port', server.port)}
${kv('listen_ipv4', server.listen_ipv4)}
${kv('base_path', server.base_path)}
${kv('public_url', server.public_url)}
</div></div>`;

  // Database section
  const dialectChip = db.dialect ? chip(db.dialect) : '';
  const dbHtml = `<div class="wakapi-sec"><h3>Database</h3><div class="wakapi-card">
${db.dialect != null ? `<div class="wakapi-kv"><span class="wakapi-kv-k">dialect</span>${dialectChip}</div>` : ''}
${kv('host', db.host)}
${kv('name', db.name)}
${kv('user', db.user)}
${db.password != null && db.password !== '' ? kv('password', '***', true) : ''}
</div></div>`;

  // Security section
  const secHtml = `<div class="wakapi-sec"><h3>Security</h3><div class="wakapi-card">
${security.password_salt != null && security.password_salt !== '' ? kv('password_salt', '***', true) : ''}
${bool('insecure_cookies', security.insecure_cookies)}
${bool('allow_signup', security.allow_signup)}
${bool('expose_metrics', security.expose_metrics)}
</div></div>`;

  // Mail/SMTP section
  const mailHtml = `<div class="wakapi-sec"><h3>Mail / SMTP</h3><div class="wakapi-card">
${bool('enabled', mail.enabled)}
${kv('smtp_host', mail.smtp_host)}
${kv('smtp_port', mail.smtp_port)}
${kv('smtp_user', mail.smtp_user)}
${mail.smtp_pass != null && mail.smtp_pass !== '' ? kv('smtp_pass', '***', true) : ''}
</div></div>`;

  // App section
  const appHtml = `<div class="wakapi-sec"><h3>App</h3><div class="wakapi-card">
${kv('aggregation_time', app.aggregation_time)}
${kv('inactive_days', app.inactive_days)}
${kv('import_batch_size', app.import_batch_size)}
</div></div>`;

  const host = document.createElement('div');
  host.className = 'wakapi-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="wakapi-badge">Wakapi</span>
  <span class="wakapi-title">Wakapi Time Tracker</span>
</div>
<div class="wakapi-sub">${esc(subParts)}</div>
${serverHtml}${dbHtml}${secHtml}${mailHtml}${appHtml}`;
  return { parentNode: host };
}
