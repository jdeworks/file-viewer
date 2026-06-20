const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.droneci-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.droneci-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#212121;color:#76ff03;vertical-align:middle;margin-right:8px;}
.droneci-title{font-size:18px;font-weight:700;margin:0 0 4px;display:inline;}
.droneci-sub{font-size:12px;color:var(--fg-2,#888);margin:4px 0 14px;}
.droneci-sec{margin:12px 0;}
.droneci-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.droneci-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;}
.droneci-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;flex-wrap:wrap;}
.droneci-key{color:var(--fg-2,#888);font-size:12px;min-width:230px;flex-shrink:0;}
.droneci-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.droneci-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;background:var(--bg-2,#f6f8fa);color:var(--fg,#24292f);}
.droneci-chip-green{background:#e8f5e9;border-color:#4caf50;color:#1b5e20;}
.droneci-chip-blue{background:#e3f2fd;border-color:#2196f3;color:#0d47a1;}
.droneci-chip-gray{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg-2,#888);}
.droneci-chip-orange{background:#fff3e0;border-color:#ff9800;color:#e65100;}
.droneci-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
`;

function parseKV(text) {
  const out = {};
  for (const raw of (text || '').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const stripped = line.startsWith('export ') ? line.slice(7) : line;
    const eq = stripped.indexOf('=');
    if (eq < 1) continue;
    const key = stripped.slice(0, eq).trim();
    let val = stripped.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (key && !(key in out)) out[key] = val;
  }
  return out;
}

function maskDsn(s) {
  if (!s) return '';
  return s.replace(/(postgres(?:ql)?:\/\/|mysql:\/\/)[^@]*@/, '$1[configured]@');
}

function chip(val, cls = '') {
  if (val == null || val === '') return '';
  return `<span class="droneci-chip${cls ? ' droneci-chip-' + cls : ''}">${esc(val)}</span>`;
}

function masked() {
  return '<span class="droneci-masked">[configured]</span>';
}

function row(label, html) {
  if (!html) return '';
  return `<div class="droneci-row"><span class="droneci-key">${esc(label)}</span><span class="droneci-val">${html}</span></div>`;
}

function boolChip(v) {
  const lower = (v || '').trim().toLowerCase();
  if (lower === 'true' || lower === '1') return chip('true', 'green');
  if (lower === 'false' || lower === '0') return chip('false', 'gray');
  return chip(v, 'gray');
}

function isSensitive(key) {
  return /secret|password|passwd|token|api[_-]?key|private/i.test(key);
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'droneci-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const kv = parseKV(intake.text || '');

  const serverHost = kv.DRONE_SERVER_HOST || '';
  const title = serverHost || 'Drone CI Config';

  // Header
  const header = document.createElement('div');
  header.innerHTML = `
    <div style="margin-bottom:4px;">
      <span class="droneci-badge">Drone</span>
      <span class="droneci-title">${esc(title)}</span>
    </div>
    <div class="droneci-sub">Drone CI server environment configuration</div>
  `;
  host.appendChild(header);

  let body = '';

  // Server
  const serverProto = kv.DRONE_SERVER_PROTO || '';
  const serverPort = kv.DRONE_SERVER_PORT || '';
  const serverRows = [
    serverHost ? row('DRONE_SERVER_HOST', esc(serverHost)) : '',
    serverProto ? row('DRONE_SERVER_PROTO', chip(serverProto, serverProto === 'https' ? 'green' : 'orange')) : '',
    serverPort ? row('DRONE_SERVER_PORT', chip(serverPort, 'blue')) : '',
  ].filter(Boolean).join('');
  if (serverRows) body += `<div class="droneci-sec"><h3>Server</h3><div class="droneci-card">${serverRows}</div></div>`;

  // RPC
  const rpcRows = [
    kv.DRONE_RPC_SECRET != null ? row('DRONE_RPC_SECRET', masked()) : '',
    kv.DRONE_RPC_HOST ? row('DRONE_RPC_HOST', esc(kv.DRONE_RPC_HOST)) : '',
  ].filter(Boolean).join('');
  if (rpcRows) body += `<div class="droneci-sec"><h3>RPC</h3><div class="droneci-card">${rpcRows}</div></div>`;

  // GitHub
  const ghRows = [
    kv.DRONE_GITHUB_CLIENT_ID ? row('DRONE_GITHUB_CLIENT_ID', esc(kv.DRONE_GITHUB_CLIENT_ID)) : '',
    kv.DRONE_GITHUB_CLIENT_SECRET != null ? row('DRONE_GITHUB_CLIENT_SECRET', masked()) : '',
    kv.DRONE_GITHUB_SERVER ? row('DRONE_GITHUB_SERVER', esc(kv.DRONE_GITHUB_SERVER)) : '',
  ].filter(Boolean).join('');
  if (ghRows) body += `<div class="droneci-sec"><h3>GitHub</h3><div class="droneci-card">${ghRows}</div></div>`;

  // GitLab
  const glRows = [
    kv.DRONE_GITLAB_CLIENT_ID ? row('DRONE_GITLAB_CLIENT_ID', esc(kv.DRONE_GITLAB_CLIENT_ID)) : '',
    kv.DRONE_GITLAB_CLIENT_SECRET != null ? row('DRONE_GITLAB_CLIENT_SECRET', masked()) : '',
    kv.DRONE_GITLAB_SERVER ? row('DRONE_GITLAB_SERVER', esc(kv.DRONE_GITLAB_SERVER)) : '',
  ].filter(Boolean).join('');
  if (glRows) body += `<div class="droneci-sec"><h3>GitLab</h3><div class="droneci-card">${glRows}</div></div>`;

  // Gitea
  const giteaRows = [
    kv.DRONE_GITEA_CLIENT_ID ? row('DRONE_GITEA_CLIENT_ID', esc(kv.DRONE_GITEA_CLIENT_ID)) : '',
    kv.DRONE_GITEA_CLIENT_SECRET != null ? row('DRONE_GITEA_CLIENT_SECRET', masked()) : '',
    kv.DRONE_GITEA_SERVER ? row('DRONE_GITEA_SERVER', esc(kv.DRONE_GITEA_SERVER)) : '',
  ].filter(Boolean).join('');
  if (giteaRows) body += `<div class="droneci-sec"><h3>Gitea</h3><div class="droneci-card">${giteaRows}</div></div>`;

  // Database
  const dbDriver = kv.DRONE_DATABASE_DRIVER || '';
  const dbDsn = kv.DRONE_DATABASE_DATASOURCE || '';
  const dbRows = [
    dbDriver ? row('DRONE_DATABASE_DRIVER', chip(dbDriver, 'blue')) : '',
    dbDsn ? row('DRONE_DATABASE_DATASOURCE', esc(maskDsn(dbDsn))) : '',
  ].filter(Boolean).join('');
  if (dbRows) body += `<div class="droneci-sec"><h3>Database</h3><div class="droneci-card">${dbRows}</div></div>`;

  // S3
  const s3Rows = [
    kv.DRONE_S3_BUCKET ? row('DRONE_S3_BUCKET', esc(kv.DRONE_S3_BUCKET)) : '',
    kv.DRONE_S3_PREFIX ? row('DRONE_S3_PREFIX', esc(kv.DRONE_S3_PREFIX)) : '',
    kv.DRONE_S3_ENDPOINT ? row('DRONE_S3_ENDPOINT', esc(kv.DRONE_S3_ENDPOINT)) : '',
    kv.DRONE_S3_PATH_STYLE != null ? row('DRONE_S3_PATH_STYLE', boolChip(kv.DRONE_S3_PATH_STYLE)) : '',
  ].filter(Boolean).join('');
  if (s3Rows) body += `<div class="droneci-sec"><h3>S3</h3><div class="droneci-card">${s3Rows}</div></div>`;

  // Secrets
  const secretRows = [
    kv.DRONE_S3_SECRET != null ? row('DRONE_S3_SECRET', masked()) : '',
    kv.DRONE_CONVERT_PLUGIN_SECRET != null ? row('DRONE_CONVERT_PLUGIN_SECRET', masked()) : '',
  ].filter(Boolean).join('');
  // Also catch any other sensitive keys not explicitly listed
  const extraSecretRows = Object.keys(kv)
    .filter((k) => isSensitive(k) && !['DRONE_RPC_SECRET','DRONE_GITHUB_CLIENT_SECRET','DRONE_GITLAB_CLIENT_SECRET','DRONE_GITEA_CLIENT_SECRET','DRONE_S3_SECRET','DRONE_CONVERT_PLUGIN_SECRET'].includes(k))
    .map((k) => row(k, masked()))
    .join('');
  const allSecretRows = secretRows + extraSecretRows;
  if (allSecretRows) body += `<div class="droneci-sec"><h3>Secrets</h3><div class="droneci-card">${allSecretRows}</div></div>`;

  // Logs
  const logRows = [
    kv.DRONE_LOGS_DEBUG != null ? row('DRONE_LOGS_DEBUG', boolChip(kv.DRONE_LOGS_DEBUG)) : '',
    kv.DRONE_LOGS_PRETTY != null ? row('DRONE_LOGS_PRETTY', boolChip(kv.DRONE_LOGS_PRETTY)) : '',
  ].filter(Boolean).join('');
  if (logRows) body += `<div class="droneci-sec"><h3>Logs</h3><div class="droneci-card">${logRows}</div></div>`;

  if (!body) {
    body = '<p style="color:var(--fg-2,#888);font-size:13px;">No Drone CI configuration keys found.</p>';
  }

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  host.appendChild(bodyDiv);

  return { parentNode: host };
}
