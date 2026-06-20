// SABnzbd config renderer. Parses SABnzbd INI (with nested [[subsections]]).
// Pure text parsing — no eval, no execution.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Parse SABnzbd INI format which supports [section] and [[subsection]]
function parseSabnzbdIni(text) {
  const result = {};
  let curSection = null;
  let curSubSection = null;

  for (const rawLine of (text || '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) continue;

    // [[subsection]]
    const sub = line.match(/^\[\[([^\]]+)\]\]$/);
    if (sub) {
      curSubSection = sub[1].trim().toLowerCase();
      if (curSection && !result[curSection][curSubSection]) {
        result[curSection][curSubSection] = {};
      }
      continue;
    }

    // [section]
    const sec = line.match(/^\[([^\]]+)\]$/);
    if (sec) {
      curSection = sec[1].trim().toLowerCase();
      curSubSection = null;
      if (!result[curSection]) result[curSection] = {};
      continue;
    }

    // key = value
    const kv = line.match(/^([^=]+)=(.*)/);
    if (kv && curSection) {
      const key = kv[1].trim().toLowerCase();
      const val = kv[2].trim();
      if (curSubSection) {
        if (result[curSection] && result[curSection][curSubSection]) {
          result[curSection][curSubSection][key] = val;
        }
      } else {
        result[curSection][key] = val;
      }
    }
  }
  return result;
}

function isSensitiveKey(key) {
  const k = key.toLowerCase();
  return k.includes('password') || k.includes('api_key') || k.includes('nzb_key') || k.includes('secret');
}

function masked() {
  return '<span style="color:var(--fg-2,#888);font-style:italic">[configured]</span>';
}

function kvRow(key, value) {
  if (value == null || value === '') return '';
  const display = isSensitiveKey(key) ? masked() : '<span class="sabnzbd-val">' + esc(value) + '</span>';
  return '<li class="sabnzbd-row"><code class="sabnzbd-key">' + esc(key) + '</code>' + display + '</li>';
}

const CSS = `
.sabnzbd-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.sabnzbd-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#f4a11e;color:#fff;vertical-align:middle;margin-right:8px;}
.sabnzbd-title{font-size:18px;font-weight:700;margin:0 0 14px;display:flex;align-items:center;flex-wrap:wrap;gap:6px;}
.sabnzbd-sec{margin:14px 0;}
.sabnzbd-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.sabnzbd-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.sabnzbd-list{list-style:none;margin:0;padding:0;}
.sabnzbd-row{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:12px;}
.sabnzbd-key{color:var(--fg-2,#888);min-width:180px;font-family:ui-monospace,monospace;flex-shrink:0;}
.sabnzbd-val{font-family:ui-monospace,monospace;word-break:break-all;}
.sabnzbd-chip{display:inline-block;padding:1px 7px;border-radius:3px;background:#f4a11e;color:#fff;font-size:11px;font-weight:600;margin-left:4px;}
.sabnzbd-server{border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:8px 12px;margin:6px 0;background:var(--bg,#fff);}
.sabnzbd-server-title{font-size:12px;font-weight:600;color:var(--fg-2,#888);margin:0 0 4px;}
`;

export function render(intake) {
  const ini = parseSabnzbdIni(intake.text || '');
  const misc = ini['misc'] || {};
  const servers = ini['servers'] || {};

  const host = document.createElement('div');
  host.className = 'sabnzbd-doc';

  // Server / web interface section
  const svrKeys = ['host', 'port', 'web_username', 'web_password'];
  const svrRows = svrKeys.filter((k) => misc[k]).map((k) => kvRow(k, misc[k])).join('');
  const svrHtml = svrRows ? `<div class="sabnzbd-sec"><h3>Server</h3><div class="sabnzbd-card"><ul class="sabnzbd-list">${svrRows}</ul></div></div>` : '';

  // Paths
  const pathKeys = ['download_dir', 'complete_dir', 'nzb_backup_dir', 'script_dir'];
  const pathRows = pathKeys.filter((k) => misc[k]).map((k) => kvRow(k, misc[k])).join('');
  const pathsHtml = pathRows ? `<div class="sabnzbd-sec"><h3>Paths</h3><div class="sabnzbd-card"><ul class="sabnzbd-list">${pathRows}</ul></div></div>` : '';

  // API keys
  const apiKeys = ['api_key', 'nzb_key'];
  const apiRows = apiKeys.filter((k) => misc[k]).map((k) => kvRow(k, misc[k])).join('');
  const apiHtml = apiRows ? `<div class="sabnzbd-sec"><h3>API</h3><div class="sabnzbd-card"><ul class="sabnzbd-list">${apiRows}</ul></div></div>` : '';

  // News servers (nested [[servername]] under [servers])
  let newsServersHtml = '';
  const serverEntries = Object.entries(servers).filter(([, v]) => typeof v === 'object');
  if (serverEntries.length) {
    const serverCards = serverEntries.map(([name, s]) => {
      const sslBadge = s['ssl'] === '1' ? '<span class="sabnzbd-chip">TLS</span>' : '';
      return `<div class="sabnzbd-server">
<div class="sabnzbd-server-title">${esc(name)}${sslBadge}</div>
<ul class="sabnzbd-list">
${s['host'] ? `<li class="sabnzbd-row"><code class="sabnzbd-key">host</code><span class="sabnzbd-val">${esc(s['host'])}</span></li>` : ''}
${s['port'] ? `<li class="sabnzbd-row"><code class="sabnzbd-key">port</code><span class="sabnzbd-val">${esc(s['port'])}</span></li>` : ''}
${s['connections'] ? `<li class="sabnzbd-row"><code class="sabnzbd-key">connections</code><span class="sabnzbd-val">${esc(s['connections'])}</span></li>` : ''}
${s['username'] ? `<li class="sabnzbd-row"><code class="sabnzbd-key">username</code><span class="sabnzbd-val">${esc(s['username'])}</span></li>` : ''}
${s['password'] ? `<li class="sabnzbd-row"><code class="sabnzbd-key">password</code>${masked()}</li>` : ''}
</ul></div>`;
    }).join('');
    newsServersHtml = `<div class="sabnzbd-sec"><h3>News Servers</h3>${serverCards}</div>`;
  }

  // Sorting
  const sortKeys = ['tv_sort_string', 'movie_sort_string'];
  const sortRows = sortKeys.filter((k) => misc[k]).map((k) => kvRow(k, misc[k])).join('');
  const sortHtml = sortRows ? `<div class="sabnzbd-sec"><h3>Sorting</h3><div class="sabnzbd-card"><ul class="sabnzbd-list">${sortRows}</ul></div></div>` : '';

  const portTag = misc['port'] ? `<span style="font-size:13px;font-weight:400;color:var(--fg-2,#888)">:${esc(misc['port'])}</span>` : '';

  const isEmpty = !svrRows && !pathRows && !apiRows && !serverEntries.length && !sortRows;
  const emptyHtml = isEmpty ? '<p style="color:var(--fg-2,#888)">No SABnzbd configuration directives detected.</p>' : '';

  host.innerHTML = `<style>${CSS}</style>
<div class="sabnzbd-title"><span class="sabnzbd-badge">SABnzbd</span>sabnzbd.ini ${portTag}</div>
${svrHtml}${pathsHtml}${apiHtml}${newsServersHtml}${sortHtml}${emptyHtml}`;

  return { parentNode: host };
}
