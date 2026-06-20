import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.gts-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-gts{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#6f42c1;color:#fff;vertical-align:middle;margin-right:8px;}
.gts-title{font-size:20px;font-weight:700;margin:0 0 2px;font-family:ui-monospace,monospace;}
.gts-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 16px;}
.gts-sec{margin:14px 0;}
.gts-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.gts-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.gts-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px;}
.gts-kv-k{color:var(--fg-2,#888);min-width:180px;flex-shrink:0;}
.gts-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.gts-masked{font-family:ui-monospace,monospace;color:var(--fg-2,#999);font-style:italic;}
.gts-enabled{color:#1b5e20;font-weight:600;}
.gts-disabled{color:#b71c1c;font-weight:600;}
`;

function kv(label, value, masked) {
  if (value == null || value === '') return '';
  const valHtml = masked
    ? `<span class="gts-masked">[configured]</span>`
    : `<span class="gts-kv-v">${esc(String(value))}</span>`;
  return `<div class="gts-kv"><span class="gts-kv-k">${esc(label)}</span>${valHtml}</div>`;
}

function bool(label, value) {
  if (value == null) return '';
  const on = value === true || value === 'true';
  return `<div class="gts-kv"><span class="gts-kv-k">${esc(label)}</span><span class="${on ? 'gts-enabled' : 'gts-disabled'}">${on ? 'yes' : 'no'}</span></div>`;
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = jsyaml.load(intake.text || '') || {};
  } catch { cfg = intake.parsed || {}; }

  const title = cfg['host'] || 'GoToSocial Config';
  const subParts = [
    cfg['protocol'] ? `${cfg['protocol']}` : null,
    cfg['host'] ? cfg['host'] : null,
    cfg['port'] ? `:${cfg['port']}` : null,
    cfg['db-type'] ? `db: ${cfg['db-type']}` : null,
    cfg['storage-backend'] ? `storage: ${cfg['storage-backend']}` : null,
  ].filter(Boolean).join(' · ');

  // Server section
  const serverHtml = `<div class="gts-sec"><h3>Server</h3><div class="gts-card">
${kv('host', cfg['host'])}
${kv('port', cfg['port'])}
${kv('protocol', cfg['protocol'])}
${kv('account-domain', cfg['account-domain'])}
${kv('bind-address', cfg['bind-address'])}
</div></div>`;

  // Database section
  const dbHtml = (cfg['db-type'] || cfg['db-address'] || cfg['db-name'] || cfg['db-user']) ? `<div class="gts-sec"><h3>Database</h3><div class="gts-card">
${kv('db-type', cfg['db-type'])}
${kv('db-address', cfg['db-address'])}
${kv('db-name', cfg['db-name'])}
${kv('db-user', cfg['db-user'])}
${cfg['db-password'] != null ? kv('db-password', '***', true) : ''}
</div></div>` : '';

  // Storage section
  const storageHtml = (cfg['storage-backend'] || cfg['s3-endpoint'] || cfg['s3-bucket'] || cfg['s3-access-key']) ? `<div class="gts-sec"><h3>Storage</h3><div class="gts-card">
${kv('storage-backend', cfg['storage-backend'])}
${kv('s3-endpoint', cfg['s3-endpoint'])}
${kv('s3-bucket', cfg['s3-bucket'])}
${kv('s3-access-key', cfg['s3-access-key'])}
${cfg['s3-secret-key'] != null ? kv('s3-secret-key', '***', true) : ''}
</div></div>` : '';

  // Email section
  const emailHtml = (cfg['smtp-host'] || cfg['smtp-port'] || cfg['smtp-username'] || cfg['smtp-from']) ? `<div class="gts-sec"><h3>Email</h3><div class="gts-card">
${kv('smtp-host', cfg['smtp-host'])}
${kv('smtp-port', cfg['smtp-port'])}
${kv('smtp-username', cfg['smtp-username'])}
${cfg['smtp-password'] != null ? kv('smtp-password', '***', true) : ''}
${kv('smtp-from', cfg['smtp-from'])}
</div></div>` : '';

  // OIDC section
  const oidcHtml = (cfg['oidc-enabled'] != null || cfg['oidc-issuer'] || cfg['oidc-client-id']) ? `<div class="gts-sec"><h3>OIDC</h3><div class="gts-card">
${bool('oidc-enabled', cfg['oidc-enabled'])}
${kv('oidc-issuer', cfg['oidc-issuer'])}
${kv('oidc-client-id', cfg['oidc-client-id'])}
${cfg['oidc-client-secret'] != null ? kv('oidc-client-secret', '***', true) : ''}
</div></div>` : '';

  // Moderation section
  const modHtml = (cfg['accounts-registration-open'] != null || cfg['accounts-approval-required'] != null || cfg['instance-expose-peers'] != null) ? `<div class="gts-sec"><h3>Moderation</h3><div class="gts-card">
${bool('accounts-registration-open', cfg['accounts-registration-open'])}
${bool('accounts-approval-required', cfg['accounts-approval-required'])}
${bool('instance-expose-peers', cfg['instance-expose-peers'])}
</div></div>` : '';

  const host = document.createElement('div');
  host.className = 'gts-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-gts">GoToSocial</span>
  <span class="gts-title">${esc(title)}</span>
</div>
<div class="gts-sub">${esc(subParts)}</div>
${serverHtml}${dbHtml}${storageHtml}${emailHtml}${oidcHtml}${modHtml}`;
  return { parentNode: host };
}
