import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.dex-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-dex{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1a3a5c;color:#fff;vertical-align:middle;margin-right:8px}
.dex-title{font-size:18px;font-weight:700;margin:0 0 4px}
.dex-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.dex-sec{margin:14px 0}
.dex-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px}
.dex-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff)}
.dex-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px}
.dex-kv-k{color:var(--fg-2,#888);min-width:160px;flex-shrink:0}
.dex-kv-v{font-family:ui-monospace,monospace;word-break:break-all}
.dex-masked{font-family:ui-monospace,monospace;color:var(--fg-2,#999);letter-spacing:2px}
.dex-pill{display:inline-flex;align-items:center;font-size:11px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:2px}
.dex-pill.on{background:#dcfce7;border-color:#86efac;color:#166534}
.dex-pill.off{background:#fef2f2;border-color:#fca5a5;color:#991b1b}
.dex-connector{display:inline-flex;align-items:center;gap:6px;font-size:12px;padding:3px 10px;border-radius:8px;background:#eff6ff;border:1px solid #93c5fd;color:#1e40af;margin:3px;font-family:ui-monospace,monospace}
.dex-client{border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:7px 12px;margin:5px 0;font-size:13px;background:var(--bg,#fff)}
.dex-client-name{font-weight:600;margin-bottom:3px}
.dex-client-uri{font-size:11px;font-family:ui-monospace,monospace;color:var(--fg-2,#888);word-break:break-all}
`;

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = {}; }

  const web = cfg.web || {};
  const grpc = cfg.grpc || {};
  const storage = cfg.storage || {};
  const storageCfg = storage.config || {};
  const oauth2 = cfg.oauth2 || {};
  const connectors = Array.isArray(cfg.connectors) ? cfg.connectors : [];
  const staticClients = Array.isArray(cfg.staticClients) ? cfg.staticClients : [];
  const staticPasswords = Array.isArray(cfg.staticPasswords) ? cfg.staticPasswords : [];

  const subParts = [
    cfg.issuer ? cfg.issuer : null,
    connectors.length ? `${connectors.length} connector${connectors.length !== 1 ? 's' : ''}` : null,
    staticClients.length ? `${staticClients.length} client${staticClients.length !== 1 ? 's' : ''}` : null,
  ].filter(Boolean).join(' · ');

  // Server section
  const serverRows = [
    cfg.issuer ? `<div class="dex-kv"><span class="dex-kv-k">issuer</span><span class="dex-kv-v">${esc(cfg.issuer)}</span></div>` : '',
    web.http ? `<div class="dex-kv"><span class="dex-kv-k">web.http</span><span class="dex-kv-v">${esc(web.http)}</span></div>` : '',
    web.https ? `<div class="dex-kv"><span class="dex-kv-k">web.https</span><span class="dex-kv-v">${esc(web.https)}</span></div>` : '',
    grpc.addr ? `<div class="dex-kv"><span class="dex-kv-k">grpc.addr</span><span class="dex-kv-v">${esc(grpc.addr)}</span></div>` : '',
  ].filter(Boolean).join('');

  const serverHtml = serverRows ? `<div class="dex-sec"><h3>Server</h3><div class="dex-card">${serverRows}</div></div>` : '';

  // Storage section
  const storageRows = [
    storage.type ? `<div class="dex-kv"><span class="dex-kv-k">type</span><span class="dex-kv-v">${esc(storage.type)}</span></div>` : '',
    storageCfg.host ? `<div class="dex-kv"><span class="dex-kv-k">host</span><span class="dex-kv-v">${esc(storageCfg.host)}</span></div>` : '',
    storageCfg.database ? `<div class="dex-kv"><span class="dex-kv-k">database</span><span class="dex-kv-v">${esc(storageCfg.database)}</span></div>` : '',
    storageCfg.user ? `<div class="dex-kv"><span class="dex-kv-k">user</span><span class="dex-kv-v">${esc(storageCfg.user)}</span></div>` : '',
    storageCfg.password != null ? `<div class="dex-kv"><span class="dex-kv-k">password</span><span class="dex-masked">[configured]</span></div>` : '',
  ].filter(Boolean).join('');

  const storageHtml = storageRows ? `<div class="dex-sec"><h3>Storage</h3><div class="dex-card">${storageRows}</div></div>` : '';

  // Connectors section
  const connectorsHtml = connectors.length ? `<div class="dex-sec"><h3>Connectors (${connectors.length})</h3>
<div class="dex-card" style="display:flex;flex-wrap:wrap;gap:4px;padding:10px 14px">
${connectors.slice(0, 6).map((c) => `<span class="dex-connector"><strong>${esc(c.type || '?')}</strong>${c.name ? ` — ${esc(c.name)}` : (c.id ? ` (${esc(c.id)})` : '')}</span>`).join('')}
${connectors.length > 6 ? `<span style="font-size:12px;color:var(--fg-2,#888);padding:4px 6px">+${connectors.length - 6} more</span>` : ''}
</div></div>` : '';

  // OAuth2 section
  const oauth2Rows = [
    oauth2.skipApprovalScreen != null ? `<div class="dex-kv"><span class="dex-kv-k">skipApprovalScreen</span><span class="dex-kv-v"><span class="dex-pill ${oauth2.skipApprovalScreen ? 'on' : 'off'}">${oauth2.skipApprovalScreen ? 'true' : 'false'}</span></span></div>` : '',
    Array.isArray(oauth2.responseTypes) && oauth2.responseTypes.length ? `<div class="dex-kv"><span class="dex-kv-k">responseTypes</span><span class="dex-kv-v">${oauth2.responseTypes.map((t) => `<span class="dex-pill">${esc(t)}</span>`).join(' ')}</span></div>` : '',
  ].filter(Boolean).join('');

  const oauth2Html = oauth2Rows ? `<div class="dex-sec"><h3>OAuth2</h3><div class="dex-card">${oauth2Rows}</div></div>` : '';

  // Static Clients section
  let staticClientsHtml = '';
  if (staticClients.length) {
    const clientCards = staticClients.slice(0, 4).map((c) => {
      const uris = Array.isArray(c.redirectURIs) ? c.redirectURIs : [];
      const truncUri = uris.length ? (uris[0].length > 60 ? uris[0].slice(0, 60) + '…' : uris[0]) + (uris.length > 1 ? ` +${uris.length - 1}` : '') : '';
      return `<div class="dex-client">
<div class="dex-client-name">${esc(c.name || c.id || '?')}${c.id && c.name ? ` <span style="font-size:11px;color:var(--fg-2,#888);font-weight:400">(${esc(c.id)})</span>` : ''}</div>
${c.secret != null ? `<div style="font-size:12px;color:var(--fg-2,#888)">secret: <span class="dex-masked">[configured]</span></div>` : ''}
${truncUri ? `<div class="dex-client-uri">redirect: ${esc(truncUri)}</div>` : ''}
</div>`;
    }).join('');
    staticClientsHtml = `<div class="dex-sec"><h3>Static Clients (${staticClients.length})</h3>${clientCards}${staticClients.length > 4 ? `<div style="font-size:12px;color:var(--fg-2,#888);padding:4px 0">…and ${staticClients.length - 4} more</div>` : ''}</div>`;
  }

  // Password DB section
  const pwEnabled = cfg.enablePasswordDB;
  const passwordDbHtml = (pwEnabled != null || staticPasswords.length) ? `<div class="dex-sec"><h3>Password DB</h3><div class="dex-card">
${pwEnabled != null ? `<div class="dex-kv"><span class="dex-kv-k">enablePasswordDB</span><span class="dex-kv-v"><span class="dex-pill ${pwEnabled ? 'on' : 'off'}">${pwEnabled ? 'enabled' : 'disabled'}</span></span></div>` : ''}
${staticPasswords.length ? `<div class="dex-kv"><span class="dex-kv-k">staticPasswords</span><span class="dex-kv-v">${staticPasswords.length} user${staticPasswords.length !== 1 ? 's' : ''} configured</span></div>` : ''}
</div></div>` : '';

  const host = document.createElement('div');
  host.className = 'dex-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px">
  <span class="badge-dex">Dex</span>
  <span class="dex-title">${esc(cfg.issuer || 'Dex OIDC Provider')}</span>
</div>
<div class="dex-sub">${esc(subParts)}</div>
${serverHtml}${storageHtml}${connectorsHtml}${oauth2Html}${staticClientsHtml}${passwordDbHtml}`;
  return { parentNode: host };
}
