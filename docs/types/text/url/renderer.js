// URL / query-string inspector — pure native URL API, zero deps.
// Returns bodyHtml for the sandboxed iframe renderer.

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const OAUTH_PARAMS = new Set(['code', 'state', 'error', 'access_token', 'refresh_token', 'token_type', 'id_token']);
const JWT_RE = /^ey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const SENSITIVE_PARAMS = /^(?:api[_-]?key|access[_-]?token|refresh[_-]?token|id[_-]?token|token|password|passwd|pass|secret|client[_-]?secret|credential|authorization|auth|code)$/i;
const TRACKING_PARAMS = new Map([
  ['utm_source', 'Campaign source'], ['utm_medium', 'Campaign medium'], ['utm_campaign', 'Campaign name'],
  ['utm_term', 'Campaign term'], ['utm_content', 'Campaign content'], ['gclid', 'Google click ID'],
  ['fbclid', 'Meta click ID'], ['msclkid', 'Microsoft click ID'], ['ref', 'Referral tag'], ['source', 'Source tag'],
]);
const SHORTENERS = new Set(['bit.ly', 't.co', 'tinyurl.com', 'goo.gl', 'ow.ly', 'buff.ly', 'is.gd', 'cutt.ly', 'rebrand.ly']);

function b64urlDecode(s) {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const b64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/');
  try { return JSON.parse(atob(b64)); } catch { return null; }
}

function extractTld(host) {
  const parts = host.split('.');
  return parts.length >= 2 ? parts.slice(-2).join('.') : host;
}

// NOTE: copy buttons carry their payload in a data-* attribute (HTML-attribute-escaped via
// esc(), read back with getAttribute()) rather than inline onclick="...('value')". HTML entity
// decoding happens BEFORE an inline event-handler attribute is compiled as JS, so escaping a
// quote as &#39; does NOT stop it from becoming a literal ' in the compiled handler and breaking
// out of the JS string — esc() alone is not safe in that context. A single delegated listener
// (installed once by copyDelegationScript()) handles every button.
function copyBtn(val) {
  return `<button class="ui-copy-btn" data-copy="${esc(val)}" title="Copy">⧉</button>`;
}

function copyDelegationScript() {
  return `<script>document.addEventListener('click',function(e){var b=e.target.closest('[data-copy]');if(b)navigator.clipboard?.writeText(b.getAttribute('data-copy'));});</script>`;
}

function renderJwt(val) {
  const parts = val.split('.');
  if (parts.length < 3) return null;
  const header = b64urlDecode(parts[0]);
  const payload = b64urlDecode(parts[1]);
  if (!header && !payload) return null;
  let rows = '';
  if (header) rows += `<tr><td class="ui-label">Header</td><td><code>${esc(JSON.stringify(header, null, 2))}</code></td></tr>`;
  if (payload) rows += `<tr><td class="ui-label">Payload</td><td><code>${esc(JSON.stringify(payload, null, 2))}</code></td></tr>`;
  if (payload && Number.isFinite(Number(payload.exp))) {
    const expires = Number(payload.exp) * 1000;
    const date = new Date(expires);
    if (Number.isFinite(date.getTime())) {
      const expired = expires <= Date.now();
      rows += `<tr><td class="ui-label">Expiry claim</td><td><span class="ui-badge ${expired ? 'ui-badge-danger' : 'ui-badge-safe'}">${expired ? 'Expired' : 'Not expired'}</span> ${esc(date.toISOString())}</td></tr>`;
    }
  }
  rows += '<tr><td class="ui-label">Verification</td><td><span class="ui-security-note">Decoded only — the signature is not verified.</span></td></tr>';
  return rows;
}

function isSensitiveParam(key) {
  return SENSITIVE_PARAMS.test(String(key || ''));
}

