import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.au-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-au{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#00B3ED;color:#fff;vertical-align:middle;margin-right:8px;}
.au-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.au-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.au-sec{margin:14px 0;}
.au-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.au-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.au-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px;}
.au-kv-k{color:var(--fg-2,#888);min-width:180px;flex-shrink:0;}
.au-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.au-masked{font-family:ui-monospace,monospace;color:var(--fg-2,#999);letter-spacing:2px;}
.au-table{width:100%;border-collapse:collapse;font-size:13px;}
.au-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);font-weight:600;padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);}
.au-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e8eaed);vertical-align:top;}
.au-pill{display:inline-flex;align-items:center;font-size:11px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:2px;}
.au-policy-deny{background:#fef2f2;border-color:#fca5a5;color:#991b1b;}
.au-policy-allow{background:#dcfce7;border-color:#86efac;color:#166534;}
.au-policy-bypass{background:#fefce8;border-color:#fde047;color:#713f12;}
.au-policy-one{background:#eff6ff;border-color:#93c5fd;color:#1e40af;}
.au-policy-two{background:#f5f3ff;border-color:#c4b5fd;color:#5b21b6;}
`;

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<div class="au-kv"><span class="au-kv-k">${esc(label)}</span><span class="au-kv-v">${esc(String(value))}</span></div>`;
}

function policyClass(p) {
  if (p === 'deny') return 'au-policy-deny';
  if (p === 'allow') return 'au-policy-allow';
  if (p === 'bypass') return 'au-policy-bypass';
  if (p === 'one_factor') return 'au-policy-one';
  if (p === 'two_factor') return 'au-policy-two';
  return '';
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = {}; }

  // Auth backend
  const backend = cfg.authentication_backend || {};
  const backendType = backend.ldap ? 'ldap' : backend.file ? 'file' : 'unknown';
  const ldap = backend.ldap || {};
  const file = backend.file || {};

  // Server
  const server = cfg.server || {};

  // Session
  const session = cfg.session || {};

  // Access control
  const ac = cfg.access_control || {};
  const acRules = Array.isArray(ac.rules) ? ac.rules : [];
  const defaultPolicy = ac.default_policy || null;

  // OIDC
  const idpClients = Array.isArray(cfg.identity_providers?.oidc?.clients)
    ? cfg.identity_providers.oidc.clients
    : [];

  // Summary
  const subParts = [
    `backend: ${backendType}`,
    session.domain ? `session: ${session.domain}` : null,
    acRules.length ? `${acRules.length} access rule${acRules.length !== 1 ? 's' : ''}` : null,
    idpClients.length ? `${idpClients.length} OIDC client${idpClients.length !== 1 ? 's' : ''}` : null,
  ].filter(Boolean).join(' · ');

  // Server section
  const serverHtml = (server.host || server.port) ? `<div class="au-sec"><h3>Server</h3><div class="au-card">
${kv('Host', server.host)}
${kv('Port', server.port)}
${server.path ? kv('Path prefix', server.path) : ''}
</div></div>` : '';

  // Auth backend section
  let backendDetails = '';
  if (backendType === 'ldap') {
    backendDetails = `${kv('URL', ldap.url || ldap.address)}${kv('Base DN', ldap.base_dn)}${kv('User', ldap.user)}${ldap.password != null ? `<div class="au-kv"><span class="au-kv-k">Password</span><span class="au-masked">••••••••</span></div>` : ''}`;
  } else if (backendType === 'file') {
    backendDetails = `${kv('Path', file.path)}`;
  }
  const backendHtml = `<div class="au-sec"><h3>Authentication Backend</h3><div class="au-card">
${kv('Type', backendType)}
${backendDetails}
</div></div>`;

  // Session section
  const sessionHtml = (session.domain || session.name || session.expiration) ? `<div class="au-sec"><h3>Session</h3><div class="au-card">
${kv('Domain', session.domain)}
${kv('Name', session.name)}
${kv('Expiration', session.expiration)}
${kv('Inactivity', session.inactivity)}
</div></div>` : '';

  // Access control section
  const acHtml = `<div class="au-sec"><h3>Access Control</h3><div class="au-card">
${defaultPolicy ? `<div class="au-kv"><span class="au-kv-k">Default policy</span><span class="au-pill ${policyClass(defaultPolicy)}">${esc(defaultPolicy)}</span></div>` : ''}
${acRules.length ? `<div class="au-kv"><span class="au-kv-k">Rules count</span><span class="au-kv-v">${acRules.length}</span></div>` : ''}
</div>
${acRules.length ? `<table class="au-table" style="margin-top:8px">
  <thead><tr><th>Domain</th><th>Policy</th><th>Resources</th></tr></thead>
  <tbody>${acRules.slice(0, 10).map((r) => {
    const domains = Array.isArray(r.domain) ? r.domain.join(', ') : (r.domain || '—');
    const resources = Array.isArray(r.resources) ? r.resources.length : 0;
    return `<tr>
      <td style="font:12px ui-monospace,monospace">${esc(domains)}</td>
      <td><span class="au-pill ${policyClass(r.policy)}">${esc(r.policy || '—')}</span></td>
      <td>${resources ? `${resources} resource${resources !== 1 ? 's' : ''}` : '—'}</td>
    </tr>`;
  }).join('')}${acRules.length > 10 ? `<tr><td colspan="3" style="font-size:12px;color:var(--fg-2,#888)">…and ${acRules.length - 10} more</td></tr>` : ''}
  </tbody>
</table>` : ''}
</div>`;

  // OIDC clients section
  const oidcHtml = idpClients.length ? `<div class="au-sec"><h3>OIDC Clients (${idpClients.length})</h3>
<table class="au-table">
  <thead><tr><th>Client ID</th><th>Description</th><th>Redirect URIs</th></tr></thead>
  <tbody>${idpClients.map((c) => {
    const uris = Array.isArray(c.redirect_uris) ? c.redirect_uris : [];
    const hasSecret = c.secret != null || c.client_secret != null;
    return `<tr>
      <td><code style="font:12px ui-monospace,monospace">${esc(c.id || c.client_id || '?')}</code>${hasSecret ? ` <span class="au-masked" title="secret masked">••••••••</span>` : ''}</td>
      <td style="font-size:12px">${esc(c.description || '—')}</td>
      <td style="font-size:12px">${uris.slice(0, 3).map((u) => `<div>${esc(u)}</div>`).join('')}${uris.length > 3 ? `<div style="color:var(--fg-2,#888)">+${uris.length - 3} more</div>` : ''}</td>
    </tr>`;
  }).join('')}
  </tbody>
</table></div>` : '';

  const host = document.createElement('div');
  host.className = 'au-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-au">Authelia</span>
  <span class="au-title">Configuration</span>
</div>
<div class="au-sub">${esc(subParts)}</div>
${serverHtml}${backendHtml}${sessionHtml}${acHtml}${oidcHtml}`;
  return { parentNode: host };
}
