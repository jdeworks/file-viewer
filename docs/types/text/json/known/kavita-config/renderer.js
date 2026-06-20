const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.kavita-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.kavita-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#7b2d8b;color:#fff;vertical-align:middle;margin-right:8px;}
.kavita-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.kavita-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.kavita-sec{margin:12px 0;}
.kavita-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.kavita-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;}
.kavita-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;}
.kavita-key{color:var(--fg-2,#888);font-size:12px;min-width:180px;flex-shrink:0;}
.kavita-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.kavita-chip{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;}
.kavita-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
`;

function chip(val) {
  if (val == null || val === '') return '';
  return `<span class="kavita-chip">${esc(String(val))}</span>`;
}

function masked() {
  return '<span class="kavita-masked">[configured]</span>';
}

function row(label, html) {
  if (!html) return '';
  return `<div class="kavita-row"><span class="kavita-key">${esc(label)}</span><span class="kavita-val">${html}</span></div>`;
}

export function render(intake) {
  let cfg = {};
  try { cfg = intake.parsed || JSON.parse(intake.text || '{}'); } catch { cfg = {}; }

  const host = document.createElement('div');
  host.className = 'kavita-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  // Header
  const header = document.createElement('div');
  header.innerHTML = `
    <div style="margin-bottom:12px;">
      <span class="kavita-badge">Kavita</span>
      <span class="kavita-title">Kavita Server Config</span>
    </div>
    <p class="kavita-sub">Kavita self-hosted comic and book reader configuration</p>
  `;
  host.appendChild(header);

  let body = '';

  // Server section
  const serverRows = [
    cfg.Port != null ? row('Port', chip(cfg.Port)) : '',
    cfg.IpAddresses != null ? row('IP Addresses', chip(cfg.IpAddresses)) : '',
    cfg.BaseUrl != null ? row('Base URL', chip(cfg.BaseUrl)) : '',
    cfg.AllowIFraming != null ? row('Allow IFraming', chip(String(cfg.AllowIFraming))) : '',
    cfg.EmailServiceUrl != null ? row('Email Service URL', chip(cfg.EmailServiceUrl)) : '',
  ].filter(Boolean).join('');
  if (serverRows) body += `<div class="kavita-sec"><h3>Server</h3><div class="kavita-card">${serverRows}</div></div>`;

  // Security section
  const secRows = [
    cfg.TokenKey != null ? row('Token Key', masked()) : '',
    cfg.ApiKey != null ? row('API Key', masked()) : '',
  ].filter(Boolean).join('');
  if (secRows) body += `<div class="kavita-sec"><h3>Security</h3><div class="kavita-card">${secRows}</div></div>`;

  // Logging section
  const logRows = [
    cfg.LoggingLevel != null ? row('Logging Level', chip(cfg.LoggingLevel)) : '',
    cfg.TotalLogs != null ? row('Total Logs', chip(cfg.TotalLogs)) : '',
  ].filter(Boolean).join('');
  if (logRows) body += `<div class="kavita-sec"><h3>Logging</h3><div class="kavita-card">${logRows}</div></div>`;

  // Features section
  const featRows = [
    cfg.CacheSize != null ? row('Cache Size (MB)', chip(cfg.CacheSize)) : '',
    cfg.TotalBackups != null ? row('Total Backups', chip(cfg.TotalBackups)) : '',
    cfg.BackupDirectory != null ? row('Backup Directory', chip(cfg.BackupDirectory)) : '',
  ].filter(Boolean).join('');
  if (featRows) body += `<div class="kavita-sec"><h3>Features</h3><div class="kavita-card">${featRows}</div></div>`;

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  host.appendChild(bodyDiv);

  return { parentNode: host };
}
