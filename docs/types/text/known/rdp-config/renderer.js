const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.rdp-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.rdp-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0078D4;color:#fff;vertical-align:middle;margin-right:8px;}
.rdp-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.rdp-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.rdp-card{border:1px solid var(--border,#e0e0e0);border-radius:10px;padding:14px 18px;margin:0 0 14px;background:var(--bg,#fff);}
.rdp-card-title{font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 10px;}
.rdp-row{display:flex;gap:8px;align-items:baseline;padding:3px 0;font-size:13px;}
.rdp-key{color:var(--fg-2,#888);min-width:140px;flex-shrink:0;font-size:12px;font-family:ui-monospace,monospace;}
.rdp-val{font-family:ui-monospace,monospace;word-break:break-all;}
.rdp-val-text{font-family:system-ui,sans-serif;}
.rdp-redacted{color:var(--fg-2,#888);font-style:italic;}
.rdp-copy-row{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 14px;}
.rdp-copy-btn{display:inline-flex;align-items:center;gap:5px;padding:5px 12px;border-radius:6px;border:1px solid var(--border,#e0e0e0);background:var(--bg,#fff);color:var(--fg,#24292f);font-size:12px;cursor:pointer;font-family:ui-monospace,monospace;}
.rdp-copy-btn:hover{background:var(--bg-2,#f6f8fa);}
.rdp-chips{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 0;}
.rdp-chip{display:inline-block;padding:2px 9px;border-radius:8px;font-size:11px;font-weight:600;font-family:system-ui,sans-serif;}
.rdp-chip-nla{background:#dbeafe;border:1px solid #93c5fd;color:#1e3a8a;}
.rdp-chip-any{background:#f3f4f6;border:1px solid #d1d5db;color:#374151;}
.rdp-chip-on{background:#dcfce7;border:1px solid #86efac;color:#14532d;}
.rdp-chip-off{background:#f9fafb;border:1px solid #e5e7eb;color:#6b7280;}
.rdp-chip-res{background:#fef3c7;border:1px solid #fcd34d;color:#78350f;}
.rdp-sec{margin:14px 0 6px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);}
`;

function parseRdp(text) {
  const result = {};
  for (const line of (text || '').split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    const parts = t.split(':');
    if (parts.length < 3) continue;
    const key = parts[0].trim().toLowerCase();
    const type = parts[1].trim();
    const value = parts.slice(2).join(':').trim();
    result[key] = { type, value };
  }
  return result;
}

function get(parsed, key) {
  return parsed[key]?.value ?? '';
}

function isPasswordKey(key) {
  return /password|passwd|credential/i.test(key);
}

export function render(intake) {
  const parsed = parseRdp(intake.text || '');

  // Connection details
  const fullAddr = get(parsed, 'full address');
  let host = fullAddr;
  let port = '3389';
  if (fullAddr.includes(':')) {
    const lastColon = fullAddr.lastIndexOf(':');
    const possiblePort = fullAddr.slice(lastColon + 1);
    if (/^\d+$/.test(possiblePort)) {
      host = fullAddr.slice(0, lastColon);
      port = possiblePort;
    }
  }

  const username = get(parsed, 'username');
  const domain = get(parsed, 'domain');
  const displayUser = domain ? `${domain}\\${username}` : username;

  // Resolution
  const screenMode = get(parsed, 'screen mode id');
  const dw = get(parsed, 'desktopwidth');
  const dh = get(parsed, 'desktopheight');
  let resLabel = '';
  if (screenMode === '2') resLabel = 'Fullscreen';
  else if (dw && dh) resLabel = `${dw} × ${dh}`;

  // Settings chips
  const authLevel = parseInt(get(parsed, 'authentication level') || '-1', 10);
  const audioMode = get(parsed, 'audiomode');
  const redirectClipboard = get(parsed, 'redirectclipboard');
  const redirectDrives = get(parsed, 'redirectdrives');

  const chips = [];
  if (authLevel >= 2) chips.push(`<span class="rdp-chip rdp-chip-nla">NLA</span>`);
  else if (authLevel >= 0) chips.push(`<span class="rdp-chip rdp-chip-any">Auth: Any</span>`);
  if (audioMode === '0') chips.push(`<span class="rdp-chip rdp-chip-on">Audio: local</span>`);
  else if (audioMode === '1') chips.push(`<span class="rdp-chip rdp-chip-off">Audio: remote</span>`);
  else if (audioMode === '2') chips.push(`<span class="rdp-chip rdp-chip-off">Audio: off</span>`);
  if (redirectClipboard === '1') chips.push(`<span class="rdp-chip rdp-chip-on">Clipboard</span>`);
  else if (redirectClipboard === '0') chips.push(`<span class="rdp-chip rdp-chip-off">No clipboard</span>`);
  if (redirectDrives === '1') chips.push(`<span class="rdp-chip rdp-chip-on">Drives</span>`);
  else if (redirectDrives === '0') chips.push(`<span class="rdp-chip rdp-chip-off">No drives</span>`);
  if (resLabel) chips.push(`<span class="rdp-chip rdp-chip-res">${esc(resLabel)}</span>`);

  // Build copy commands
  const mstscCmd = `mstsc /v:${host}:${port}`;
  const xfreerdpCmd = username
    ? `xfreerdp /u:${displayUser} /v:${host}`
    : `xfreerdp /v:${host}`;

  // All key/value rows (filtered, redacting passwords)
  const knownKeys = new Set(['full address', 'username', 'domain', 'desktopwidth', 'desktopheight', 'screen mode id', 'session bpp', 'authentication level', 'audiomode', 'redirectclipboard', 'redirectdrives', 'prompt for credentials', 'connection type', 'networkautodetect', 'use multimon', 'enablecredsspsupport']);
  const extraRows = Object.entries(parsed)
    .filter(([k]) => !knownKeys.has(k) && k !== 'password 51')
    .map(([k, { value }]) => {
      const redact = isPasswordKey(k);
      return `<div class="rdp-row"><span class="rdp-key">${esc(k)}</span><span class="rdp-val${redact ? ' rdp-redacted' : ''}">${redact ? '[configured]' : esc(value)}</span></div>`;
    }).join('');

  const hasPassword = !!parsed['password 51'] || Object.keys(parsed).some(isPasswordKey);

  const host2 = document.createElement('div');
  host2.className = 'rdp-doc';
  host2.innerHTML = `<style>${CSS}</style>
<div class="rdp-title"><span class="rdp-badge">RDP</span>Remote Desktop Config</div>
<div class="rdp-sub">Windows Remote Desktop Protocol connection file</div>
<div class="rdp-copy-row">
  <button class="rdp-copy-btn" data-cmd="${esc(mstscCmd)}" type="button">${esc(mstscCmd)}</button>
  <button class="rdp-copy-btn" data-cmd="${esc(xfreerdpCmd)}" type="button">${esc(xfreerdpCmd)}</button>
</div>
<div class="rdp-card">
  <div class="rdp-card-title">Connection</div>
  ${host ? `<div class="rdp-row"><span class="rdp-key">host</span><span class="rdp-val">${esc(host)}</span></div>` : ''}
  ${port ? `<div class="rdp-row"><span class="rdp-key">port</span><span class="rdp-val">${esc(port)}</span></div>` : ''}
  ${username ? `<div class="rdp-row"><span class="rdp-key">user</span><span class="rdp-val">${esc(displayUser)}</span></div>` : ''}
  ${hasPassword ? `<div class="rdp-row"><span class="rdp-key">password</span><span class="rdp-val rdp-redacted">[configured]</span></div>` : ''}
</div>
${chips.length ? `<div class="rdp-sec">Settings</div><div class="rdp-chips">${chips.join('')}</div>` : ''}
${extraRows ? `<div class="rdp-sec">Additional settings</div><div class="rdp-card">${extraRows}</div>` : ''}`;

  // Wire copy buttons
  host2.querySelectorAll('.rdp-copy-btn').forEach((btn) => {
    const cmd = btn.dataset.cmd;
    btn.addEventListener('click', () => {
      navigator.clipboard?.writeText(cmd).catch(() => {});
      const orig = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = orig; }, 1500);
    });
  });

  return { parentNode: host2 };
}
