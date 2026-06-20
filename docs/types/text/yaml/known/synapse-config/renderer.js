import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.synapse-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-syn{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0DBD8B;color:#fff;vertical-align:middle;margin-right:8px;}
.syn-title{font-size:20px;font-weight:700;margin:0 0 2px;font-family:ui-monospace,monospace;}
.syn-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 16px;}
.syn-sec{margin:14px 0;}
.syn-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.syn-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.syn-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px;}
.syn-kv-k{color:var(--fg-2,#888);min-width:180px;flex-shrink:0;}
.syn-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.syn-masked{font-family:ui-monospace,monospace;color:var(--fg-2,#999);font-style:italic;}
.syn-chip{display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:2px;}
.syn-chip-port{background:#e8f5e9;border-color:#a5d6a7;color:#1b5e20;}
.syn-chip-type{background:#e3f2fd;border-color:#90caf9;color:#0d47a1;}
.syn-enabled{color:#1b5e20;font-weight:600;}
.syn-disabled{color:#b71c1c;font-weight:600;}
.syn-table{width:100%;border-collapse:collapse;font-size:13px;}
.syn-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);font-weight:600;padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);}
.syn-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#f0f0f0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
`;

function kv(label, value, masked) {
  if (value == null || value === '') return '';
  const valHtml = masked
    ? `<span class="syn-masked">[configured]</span>`
    : `<span class="syn-kv-v">${esc(String(value))}</span>`;
  return `<div class="syn-kv"><span class="syn-kv-k">${esc(label)}</span>${valHtml}</div>`;
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  // Core identity
  const serverName = cfg.server_name || '';
  const publicBaseUrl = cfg.public_baseurl || '';

  // Listeners
  const listeners = Array.isArray(cfg.listeners) ? cfg.listeners : [];

  // Database
  const db = cfg.database || {};
  const dbName = db.name || '';
  const dbArgs = db.args || {};
  const dbBackend = dbName === 'psycopg2' ? 'PostgreSQL (psycopg2)' : dbName === 'sqlite3' ? 'SQLite3' : dbName || null;
  const dbHost = dbArgs.host || null;
  const dbDbName = dbArgs.database || dbArgs.dbname || null;
  const hasDbPassword = dbArgs.password != null;

  // Security keys (always mask)
  const hasRegistrationSecret = cfg.registration_shared_secret != null;
  const hasMacaroonSecret = cfg.macaroon_secret_key != null;
  const hasFormSecret = cfg.form_secret != null;
  const signingKeyPath = cfg.signing_key_path || null;

  // Media
  const mediaStorePath = cfg.media_store_path || null;

  // Federation
  const federationEnabled = cfg.federation !== false;

  // Registration
  const registrationEnabled = cfg.enable_registration === true;

  // Presence
  const presenceEnabled = (cfg.presence || {}).enabled !== false;

  // Room version
  const roomVersion = cfg.default_room_version || null;

  // Email
  const email = cfg.email || {};
  const smtpHost = email.smtp_host || null;
  const smtpPort = email.smtp_port || null;
  const hasSmtpPass = email.smtp_pass != null;

  // Log config
  const logConfig = cfg.log_config || null;

  // Trusted key servers
  const trustedKeyServers = Array.isArray(cfg.trusted_key_servers) ? cfg.trusted_key_servers : [];

  // Summary line
  const subParts = [
    serverName ? `server: ${serverName}` : null,
    listeners.length ? `${listeners.length} listener${listeners.length !== 1 ? 's' : ''}` : null,
    dbBackend ? `db: ${dbBackend}` : null,
    federationEnabled ? 'federation enabled' : 'federation disabled',
  ].filter(Boolean).join(' · ');

  // Listeners section
  const listenersHtml = listeners.length ? `<div class="syn-sec"><h3>Listeners</h3><div class="syn-card">
${listeners.map((l) => {
    const port = l.port || '?';
    const type = Array.isArray(l.resources) ? l.resources.map((r) => r.names || []).flat().join(', ') : (l.type || '');
    const bind = l.bind_address || l.bind_addresses || '';
    const bindStr = Array.isArray(bind) ? bind.join(', ') : String(bind);
    return `<div style="display:flex;align-items:center;flex-wrap:wrap;gap:4px;margin:3px 0;">
  <span class="syn-chip syn-chip-port">:${esc(port)}</span>
  ${type ? `<span class="syn-chip syn-chip-type">${esc(type)}</span>` : ''}
  ${bindStr ? `<span class="syn-chip">${esc(bindStr)}</span>` : ''}
</div>`;
  }).join('')}
</div></div>` : '';

  // Database section
  const dbHtml = dbBackend ? `<div class="syn-sec"><h3>Database</h3><div class="syn-card">
${kv('Backend', dbBackend)}
${dbHost ? kv('Host', dbHost) : ''}
${dbDbName ? kv('Database', dbDbName) : ''}
${hasDbPassword ? kv('Password', '***', true) : ''}
</div></div>` : '';

  // Federation section
  const federationHtml = `<div class="syn-sec"><h3>Federation</h3><div class="syn-card">
<div class="syn-kv"><span class="syn-kv-k">Federation</span><span class="${federationEnabled ? 'syn-enabled' : 'syn-disabled'}">${federationEnabled ? 'enabled' : 'disabled'}</span></div>
${registrationEnabled ? '<div class="syn-kv"><span class="syn-kv-k">Registration</span><span class="syn-enabled">enabled</span></div>' : ''}
<div class="syn-kv"><span class="syn-kv-k">Presence</span><span class="${presenceEnabled ? 'syn-enabled' : 'syn-disabled'}">${presenceEnabled ? 'enabled' : 'disabled'}</span></div>
${roomVersion ? kv('Default room version', roomVersion) : ''}
</div></div>`;

  // Secrets section
  const secretsHtml = (hasRegistrationSecret || hasMacaroonSecret || hasFormSecret || signingKeyPath) ? `<div class="syn-sec"><h3>Security</h3><div class="syn-card">
${hasRegistrationSecret ? kv('registration_shared_secret', '***', true) : ''}
${hasMacaroonSecret ? kv('macaroon_secret_key', '***', true) : ''}
${hasFormSecret ? kv('form_secret', '***', true) : ''}
${signingKeyPath ? kv('signing_key_path', signingKeyPath) : ''}
</div></div>` : '';

  // Media section
  const mediaHtml = mediaStorePath ? `<div class="syn-sec"><h3>Media</h3><div class="syn-card">
${kv('media_store_path', mediaStorePath)}
</div></div>` : '';

  // Email section
  const emailHtml = (smtpHost || smtpPort) ? `<div class="syn-sec"><h3>Email (SMTP)</h3><div class="syn-card">
${smtpHost ? kv('SMTP host', smtpHost) : ''}
${smtpPort ? kv('SMTP port', smtpPort) : ''}
${hasSmtpPass ? kv('SMTP password', '***', true) : ''}
</div></div>` : '';

  // Logging section
  const logHtml = logConfig ? `<div class="syn-sec"><h3>Logging</h3><div class="syn-card">
${kv('log_config', logConfig)}
</div></div>` : '';

  // Trusted key servers section
  const tksHtml = trustedKeyServers.length ? `<div class="syn-sec"><h3>Trusted Key Servers (${trustedKeyServers.length})</h3><div class="syn-card">
${trustedKeyServers.map((s) => {
    const sn = typeof s === 'string' ? s : (s.server_name || JSON.stringify(s));
    return `<div class="syn-kv"><span class="syn-kv-v">${esc(sn)}</span></div>`;
  }).join('')}
</div></div>` : '';

  const host = document.createElement('div');
  host.className = 'synapse-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-syn">Matrix Synapse</span>
  <span class="syn-title">${esc(serverName || 'homeserver.yaml')}</span>
</div>
${publicBaseUrl ? `<div style="font-size:12px;font-family:ui-monospace,monospace;color:var(--fg-2,#888);margin-bottom:4px;">${esc(publicBaseUrl)}</div>` : ''}
<div class="syn-sub">${esc(subParts)}</div>
${listenersHtml}${dbHtml}${federationHtml}${secretsHtml}${mediaHtml}${emailHtml}${logHtml}${tksHtml}`;
  return { parentNode: host };
}
