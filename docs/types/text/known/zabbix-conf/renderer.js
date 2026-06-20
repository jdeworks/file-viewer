const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.zabbix-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.zabbix-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#d40000;color:#fff;vertical-align:middle;margin-right:8px;}
.zabbix-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.zabbix-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 16px;}
.zabbix-section{margin:0 0 6px;font-size:13px;font-weight:600;color:var(--fg-2,#888);text-transform:uppercase;letter-spacing:.04em;}
.zabbix-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:12px;}
.zabbix-table{width:100%;border-collapse:collapse;font-size:13px;}
.zabbix-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.zabbix-table td:first-child{color:var(--fg-2,#666);width:42%;font-family:ui-monospace,monospace;font-size:12px;white-space:nowrap;}
.zabbix-table td:last-child{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.zabbix-table tr:last-child td{border-bottom:none;}
.zabbix-chips{display:flex;flex-wrap:wrap;gap:6px;padding:4px 0;}
.zabbix-chip{display:inline-block;padding:2px 9px;border-radius:10px;font-size:12px;font-weight:600;background:var(--bg-2,#f0f0f0);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.zabbix-warn{background:#fff3cd;border:1px solid #ffc107;border-radius:6px;padding:8px 12px;margin-bottom:12px;font-size:13px;color:#664d03;}
.zabbix-masked{font-family:ui-monospace,monospace;color:var(--fg-2,#999);font-style:italic;}
.zabbix-empty{color:var(--fg-2,#888);font-size:13px;}
`;

function parseKV(text) {
  const result = {};
  for (const line of (text || '').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!result[key]) result[key] = [];
    result[key].push(val);
  }
  return result;
}

function agentType(filename) {
  const n = (filename || '').split('/').pop().toLowerCase();
  if (n === 'zabbix_agent2.conf') return 'Agent2';
  if (n === 'zabbix_server.conf') return 'Server';
  if (n === 'zabbix_proxy.conf') return 'Proxy';
  return 'Agent';
}

export function render(intake) {
  const text = intake.text || '';
  const kv = parseKV(text);
  const filename = intake.name || intake.filename || 'zabbix_agentd.conf';
  const type = agentType(filename);

  const get = (k) => (kv[k] || [])[0] || null;
  const getAll = (k) => kv[k] || [];

  // Security: mask PSK values
  const hasPSKIdentity = get('TLSPSKIdentity') != null;
  const hasPSKFile = get('TLSPSKFile') != null;

  // Core settings
  const server = getAll('Server');
  const serverActive = getAll('ServerActive');
  const hostname = get('Hostname') || get('HostnameItem');
  const listenPort = get('ListenPort');
  const logFile = get('LogFile');
  const bufferSize = get('BufferSize');
  const timeout = get('Timeout');
  const enableRemoteCmd = get('EnableRemoteCommands');
  const logRemoteCmd = get('LogRemoteCommands');
  const includes = getAll('Include');
  const userParams = getAll('UserParameter');
  const tlsConnect = get('TLSConnect');
  const tlsAccept = get('TLSAccept');

  // Remote commands flag — flag red if 1
  const remoteEnabled = enableRemoteCmd === '1';

  const baseFilename = filename.split('/').pop();

  // Warnings
  let warningsHtml = '';
  if (remoteEnabled) {
    warningsHtml += `<div class="zabbix-warn">&#9888; <strong>EnableRemoteCommands = 1</strong>: the Zabbix server can execute arbitrary commands on this host. Consider disabling unless required.</div>`;
  }

  // Build sections
  let sectionsHtml = '';

  // Connectivity
  const connRows = [
    server.length ? ['Server (passive)', server.join(', ')] : null,
    serverActive.length ? ['ServerActive (active)', serverActive.join(', ')] : null,
    hostname ? ['Hostname', hostname] : null,
    listenPort ? ['ListenPort', listenPort] : null,
  ].filter(Boolean);

  if (connRows.length) {
    const rows = connRows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('');
    sectionsHtml += `<div class="zabbix-section">Connectivity</div>
<div class="zabbix-card"><table class="zabbix-table"><tbody>${rows}</tbody></table></div>`;
  }

  // Settings
  const settingRows = [
    logFile ? ['LogFile', logFile] : null,
    bufferSize ? ['BufferSize', bufferSize] : null,
    timeout ? ['Timeout', timeout] : null,
    enableRemoteCmd != null ? ['EnableRemoteCommands', enableRemoteCmd] : null,
    logRemoteCmd != null ? ['LogRemoteCommands', logRemoteCmd] : null,
  ].filter(Boolean);

  if (settingRows.length) {
    const rows = settingRows.map(([k, v]) => {
      const dangerous = k === 'EnableRemoteCommands' && v === '1';
      return `<tr><td>${esc(k)}</td><td style="${dangerous ? 'color:#cf222e;font-weight:600;' : ''}">${esc(v)}</td></tr>`;
    }).join('');
    sectionsHtml += `<div class="zabbix-section">Settings</div>
<div class="zabbix-card"><table class="zabbix-table"><tbody>${rows}</tbody></table></div>`;
  }

  // TLS
  const tlsRows = [
    tlsConnect ? ['TLSConnect', tlsConnect] : null,
    tlsAccept ? ['TLSAccept', tlsAccept] : null,
    hasPSKIdentity ? ['TLSPSKIdentity', null] : null,
    hasPSKFile ? ['TLSPSKFile', null] : null,
  ].filter(Boolean);

  if (tlsRows.length) {
    const rows = tlsRows.map(([k, v]) => {
      if (v === null) {
        return `<tr><td>${esc(k)}</td><td><span class="zabbix-masked">[configured]</span></td></tr>`;
      }
      return `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`;
    }).join('');
    sectionsHtml += `<div class="zabbix-section">TLS</div>
<div class="zabbix-card"><table class="zabbix-table"><tbody>${rows}</tbody></table></div>`;
  }

  // Include paths
  if (includes.length) {
    const chips = includes.map((p) => `<span class="zabbix-chip">${esc(p)}</span>`).join('');
    sectionsHtml += `<div class="zabbix-section">Include Paths (${includes.length})</div>
<div class="zabbix-card"><div class="zabbix-chips">${chips}</div></div>`;
  }

  // UserParameter entries
  if (userParams.length) {
    sectionsHtml += `<div class="zabbix-section">UserParameter Entries</div>
<div class="zabbix-card"><div class="zabbix-chips"><span class="zabbix-chip">${userParams.length} user parameter${userParams.length !== 1 ? 's' : ''} defined</span></div></div>`;
  }

  const subParts = [
    `${type} config`,
    server.length ? `Server: ${server[0]}` : null,
    hostname ? `Host: ${hostname}` : null,
  ].filter(Boolean).join(' · ');

  const host = document.createElement('div');
  host.className = 'zabbix-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="zabbix-title"><span class="zabbix-badge">Zabbix ${esc(type)}</span>${esc(baseFilename)}</div>
<div class="zabbix-sub">${esc(subParts)}</div>
${warningsHtml}
${sectionsHtml || '<p class="zabbix-empty">No configuration keys found.</p>'}`;

  return { parentNode: host };
}
