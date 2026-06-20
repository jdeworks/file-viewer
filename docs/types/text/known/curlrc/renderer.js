// curl .curlrc renderer.
// Parses "option = value" or boolean "option" lines, masks credentials.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.curlrc-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.curlrc-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#cc0000;color:#fff;vertical-align:middle;margin-right:8px}
.curlrc-title{font-size:18px;font-weight:700;margin:0 0 4px}
.curlrc-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.curlrc-sec{margin:14px 0}
.curlrc-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;border-bottom:1px solid var(--border,#e0e0e0);padding-bottom:4px}
.curlrc-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
.curlrc-chip{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.curlrc-chip-green{background:#dcfce7;border-color:#86efac;color:#15803d}
.curlrc-chip-blue{background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8}
.curlrc-chip-gray{background:#f3f4f6;border-color:#d1d5db;color:#4b5563}
.curlrc-chip-orange{background:#fff7ed;border-color:#fdba74;color:#c2410c}
.curlrc-table{width:100%;border-collapse:collapse;font-size:13px}
.curlrc-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:4px 8px;border-bottom:1px solid var(--border,#e0e0e0)}
.curlrc-table td{padding:5px 8px;border-bottom:1px solid var(--border,#f0f0f0);vertical-align:top}
.curlrc-table tr:last-child td{border-bottom:none}
.curlrc-key{font:13px/1.4 ui-monospace,monospace;font-weight:600;color:var(--fg,#24292f)}
.curlrc-val{font:12px/1.4 ui-monospace,monospace;color:var(--fg-2,#666);word-break:break-all}
.curlrc-redacted{font:12px/1.4 ui-monospace,monospace;color:var(--fg-2,#888);font-style:italic}
`;

function parseCurlrc(text) {
  const lines = text.split(/\r?\n/);
  // keys with values
  const opts = new Map();
  // boolean flags (present but no value)
  const bools = new Set();
  // repeated header entries
  const headers = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    // option = value  (with optional quotes around value)
    const kvMatch = line.match(/^([\w-]+)\s*=\s*"?([^"]*)"?$/);
    if (kvMatch) {
      const key = kvMatch[1].toLowerCase();
      const val = kvMatch[2].trim();
      if (key === 'header') {
        headers.push(val);
      } else if (!opts.has(key)) {
        opts.set(key, val);
      }
      continue;
    }

    // boolean flag (just the option name, no =)
    const boolMatch = line.match(/^([\w-]+)$/);
    if (boolMatch) {
      bools.add(boolMatch[1].toLowerCase());
    }
  }

  return { opts, bools, headers };
}

// Credential-sensitive keys — value must be masked
const SENSITIVE_KEYS = new Set(['user', 'u', 'oauth2-bearer', 'password']);

function isSensitiveKey(key) {
  return SENSITIVE_KEYS.has(key) || /password|passwd|secret|token|credential/i.test(key);
}

function boolChip(label, cls = 'curlrc-chip-green') {
  return `<span class="curlrc-chip ${cls}">${esc(label)}</span>`;
}

function valChip(label, val, cls = 'curlrc-chip-gray') {
  return `<span class="curlrc-chip ${cls}">${esc(label)}: ${esc(val)}</span>`;
}

export function render(intake) {
  const text = intake.text || '';
  const { opts, bools, headers } = parseCurlrc(text);

  const parts = [];

  // Network card
  const netChips = [];
  const followsRedirects = bools.has('location') || bools.has('follow') || opts.has('location') || opts.has('follow');
  if (followsRedirects) netChips.push(boolChip('follow redirects'));
  const maxRedirs = opts.get('max-redirs');
  if (maxRedirs) netChips.push(valChip('max-redirs', maxRedirs));
  const retry = opts.get('retry');
  if (retry) netChips.push(valChip('retry', retry, 'curlrc-chip-blue'));
  const retryDelay = opts.get('retry-delay');
  if (retryDelay) netChips.push(valChip('retry-delay', retryDelay + 's'));
  const maxTime = opts.get('max-time');
  if (maxTime) netChips.push(valChip('max-time', maxTime + 's'));
  const connTimeout = opts.get('connect-timeout');
  if (connTimeout) netChips.push(valChip('connect-timeout', connTimeout + 's'));
  const speedLimit = opts.get('speed-limit');
  if (speedLimit) netChips.push(valChip('speed-limit', speedLimit));
  const speedTime = opts.get('speed-time');
  if (speedTime) netChips.push(valChip('speed-time', speedTime + 's'));
  if (netChips.length) {
    parts.push(`<div class="curlrc-sec"><h3>Network</h3><div class="curlrc-chips">${netChips.join('')}</div></div>`);
  }

  // HTTP card
  const httpChips = [];
  const ua = opts.get('user-agent');
  if (ua) {
    const display = ua.length > 40 ? ua.slice(0, 40) + '…' : ua;
    httpChips.push(`<span class="curlrc-chip curlrc-chip-gray" title="${esc(ua)}">user-agent: ${esc(display)}</span>`);
  }
  if (bools.has('compressed')) httpChips.push(boolChip('compressed'));
  if (bools.has('http2') || opts.has('http2')) httpChips.push(boolChip('http2', 'curlrc-chip-blue'));
  if (bools.has('http3') || opts.has('http3')) httpChips.push(boolChip('http3', 'curlrc-chip-blue'));
  // Show added headers, masking Authorization values
  for (const h of headers) {
    let display = h;
    if (/^authorization:/i.test(h)) display = h.replace(/:.+$/, ': [configured]');
    httpChips.push(`<span class="curlrc-chip curlrc-chip-gray">header: ${esc(display)}</span>`);
  }
  if (httpChips.length) {
    parts.push(`<div class="curlrc-sec"><h3>HTTP</h3><div class="curlrc-chips">${httpChips.join('')}</div></div>`);
  }

  // Security card
  const secRows = [];
  const capath = opts.get('capath');
  if (capath) secRows.push(`<tr><td class="curlrc-key">capath</td><td><span class="curlrc-val">${esc(capath)}</span></td></tr>`);
  const cacert = opts.get('cacert');
  if (cacert) secRows.push(`<tr><td class="curlrc-key">cacert</td><td><span class="curlrc-val">${esc(cacert)}</span></td></tr>`);
  const cert = opts.get('cert');
  if (cert) secRows.push(`<tr><td class="curlrc-key">cert</td><td><span class="curlrc-val">${esc(cert)}</span></td></tr>`);
  const key = opts.get('key');
  if (key) secRows.push(`<tr><td class="curlrc-key">key</td><td><span class="curlrc-val">${esc(key)}</span></td></tr>`);
  const keyType = opts.get('key-type');
  if (keyType) secRows.push(`<tr><td class="curlrc-key">key-type</td><td><span class="curlrc-chip curlrc-chip-gray">${esc(keyType)}</span></td></tr>`);
  if (bools.has('insecure') || opts.has('insecure')) {
    secRows.push(`<tr><td class="curlrc-key">insecure</td><td><span class="curlrc-chip curlrc-chip-orange">TLS verification disabled</span></td></tr>`);
  }
  if (secRows.length) {
    parts.push(`<div class="curlrc-sec"><h3>Security</h3><table class="curlrc-table"><tbody>${secRows.join('')}</tbody></table></div>`);
  }

  // Auth card — mask all credential values
  const authKeys = ['user', 'u', 'oauth2-bearer'];
  const authPresent = authKeys.filter(k => opts.has(k) || bools.has(k));
  // also catch any option key that looks password-like
  for (const [k] of opts) {
    if (isSensitiveKey(k) && !authPresent.includes(k)) authPresent.push(k);
  }
  if (authPresent.length) {
    const authChips = authPresent.map(k =>
      `<span class="curlrc-chip curlrc-chip-gray">${esc(k)}: <span class="curlrc-redacted">[configured]</span></span>`
    );
    parts.push(`<div class="curlrc-sec"><h3>Authentication</h3><div class="curlrc-chips">${authChips.join('')}</div></div>`);
  }

  // Proxy card
  const proxy = opts.get('proxy') || opts.get('x');
  const socks5 = opts.get('socks5');
  const noProxy = opts.get('noproxy');
  if (proxy || socks5 || noProxy) {
    const proxyChips = [];
    const maskProxy = (p) => p.replace(/(:\/\/)[^@]+@/, '$1[credentials]@');
    if (proxy) proxyChips.push(`<span class="curlrc-chip curlrc-chip-gray">proxy: ${esc(maskProxy(proxy))}</span>`);
    if (socks5) proxyChips.push(`<span class="curlrc-chip curlrc-chip-gray">socks5: ${esc(maskProxy(socks5))}</span>`);
    if (noProxy) proxyChips.push(`<span class="curlrc-chip curlrc-chip-gray">noproxy: ${esc(noProxy)}</span>`);
    parts.push(`<div class="curlrc-sec"><h3>Proxy</h3><div class="curlrc-chips">${proxyChips.join('')}</div></div>`);
  }

  // Output card
  const outChips = [];
  if (bools.has('silent') || opts.has('silent')) outChips.push(boolChip('silent', 'curlrc-chip-gray'));
  if (bools.has('show-error') || opts.has('show-error')) outChips.push(boolChip('show-error', 'curlrc-chip-gray'));
  if (bools.has('verbose') || opts.has('verbose')) outChips.push(boolChip('verbose', 'curlrc-chip-gray'));
  const output = opts.get('output');
  if (output) outChips.push(valChip('output', output));
  const remoteName = bools.has('remote-name') || opts.has('remote-name');
  if (remoteName) outChips.push(boolChip('remote-name'));
  if (outChips.length) {
    parts.push(`<div class="curlrc-sec"><h3>Output</h3><div class="curlrc-chips">${outChips.join('')}</div></div>`);
  }

  // Build subtitle
  const subParts = [];
  if (followsRedirects) subParts.push('follows redirects');
  if (retry) subParts.push(`retry: ${retry}`);
  if (maxTime) subParts.push(`max-time: ${maxTime}s`);
  const sub = subParts.join(' · ') || 'curl default configuration';

  const host = document.createElement('div');
  host.className = 'curlrc-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="curlrc-title"><span class="curlrc-badge">curl</span>curl Defaults</div>
<div class="curlrc-sub">${esc(sub)}</div>
${parts.join('')}`;

  return { parentNode: host };
}
