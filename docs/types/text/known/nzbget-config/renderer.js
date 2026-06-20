// NZBGet config renderer. Parses key=value format; # comments ignored.
// Pure text parsing — no eval, no execution.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function parseNzbget(text) {
  const result = {};
  for (const line of (text || '').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    result[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
  return result;
}

function isSensitiveKey(key) {
  const k = key.toLowerCase();
  return k.includes('password') || k.includes('secret');
}

function masked() {
  return '<span style="color:var(--fg-2,#888);font-style:italic">[configured]</span>';
}

function kvRow(key, value) {
  const display = isSensitiveKey(key) ? masked() : '<span class="nzbget-val">' + esc(value) + '</span>';
  return '<li class="nzbget-row"><code class="nzbget-key">' + esc(key) + '</code>' + display + '</li>';
}

function extractServers(cfg) {
  const serverNums = new Set();
  for (const key of Object.keys(cfg)) {
    const m = key.match(/^Server(\d+)\./i);
    if (m) serverNums.add(Number(m[1]));
  }
  return [...serverNums].sort((a, b) => a - b).map((n) => {
    const prefix = 'Server' + n + '.';
    const get = (suffix) => cfg[prefix + suffix] || cfg[prefix + suffix.toLowerCase()] || '';
    return {
      num: n,
      host: get('Host'),
      port: get('Port'),
      username: get('Username'),
      password: get('Password'),
      connections: get('Connections'),
      encryption: get('Encryption'),
    };
  });
}

const CSS = `
.nzbget-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.nzbget-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#f4a11e;color:#fff;vertical-align:middle;margin-right:8px;}
.nzbget-title{font-size:18px;font-weight:700;margin:0 0 14px;display:flex;align-items:center;flex-wrap:wrap;gap:6px;}
.nzbget-sec{margin:14px 0;}
.nzbget-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.nzbget-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.nzbget-list{list-style:none;margin:0;padding:0;}
.nzbget-row{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:12px;}
.nzbget-key{color:var(--fg-2,#888);min-width:180px;font-family:ui-monospace,monospace;flex-shrink:0;}
.nzbget-val{font-family:ui-monospace,monospace;word-break:break-all;}
.nzbget-chip{display:inline-block;padding:1px 7px;border-radius:3px;background:#f4a11e;color:#fff;font-size:11px;font-weight:600;margin-left:4px;}
.nzbget-server{border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:8px 12px;margin:6px 0;background:var(--bg,#fff);}
.nzbget-server-title{font-size:12px;font-weight:600;color:var(--fg-2,#888);margin:0 0 4px;}
`;

export function render(intake) {
  const cfg = parseNzbget(intake.text || '');
  const host = document.createElement('div');
  host.className = 'nzbget-doc';

  // Paths section
  const pathKeys = ['MainDir', 'TempDir', 'DestDir', 'NzbDir', 'QueueDir', 'LogFile'];
  const pathRows = pathKeys.filter((k) => cfg[k]).map((k) => kvRow(k, cfg[k])).join('');
  const pathsHtml = pathRows ? `<div class="nzbget-sec"><h3>Paths</h3><div class="nzbget-card"><ul class="nzbget-list">${pathRows}</ul></div></div>` : '';

  // News servers
  const servers = extractServers(cfg);
  let serversHtml = '';
  if (servers.length) {
    const serverCards = servers.map((s) => {
      const encBadge = s.encryption && s.encryption.toLowerCase() === 'yes'
        ? '<span class="nzbget-chip">TLS</span>' : '';
      return `<div class="nzbget-server">
<div class="nzbget-server-title">Server ${esc(String(s.num))}${encBadge}</div>
<ul class="nzbget-list">
${s.host ? `<li class="nzbget-row"><code class="nzbget-key">Host</code><span class="nzbget-val">${esc(s.host)}</span></li>` : ''}
${s.port ? `<li class="nzbget-row"><code class="nzbget-key">Port</code><span class="nzbget-val">${esc(s.port)}</span></li>` : ''}
${s.connections ? `<li class="nzbget-row"><code class="nzbget-key">Connections</code><span class="nzbget-val">${esc(s.connections)}</span></li>` : ''}
${s.username ? `<li class="nzbget-row"><code class="nzbget-key">Username</code><span class="nzbget-val">${esc(s.username)}</span></li>` : ''}
${s.password ? `<li class="nzbget-row"><code class="nzbget-key">Password</code>${masked()}</li>` : ''}
</ul></div>`;
    }).join('');
    serversHtml = `<div class="nzbget-sec"><h3>News Servers</h3>${serverCards}</div>`;
  }

  // Security / Web control
  const secKeys = ['ControlIP', 'ControlPort', 'ControlUsername', 'ControlPassword'];
  const secRows = secKeys.filter((k) => cfg[k]).map((k) => kvRow(k, cfg[k])).join('');
  const secHtml = secRows ? `<div class="nzbget-sec"><h3>Security</h3><div class="nzbget-card"><ul class="nzbget-list">${secRows}</ul></div></div>` : '';

  // Download settings
  const dlKeys = ['ConnectionTimeout', 'ArticleTimeout', 'RetryOnCrcError'];
  const dlRows = dlKeys.filter((k) => cfg[k]).map((k) => kvRow(k, cfg[k])).join('');
  const dlHtml = dlRows ? `<div class="nzbget-sec"><h3>Download</h3><div class="nzbget-card"><ul class="nzbget-list">${dlRows}</ul></div></div>` : '';

  // Post-processing
  const ppKeys = ['PostMaxProcesses', 'ScriptDir'];
  const ppRows = ppKeys.filter((k) => cfg[k]).map((k) => kvRow(k, cfg[k])).join('');
  const ppHtml = ppRows ? `<div class="nzbget-sec"><h3>Post-Processing</h3><div class="nzbget-card"><ul class="nzbget-list">${ppRows}</ul></div></div>` : '';

  const isEmpty = !pathRows && !servers.length && !secRows && !dlRows && !ppRows;
  const emptyHtml = isEmpty ? '<p style="color:var(--fg-2,#888)">No NZBGet configuration directives detected.</p>' : '';

  host.innerHTML = `<style>${CSS}</style>
<div class="nzbget-title"><span class="nzbget-badge">NZBGet</span>nzbget.conf</div>
${pathsHtml}${serversHtml}${secHtml}${dlHtml}${ppHtml}${emptyHtml}`;

  return { parentNode: host };
}
