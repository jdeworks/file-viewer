const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.semaphore-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.semaphore-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#16a34a;color:#fff;vertical-align:middle;margin-right:8px;}
.semaphore-title{font-size:18px;font-weight:700;margin:0 0 4px;display:inline;}
.semaphore-sub{font-size:12px;color:var(--fg-2,#888);margin:4px 0 14px;}
.semaphore-sec{margin:12px 0;}
.semaphore-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.semaphore-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;}
.semaphore-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;flex-wrap:wrap;}
.semaphore-key{color:var(--fg-2,#888);font-size:12px;min-width:220px;flex-shrink:0;}
.semaphore-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.semaphore-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;background:var(--bg-2,#f6f8fa);color:var(--fg,#24292f);}
.semaphore-chip-blue{background:#e3f2fd;border-color:#2196f3;color:#0d47a1;}
.semaphore-chip-green{background:#e8f5e9;border-color:#4caf50;color:#1b5e20;}
.semaphore-chip-red{background:#ffebee;border-color:#f44336;color:#b71c1c;}
.semaphore-chip-gray{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg-2,#888);}
.semaphore-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
`;

function chip(val, cls) {
  if (val == null || val === '') return '';
  return `<span class="semaphore-chip${cls ? ' semaphore-chip-' + cls : ''}">${esc(String(val))}</span>`;
}

function masked() {
  return '<span class="semaphore-masked">[configured]</span>';
}

function row(label, html) {
  if (!html) return '';
  return `<div class="semaphore-row"><span class="semaphore-key">${esc(label)}</span><span class="semaphore-val">${html}</span></div>`;
}

function boolChip(v, trueLabel, trueColor, falseLabel, falseColor) {
  const s = String(v == null ? '' : v).trim().toLowerCase();
  if (s === 'true' || s === '1' || s === 'yes') return chip(trueLabel || 'true', trueColor || 'green');
  if (s === 'false' || s === '0' || s === 'no') return chip(falseLabel || 'false', falseColor || 'gray');
  return chip(String(v), 'gray');
}

export function render(intake) {
  let cfg = {};
  try { cfg = intake.parsed || JSON.parse(intake.text || '{}'); } catch { cfg = {}; }

  const host = document.createElement('div');
  host.className = 'semaphore-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  // Determine dialect
  const dialect = cfg.dialect || (cfg.postgres ? 'postgres' : cfg.mysql ? 'mysql' : 'bolt');

  const webHost = cfg.web_host || '';

  // Header
  const header = document.createElement('div');
  header.innerHTML = `
    <div style="margin-bottom:4px;">
      <span class="semaphore-badge">Semaphore</span>
      <span class="semaphore-title">${esc(webHost || 'Semaphore Config')}</span>
    </div>
    <div class="semaphore-sub">Ansible Semaphore CI/CD task runner configuration</div>
  `;
  host.appendChild(header);

  let body = '';

  // Web
  const webRows = [
    cfg.web_host ? row('web_host', chip(cfg.web_host, 'blue')) : '',
    cfg.interface != null ? row('interface', chip(cfg.interface)) : '',
    cfg.port != null ? row('port', chip(cfg.port, 'blue')) : '',
    cfg.tmp_path ? row('tmp_path', chip(cfg.tmp_path)) : '',
  ].filter(Boolean).join('');
  if (webRows) body += `<div class="semaphore-sec"><h3>Web</h3><div class="semaphore-card">${webRows}</div></div>`;

  // Database
  const db = cfg[dialect] || {};
  const dialectChip = chip(dialect, dialect === 'postgres' ? 'blue' : dialect === 'mysql' ? 'green' : 'gray');
  let dbRows = row('dialect', dialectChip);
  if (dialect === 'bolt') {
    if (db.host) dbRows += row('host (file)', chip(db.host));
  } else {
    if (db.host) dbRows += row('host', chip(db.host));
    if (db.user) dbRows += row('user', chip(db.user));
    if (db.pass != null) dbRows += row('pass', masked());
    if (db.name) dbRows += row('name', chip(db.name));
  }
  body += `<div class="semaphore-sec"><h3>Database</h3><div class="semaphore-card">${dbRows}</div></div>`;

  // Security
  const secRows = [
    cfg.cookie_hash != null ? row('cookie_hash', masked()) : '',
    cfg.cookie_encryption != null ? row('cookie_encryption', masked()) : '',
    cfg.access_key_encryption != null ? row('access_key_encryption', masked()) : '',
  ].filter(Boolean).join('');
  if (secRows) body += `<div class="semaphore-sec"><h3>Security</h3><div class="semaphore-card">${secRows}</div></div>`;

  // Email
  const emailRows = [
    cfg.email_host ? row('email_host', chip(cfg.email_host)) : '',
    cfg.email_port != null ? row('email_port', chip(cfg.email_port, 'blue')) : '',
    cfg.email_sender ? row('email_sender', chip(cfg.email_sender)) : '',
    cfg.email_username ? row('email_username', chip(cfg.email_username)) : '',
    cfg.email_password != null ? row('email_password', masked()) : '',
    cfg.email_secure != null ? row('email_secure', boolChip(cfg.email_secure, 'enabled', 'green', 'disabled', 'gray')) : '',
  ].filter(Boolean).join('');
  if (emailRows) body += `<div class="semaphore-sec"><h3>Email</h3><div class="semaphore-card">${emailRows}</div></div>`;

  // Telegram
  const tgRows = [
    cfg.telegram_chat ? row('telegram_chat', chip(cfg.telegram_chat)) : '',
    cfg.telegram_token != null ? row('telegram_token', masked()) : '',
  ].filter(Boolean).join('');
  if (tgRows) body += `<div class="semaphore-sec"><h3>Telegram</h3><div class="semaphore-card">${tgRows}</div></div>`;

  // OIDC
  const oidc = cfg.oidc || {};
  const oidcEndpoint = oidc.endpoint || {};
  const oidcRows = [
    oidc.name ? row('oidc.name', chip(oidc.name)) : '',
    oidc.client_id ? row('oidc.client_id', chip(oidc.client_id)) : '',
    oidc.client_secret != null ? row('oidc.client_secret', masked()) : '',
    oidc.redirect_url ? row('oidc.redirect_url', chip(oidc.redirect_url)) : '',
    oidcEndpoint.auth ? row('oidc.endpoint.auth', chip(oidcEndpoint.auth)) : '',
  ].filter(Boolean).join('');
  if (oidcRows) body += `<div class="semaphore-sec"><h3>OIDC</h3><div class="semaphore-card">${oidcRows}</div></div>`;

  // Git
  const gitClient = cfg.git_client || '';
  const gitRows = [
    gitClient ? row('git_client', chip(gitClient, gitClient === 'go_git' ? 'blue' : 'gray')) : '',
    cfg.ssh_config_path ? row('ssh_config_path', chip(cfg.ssh_config_path)) : '',
  ].filter(Boolean).join('');
  if (gitRows) body += `<div class="semaphore-sec"><h3>Git</h3><div class="semaphore-card">${gitRows}</div></div>`;

  // Runner
  const runner = cfg.runner || {};
  const runnerRows = [
    runner.token != null ? row('runner.token', masked()) : '',
    runner.registration_token != null ? row('runner.registration_token', masked()) : '',
  ].filter(Boolean).join('');
  if (runnerRows) body += `<div class="semaphore-sec"><h3>Runner</h3><div class="semaphore-card">${runnerRows}</div></div>`;

  // LDAP
  const ldap = cfg.ldap || {};
  const ldapRows = [
    ldap.host ? row('ldap.host', chip(ldap.host)) : '',
    ldap.dn ? row('ldap.dn', chip(ldap.dn)) : '',
    ldap.password != null ? row('ldap.password', masked()) : '',
  ].filter(Boolean).join('');
  if (ldapRows) body += `<div class="semaphore-sec"><h3>LDAP</h3><div class="semaphore-card">${ldapRows}</div></div>`;

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  host.appendChild(bodyDiv);

  return { parentNode: host };
}
