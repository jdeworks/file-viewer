import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.wkapi-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-wkapi{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#16a34a;color:#fff;vertical-align:middle;margin-right:8px;}
.wkapi-title{font-size:20px;font-weight:700;margin:0 0 2px;font-family:ui-monospace,monospace;}
.wkapi-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 16px;}
.wkapi-sec{margin:14px 0;}
.wkapi-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.wkapi-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.wkapi-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px;}
.wkapi-kv-k{color:var(--fg-2,#888);min-width:180px;flex-shrink:0;}
.wkapi-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.wkapi-masked{font-family:ui-monospace,monospace;color:var(--fg-2,#999);font-style:italic;}
.wkapi-enabled{color:#1b5e20;font-weight:600;}
.wkapi-disabled{color:#b71c1c;font-weight:600;}
`;

function kv(label, value, masked) {
  if (value == null || value === '') return '';
  const valHtml = masked
    ? `<span class="wkapi-masked">[configured]</span>`
    : `<span class="wkapi-kv-v">${esc(String(value))}</span>`;
  return `<div class="wkapi-kv"><span class="wkapi-kv-k">${esc(label)}</span>${valHtml}</div>`;
}

function bool(label, value) {
  if (value == null) return '';
  const on = value === true || value === 'true';
  return `<div class="wkapi-kv"><span class="wkapi-kv-k">${esc(label)}</span><span class="${on ? 'wkapi-enabled' : 'wkapi-disabled'}">${on ? 'yes' : 'no'}</span></div>`;
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = jsyaml.load(intake.text || '') || {};
  } catch { cfg = intake.parsed || {}; }

  const srv = cfg.server || {};
  const db = cfg.database || {};
  const sec = cfg.security || {};
  const mail = cfg.mail || {};
  const lb = cfg.leaderboard;

  const subParts = [
    srv.public_url ? srv.public_url : null,
    db.dialect ? `db: ${db.dialect}` : null,
    srv.port ? `port: ${srv.port}` : null,
  ].filter(Boolean).join(' · ');

  // Server section
  const serverHtml = `<div class="wkapi-sec"><h3>Server</h3><div class="wkapi-card">
${kv('port', srv.port)}
${kv('listen_addr', srv.listen_addr)}
${kv('base_path', srv.base_path)}
${kv('public_url', srv.public_url)}
</div></div>`;

  // Database section
  const dbHtml = `<div class="wkapi-sec"><h3>Database</h3><div class="wkapi-card">
${kv('dialect', db.dialect)}
${kv('host', db.host)}
${kv('name', db.name)}
${kv('user', db.user)}
${db.password != null ? kv('password', '***', true) : ''}
</div></div>`;

  // Security section
  const secHtml = `<div class="wkapi-sec"><h3>Security</h3><div class="wkapi-card">
${bool('insecure_cookies', sec.insecure_cookies)}
${bool('allow_signup', sec.allow_signup)}
${bool('expose_metrics', sec.expose_metrics)}
${sec.password_salt != null ? kv('password_salt', '***', true) : ''}
</div></div>`;

  // Mail section
  const mailHtml = `<div class="wkapi-sec"><h3>Mail</h3><div class="wkapi-card">
${bool('enabled', mail.enabled)}
${kv('sender', mail.sender)}
${kv('provider', mail.provider)}
${(mail.smtp && mail.smtp.password != null) ? kv('smtp.password', '***', true) : ''}
</div></div>`;

  // Leaderboard section (only if leaderboard object exists)
  const lbHtml = lb != null ? `<div class="wkapi-sec"><h3>Leaderboard</h3><div class="wkapi-card">
${bool('enabled', lb.enabled)}
${kv('scope', lb.scope)}
</div></div>` : '';

  const host = document.createElement('div');
  host.className = 'wkapi-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-wkapi">Wakapi</span>
  <span class="wkapi-title">Wakapi Time Tracker</span>
</div>
<div class="wkapi-sub">${esc(subParts)}</div>
${serverHtml}${dbHtml}${secHtml}${mailHtml}${lbHtml}`;
  return { parentNode: host };
}
