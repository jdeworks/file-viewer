const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const REDACT_KEYS = new Set([
  'access_key_id', 'secret_access_key', 'password', 'password2',
  'client_secret', 'token', 'refresh_token', 'auth_url', 'token_url',
]);

const TYPE_COLORS = {
  s3: '#e67e22',
  drive: '#4285f4',
  dropbox: '#0061ff',
  onedrive: '#0078d4',
  b2: '#8e44ad',
  sftp: '#27ae60',
  local: '#7f8c8d',
  crypt: '#c0392b',
  ftp: '#16a085',
  azureblob: '#0078d4',
  swift: '#d32f2f',
  box: '#0070d8',
  mega: '#d62d20',
  webdav: '#5d4037',
  alias: '#455a64',
  union: '#455a64',
};

const CSS = `
.rclonecfg-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.rclonecfg-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1a2a6c;color:#fff;vertical-align:middle;margin-right:8px;}
.rclonecfg-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.rclonecfg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.rclonecfg-remote{margin:10px 0;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.rclonecfg-remote-hd{padding:8px 14px;background:var(--bg-2,#f6f8fa);display:flex;align-items:center;gap:8px;cursor:pointer;user-select:none;}
.rclonecfg-remote-hd:hover{background:var(--bg-3,#eaeef2);}
.rclonecfg-remote-name{font-size:13px;font-weight:600;font-family:ui-monospace,monospace;flex:1;}
.rclonecfg-type-chip{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;color:#fff;}
.rclonecfg-chip{display:inline-block;padding:1px 7px;border-radius:8px;font-size:11px;font-weight:500;background:var(--bg-3,#eaeef2);color:var(--fg,#24292f);margin:1px 2px;}
.rclonecfg-arrow{font-size:10px;color:var(--fg-2,#888);transition:transform .15s;}
.rclonecfg-arrow.open{transform:rotate(90deg);}
.rclonecfg-body{padding:10px 14px;}
.rclonecfg-row{display:flex;gap:8px;flex-wrap:wrap;align-items:baseline;padding:3px 0;font-size:12px;}
.rclonecfg-key{font-family:ui-monospace,monospace;color:var(--fg-2,#888);min-width:160px;}
.rclonecfg-val{font-family:ui-monospace,monospace;word-break:break-all;}
.rclonecfg-redacted{color:var(--fg-2,#888);font-style:italic;}
.rclonecfg-divider{border:none;border-top:1px solid var(--border,#e0e0e0);margin:6px 0;}
`;

function parseRcloneConf(text) {
  const remotes = [];
  let current = null;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) continue;
    const sec = line.match(/^\[([^\]]+)\]$/);
    if (sec) {
      current = { name: sec[1], pairs: [] };
      remotes.push(current);
      continue;
    }
    if (current) {
      const kv = line.match(/^([^=]+)=(.*)/);
      if (kv) current.pairs.push([kv[1].trim(), kv[2].trim()]);
    }
  }
  return remotes;
}

function typeChip(type) {
  const color = TYPE_COLORS[type] || '#555';
  return `<span class="rclonecfg-type-chip" style="background:${color}">${esc(type)}</span>`;
}

function chip(label) {
  return `<span class="rclonecfg-chip">${esc(label)}</span>`;
}

