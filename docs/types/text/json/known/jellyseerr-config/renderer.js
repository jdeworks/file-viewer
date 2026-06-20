const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const SENSITIVE_RE = /secret|password|token|key|api|private/i;

function maskValue(k, v) {
  if (SENSITIVE_RE.test(k) && v) return '[configured]';
  return v;
}

const CSS = `
.jellyseerr-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-jellyseerr{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#6366f1;color:#fff;vertical-align:middle;margin-right:8px;}
.jellyseerr-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.jellyseerr-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.jellyseerr-sec{margin:14px 0;}
.jellyseerr-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.jellyseerr-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.jellyseerr-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px;}
.jellyseerr-kv-k{color:var(--fg-2,#888);min-width:160px;flex-shrink:0;}
.jellyseerr-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.jellyseerr-badge{display:inline-block;font-size:11px;padding:2px 8px;border-radius:5px;font-weight:600;vertical-align:middle;}
.jellyseerr-badge-on{background:#dcfce7;border:1px solid #86efac;color:#166534;}
.jellyseerr-badge-off{background:#f1f5f9;border:1px solid var(--border,#e0e0e0);color:var(--fg-2,#888);}
.jellyseerr-badge-masked{background:#fef3c7;border:1px solid #fcd34d;color:#92400e;font-style:italic;}
.jellyseerr-agent{display:inline-flex;align-items:center;gap:4px;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);margin:2px;}
.jellyseerr-agent-on{border-color:#86efac;background:#dcfce7;color:#166534;}
.jellyseerr-pills{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;}
`;

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<div class="jellyseerr-kv"><span class="jellyseerr-kv-k">${esc(label)}</span><span class="jellyseerr-kv-v">${esc(String(value))}</span></div>`;
}

function kvMasked(label, value) {
  if (value == null || value === '') return '';
  return `<div class="jellyseerr-kv"><span class="jellyseerr-kv-k">${esc(label)}</span><span class="jellyseerr-kv-v"><span class="jellyseerr-badge jellyseerr-badge-masked">[configured]</span></span></div>`;
}

function kvBool(label, value) {
  if (value == null) return '';
  const on = value === true || value === 'true' || value === 1;
  return `<div class="jellyseerr-kv"><span class="jellyseerr-kv-k">${esc(label)}</span><span class="jellyseerr-kv-v"><span class="jellyseerr-badge ${on ? 'jellyseerr-badge-on' : 'jellyseerr-badge-off'}">${on ? 'Yes' : 'No'}</span></span></div>`;
}

export function render(intake) {
  let cfg;
  try {
    cfg = typeof intake.parsed === 'object' && intake.parsed ? intake.parsed : JSON.parse(intake.text || '{}');
  } catch {
    return { parentNode: Object.assign(document.createElement('div'), { textContent: 'Invalid Jellyseerr config JSON.' }) };
  }

  const main = cfg.main || {};
  const jellyfin = cfg.jellyfin || {};
  const notifications = cfg.notifications || {};

  // App section
  const appHtml = `<div class="jellyseerr-sec"><h3>App</h3><div class="jellyseerr-card">
${kv('Title', main.applicationTitle)}
${kv('URL', main.applicationUrl)}
${kv('Locale', main.locale)}
${kv('Version', cfg.currentVersion)}
</div></div>`;

  // Security section
  const securityHtml = `<div class="jellyseerr-sec"><h3>Security</h3><div class="jellyseerr-card">
${main.apiKey != null ? kvMasked('API key', main.apiKey) : ''}
${main.trustProxy != null ? kvBool('Trust proxy', main.trustProxy) : ''}
${main.csrfProtection != null ? kvBool('CSRF protection', main.csrfProtection) : ''}
</div></div>`;

  // Media section
  const mediaItems = [
    main.defaultPermissions != null ? kv('Default permissions', main.defaultPermissions) : '',
    main.hideAvailable != null ? kvBool('Hide available', main.hideAvailable) : '',
  ].filter(Boolean).join('');
  const mediaHtml = mediaItems
    ? `<div class="jellyseerr-sec"><h3>Media</h3><div class="jellyseerr-card">${mediaItems}</div></div>`
    : '';

  // Notifications section
  let notificationsHtml = '';
  if (notifications.agents && typeof notifications.agents === 'object') {
    const agents = notifications.agents;
    const agentPills = Object.entries(agents).map(([name, agentCfg]) => {
      const enabled = agentCfg && agentCfg.enabled === true;
      return `<span class="jellyseerr-agent${enabled ? ' jellyseerr-agent-on' : ''}">${esc(name)}${enabled ? ' ✓' : ''}</span>`;
    }).join('');
    notificationsHtml = `<div class="jellyseerr-sec"><h3>Notifications</h3><div class="jellyseerr-card">
<div class="jellyseerr-pills">${agentPills}</div>
</div></div>`;
  }

  // Jellyfin section
  const libraryCount = Array.isArray(jellyfin.libraries) ? jellyfin.libraries.length : null;
  const jellyfinItems = [
    kv('Hostname', jellyfin.hostname),
    kv('External hostname', jellyfin.externalHostname),
    libraryCount != null ? kv('Libraries', libraryCount) : '',
  ].filter(Boolean).join('');
  const jellyfinHtml = jellyfinItems
    ? `<div class="jellyseerr-sec"><h3>Jellyfin</h3><div class="jellyseerr-card">${jellyfinItems}</div></div>`
    : '';

  const subParts = [
    main.applicationTitle || 'Jellyseerr',
    cfg.currentVersion ? `v${cfg.currentVersion}` : '',
    main.applicationUrl || '',
  ].filter(Boolean).join(' · ');

  const host = document.createElement('div');
  host.className = 'jellyseerr-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-jellyseerr">Jellyseerr</span>
  <span class="jellyseerr-title">${esc(main.applicationTitle || 'Jellyseerr')}</span>
</div>
<div class="jellyseerr-sub">${esc(subParts)}</div>
${appHtml}${securityHtml}${mediaHtml}${notificationsHtml}${jellyfinHtml}`;
  return { parentNode: host };
}
