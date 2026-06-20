const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.htpasswd-doc{padding:16px 18px;max-width:680px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.htpasswd-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#cc0000;color:#fff;vertical-align:middle;margin-right:8px;}
.htpasswd-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.htpasswd-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.htpasswd-warning{display:flex;align-items:flex-start;gap:8px;background:#fff8e1;border:1px solid #ffe082;border-radius:6px;padding:8px 12px;margin:0 0 14px;font-size:12px;color:#5d4037;}
.htpasswd-warning-icon{flex-shrink:0;font-size:14px;line-height:1.4;}
.htpasswd-sec{margin:12px 0;}
.htpasswd-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.htpasswd-table{width:100%;border-collapse:collapse;font-size:13px;}
.htpasswd-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.htpasswd-table td{padding:6px 8px 6px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:middle;}
.htpasswd-user{font-family:ui-monospace,monospace;font-size:13px;font-weight:600;}
.htpasswd-hash-type{display:inline-block;font-size:10px;padding:1px 6px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;color:var(--fg-2,#888);}
.htpasswd-hidden{color:var(--fg-2,#888);font-size:12px;font-style:italic;}
.htpasswd-count{display:inline-block;font-size:13px;font-weight:600;padding:4px 12px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);margin-bottom:10px;}
`;

function detectHashType(hash) {
  if (!hash) return 'unknown';
  if (hash.startsWith('$apr1$')) return 'MD5 (APR)';
  if (hash.startsWith('$2y$') || hash.startsWith('$2a$') || hash.startsWith('$2b$')) return 'bcrypt';
  if (hash.startsWith('{SHA}')) return 'SHA-1';
  if (hash.startsWith('$5$')) return 'SHA-256';
  if (hash.startsWith('$6$')) return 'SHA-512';
  if (/^[a-zA-Z0-9./]{13}$/.test(hash)) return 'crypt';
  return 'unknown';
}

function parseHtpasswd(text) {
  const entries = [];
  const lines = (text || '').split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const colonIdx = line.indexOf(':');
    if (colonIdx < 1) continue;
    const username = line.slice(0, colonIdx);
    const hash = line.slice(colonIdx + 1);
    // Detect second colon for realm-based digest auth (username:realm:hash)
    const secondColon = hash.indexOf(':');
    let hashType, realm = null;
    if (secondColon >= 0) {
      realm = hash.slice(0, secondColon);
      hashType = detectHashType(hash.slice(secondColon + 1));
    } else {
      hashType = detectHashType(hash);
    }
    entries.push({ username, hashType, realm });
  }
  return entries;
}

export function render(intake) {
  const entries = parseHtpasswd(intake.text);

  const host = document.createElement('div');
  host.className = 'htpasswd-doc';

  const countLabel = entries.length === 1 ? '1 credential entry' : `${entries.length} credential entries`;

  let tableHtml = '';
  if (entries.length > 0) {
    const rows = entries.map((e) => {
      const realmCell = e.realm != null ? `<td style="font-family:ui-monospace,monospace;font-size:12px">${esc(e.realm)}</td>` : '';
      return `<tr>
        <td class="htpasswd-user">${esc(e.username)}</td>
        ${realmCell}
        <td><span class="htpasswd-hash-type">${esc(e.hashType)}</span></td>
        <td class="htpasswd-hidden">[hashed]</td>
      </tr>`;
    }).join('');
    const hasRealm = entries.some((e) => e.realm != null);
    const realmHeader = hasRealm ? '<th>Realm</th>' : '';
    tableHtml = `<div class="htpasswd-sec"><h3>Users</h3>
      <table class="htpasswd-table">
        <thead><tr><th>Username</th>${realmHeader}<th>Hash Type</th><th>Password</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }

  host.innerHTML = `<style>${CSS}</style>
<div class="htpasswd-title"><span class="htpasswd-badge">Apache Auth &#x1F512;</span></div>
<div class="htpasswd-sub">HTTP Basic/Digest authentication credential file</div>
<div class="htpasswd-warning">
  <span class="htpasswd-warning-icon">&#x26A0;&#xFE0F;</span>
  <span>Password hashes are hidden for security. Usernames are not secret and are shown below.</span>
</div>
<div class="htpasswd-count">${esc(countLabel)}</div>
${tableHtml}`;

  return { parentNode: host };
}
