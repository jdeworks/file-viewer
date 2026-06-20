import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.vkunja-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-vkunja{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0d7377;color:#fff;vertical-align:middle;margin-right:8px;}
.vkunja-title{font-size:20px;font-weight:700;margin:0 0 2px;font-family:ui-monospace,monospace;}
.vkunja-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 16px;}
.vkunja-sec{margin:14px 0;}
.vkunja-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.vkunja-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.vkunja-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px;}
.vkunja-kv-k{color:var(--fg-2,#888);min-width:200px;flex-shrink:0;}
.vkunja-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.vkunja-masked{font-family:ui-monospace,monospace;color:var(--fg-2,#999);font-style:italic;}
.vkunja-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;background:var(--bg-2,#f6f8fa);color:var(--fg,#24292f);}
.vkunja-chip-green{background:#e8f5e9;border-color:#4caf50;color:#1b5e20;}
.vkunja-chip-red{background:#ffebee;border-color:#f44336;color:#b71c1c;}
.vkunja-chip-teal{background:#e0f2f1;border-color:#0d7377;color:#004d40;}
.vkunja-chip-gray{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg-2,#888);}
`;

function kv(label, value, masked) {
  if (value == null || value === '') return '';
  const valHtml = masked
    ? `<span class="vkunja-masked">[configured]</span>`
    : `<span class="vkunja-kv-v">${esc(String(value))}</span>`;
  return `<div class="vkunja-kv"><span class="vkunja-kv-k">${esc(label)}</span>${valHtml}</div>`;
}

function chip(val, cls) {
  if (val == null || val === '') return '';
  return `<span class="vkunja-chip${cls ? ' vkunja-chip-' + cls : ''}">${esc(String(val))}</span>`;
}

function boolChip(label, value) {
  if (value == null) return '';
  const on = value === true || value === 'true';
  const html = on ? chip('yes', 'green') : chip('no', 'gray');
  return `<div class="vkunja-kv"><span class="vkunja-kv-k">${esc(label)}</span>${html}</div>`;
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = jsyaml.load(intake.text || '') || {};
  } catch { cfg = intake.parsed || {}; }

  const svc = cfg.service || {};
  const db = cfg.database || {};
  const redis = cfg.redis || {};
  const mailer = cfg.mailer || {};
  const files = cfg.files || {};

  const title = svc.frontendurl || 'Vikunja Task Manager';

  const subParts = [
    svc.interface ? `listening on ${svc.interface}` : null,
    db.type ? `db: ${db.type}` : null,
    redis.enabled ? 'redis' : null,
    mailer.enabled ? 'mail' : null,
  ].filter(Boolean).join(' · ');

  // Service section
  const svcHtml = `<div class="vkunja-sec"><h3>Service</h3><div class="vkunja-card">
${kv('interface', svc.interface)}
${kv('frontendurl', svc.frontendurl)}
${svc.enablepublicteams != null ? `<div class="vkunja-kv"><span class="vkunja-kv-k">enablepublicteams</span>${chip(svc.enablepublicteams ? 'yes' : 'no', svc.enablepublicteams ? 'green' : 'gray')}</div>` : ''}
${svc.enableregistration != null ? `<div class="vkunja-kv"><span class="vkunja-kv-k">enableregistration</span>${chip(svc.enableregistration ? 'yes' : 'no', svc.enableregistration ? 'green' : 'gray')}</div>` : ''}
${kv('jwtttl', svc.jwtttl != null ? `${svc.jwtttl}s` : null)}
${kv('jwtttllong', svc.jwtttllong != null ? `${svc.jwtttllong}s` : null)}
</div></div>`;

  // Database section
  const dbHtml = (db.type || db.host || db.database) ? `<div class="vkunja-sec"><h3>Database</h3><div class="vkunja-card">
${kv('type', db.type)}
${kv('host', db.host)}
${kv('database', db.database)}
${kv('user', db.user)}
${db.password != null ? kv('password', '***', true) : ''}
</div></div>` : '';

  // Redis section
  const redisHtml = (redis.enabled != null || redis.host) ? `<div class="vkunja-sec"><h3>Redis</h3><div class="vkunja-card">
${boolChip('enabled', redis.enabled)}
${kv('host', redis.host)}
${redis.password != null && redis.password !== '' ? kv('password', '***', true) : ''}
</div></div>` : '';

  // Mail section
  const mailHtml = (mailer.enabled != null || mailer.host) ? `<div class="vkunja-sec"><h3>Mail</h3><div class="vkunja-card">
${boolChip('enabled', mailer.enabled)}
${kv('host', mailer.host)}
${kv('port', mailer.port)}
${kv('fromemail', mailer.fromemail)}
${mailer.password != null && mailer.password !== '' ? kv('password', '***', true) : ''}
</div></div>` : '';

  // Files section
  const filesHtml = (files.basepath || files.maxsize != null) ? `<div class="vkunja-sec"><h3>Files</h3><div class="vkunja-card">
${kv('basepath', files.basepath)}
${kv('maxsize', files.maxsize != null ? `${files.maxsize} bytes` : null)}
</div></div>` : '';

  const host = document.createElement('div');
  host.className = 'vkunja-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-vkunja">Vikunja</span>
  <span class="vkunja-title">${esc(title)}</span>
</div>
<div class="vkunja-sub">${esc(subParts)}</div>
${svcHtml}${dbHtml}${redisHtml}${mailHtml}${filesHtml}`;
  return { parentNode: host };
}