function redactedUrl(raw) {
  try {
    const bare = raw.startsWith('?');
    const parsed = new URL(bare ? 'https://x' + raw : raw);
    let changed = false;
    for (const key of [...parsed.searchParams.keys()]) {
      if (!isSensitiveParam(key)) continue;
      parsed.searchParams.set(key, '[hidden]'); changed = true;
    }
    if (!changed) return raw;
    return bare ? parsed.search : parsed.toString();
  } catch { return raw; }
}

function renderParams(params, rawSearch = '') {
  if (!params || [...params.entries()].length === 0) return '';
  const entries = [...params.entries()];
  let rows = `<tr><th colspan="2" class="ui-section-head">Query Parameters (${entries.length})</th></tr>`;
  const sensitiveCount = entries.filter(([key]) => isSensitiveParam(key)).length;
  if (sensitiveCount) rows += `<tr class="ui-security-row"><td colspan="2">⚠ ${sensitiveCount} sensitive-looking parameter${sensitiveCount === 1 ? ' is' : 's are'} hidden by default. Reveal only on this local device.</td></tr>`;
  const decodedNote = /(?:%[0-9a-f]{2}|\+)/i.test(rawSearch) ? ` <span class="ui-badge ui-badge-decoded">URL-decoded</span>` : '';
  for (const [k, v] of entries) {
    const isOAuth = OAUTH_PARAMS.has(k);
    const isJwt = JWT_RE.test(v);
    const tracking = TRACKING_PARAMS.get(k.toLowerCase());
    const sensitive = isSensitiveParam(k);
    let badge = '';
    if (isOAuth) badge += ` <span class="ui-badge ui-badge-oauth">OAuth</span>`;
    if (isJwt) badge += ` <span class="ui-badge ui-badge-jwt">JWT</span>`;
    if (tracking) badge += ` <span class="ui-badge ui-badge-track">${esc(tracking)}</span>`;
    if (sensitive) badge += ' <span class="ui-badge ui-badge-danger">Sensitive</span>';

    let valueHtml = sensitive
      ? `<details class="ui-secret-value"><summary>Hidden value</summary><code>${esc(v)}</code>${copyBtn(v)}</details>`
      : esc(v) + copyBtn(v);

    // URL-encoded JSON: offer to pretty-print inline
    let decoded = v;
    try { decoded = decodeURIComponent(v); } catch { /* keep v */ }
    if (decoded.startsWith('{') || decoded.startsWith('[')) {
      try {
        const pretty = JSON.stringify(JSON.parse(decoded), null, 2);
        valueHtml += `<details class="ui-pretty"><summary>Pretty-print JSON</summary><pre>${esc(pretty)}</pre></details>`;
      } catch { /* not JSON */ }
    }

    const rowClass = sensitive ? ' class="ui-sensitive-row"' : isOAuth ? ' class="ui-oauth-row"' : '';
    rows += `<tr${rowClass}><td class="ui-key">${esc(k)}${badge}</td><td class="ui-val">${valueHtml}${decodedNote}</td></tr>`;
    if (isJwt) {
      const jwtRows = renderJwt(v);
      if (jwtRows) rows += jwtRows;
    }
  }
  return rows;
}

