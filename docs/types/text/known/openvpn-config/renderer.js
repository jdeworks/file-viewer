const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.ovpn-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.ovpn-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#2ecc71;color:#fff;vertical-align:middle;margin-right:8px;}
.ovpn-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.ovpn-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 16px;}
.ovpn-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:12px 16px;margin-bottom:10px;}
.ovpn-card-hd{display:flex;align-items:center;gap:8px;margin-bottom:8px;font-weight:700;font-size:13px;}
.ovpn-table{width:100%;border-collapse:collapse;font-size:12px;}
.ovpn-table td{padding:3px 8px 3px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;font-family:ui-monospace,monospace;}
.ovpn-table td:first-child{color:var(--fg-2,#888);width:38%;white-space:nowrap;}
.ovpn-table tr:last-child td{border-bottom:none;}
.ovpn-tag{display:inline-block;font-size:10px;padding:1px 6px;border-radius:8px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;}
.ovpn-tag-client{background:#d4edda;color:#155724;border:1px solid #c3e6cb;}
.ovpn-tag-server{background:#cce5ff;color:#004085;border:1px solid #b8daff;}
.ovpn-tag-tls{background:#fff3cd;color:#856404;border:1px solid #ffc107;}
.ovpn-embedded{display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:2px 8px;border-radius:10px;background:#e9ecef;color:#495057;border:1px solid #ced4da;margin:2px 3px 2px 0;font-family:system-ui,sans-serif;}
.ovpn-remote{color:#6f42c1;font-family:ui-monospace,monospace;}
.ovpn-mode-client{color:#155724;font-weight:700;}
.ovpn-mode-server{color:#004085;font-weight:700;}
`;

// Embedded certificate/key block names to detect and label (never show content)
const EMBEDDED_BLOCKS = [
  { tag: 'ca',        label: 'CA certificate',    icon: '🔒' },
  { tag: 'cert',      label: 'client certificate', icon: '📄' },
  { tag: 'key',       label: 'private key',        icon: '🔑' },
  { tag: 'tls-auth',  label: 'tls-auth key',       icon: '🛡️' },
  { tag: 'tls-crypt', label: 'tls-crypt key',       icon: '🛡️' },
];

function parseOvpn(text) {
  const result = {
    mode: null,       // 'client' | 'server' | null
    remote: null,     // 'host:port'
    proto: null,
    dev: null,
    cipher: null,
    auth: null,
    compress: null,
    tlsVersionMin: null,
    authUserPass: false,
    embedded: [],     // list of block labels that are embedded
    extraOptions: [], // [key, value] pairs worth showing
  };

  // Strip embedded blocks (collect their tag names, discard content)
  let stripped = text;
  for (const { tag, label } of EMBEDDED_BLOCKS) {
    const re = new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>`, 'gi');
    if (re.test(stripped)) {
      result.embedded.push(label);
      stripped = stripped.replace(re, '');
    }
  }

  for (const raw of stripped.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) continue;

    // Bare directives
    if (/^client\s*$/.test(line)) { result.mode = 'client'; continue; }
    if (/^server\s+/.test(line) || /^server\s*$/.test(line)) {
      if (result.mode === null) result.mode = 'server';
      continue;
    }
    if (/^auth-user-pass\b/.test(line)) { result.authUserPass = true; continue; }

    // Key-value directives
    const m = line.match(/^(\S+)\s+(.*)/);
    if (!m) continue;
    const [, key, val] = m;
    const kl = key.toLowerCase();

    if (kl === 'remote' && !result.remote) {
      // remote HOST [PORT] [PROTO]
      const parts = val.trim().split(/\s+/);
      const host = parts[0];
      const port = parts[1] || '1194';
      result.remote = `${host}:${port}`;
    } else if (kl === 'proto' && !result.proto) {
      result.proto = val.trim();
    } else if (kl === 'dev' && !result.dev) {
      result.dev = val.trim();
    } else if (kl === 'cipher' && !result.cipher) {
      result.cipher = val.trim();
    } else if (kl === 'auth' && !result.auth) {
      result.auth = val.trim();
    } else if ((kl === 'compress' || kl === 'comp-lzo') && !result.compress) {
      result.compress = val.trim() || key.toLowerCase();
    } else if (kl === 'tls-version-min' && !result.tlsVersionMin) {
      result.tlsVersionMin = val.trim();
    }
  }

  return result;
}

export function render(intake) {
  const text = intake.text || '';
  const parsed = parseOvpn(text);

  const modeLabel = parsed.mode === 'client'
    ? `<span class="ovpn-tag ovpn-tag-client">client</span>`
    : parsed.mode === 'server'
      ? `<span class="ovpn-tag ovpn-tag-server">server</span>`
      : '';

  const modeClass = parsed.mode === 'client' ? 'ovpn-mode-client' : parsed.mode === 'server' ? 'ovpn-mode-server' : '';
  const modeText = parsed.mode ? `<span class="${modeClass}">${esc(parsed.mode)}</span> mode` : 'unknown mode';

  // Main settings table rows
  const rows = [];
  if (parsed.remote) rows.push(`<tr><td>remote</td><td><span class="ovpn-remote">${esc(parsed.remote)}</span></td></tr>`);
  if (parsed.proto)  rows.push(`<tr><td>proto</td><td>${esc(parsed.proto)}</td></tr>`);
  if (parsed.dev)    rows.push(`<tr><td>dev</td><td>${esc(parsed.dev)}</td></tr>`);
  if (parsed.cipher) rows.push(`<tr><td>cipher</td><td>${esc(parsed.cipher)}</td></tr>`);
  if (parsed.auth)   rows.push(`<tr><td>auth</td><td>${esc(parsed.auth)}</td></tr>`);
  if (parsed.compress) rows.push(`<tr><td>compress</td><td>${esc(parsed.compress)}</td></tr>`);
  if (parsed.tlsVersionMin) rows.push(`<tr><td>tls-version-min</td><td><span class="ovpn-tag ovpn-tag-tls">${esc(parsed.tlsVersionMin)}</span></td></tr>`);
  if (parsed.authUserPass) rows.push(`<tr><td>auth-user-pass</td><td>required</td></tr>`);

  const settingsCard = rows.length
    ? `<div class="ovpn-card">
  <div class="ovpn-card-hd">Settings ${modeLabel}</div>
  <table class="ovpn-table"><tbody>${rows.join('')}</tbody></table>
</div>`
    : `<div class="ovpn-card">
  <div class="ovpn-card-hd">Settings ${modeLabel}</div>
  <p style="margin:0;font-size:12px;color:var(--fg-2,#888);">No recognized directives found.</p>
</div>`;

  // Embedded credentials card
  const embeddedCard = parsed.embedded.length
    ? `<div class="ovpn-card">
  <div class="ovpn-card-hd">Embedded credentials</div>
  <p style="margin:0 0 8px;font-size:12px;color:var(--fg-2,#888);">The following are embedded in the file — content is not shown for security.</p>
  <div>${parsed.embedded.map((l) => `<span class="ovpn-embedded">embedded ${esc(l)}</span>`).join('')}</div>
</div>`
    : '';

  const subLine = parsed.remote
    ? `${modeText} &middot; ${esc(parsed.remote)}`
    : modeText;

  const host = document.createElement('div');
  host.className = 'ovpn-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="ovpn-title"><span class="ovpn-badge">OpenVPN</span>OpenVPN Configuration</div>
<div class="ovpn-sub">${subLine}</div>
${settingsCard}
${embeddedCard}`;

  return { parentNode: host };
}
