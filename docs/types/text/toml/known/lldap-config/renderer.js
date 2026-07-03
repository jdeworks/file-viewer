import { parseTOML } from '../../toml.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

function maskDbUrl(url) {
  if (!url) return '';
  try {
    // Mask credentials in URLs like postgres://user:pass@host/db
    return String(url).replace(/:\/\/([^:@]+):([^@]+)@/, '://$1:[configured]@');
  } catch { return String(url); }
}

const CSS = `
.lldap-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-lldap{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0d9488;color:#fff;vertical-align:middle;margin-right:8px}
.lldap-title{font-size:18px;font-weight:700;margin:0 0 4px}
.lldap-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.lldap-sec{margin:14px 0}
.lldap-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px}
.lldap-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff)}
.lldap-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px}
.lldap-kv-k{color:var(--fg-2,#888);min-width:160px;flex-shrink:0}
.lldap-kv-v{font-family:ui-monospace,monospace;word-break:break-all}
.lldap-masked{font-family:ui-monospace,monospace;color:var(--fg-2,#999);letter-spacing:2px}
.lldap-chip{display:inline-block;font-size:11px;padding:2px 8px;border-radius:8px;font-family:ui-monospace,monospace;font-weight:600;margin:1px}
.lldap-chip.on{background:#dcfce7;border:1px solid #86efac;color:#166534}
.lldap-chip.off{background:#fef2f2;border:1px solid #fca5a5;color:#991b1b}
.lldap-chip.info{background:#eff6ff;border:1px solid #93c5fd;color:#1e40af}
`;