function renderSingleUrl(raw) {
  raw = raw.trim();
  let parsed;

  // Handle bare query strings like ?foo=bar
  if (raw.startsWith('?')) {
    try { parsed = new URL('https://x' + raw); } catch { return null; }
  } else {
    try { parsed = new URL(raw); } catch { return null; }
  }

  const scheme = parsed.protocol.replace(/:$/, '');

  // mailto: special rendering
  if (scheme === 'mailto') {
    const to = parsed.pathname;
    const subject = parsed.searchParams.get('subject') || '';
    const body = parsed.searchParams.get('body') || '';
    const cc = parsed.searchParams.get('cc') || '';
    const bcc = parsed.searchParams.get('bcc') || '';
    let rows = `<tr><th colspan="2" class="ui-section-head">mailto: address</th></tr>
      <tr><td class="ui-label">To</td><td>${esc(to)}${copyBtn(to)}</td></tr>`;
    if (subject) rows += `<tr><td class="ui-label">Subject</td><td>${esc(subject)}</td></tr>`;
    if(cc) rows += `<tr><td class="ui-label">CC</td><td>${esc(cc)}</td></tr>`;
    if(bcc) rows += `<tr><td class="ui-label">BCC</td><td>${esc(bcc)}</td></tr>`;
    if (body) rows += `<tr><td class="ui-label">Body</td><td><pre class="ui-body-pre">${esc(body)}</pre></td></tr>`;
    return `<table class="ui-table"><tbody>${rows}</tbody></table>`;
  }

  // data: URI special rendering
  if (scheme === 'data') {
    const rest = raw.slice(5);
    const semi = rest.indexOf(';');
    const comma = rest.indexOf(',');
    const mime = comma > 0 ? rest.slice(0, Math.min(semi > 0 ? semi : comma, comma)) : 'text/plain';
    const isBase64 = rest.includes(';base64,');
    const dataPayload = rest.slice(comma + 1);
    let content = '';
    if (isBase64 && mime.startsWith('image/')) {
      content = `<tr><td colspan="2" class="ui-center"><img src="${esc(raw)}" style="max-width:100%;max-height:300px;image-rendering:pixelated;" alt="data: image"/></td></tr>`;
    } else if (isBase64) {
      try {
        const decoded = atob(dataPayload);
        content = `<tr><td class="ui-label">Decoded (first 500)</td><td><pre>${esc(decoded.slice(0, 500))}</pre></td></tr>`;
      } catch { /* not valid base64 */ }
    } else {
      try {
        const decoded = decodeURIComponent(dataPayload);
        content = `<tr><td class="ui-label">Content (first 500)</td><td><pre>${esc(decoded.slice(0, 500))}</pre></td></tr>`;
      } catch { /* keep raw */ }
    }
    return `<table class="ui-table"><tbody>
      <tr><th colspan="2" class="ui-section-head">data: URI</th></tr>
      <tr><td class="ui-label">MIME type</td><td>${esc(mime)}</td></tr>
      <tr><td class="ui-label">Encoding</td><td>${isBase64 ? 'base64' : 'URL-encoded'}</td></tr>
      <tr><td class="ui-label">Size</td><td>${dataPayload.length.toLocaleString()} chars</td></tr>
      ${content}
    </tbody></table>`;
  }

  const host = parsed.hostname;
  const port = parsed.port || (scheme === 'https' ? '(443)' : scheme === 'http' ? '(80)' : '');
  const pathParts = parsed.pathname.split('/').filter(Boolean);
  const fragment = parsed.hash ? parsed.hash.slice(1) : '';

  let rows = `
    <tr><th colspan="2" class="ui-section-head">URL Structure</th></tr>
    <tr><td class="ui-label">Scheme</td><td>${esc(scheme)}</td></tr>
    <tr><td class="ui-label">Host</td><td>${esc(host)}${copyBtn(host)}</td></tr>
    <tr><td class="ui-label">Port</td><td>${esc(port)}</td></tr>
    <tr><td class="ui-label">Path</td><td>${esc(parsed.pathname)}${copyBtn(parsed.pathname)}</td></tr>`;

  if (SHORTENERS.has(host.toLowerCase())) {
    rows += '<tr class="ui-security-row"><td colspan="2">Shortened URL: the final destination is unknown. No network request was made.</td></tr>';
  }

  for (let i = 0; i < pathParts.length; i++) {
    rows += `<tr><td class="ui-label ui-indent">path[${i}]</td><td>${esc(pathParts[i])}</td></tr>`;
  }

  rows += renderParams(parsed.searchParams, parsed.search);

  if (fragment) {
    rows += `<tr><th colspan="2" class="ui-section-head">Fragment</th></tr>
      <tr><td class="ui-label">Fragment</td><td>${esc(fragment)}${copyBtn(fragment)}</td></tr>`;
  }

  return `<table class="ui-table"><tbody>${rows}</tbody></table>`;
}