function renderRemote(remote, idx) {
  const pairMap = Object.fromEntries(remote.pairs);
  const type = pairMap['type'] || '';

  // Build provider-specific info rows
  const infoRows = [];

  // Always show type
  // (type chip shown in header)

  // S3-specific
  if (type === 's3') {
    if (pairMap['provider']) infoRows.push(['provider', chip(pairMap['provider'])]);
    if (pairMap['region']) infoRows.push(['region', chip(pairMap['region'])]);
    if (pairMap['location_constraint']) infoRows.push(['location_constraint', esc(pairMap['location_constraint'])]);
    if (pairMap['bucket_acl']) infoRows.push(['bucket_acl', chip(pairMap['bucket_acl'])]);
    if (pairMap['storage_class']) infoRows.push(['storage_class', chip(pairMap['storage_class'])]);
  }

  // Google Drive
  if (type === 'drive') {
    if (pairMap['client_id']) infoRows.push(['client_id', esc(pairMap['client_id'])]);
    if (pairMap['scope']) infoRows.push(['scope', chip(pairMap['scope'])]);
    if (pairMap['root_folder_id']) infoRows.push(['root_folder_id', esc(pairMap['root_folder_id'])]);
  }

  // Dropbox
  if (type === 'dropbox') {
    if (pairMap['client_id']) infoRows.push(['client_id', esc(pairMap['client_id'])]);
    if (pairMap['chunk_size']) infoRows.push(['chunk_size', chip(pairMap['chunk_size'])]);
  }

  // SFTP
  if (type === 'sftp') {
    if (pairMap['host']) infoRows.push(['host', esc(pairMap['host'])]);
    if (pairMap['user']) infoRows.push(['user', esc(pairMap['user'])]);
    if (pairMap['port']) infoRows.push(['port', chip(pairMap['port'])]);
    if (pairMap['key_file']) infoRows.push(['key_file', esc(pairMap['key_file'])]);
    if (pairMap['shell_type']) infoRows.push(['shell_type', chip(pairMap['shell_type'])]);
  }

  // crypt
  if (type === 'crypt') {
    if (pairMap['remote']) infoRows.push(['remote', esc(pairMap['remote'])]);
    if (pairMap['filename_encryption']) infoRows.push(['filename_encryption', chip(pairMap['filename_encryption'])]);
    if (pairMap['directory_name_encryption']) infoRows.push(['directory_name_encryption', chip(pairMap['directory_name_encryption'])]);
  }

  // Redacted keys
  const redactedKeys = remote.pairs
    .filter(([k]) => REDACT_KEYS.has(k))
    .map(([k]) => k);

  const rowsHtml = infoRows.map(([k, vHtml]) =>
    `<div class="rclonecfg-row"><span class="rclonecfg-key">${esc(k)}</span><span class="rclonecfg-val">${vHtml}</span></div>`
  ).join('');

  const redactHtml = redactedKeys.length
    ? `<hr class="rclonecfg-divider"><div class="rclonecfg-row"><span class="rclonecfg-key">${redactedKeys.map(esc).join(', ')}</span><span class="rclonecfg-val rclonecfg-redacted">[configured]</span></div>`
    : '';

  const openClass = idx === 0 ? ' open' : '';
  const bodyStyle = idx === 0 ? '' : ' style="display:none"';

  return `<div class="rclonecfg-remote">
  <div class="rclonecfg-remote-hd" onclick="(function(el){var b=el.nextElementSibling;var a=el.querySelector('.rclonecfg-arrow');var o=b.style.display==='none';b.style.display=o?'':'none';a.classList.toggle('open',o);})(this)">
    <span class="rclonecfg-remote-name">[${esc(remote.name)}]</span>
    ${type ? typeChip(type) : ''}
    <span class="rclonecfg-arrow${openClass}">▶</span>
  </div>
  <div class="rclonecfg-body"${bodyStyle}>
    ${rowsHtml || '<span style="color:var(--fg-2,#888);font-size:12px;">No additional info.</span>'}
    ${redactHtml}
  </div>
</div>`;
}

export function render(intake) {
  const text = intake.text || '';
  const remotes = parseRcloneConf(text);

  const remotesHtml = remotes.map((r, i) => renderRemote(r, i)).join('');

  const host = document.createElement('div');
  host.className = 'rclonecfg-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="rclonecfg-title"><span class="rclonecfg-badge">rclone</span>rclone Remotes</div>
<div class="rclonecfg-sub">${remotes.length} remote${remotes.length !== 1 ? 's' : ''} configured</div>
${remotesHtml || '<p style="color:var(--fg-2,#888);font-size:13px;">No remotes found.</p>'}`;
  return { parentNode: host };
}
