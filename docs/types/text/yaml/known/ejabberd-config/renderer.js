import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.ejabberd-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.ejabberd-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#e85c00;color:#fff;vertical-align:middle;margin-right:8px;}
.ejabberd-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.ejabberd-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 16px;}
.ejabberd-section{margin:0 0 6px;font-size:13px;font-weight:600;color:var(--fg-2,#888);text-transform:uppercase;letter-spacing:.04em;}
.ejabberd-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:12px;}
.ejabberd-table{width:100%;border-collapse:collapse;font-size:13px;}
.ejabberd-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.ejabberd-table td:first-child{color:var(--fg-2,#666);width:38%;font-family:ui-monospace,monospace;font-size:12px;white-space:nowrap;}
.ejabberd-table td:last-child{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.ejabberd-table tr:last-child td{border-bottom:none;}
.ejabberd-chips{display:flex;flex-wrap:wrap;gap:6px;padding:4px 0;}
.ejabberd-chip{display:inline-block;padding:2px 9px;border-radius:10px;font-size:12px;font-weight:600;background:var(--bg-2,#f0f0f0);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.ejabberd-chip-c2s{background:#1565C0;color:#fff;border:none;}
.ejabberd-chip-s2s{background:#6A1B9A;color:#fff;border:none;}
.ejabberd-chip-http{background:#1B5E20;color:#fff;border:none;}
.ejabberd-chip-https{background:#004D40;color:#fff;border:none;}
.ejabberd-chip-mqtt{background:#E65100;color:#fff;border:none;}
.ejabberd-chip-other{background:#546E7A;color:#fff;border:none;}
.ejabberd-host{display:inline-block;padding:2px 9px;border-radius:10px;font-size:12px;font-family:ui-monospace,monospace;background:#fff3e0;border:1px solid #ffcc02;color:#4e3c00;margin:2px;}
.ejabberd-masked{font-family:ui-monospace,monospace;color:var(--fg-2,#999);font-style:italic;}
.ejabberd-empty{color:var(--fg-2,#888);font-size:13px;}
`;

function listenerClass(mod) {
  const m = String(mod || '').toLowerCase();
  if (m.includes('c2s')) return 'ejabberd-chip-c2s';
  if (m.includes('s2s')) return 'ejabberd-chip-s2s';
  if (m.includes('https') || m.includes('bosh') || m.includes('websocket')) return 'ejabberd-chip-https';
  if (m.includes('http')) return 'ejabberd-chip-http';
  if (m.includes('mqtt')) return 'ejabberd-chip-mqtt';
  return 'ejabberd-chip-other';
}

function listenerLabel(entry) {
  // entry is typically { port: N, module: '...', ...} or {ip: '::..', port: N, module: '...'}
  if (!entry || typeof entry !== 'object') return String(entry);
  const port = entry.port;
  const mod = entry.module || '';
  const shortMod = mod.replace(/^ejabberd_/, '').replace(/_/g, ' ');
  return port ? `${port} (${shortMod})` : shortMod;
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  const hosts = Array.isArray(cfg.hosts) ? cfg.hosts : (cfg.hosts ? [cfg.hosts] : []);
  const loglevel = cfg.loglevel;
  const listeners = Array.isArray(cfg.listen) ? cfg.listen : [];
  const modules = cfg.modules || {};
  const moduleCount = typeof modules === 'object' ? Object.keys(modules).length : 0;
  const authMethod = cfg.auth_method || (Array.isArray(cfg.auth_method) ? cfg.auth_method.join(', ') : null);
  const certfiles = Array.isArray(cfg.certfiles) ? cfg.certfiles : (cfg.certfiles ? [cfg.certfiles] : []);
  const acl = cfg.acl || {};
  const aclKeys = typeof acl === 'object' ? Object.keys(acl) : [];
  const access = cfg.access || {};
  const accessKeys = typeof access === 'object' ? Object.keys(access) : [];

  // Database / SQL
  const defaultDB = cfg.default_db;
  const sqlType = cfg.sql_type;
  const hasSqlPassword = cfg.sql_password != null;
  const hasOdbcString = cfg.odbc_server != null || cfg.sql_server != null;
  const ldapBind = cfg.ldap_password != null;

  // Admin accounts: count only — check acl.admin or access.configure
  const aclAdmin = acl.admin;
  let adminCount = 0;
  if (Array.isArray(aclAdmin)) {
    adminCount = aclAdmin.length;
  } else if (aclAdmin && typeof aclAdmin === 'object') {
    // may be {user: [...]} or list of {user: x, server: y}
    const users = aclAdmin.user;
    adminCount = Array.isArray(users) ? users.length : (users != null ? 1 : 1);
  }

  // Build sections
  let sectionsHtml = '';

  // Hosts
  if (hosts.length) {
    const chips = hosts.map((h) => `<span class="ejabberd-host">${esc(h)}</span>`).join('');
    sectionsHtml += `<div class="ejabberd-section">Hosts (${hosts.length})</div>
<div class="ejabberd-card"><div class="ejabberd-chips">${chips}</div></div>`;
  }

  // General
  const generalRows = [
    loglevel != null ? ['loglevel', String(loglevel)] : null,
    authMethod ? ['auth_method', Array.isArray(authMethod) ? authMethod.join(', ') : String(authMethod)] : null,
    defaultDB ? ['default_db', String(defaultDB)] : null,
    sqlType ? ['sql_type', String(sqlType)] : null,
    hasSqlPassword ? ['sql_password', null] : null,
    ldapBind ? ['ldap_password', null] : null,
  ].filter(Boolean);

  if (generalRows.length) {
    const rows = generalRows.map(([k, v]) => {
      if (v === null) {
        return `<tr><td>${esc(k)}</td><td><span class="ejabberd-masked">[configured]</span></td></tr>`;
      }
      return `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`;
    }).join('');
    sectionsHtml += `<div class="ejabberd-section">General</div>
<div class="ejabberd-card"><table class="ejabberd-table"><tbody>${rows}</tbody></table></div>`;
  }

  // Listeners
  if (listeners.length) {
    const chips = listeners.map((l) => {
      const mod = l.module || '';
      const cls = listenerClass(mod);
      const label = listenerLabel(l);
      return `<span class="ejabberd-chip ${cls}">${esc(label)}</span>`;
    }).join('');
    sectionsHtml += `<div class="ejabberd-section">Listeners (${listeners.length})</div>
<div class="ejabberd-card"><div class="ejabberd-chips">${chips}</div></div>`;
  }

  // Modules
  if (moduleCount) {
    const moduleNames = Object.keys(modules).slice(0, 12);
    const chips = moduleNames.map((m) => `<span class="ejabberd-chip">${esc(m)}</span>`).join('');
    const more = moduleCount > 12 ? `<span class="ejabberd-chip" style="background:none;border:none;color:var(--fg-2,#888)">+${moduleCount - 12} more</span>` : '';
    sectionsHtml += `<div class="ejabberd-section">Modules (${moduleCount} enabled)</div>
<div class="ejabberd-card"><div class="ejabberd-chips">${chips}${more}</div></div>`;
  }

  // Certificates
  if (certfiles.length) {
    const chips = certfiles.map((c) => `<span class="ejabberd-chip">${esc(c)}</span>`).join('');
    sectionsHtml += `<div class="ejabberd-section">Certificates</div>
<div class="ejabberd-card"><div class="ejabberd-chips">${chips}</div></div>`;
  }

  // ACL / Access
  const aclRows = [
    aclKeys.length ? ['ACL entries', aclKeys.join(', ')] : null,
    adminCount ? ['Admin accounts', String(adminCount) + ' configured'] : null,
    accessKeys.length ? ['Access rules', String(accessKeys.length) + ' rules'] : null,
  ].filter(Boolean);

  if (aclRows.length) {
    const rows = aclRows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('');
    sectionsHtml += `<div class="ejabberd-section">Access Control</div>
<div class="ejabberd-card"><table class="ejabberd-table"><tbody>${rows}</tbody></table></div>`;
  }

  const subParts = [
    hosts.length ? `${hosts.length} host${hosts.length !== 1 ? 's' : ''}` : null,
    moduleCount ? `${moduleCount} module${moduleCount !== 1 ? 's' : ''}` : null,
    listeners.length ? `${listeners.length} listener${listeners.length !== 1 ? 's' : ''}` : null,
    authMethod ? `auth: ${Array.isArray(authMethod) ? authMethod.join('+') : authMethod}` : null,
  ].filter(Boolean).join(' · ');

  const host = document.createElement('div');
  host.className = 'ejabberd-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="ejabberd-title"><span class="ejabberd-badge">ejabberd</span>ejabberd.yml</div>
<div class="ejabberd-sub">${esc(subParts)}</div>
${sectionsHtml || '<p class="ejabberd-empty">No configuration found.</p>'}`;

  return { parentNode: host };
}