function renderMultiUrl(lines) {
  const urls = lines.filter((l) => /^https?:\/\//i.test(l.trim())).map((l) => l.trim());
  let html = `<div class="ui-multi-head">Multiple URLs (${urls.length})</div>`;
  html += `<table class="ui-table"><tbody><tr><th>#</th><th>URL</th><th>Host</th></tr>`;
  for (let i = 0; i < urls.length; i++) {
    let host = '';
    try { host = new URL(urls[i]).hostname; } catch {}
    html += `<tr><td class="ui-label">${i + 1}</td><td class="ui-val">${esc(redactedUrl(urls[i]))}</td><td>${esc(host)}</td></tr>`;
  }
  html += `</tbody></table>`;
  for (let i = 0; i < urls.length; i++) {
    html += `<details class="ui-url-item">
      <summary><span class="ui-url-num">#${i + 1}</span> <span class="ui-url-raw">${esc(redactedUrl(urls[i]))}</span></summary>
      <div class="ui-url-detail">${renderSingleUrl(urls[i]) || '<em>Could not parse</em>'}</div>
    </details>`;
  }
  html += `<button class="ui-copy-all-btn" data-copy="${esc(JSON.stringify(urls, null, 2))}">Copy all as JSON array</button>`;
  return html;
}

function copyAllParamsBtn(params) {
  const obj = {};
  for (const [k, v] of params.entries()) obj[k] = v;
  const json = JSON.stringify(obj, null, 2);
  return `<button class="ui-copy-all-btn" data-copy="${esc(json)}">Copy all params as JSON</button>`;
}

const CSS = `
<style>
body { font: 13px/1.5 system-ui, sans-serif; color: #1a1d21; background: #fff; margin: 0; padding: 12px; }
body.fv-dark { color: #e6e6e6; background: #1e1e1e; }
body.fv-dark .ui-table td, body.fv-dark .ui-table th { border-color: #3a3a3d; }
.ui-raw-box { display: block; font-family: monospace; font-size: 12px; background: #f4f5f7; border: 1px solid #d8dce2; border-radius: 6px; padding: 8px 12px; margin: 0 0 12px; white-space: pre-wrap; word-break: break-all; }
body.fv-dark .ui-raw-box { background: #252526; border-color: #3a3a3d; }
.ui-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
.ui-table td, .ui-table th { border: 1px solid #d8dce2; padding: 5px 10px; vertical-align: top; }
.ui-label { color: #5b6470; white-space: nowrap; font-size: 12px; width: 120px; }
.ui-indent { padding-left: 24px !important; color: #888; }
.ui-key { font-family: monospace; font-size: 12px; white-space: nowrap; }
.ui-val { font-family: monospace; font-size: 12px; word-break: break-all; }
.ui-section-head { background: #e9ebef; font-size: 12px; font-weight: 600; color: #5b6470; }
body.fv-dark .ui-section-head { background: #2d2d30; color: #9aa0a8; }
.ui-center { text-align: center; padding: 12px !important; }
.ui-oauth-row { background: rgba(79,130,230,.07); }
.ui-badge { font-size: 10px; padding: 1px 5px; border-radius: 4px; vertical-align: middle; font-weight: 600; margin-left: 4px; }
.ui-badge-oauth { background: #e3f0ff; color: #2f6feb; }
.ui-badge-jwt { background: #fff3cd; color: #664d00; }
.ui-badge-decoded { background: #e7f8ec; color: #1a7f37; }
.ui-badge-track { background: #ede9fe; color: #6d28d9; }
.ui-badge-danger { background: #fee2e2; color: #b91c1c; }
.ui-badge-safe { background: #dcfce7; color: #166534; }
body.fv-dark .ui-badge-oauth { background: #0b1220; }
body.fv-dark .ui-badge-jwt { background: #2d2400; color: #c8a000; }
body.fv-dark .ui-badge-decoded { background: #09230f; color: #56d364; }
body.fv-dark .ui-badge-track { background: #2e1065; color: #c4b5fd; }
body.fv-dark .ui-badge-danger { background: #450a0a; color: #fca5a5; }
body.fv-dark .ui-badge-safe { background: #052e16; color: #86efac; }
.ui-security-row { background: #fff7ed; color: #9a3412; font-size: 12px; }
.ui-sensitive-row { background: #fffaf0; }
.ui-secret-value summary { cursor: pointer; color: #9a3412; font-family: system-ui, sans-serif; }
.ui-security-note { color: #9a3412; }
body.fv-dark .ui-security-row, body.fv-dark .ui-sensitive-row { background: #2b1608; color: #fdba74; }
body.fv-dark .ui-secret-value summary, body.fv-dark .ui-security-note { color: #fdba74; }
.ui-copy-btn { font-size: 10px; margin-left: 4px; cursor: pointer; border: none; background: transparent; color: #5b6470; padding: 0 2px; }
.ui-copy-btn:hover { color: #2f6feb; }
.ui-copy-all-btn { font-size: 12px; padding: 4px 10px; border: 1px solid #d8dce2; border-radius: 6px; background: #f4f5f7; cursor: pointer; color: #1a1d21; margin-top: 4px; }
body.fv-dark .ui-copy-all-btn { background: #252526; border-color: #3a3a3d; color: #e6e6e6; }
.ui-pretty { margin-top: 4px; }
.ui-pretty summary { font-size: 11px; cursor: pointer; color: #5b6470; }
.ui-pretty pre { margin: 4px 0 0; font-size: 11px; max-height: 200px; overflow: auto; }
.ui-body-pre { white-space: pre-wrap; word-break: break-all; font-size: 12px; margin: 0; }
.ui-multi-head { font-weight: 600; font-size: 13px; margin-bottom: 8px; }
.ui-url-item { border: 1px solid #d8dce2; border-radius: 6px; margin-bottom: 6px; }
body.fv-dark .ui-url-item { border-color: #3a3a3d; }
.ui-url-item summary { padding: 6px 10px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 8px; }
.ui-url-num { background: #e9ebef; border-radius: 4px; padding: 0 5px; font-size: 11px; }
.ui-url-raw { font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ui-url-detail { padding: 8px; }
pre code { font-size: 11px; white-space: pre-wrap; }
</style>
`;

export async function render(intake, _ctx) {
  const text = (intake.text || '').trim();
  if (!text) return { bodyHtml: CSS + '<em>Empty</em>', hadUnsafe: false };

  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const multiUrlCount = lines.filter((l) => /^https?:\/\//i.test(l.trim())).length;

  let mainHtml;
  const safeRaw = text.split(/\r?\n/).map(redactedUrl).join('\n');
  let rawDisplay = safeRaw.length > 400 ? safeRaw.slice(0, 400) + '…' : safeRaw;

  if (multiUrlCount >= 3) {
    mainHtml = renderMultiUrl(lines);
  } else {
    const parsed = renderSingleUrl(text);
    if (parsed) {
      // If the URL has query params, add copy-all button
      let parsed2;
      try {
        const raw2 = text.startsWith('?') ? 'https://x' + text : text;
        parsed2 = new URL(raw2);
      } catch { /* ok */ }
      const extra = parsed2 && [...parsed2.searchParams.entries()].length > 1
        ? copyAllParamsBtn(parsed2.searchParams) : '';
      mainHtml = parsed + extra;
    } else {
      mainHtml = `<div style="color:#888;">Could not parse as URL.</div>`;
    }
  }

  const body = `${CSS}
    <code class="ui-raw-box">${esc(rawDisplay)}${copyBtn(text)}</code>
    ${mainHtml}
    ${copyDelegationScript()}`;

  return { bodyHtml: body, hadUnsafe: false };
}
