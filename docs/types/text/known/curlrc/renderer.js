// curl .curlrc renderer.
// Parses "option = value" or boolean "option" lines, masks credentials.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.curlrccfg-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.curlrccfg-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#003366;color:#fff;vertical-align:middle;margin-right:8px}
.curlrccfg-title{font-size:18px;font-weight:700;margin:0 0 4px}
.curlrccfg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.curlrccfg-sec{margin:14px 0}
.curlrccfg-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;border-bottom:1px solid var(--border,#e0e0e0);padding-bottom:4px}
.curlrccfg-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
.curlrccfg-chip{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.curlrccfg-chip-green{background:#dcfce7;border-color:#86efac;color:#15803d}
.curlrccfg-chip-blue{background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8}
.curlrccfg-chip-gray{background:#f3f4f6;border-color:#d1d5db;color:#4b5563}
.curlrccfg-chip-orange{background:#fff7ed;border-color:#fdba74;color:#c2410c}
.curlrccfg-table{width:100%;border-collapse:collapse;font-size:13px}
.curlrccfg-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:4px 8px;border-bottom:1px solid var(--border,#e0e0e0)}
.curlrccfg-table td{padding:5px 8px;border-bottom:1px solid var(--border,#f0f0f0);vertical-align:top}
.curlrccfg-table tr:last-child td{border-bottom:none}
.curlrccfg-key{font:13px/1.4 ui-monospace,monospace;font-weight:600;color:var(--fg,#24292f)}
.curlrccfg-val{font:12px/1.4 ui-monospace,monospace;color:var(--fg-2,#666);word-break:break-all}
.curlrccfg-redacted{font:12px/1.4 ui-monospace,monospace;color:var(--fg-2,#888);font-style:italic}
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

function boolChip(label, cls = 'curlrccfg-chip-green') {
  return `<span class="curlrccfg-chip ${cls}">${esc(label)}</span>`;
}

function valChip(label, val, cls = 'curlrccfg-chip-gray') {
  return `<span class="curlrccfg-chip ${cls}">${esc(label)}: ${esc(val)}</span>`;
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
  if (retry) netChips.push(valChip('retry', retry, 'curlrccfg-chip-blue'));
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
    parts.push(`<div class="curlrccfg-sec"><h3>Network</h3><div class="curlrccfg-chips">${netChips.join('')}</div></div>`);
  }

  // HTTP card
  const httpChips = [];
  const ua = opts.get('user-agent');
  if (ua) {
    const display = ua.length > 40 ? ua.slice(0, 40) + '…' : ua;
    httpChips.push(`<span class="curlrccfg-chip curlrccfg-chip-gray" title="${esc(ua)}">user-agent: ${esc(display)}</span>`);
  }
  if (bools.has('compressed')) httpChips.push(boolChip('compressed'));
  if (bools.has('http2') || opts.has('http2')) httpChips.push(boolChip('http2', 'curlrccfg-chip-blue'));
  if (bools.has('http3') || opts.has('http3')) httpChips.push(boolChip('http3', 'curlrccfg-chip-blue'));
  // Show added headers, masking Authorization values
  for (const h of headers) {
    let display = h;
    if (/^authorization:/i.test(h)) display = h.replace(/:.+$/, ': [configured]');
    httpChips.push(`<span class="curlrccfg-chip curlrccfg-chip-gray">header: ${esc(display)}</span>`);
  }
  if (httpChips.length) {
    parts.push(`<div class="curlrccfg-sec"><h3>HTTP</h3><div class="curlrccfg-chips">${httpChips.join('')}</div></div>`);
  }

  // Security card
  const secRows = [];
  const capath = opts.get('capath');
  if (capath) secRows.push(`<tr><td class="curlrccfg-key">capath</td><td><span class="curlrccfg-val">${esc(capath)}</span></td></tr>`);
  const cacert = opts.get('cacert');
  if (cacert) secRows.push(`<tr><td class="curlrccfg-key">cacert</td><td><span class="curlrccfg-val">${esc(cacert)}</span></td></tr>`);
  const cert = opts.get('cert');
  if (cert) secRows.push(`<tr><td class="curlrccfg-key">cert</td><td><span class="curlrccfg-val">${esc(cert)}</span></td></tr>`);
  const key = opts.get('key');
  if (key) secRows.push(`<tr><td class="curlrccfg-key">key</td><td><span class="curlrccfg-val">${esc(key)}</span></td></tr>`);
  const keyType = opts.get('key-type');
  if (keyType) secRows.push(`<tr><td class="curlrccfg-key">key-type</td><td><span class="curlrccfg-chip curlrccfg-chip-gray">${esc(keyType)}</span></td></tr>`);
  if (bools.has('insecure') || opts.has('insecure')) {
    secRows.push(`<tr><td class="curlrccfg-key">insecure</td><td><span class="curlrccfg-chip curlrccfg-chip-orange">TLS verification disabled</span></td></tr>`);
  }
  if (secRows.length) {
    parts.push(`<div class="curlrccfg-sec"><h3>Security</h3><table class="curlrccfg-table"><tbody>${secRows.join('')}</tbody></table></div>`);
  }

  // Auth card
  if (opts.has('user') || opts.has('u')) {
    parts.push(`<div class="curlrccfg-sec"><h3>Authentication</h3><div class="curlrccfg-chips"><span class="curlrccfg-chip curlrccfg-chip-gray">user: <span class="curlrccfg-redacted">[configured]</span></span></div></div>`);
  }

  // Proxy card
  const proxy = opts.get('proxy') || opts.get('x');
  if (proxy) {
    const maskedProxy = proxy.replace(/(:\/\/)[^@]+@/, '$1[credentials]@');
    parts.push(`<div class="curlrccfg-sec"><h3>Proxy</h3><div class="curlrccfg-chips"><span class="curlrccfg-chip curlrccfg-chip-gray">${esc(maskedProxy)}</span></div></div>`);
  }

  // Build subtitle
  const subParts = [];
  if (followsRedirects) subParts.push('follows redirects');
  if (retry) subParts.push(`retry: ${retry}`);
  if (maxTime) subParts.push(`max-time: ${maxTime}s`);
  const sub = subParts.join(' · ') || 'curl default configuration';

  const host = document.createElement('div');
  host.className = 'curlrccfg-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="curlrccfg-title"><span class="curlrccfg-badge">curl</span>curl Defaults</div>
<div class="curlrccfg-sub">${esc(sub)}</div>
${parts.join('')}`;

  return { parentNode: host };
}
