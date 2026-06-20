const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const SENSITIVE_RE = /secret|password|token|key|api|private/i;

function maskValue(k, v) {
  if (SENSITIVE_RE.test(k) && v) return '[configured]';
  return v;
}

const CSS = `
.overseerr-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-overseerr{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#e5a00d;color:#fff;vertical-align:middle;margin-right:8px;}
.overseerr-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.overseerr-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.overseerr-sec{margin:14px 0;}
.overseerr-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.overseerr-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.overseerr-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px;}
.overseerr-kv-k{color:var(--fg-2,#888);min-width:160px;flex-shrink:0;}
.overseerr-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.overseerr-badge{display:inline-block;font-size:11px;padding:2px 8px;border-radius:5px;font-weight:600;vertical-align:middle;}
.overseerr-badge-on{background:#dcfce7;border:1px solid #86efac;color:#166534;}
.overseerr-badge-off{background:#f1f5f9;border:1px solid var(--border,#e0e0e0);color:var(--fg-2,#888);}
.overseerr-badge-masked{background:#fef3c7;border:1px solid #fcd34d;color:#92400e;font-style:italic;}
.overseerr-agent{display:inline-flex;align-items:center;gap:4px;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);margin:2px;}
.overseerr-agent-on{border-color:#86efac;background:#dcfce7;color:#166534;}
.overseerr-pills{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;}
`;

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<div class="overseerr-kv"><span class="overseerr-kv-k">${esc(label)}</span><span class="overseerr-kv-v">${esc(String(value))}</span></div>`;
}

function kvMasked(label, value) {
  if (value == null || value === '') return '';
  return `<div class="overseerr-kv"><span class="overseerr-kv-k">${esc(label)}</span><span class="overseerr-kv-v"><span class="overseerr-badge overseerr-badge-masked">[configured]</span></span></div>`;
}

function kvBool(label, value) {
  if (value == null) return '';
  const on = value === true || value === 'true' || value === 1;
  return `<div class="overseerr-kv"><span class="overseerr-kv-k">${esc(label)}</span><span class="overseerr-kv-v"><span class="overseerr-badge ${on ? 'overseerr-badge-on' : 'overseerr-badge-off'}">${on ? 'Yes' : 'No'}</span></span></div>`;
}

export function render(intake) {
  const cfg = intake.parsed && typeof intake.parsed === 'object' ? intake.parsed : {};

  const main = cfg.main || {};
  const plex = cfg.plex || {};
  const notifications = cfg.notifications || {};

  // App section
  const appHtml = `<div class="overseerr-sec"><h3>App</h3><div class="overseerr-card">
${kv('Title', main.applicationTitle)}
${kv('URL', main.applicationUrl)}
${kv('Locale', main.locale)}
${kv('Version', cfg.currentVersion)}
</div></div>`;

  // Security section
  const securityHtml = `<div class="overseerr-sec"><h3>Security</h3><div class="overseerr-card">
${main.apiKey != null ? kvMasked('API key', main.apiKey) : ''}
${main.trustProxy != null ? kvBool('Trust proxy', main.trustProxy) : ''}
${main.csrfProtection != null ? kvBool('CSRF protection', main.csrfProtection) : ''}
</div></div>`;

  // Plex section
  const libraryCount = Array.isArray(plex.libraries) ? plex.libraries.length : null;
  const plexItems = [
    kv('Name', plex.name),
    kv('IP / Host', plex.ip),
    plex.port != null ? kv('Port', plex.port) : '',
    plex.useSsl != null ? kvBool('Use SSL', plex.useSsl) : '',
    libraryCount != null ? kv('Libraries', libraryCount) : '',
  ].filter(Boolean).join('');
  const plexHtml = plexItems
    ? `<div class="overseerr-sec"><h3>Plex</h3><div class="overseerr-card">${plexItems}</div></div>`
    : '';

  // Notifications section
  let notificationsHtml = '';
  if (notifications.agents && typeof notifications.agents === 'object') {
    const agents = notifications.agents;
    const agentPills = Object.entries(agents).map(([name, agentCfg]) => {
      const enabled = agentCfg && agentCfg.enabled === true;
      return `<span class="overseerr-agent${enabled ? ' overseerr-agent-on' : ''}">${esc(name)}${enabled ? ' ✓' : ''}</span>`;
    }).join('');
    notificationsHtml = `<div class="overseerr-sec"><h3>Notifications</h3><div class="overseerr-card">
<div class="overseerr-pills">${agentPills}</div>
</div></div>`;
  }

  const subParts = [
    main.applicationTitle || 'Overseerr',
    cfg.currentVersion ? `v${cfg.currentVersion}` : '',
    main.applicationUrl || '',
  ].filter(Boolean).join(' · ');

  const host = document.createElement('div');
  host.className = 'overseerr-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-overseerr">Overseerr</span>
  <span class="overseerr-title">${esc(main.applicationTitle || 'Overseerr')}</span>
</div>
<div class="overseerr-sub">${esc(subParts)}</div>
${appHtml}${securityHtml}${plexHtml}${notificationsHtml}`;
  return { parentNode: host };
}
