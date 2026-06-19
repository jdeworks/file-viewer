const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.gs-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-gs{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#ff6d00;color:#fff;vertical-align:middle;margin-right:8px;}
.gs-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.gs-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.gs-sec{margin:12px 0;}
.gs-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.gs-grid{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;margin:8px 0;}
.gs-key{font-size:12px;color:var(--fg-2,#888);}
.gs-val{font:12px ui-monospace,monospace;color:var(--accent,#ff6d00);word-break:break-all;}
.gs-client{border:1px solid var(--border,#e0e0e0);border-radius:6px;margin:6px 0;padding:8px 12px;}
.gs-client-name{font:13px/1.4 ui-monospace,monospace;font-weight:700;margin-bottom:4px;}
.gs-pills{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;}
.gs-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.gs-pill.svc{background:#fff3e0;border-color:#ffb74d;color:#e65100;}
`;

function detectServices(client) {
  const services = [];
  const services_arr = client.services || {};
  // FCM
  const fcm = client.services?.cloud_messaging || client.services?.analytics_service;
  if (fcm) services.push('FCM');
  // Analytics
  if (client.services?.analytics_service?.analytics_property?.tracking_id) services.push('Analytics');
  // Auth
  if (client.oauth_client && client.oauth_client.length) services.push('Auth');
  // Crashlytics (via API key presence)
  const apiServices = client.services || {};
  if (apiServices.appinvite_service) services.push('App Invites');
  if (apiServices.maps_service) services.push('Maps');
  if (apiServices.ads_service) services.push('Ads');
  return services;
}

export function render(intake) {
  let cfg = {};
  try { cfg = JSON.parse(intake.text || '{}'); } catch { cfg = {}; }

  const projectInfo = cfg.project_info || {};
  const clients = Array.isArray(cfg.client) ? cfg.client : [];

  const projectId = projectInfo.project_id || '';
  const projectNumber = projectInfo.project_number || '';
  const projectName = projectInfo.project_name || projectId || 'Google Services';
  const firebaseSenderId = projectInfo.firebase_url
    ? projectInfo.project_number
    : (clients[0]?.services?.cloud_messaging?.notification_config || null);

  const gcsSenderId = projectInfo.firebase_url || '';

  const parts = [];
  parts.push(projectId || projectName);
  if (clients.length) parts.push(`${clients.length} app client${clients.length !== 1 ? 's' : ''}`);

  const clientsHtml = clients.slice(0, 5).map((client) => {
    const clientInfo = client.client_info || {};
    const androidClientInfo = clientInfo.android_client_info || {};
    const packageName = androidClientInfo.package_name || clientInfo.client_id || '';
    const clientType = clientInfo.client_type || '';

    const apiKeys = Array.isArray(client.api_key) ? client.api_key : [];
    const oauthClients = Array.isArray(client.oauth_client) ? client.oauth_client : [];
    const services = detectServices(client);

    return `<div class="gs-client">
  <div class="gs-client-name">${esc(packageName || clientInfo.mobilesdk_app_id || 'App client')}</div>
  <div class="gs-grid">
    ${clientType ? `<span class="gs-key">Client type</span><span class="gs-val">${esc(String(clientType))}</span>` : ''}
    ${apiKeys.length ? `<span class="gs-key">API keys</span><span class="gs-val">${apiKeys.length}</span>` : ''}
    ${oauthClients.length ? `<span class="gs-key">OAuth clients</span><span class="gs-val">${oauthClients.length}</span>` : ''}
  </div>
  ${services.length ? `<div class="gs-pills">${services.map((s) => `<span class="gs-pill svc">${esc(s)}</span>`).join('')}</div>` : ''}
</div>`;
  }).join('');

  const host = document.createElement('div');
  host.className = 'gs-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="gs-title"><span class="badge-gs">Firebase</span>google-services.json</div>
<div class="gs-sub">${parts.join(' · ')}</div>

<div class="gs-sec">
  <div class="gs-grid">
    ${projectName && projectName !== projectId ? `<span class="gs-key">Project name</span><span class="gs-val">${esc(projectName)}</span>` : ''}
    ${projectId ? `<span class="gs-key">Project ID</span><span class="gs-val">${esc(projectId)}</span>` : ''}
    ${projectNumber ? `<span class="gs-key">Project number</span><span class="gs-val">${esc(projectNumber)}</span>` : ''}
    ${gcsSenderId ? `<span class="gs-key">Firebase URL</span><span class="gs-val">${esc(gcsSenderId)}</span>` : ''}
  </div>
</div>

${clients.length ? `<div class="gs-sec"><h3>App Clients (${clients.length})</h3>${clientsHtml}${clients.length > 5 ? `<div style="font-size:12px;color:var(--fg-2,#888);margin-top:4px">…and ${clients.length - 5} more</div>` : ''}</div>` : ''}
`;
  return { parentNode: host };
}
