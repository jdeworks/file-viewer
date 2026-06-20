const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.kc-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-kc{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#00B8D9;color:#fff;vertical-align:middle;margin-right:8px;}
.kc-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.kc-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.kc-sec{margin:14px 0;}
.kc-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.kc-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.kc-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px;}
.kc-kv-k{color:var(--fg-2,#888);min-width:180px;flex-shrink:0;}
.kc-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.kc-masked{font-family:ui-monospace,monospace;color:var(--fg-2,#999);letter-spacing:2px;}
.kc-table{width:100%;border-collapse:collapse;font-size:13px;}
.kc-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);font-weight:600;padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);}
.kc-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e8eaed);vertical-align:top;}
.kc-tag{display:inline-flex;align-items:center;font-size:11px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:2px;}
.kc-on{background:#dcfce7;border-color:#86efac;color:#166534;}
.kc-off{background:#fef2f2;border-color:#fca5a5;color:#991b1b;}
.kc-pills{display:flex;flex-wrap:wrap;gap:4px;}
`;

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<div class="kc-kv"><span class="kc-kv-k">${esc(label)}</span><span class="kc-kv-v">${esc(String(value))}</span></div>`;
}

function bool(label, value) {
  if (value == null) return '';
  const cls = value ? 'kc-on' : 'kc-off';
  return `<div class="kc-kv"><span class="kc-kv-k">${esc(label)}</span><span class="kc-tag ${cls}">${value ? 'enabled' : 'disabled'}</span></div>`;
}

export function render(intake) {
  let cfg;
  try { cfg = JSON.parse(intake.text || '{}'); } catch {
    return { parentNode: Object.assign(document.createElement('div'), { textContent: 'Invalid Keycloak realm JSON.' }) };
  }

  const realmName = cfg.realm || '(unnamed)';
  const displayName = cfg.displayName || cfg.displayNameHtml || '';
  const clients = Array.isArray(cfg.clients) ? cfg.clients : [];
  const realmRoles = Array.isArray(cfg.roles?.realm) ? cfg.roles.realm : [];
  const clientRoles = cfg.roles?.client && typeof cfg.roles.client === 'object' ? cfg.roles.client : {};
  const idps = Array.isArray(cfg.identityProviders) ? cfg.identityProviders : [];

  // Summary
  const subParts = [
    `realm: ${realmName}`,
    clients.length ? `${clients.length} client${clients.length !== 1 ? 's' : ''}` : null,
    realmRoles.length ? `${realmRoles.length} realm role${realmRoles.length !== 1 ? 's' : ''}` : null,
    idps.length ? `${idps.length} IdP${idps.length !== 1 ? 's' : ''}` : null,
  ].filter(Boolean).join(' · ');

  // Realm settings section
  const settingsHtml = `<div class="kc-sec"><h3>Realm Settings</h3><div class="kc-card">
${kv('Realm', realmName)}
${displayName ? kv('Display name', displayName) : ''}
${kv('Enabled', cfg.enabled != null ? String(cfg.enabled) : null)}
${bool('Registration allowed', cfg.registrationAllowed)}
${bool('Reset password allowed', cfg.resetPasswordAllowed)}
${bool('Remember me', cfg.rememberMe)}
${bool('Verify email', cfg.verifyEmail)}
${cfg.loginTheme ? kv('Login theme', cfg.loginTheme) : ''}
${cfg.accessTokenLifespan != null ? kv('Access token lifespan', `${cfg.accessTokenLifespan}s`) : ''}
</div></div>`;

  // Clients section
  const clientsHtml = clients.length ? `<div class="kc-sec"><h3>Clients (${clients.length})</h3>
<table class="kc-table">
  <thead><tr><th>Client ID</th><th>Protocol</th><th>Enabled</th><th>Public</th></tr></thead>
  <tbody>${clients.slice(0, 15).map((c) => {
    const secret = c.secret;
    const hasSecret = secret != null;
    const enabled = c.enabled !== false;
    const isPublic = c.publicClient === true;
    return `<tr>
      <td><code style="font:12px ui-monospace,monospace">${esc(c.clientId || '?')}</code>${hasSecret ? ` <span class="kc-masked" title="secret masked">••••••••</span>` : ''}</td>
      <td><span style="font:12px ui-monospace,monospace">${esc(c.protocol || '—')}</span></td>
      <td><span class="kc-tag ${enabled ? 'kc-on' : 'kc-off'}">${enabled ? 'yes' : 'no'}</span></td>
      <td><span class="kc-tag ${isPublic ? 'kc-on' : ''}">${isPublic ? 'public' : 'confidential'}</span></td>
    </tr>`;
  }).join('')}${clients.length > 15 ? `<tr><td colspan="4" style="font-size:12px;color:var(--fg-2,#888)">…and ${clients.length - 15} more</td></tr>` : ''}
  </tbody>
</table></div>` : '';

  // Realm roles section
  const rolesHtml = realmRoles.length ? `<div class="kc-sec"><h3>Realm Roles (${realmRoles.length})</h3>
<div class="kc-pills">${realmRoles.slice(0, 20).map((r) => `<span class="kc-tag">${esc(r.name || r)}</span>`).join('')}${realmRoles.length > 20 ? `<span class="kc-tag" style="color:var(--fg-2,#888)">+${realmRoles.length - 20} more</span>` : ''}
</div>` : '';

  // Client roles section
  const clientRoleEntries = Object.entries(clientRoles);
  const clientRolesHtml = clientRoleEntries.length ? `<div class="kc-sec"><h3>Client Roles</h3><div class="kc-card">
${clientRoleEntries.slice(0, 8).map(([clientId, roles]) => {
  const roleList = Array.isArray(roles) ? roles.map((r) => r.name || r).join(', ') : '?';
  return `<div class="kc-kv"><span class="kc-kv-k">${esc(clientId)}</span><span class="kc-kv-v" style="font-size:12px">${esc(roleList)}</span></div>`;
}).join('')}${clientRoleEntries.length > 8 ? `<div class="kc-kv"><span class="kc-kv-k" style="color:var(--fg-2,#888)">…and ${clientRoleEntries.length - 8} more</span></div>` : ''}
</div></div>` : '';

  // Identity providers section
  const idpsHtml = idps.length ? `<div class="kc-sec"><h3>Identity Providers (${idps.length})</h3>
<table class="kc-table">
  <thead><tr><th>Alias</th><th>Provider</th><th>Enabled</th></tr></thead>
  <tbody>${idps.map((idp) => `<tr>
    <td>${esc(idp.alias || '?')}</td>
    <td><span style="font:12px ui-monospace,monospace">${esc(idp.providerId || '?')}</span></td>
    <td><span class="kc-tag ${idp.enabled !== false ? 'kc-on' : 'kc-off'}">${idp.enabled !== false ? 'yes' : 'no'}</span></td>
  </tr>`).join('')}
  </tbody>
</table></div>` : '';

  const host = document.createElement('div');
  host.className = 'kc-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-kc">Keycloak</span>
  <span class="kc-title">${esc(displayName || realmName)} Realm</span>
</div>
<div class="kc-sub">${esc(subParts)}</div>
${settingsHtml}${clientsHtml}${rolesHtml}${clientRolesHtml}${idpsHtml}`;
  return { parentNode: host };
}
