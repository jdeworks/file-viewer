// wget .wgetrc renderer.
// Parses key = value pairs, masks credentials and proxy auth.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.wgetrc-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.wgetrc-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#003f7f;color:#fff;vertical-align:middle;margin-right:8px}
.wgetrc-title{font-size:18px;font-weight:700;margin:0 0 4px}
.wgetrc-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.wgetrc-sec{margin:14px 0}
.wgetrc-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;border-bottom:1px solid var(--border,#e0e0e0);padding-bottom:4px}
.wgetrc-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
.wgetrc-chip{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.wgetrc-chip-green{background:#dcfce7;border-color:#86efac;color:#15803d}
.wgetrc-chip-blue{background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8}
.wgetrc-chip-gray{background:#f3f4f6;border-color:#d1d5db;color:#4b5563}
.wgetrc-chip-orange{background:#fff7ed;border-color:#fdba74;color:#c2410c}
.wgetrc-redacted{font:12px/1.4 ui-monospace,monospace;color:var(--fg-2,#888);font-style:italic}
`;

function parseWgetrc(text) {
  const lines = text.split(/\r?\n/);
  const opts = new Map();
  const headers = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    // key = value (with optional quoted value)
    const kvMatch = line.match(/^([\w-]+)\s*=\s*"?([^"]*)"?$/);
    if (kvMatch) {
      const key = kvMatch[1].toLowerCase().replace(/-/g, '_');
      const val = kvMatch[2].trim();
      if (key === 'header') {
        headers.push(val);
      } else if (!opts.has(key)) {
        opts.set(key, val);
      }
    }
  }

  return { opts, headers };
}

export function render(intake) {
  const text = intake.text || '';
  const { opts, headers } = parseWgetrc(text);

  const parts = [];

  // Network card
  const netChips = [];
  const timeout = opts.get('timeout');
  if (timeout) netChips.push(`<span class="wgetrc-chip wgetrc-chip-gray">timeout: ${esc(timeout)}s</span>`);
  const tries = opts.get('tries');
  if (tries) netChips.push(`<span class="wgetrc-chip wgetrc-chip-blue">tries: ${esc(tries)}</span>`);
  const wait = opts.get('wait');
  if (wait) netChips.push(`<span class="wgetrc-chip wgetrc-chip-gray">wait: ${esc(wait)}s</span>`);
  const waitretry = opts.get('waitretry');
  if (waitretry) netChips.push(`<span class="wgetrc-chip wgetrc-chip-gray">waitretry: ${esc(waitretry)}s</span>`);
  const connTimeout = opts.get('connect_timeout');
  if (connTimeout) netChips.push(`<span class="wgetrc-chip wgetrc-chip-gray">connect-timeout: ${esc(connTimeout)}s</span>`);
  const dnsTimeout = opts.get('dns_timeout');
  if (dnsTimeout) netChips.push(`<span class="wgetrc-chip wgetrc-chip-gray">dns-timeout: ${esc(dnsTimeout)}s</span>`);
  const followFtp = opts.get('follow_ftp');
  if (followFtp) netChips.push(`<span class="wgetrc-chip ${followFtp === 'on' ? 'wgetrc-chip-green' : 'wgetrc-chip-gray'}">follow_ftp: ${esc(followFtp)}</span>`);
  const passiveFtp = opts.get('passive_ftp');
  if (passiveFtp) netChips.push(`<span class="wgetrc-chip wgetrc-chip-gray">passive_ftp: ${esc(passiveFtp)}</span>`);

  if (netChips.length) {
    parts.push(`<div class="wgetrc-sec"><h3>Network</h3><div class="wgetrc-chips">${netChips.join('')}</div></div>`);
  }

  // HTTP card
  const httpChips = [];
  const ua = opts.get('user_agent');
  if (ua) {
    const display = ua.length > 40 ? ua.slice(0, 40) + '…' : ua;
    httpChips.push(`<span class="wgetrc-chip wgetrc-chip-gray" title="${esc(ua)}">user_agent: ${esc(display)}</span>`);
  }
  // Custom headers — redact Authorization values
  for (const h of headers) {
    let display = h;
    if (/^authorization:/i.test(h)) display = h.replace(/:.+$/, ': [configured]');
    httpChips.push(`<span class="wgetrc-chip wgetrc-chip-gray">header: ${esc(display)}</span>`);
  }
  const referer = opts.get('referer');
  if (referer) httpChips.push(`<span class="wgetrc-chip wgetrc-chip-gray">referer: ${esc(referer)}</span>`);
  const cookies = opts.get('cookies');
  if (cookies) httpChips.push(`<span class="wgetrc-chip ${cookies === 'on' ? 'wgetrc-chip-green' : 'wgetrc-chip-gray'}">cookies: ${esc(cookies)}</span>`);
  const keepSession = opts.get('keep_session_cookies');
  if (keepSession) httpChips.push(`<span class="wgetrc-chip wgetrc-chip-gray">keep_session_cookies: ${esc(keepSession)}</span>`);
  const contentDisp = opts.get('content_disposition');
  if (contentDisp) httpChips.push(`<span class="wgetrc-chip ${contentDisp === 'on' ? 'wgetrc-chip-green' : 'wgetrc-chip-gray'}">content_disposition: ${esc(contentDisp)}</span>`);
  const serverResp = opts.get('server_response');
  if (serverResp) httpChips.push(`<span class="wgetrc-chip wgetrc-chip-gray">server_response: ${esc(serverResp)}</span>`);

  if (httpChips.length) {
    parts.push(`<div class="wgetrc-sec"><h3>HTTP</h3><div class="wgetrc-chips">${httpChips.join('')}</div></div>`);
  }

  // Output card
  const outChips = [];
  const verbose = opts.get('verbose');
  if (verbose) outChips.push(`<span class="wgetrc-chip wgetrc-chip-gray">verbose: ${esc(verbose)}</span>`);
  const quiet = opts.get('quiet');
  if (quiet) outChips.push(`<span class="wgetrc-chip wgetrc-chip-gray">quiet: ${esc(quiet)}</span>`);
  const timestamping = opts.get('timestamping');
  if (timestamping) outChips.push(`<span class="wgetrc-chip ${timestamping === 'on' ? 'wgetrc-chip-green' : 'wgetrc-chip-gray'}">timestamping: ${esc(timestamping)}</span>`);
  const continueOpt = opts.get('continue');
  if (continueOpt) outChips.push(`<span class="wgetrc-chip ${continueOpt === 'on' ? 'wgetrc-chip-green' : 'wgetrc-chip-gray'}">continue: ${esc(continueOpt)}</span>`);
  const progress = opts.get('progress');
  if (progress) {
    const progClass = progress === 'bar' ? 'wgetrc-chip-blue' : 'wgetrc-chip-gray';
    outChips.push(`<span class="wgetrc-chip ${progClass}">progress: ${esc(progress)}</span>`);
  }

  if (outChips.length) {
    parts.push(`<div class="wgetrc-sec"><h3>Output</h3><div class="wgetrc-chips">${outChips.join('')}</div></div>`);
  }

  // Auth card
  const hasUser = opts.has('http_user');
  const hasPass = opts.has('http_password');
  if (hasUser || hasPass) {
    const authChips = [];
    if (hasUser) authChips.push(`<span class="wgetrc-chip wgetrc-chip-gray">http_user: ${esc(opts.get('http_user'))}</span>`);
    if (hasPass) authChips.push(`<span class="wgetrc-chip wgetrc-chip-gray">http_password: <span class="wgetrc-redacted">[configured]</span></span>`);
    parts.push(`<div class="wgetrc-sec"><h3>Authentication</h3><div class="wgetrc-chips">${authChips.join('')}</div></div>`);
  }

  // Proxy card
  const httpProxy = opts.get('http_proxy');
  const httpsProxy = opts.get('https_proxy');
  if (httpProxy || httpsProxy) {
    const proxyChips = [];
    const maskProxy = (p) => p.replace(/(:\/\/)[^@]+@/, '$1[credentials]@');
    if (httpProxy) proxyChips.push(`<span class="wgetrc-chip wgetrc-chip-gray">http_proxy: ${esc(maskProxy(httpProxy))}</span>`);
    if (httpsProxy) proxyChips.push(`<span class="wgetrc-chip wgetrc-chip-gray">https_proxy: ${esc(maskProxy(httpsProxy))}</span>`);
    parts.push(`<div class="wgetrc-sec"><h3>Proxy</h3><div class="wgetrc-chips">${proxyChips.join('')}</div></div>`);
  }

  // Build subtitle
  const subParts = [];
  if (timeout) subParts.push(`timeout: ${timeout}s`);
  if (tries) subParts.push(`tries: ${tries}`);
  if (continueOpt === 'on') subParts.push('resume partial downloads');
  const sub = subParts.join(' · ') || 'wget default configuration';

  const host = document.createElement('div');
  host.className = 'wgetrc-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="wgetrc-title"><span class="wgetrc-badge">wget</span>wget Config</div>
<div class="wgetrc-sub">${esc(sub)}</div>
${parts.join('')}`;

  return { parentNode: host };
}
