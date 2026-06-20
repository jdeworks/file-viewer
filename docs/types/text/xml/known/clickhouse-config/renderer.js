// ClickHouse config.xml / users.xml enhanced view.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.ch-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-ch{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#FFCC00;color:#1a1a00;vertical-align:middle;margin-right:8px;}
.ch-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.ch-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.ch-sec{margin:14px 0;}
.ch-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.ch-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.ch-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:12px;}
.ch-kv-k{color:var(--fg-2,#888);min-width:180px;font-family:ui-monospace,monospace;}
.ch-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.ch-pills{display:flex;flex-wrap:wrap;gap:6px;}
.ch-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.ch-pill.on{background:#dcfce7;border-color:#86efac;color:#166534;}
.ch-pill.off{background:#f3f4f6;border-color:#d1d5db;color:#6b7280;}
.ch-tag{display:inline-block;font-size:11px;padding:2px 7px;border-radius:5px;background:#fffbeb;border:1px solid #fde68a;color:#92400e;margin-left:4px;}
.ch-err{color:#b91c1c;font-size:13px;padding:8px 0;}
`;

function getText(parent, tagName) {
  const el = parent.getElementsByTagName(tagName)[0];
  return el ? (el.textContent || '').trim() : '';
}

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<div class="ch-kv"><span class="ch-kv-k">${esc(label)}</span><span class="ch-kv-v">${esc(value)}</span></div>`;
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes || new Uint8Array());
  const host = document.createElement('div');
  host.className = 'ch-doc';
  host.innerHTML = `<style>${CSS}</style>`;

  let doc;
  try {
    doc = new DOMParser().parseFromString(text, 'text/xml');
  } catch {
    host.innerHTML += `<div class="ch-err">Failed to parse XML.</div>`;
    return { parentNode: host };
  }
  if (doc.getElementsByTagName('parsererror').length) {
    host.innerHTML += `<div class="ch-err">XML parse error.</div>`;
    return { parentNode: host };
  }

  // Root element: <clickhouse> or <yandex>
  const root = doc.getElementsByTagName('clickhouse')[0] || doc.getElementsByTagName('yandex')[0] || doc.documentElement;
  const isUsers = (intake.name || intake.filename || '').split('/').pop().toLowerCase() === 'users.xml';

  // Network
  const listenHost = getText(root, 'listen_host');
  const httpPort = getText(root, 'http_port');
  const tcpPort = getText(root, 'tcp_port');
  const mysqlPort = getText(root, 'mysql_port');
  const interserverPort = getText(root, 'interserver_http_port');

  // Resources
  const maxConnections = getText(root, 'max_connections');
  const maxMemUsage = getText(root, 'max_server_memory_usage');
  const maxMemRatio = getText(root, 'max_server_memory_usage_to_ram_ratio');
  const maxConCurrentQueries = getText(root, 'max_concurrent_queries');
  const keepAliveTimeout = getText(root, 'keep_alive_timeout');

  // Logger
  const loggerEl = root.getElementsByTagName('logger')[0];
  const logLevel = loggerEl ? getText(loggerEl, 'level') : '';
  const logPath = loggerEl ? getText(loggerEl, 'log') : '';
  const errorLog = loggerEl ? getText(loggerEl, 'errorlog') : '';
  const logSize = loggerEl ? getText(loggerEl, 'size') : '';
  const logCount = loggerEl ? getText(loggerEl, 'count') : '';

  // Default database / path
  const defaultDatabase = getText(root, 'default_database');
  const dataPath = getText(root, 'path');
  const tmpPath = getText(root, 'tmp_path');
  const userFilesPath = getText(root, 'user_files_path');

  // Access management
  const accessControlPath = getText(root, 'access_control_path');
  const userDirectoriesEl = root.getElementsByTagName('user_directories')[0];
  const localDirectory = userDirectoriesEl ? getText(userDirectoriesEl, 'path') : '';

  // Users (from users.xml)
  const usersEl = root.getElementsByTagName('users')[0];
  const userNames = usersEl
    ? Array.from(usersEl.childNodes).filter((n) => n.nodeType === 1).map((n) => n.nodeName).filter((n) => n !== 'parsererror')
    : [];

  // Quotas
  const quotasEl = root.getElementsByTagName('quotas')[0];
  const quotaNames = quotasEl
    ? Array.from(quotasEl.childNodes).filter((n) => n.nodeType === 1).map((n) => n.nodeName)
    : [];

  // Profiles
  const profilesEl = root.getElementsByTagName('profiles')[0];
  const profileNames = profilesEl
    ? Array.from(profilesEl.childNodes).filter((n) => n.nodeType === 1).map((n) => n.nodeName)
    : [];

  const filename = (intake.name || intake.filename || '').split('/').pop();

  // Build summary
  const subParts = [];
  if (tcpPort) subParts.push(`TCP :${tcpPort}`);
  if (httpPort) subParts.push(`HTTP :${httpPort}`);
  if (maxConnections) subParts.push(`maxConn ${maxConnections}`);
  if (logLevel) subParts.push(`log ${logLevel}`);

  const networkHtml = (listenHost || httpPort || tcpPort || interserverPort) ? `
<div class="ch-sec"><h3>Network</h3><div class="ch-card">
${kv('listen_host', listenHost)}
${kv('tcp_port', tcpPort)}
${kv('http_port', httpPort)}
${kv('mysql_port', mysqlPort)}
${kv('interserver_http_port', interserverPort)}
${kv('keep_alive_timeout', keepAliveTimeout ? keepAliveTimeout + 's' : '')}
</div></div>` : '';

  const resourcesHtml = (maxConnections || maxMemUsage || maxMemRatio || maxConCurrentQueries) ? `
<div class="ch-sec"><h3>Resources</h3><div class="ch-card">
${kv('max_connections', maxConnections)}
${kv('max_concurrent_queries', maxConCurrentQueries)}
${kv('max_server_memory_usage', maxMemUsage)}
${kv('max_server_memory_usage_to_ram_ratio', maxMemRatio)}
</div></div>` : '';

  const loggerHtml = (logLevel || logPath || errorLog) ? `
<div class="ch-sec"><h3>Logger</h3><div class="ch-card">
${kv('level', logLevel)}
${kv('log', logPath)}
${kv('errorlog', errorLog)}
${kv('size', logSize)}
${kv('count', logCount ? logCount + ' files' : '')}
</div></div>` : '';

  const pathsHtml = (dataPath || tmpPath || defaultDatabase) ? `
<div class="ch-sec"><h3>Storage</h3><div class="ch-card">
${kv('default_database', defaultDatabase)}
${kv('path', dataPath)}
${kv('tmp_path', tmpPath)}
${kv('user_files_path', userFilesPath)}
</div></div>` : '';

  const accessHtml = (accessControlPath || localDirectory) ? `
<div class="ch-sec"><h3>Access Management</h3><div class="ch-card">
${kv('access_control_path', accessControlPath)}
${kv('user_directories path', localDirectory)}
</div></div>` : '';

  const usersPillsHtml = userNames.length ? `
<div class="ch-sec"><h3>Users</h3><div class="ch-card">
<div class="ch-pills">${userNames.slice(0, 20).map((u) => `<span class="ch-pill">${esc(u)}</span>`).join('')}</div>
${userNames.length > 20 ? `<div style="font-size:11px;color:var(--fg-2,#888);margin-top:4px;">+${userNames.length - 20} more</div>` : ''}
</div></div>` : '';

  const quotasPillsHtml = quotaNames.length ? `
<div class="ch-sec"><h3>Quotas</h3><div class="ch-card">
<div class="ch-pills">${quotaNames.slice(0, 10).map((q) => `<span class="ch-pill">${esc(q)}</span>`).join('')}</div>
</div></div>` : '';

  const profilesPillsHtml = profileNames.length ? `
<div class="ch-sec"><h3>Profiles</h3><div class="ch-card">
<div class="ch-pills">${profileNames.slice(0, 10).map((p) => `<span class="ch-pill">${esc(p)}</span>`).join('')}</div>
</div></div>` : '';

  host.innerHTML += `
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-ch">ClickHouse</span>
  <span class="ch-title">${esc(isUsers ? 'Users Configuration' : 'Server Configuration')}</span>
  ${tcpPort ? `<span class="ch-tag">:${esc(tcpPort)}</span>` : ''}
  ${filename ? `<span class="ch-tag">${esc(filename)}</span>` : ''}
</div>
<div class="ch-sub">${esc(subParts.join(' · '))}</div>
${networkHtml}${resourcesHtml}${loggerHtml}${pathsHtml}${accessHtml}${usersPillsHtml}${quotasPillsHtml}${profilesPillsHtml}`;

  return { parentNode: host };
}
