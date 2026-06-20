const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.actualbudget-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.actualbudget-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#16a34a;color:#fff;vertical-align:middle;margin-right:8px;}
.actualbudget-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.actualbudget-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.actualbudget-sec{margin:12px 0;}
.actualbudget-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.actualbudget-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;}
.actualbudget-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;}
.actualbudget-key{color:var(--fg-2,#888);font-size:12px;min-width:200px;flex-shrink:0;}
.actualbudget-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.actualbudget-chip{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;}
.actualbudget-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
`;

function chip(val) {
  if (val == null || val === '') return '';
  const s = String(val);
  return `<span class="actualbudget-chip">${esc(s.length > 80 ? s.slice(0, 77) + '…' : s)}</span>`;
}

function masked() {
  return '<span class="actualbudget-masked">[configured]</span>';
}

function row(label, html) {
  if (!html) return '';
  return `<div class="actualbudget-row"><span class="actualbudget-key">${esc(label)}</span><span class="actualbudget-val">${html}</span></div>`;
}

export function render(intake) {
  let cfg = {};
  try { cfg = intake.parsed || JSON.parse(intake.text || '{}'); } catch { cfg = {}; }

  const https = cfg.https || {};
  const upload = cfg.upload || {};

  const host = document.createElement('div');
  host.className = 'actualbudget-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const title = cfg.hostname ? `${cfg.hostname}:${cfg.port || 5006}` : 'Actual Budget Config';

  const header = document.createElement('div');
  header.innerHTML = `
    <div style="margin-bottom:12px;">
      <span class="actualbudget-badge">Actual Budget</span>
      <span class="actualbudget-title">${esc(title)}</span>
    </div>
    <p class="actualbudget-sub">Actual Budget personal finance server configuration</p>
  `;
  host.appendChild(header);

  let body = '';

  // Server section
  const serverRows = [
    cfg.port != null ? row('port', chip(cfg.port)) : '',
    cfg.hostname ? row('hostname', chip(cfg.hostname)) : '',
    cfg.serverFiles ? row('serverFiles', chip(cfg.serverFiles)) : '',
    cfg.userFiles ? row('userFiles', chip(cfg.userFiles)) : '',
    cfg.dataDir ? row('dataDir', chip(cfg.dataDir)) : '',
  ].filter(Boolean).join('');
  if (serverRows) body += `<div class="actualbudget-sec"><h3>Server</h3><div class="actualbudget-card">${serverRows}</div></div>`;

  // HTTPS section
  const httpsRows = [
    https.key ? row('https.key', masked()) : '',
    https.cert ? row('https.cert', masked()) : '',
  ].filter(Boolean).join('');
  if (httpsRows) body += `<div class="actualbudget-sec"><h3>HTTPS</h3><div class="actualbudget-card">${httpsRows}</div></div>`;

  // Logging section
  const loginMethod = cfg.loginMethod;
  const trustedProxies = cfg.trustedProxies;
  const loggingRows = [
    loginMethod != null ? row('loginMethod', chip(loginMethod)) : '',
    (Array.isArray(trustedProxies) && trustedProxies.length)
      ? row('trustedProxies', trustedProxies.map(chip).join(''))
      : (typeof trustedProxies === 'string' && trustedProxies ? row('trustedProxies', chip(trustedProxies)) : ''),
  ].filter(Boolean).join('');
  if (loggingRows) body += `<div class="actualbudget-sec"><h3>Logging</h3><div class="actualbudget-card">${loggingRows}</div></div>`;

  // Upload section
  const fileSizeLimit = upload.fileSizeLimit;
  const syncEncrypted = upload.syncEncrypted;
  const uploadRows = [
    fileSizeLimit != null ? row('upload.fileSizeLimit', chip(Math.round(fileSizeLimit / (1024 * 1024)) + ' MB')) : '',
    syncEncrypted != null ? row('upload.syncEncrypted', chip(String(syncEncrypted))) : '',
  ].filter(Boolean).join('');
  if (uploadRows) body += `<div class="actualbudget-sec"><h3>Upload</h3><div class="actualbudget-card">${uploadRows}</div></div>`;

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  host.appendChild(bodyDiv);

  return { parentNode: host };
}