export function render(intake) {
  // intake.parsed is never populated at detection/render time, so parse the TOML ourselves.
  let cfg;
  if (intake.parsed && typeof intake.parsed === 'object') {
    cfg = intake.parsed;
  } else {
    try { cfg = parseTOML(intake.text || '') || {}; } catch { cfg = {}; }
  }
  const smtp = cfg.smtp_options || {};

  const subParts = [
    cfg.ldap_base_dn ? cfg.ldap_base_dn : null,
    cfg.ldap_port ? `LDAP :${cfg.ldap_port}` : null,
    cfg.http_port ? `HTTP :${cfg.http_port}` : null,
  ].filter(Boolean).join(' · ');

  // LDAP section
  const ldapRows = [
    cfg.ldap_base_dn != null ? `<div class="lldap-kv"><span class="lldap-kv-k">ldap_base_dn</span><span class="lldap-kv-v">${esc(cfg.ldap_base_dn)}</span></div>` : '',
    cfg.ldap_port != null ? `<div class="lldap-kv"><span class="lldap-kv-k">ldap_port</span><span class="lldap-kv-v">${esc(cfg.ldap_port)}</span></div>` : '',
    cfg.ldaps_port != null ? `<div class="lldap-kv"><span class="lldap-kv-k">ldaps_port</span><span class="lldap-kv-v">${esc(cfg.ldaps_port)} <span class="lldap-chip info">LDAPS</span></span></div>` : '',
    cfg.verbose != null ? `<div class="lldap-kv"><span class="lldap-kv-k">verbose</span><span class="lldap-kv-v"><span class="lldap-chip ${cfg.verbose ? 'on' : 'off'}">${cfg.verbose ? 'enabled' : 'disabled'}</span></span></div>` : '',
  ].filter(Boolean).join('');

  const ldapHtml = ldapRows ? `<div class="lldap-sec"><h3>LDAP</h3><div class="lldap-card">${ldapRows}</div></div>` : '';

  // HTTP section
  const httpRows = [
    cfg.http_port != null ? `<div class="lldap-kv"><span class="lldap-kv-k">http_port</span><span class="lldap-kv-v">${esc(cfg.http_port)}</span></div>` : '',
    cfg.http_url != null ? `<div class="lldap-kv"><span class="lldap-kv-k">http_url</span><span class="lldap-kv-v">${esc(cfg.http_url)}</span></div>` : '',
  ].filter(Boolean).join('');

  const httpHtml = httpRows ? `<div class="lldap-sec"><h3>HTTP</h3><div class="lldap-card">${httpRows}</div></div>` : '';

  // Security section
  const securityRows = [
    cfg.jwt_secret != null ? `<div class="lldap-kv"><span class="lldap-kv-k">jwt_secret</span><span class="lldap-masked">[configured]</span></div>` : '',
    cfg.key_file != null ? `<div class="lldap-kv"><span class="lldap-kv-k">key_file</span><span class="lldap-kv-v">${esc(cfg.key_file)}</span></div>` : '',
  ].filter(Boolean).join('');

  const securityHtml = securityRows ? `<div class="lldap-sec"><h3>Security</h3><div class="lldap-card">${securityRows}</div></div>` : '';

  // Admin section
  const adminRows = [
    cfg.lldap_ldap_user_dn != null ? `<div class="lldap-kv"><span class="lldap-kv-k">lldap_ldap_user_dn</span><span class="lldap-kv-v">${esc(cfg.lldap_ldap_user_dn)}</span></div>` : '',
    cfg.lldap_ldap_user_pass != null ? `<div class="lldap-kv"><span class="lldap-kv-k">lldap_ldap_user_pass</span><span class="lldap-masked">[configured]</span></div>` : '',
  ].filter(Boolean).join('');

  const adminHtml = adminRows ? `<div class="lldap-sec"><h3>Admin</h3><div class="lldap-card">${adminRows}</div></div>` : '';

  // Database section
  const dbHtml = cfg.database_url != null ? `<div class="lldap-sec"><h3>Database</h3><div class="lldap-card">
<div class="lldap-kv"><span class="lldap-kv-k">database_url</span><span class="lldap-kv-v">${esc(maskDbUrl(cfg.database_url))}</span></div>
</div></div>` : '';

  // SMTP section
  const smtpRows = [
    smtp.server != null ? `<div class="lldap-kv"><span class="lldap-kv-k">server</span><span class="lldap-kv-v">${esc(smtp.server)}</span></div>` : '',
    smtp.port != null ? `<div class="lldap-kv"><span class="lldap-kv-k">port</span><span class="lldap-kv-v">${esc(smtp.port)}</span></div>` : '',
    smtp.from != null ? `<div class="lldap-kv"><span class="lldap-kv-k">from</span><span class="lldap-kv-v">${esc(smtp.from)}</span></div>` : '',
    smtp.user != null ? `<div class="lldap-kv"><span class="lldap-kv-k">user</span><span class="lldap-kv-v">${esc(smtp.user)}</span></div>` : '',
    smtp.password != null ? `<div class="lldap-kv"><span class="lldap-kv-k">password</span><span class="lldap-masked">[configured]</span></div>` : '',
    smtp.enable_password_reset != null ? `<div class="lldap-kv"><span class="lldap-kv-k">enable_password_reset</span><span class="lldap-kv-v"><span class="lldap-chip ${smtp.enable_password_reset ? 'on' : 'off'}">${smtp.enable_password_reset ? 'enabled' : 'disabled'}</span></span></div>` : '',
  ].filter(Boolean).join('');

  const smtpHtml = smtpRows ? `<div class="lldap-sec"><h3>SMTP</h3><div class="lldap-card">${smtpRows}</div></div>` : '';

  const host = document.createElement('div');
  host.className = 'lldap-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px">
  <span class="badge-lldap">LLDAP</span>
  <span class="lldap-title">${esc(cfg.ldap_base_dn || 'LLDAP Config')}</span>
</div>
<div class="lldap-sub">${esc(subParts)}</div>
${ldapHtml}${httpHtml}${securityHtml}${adminHtml}${dbHtml}${smtpHtml}`;
  return { parentNode: host };
}
