const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.nsqconf-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.nsqconf-doc .badge-nsq{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#23aa5a;color:#fff;vertical-align:middle;margin-right:8px;}
.nsqconf-doc .nsq-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.nsqconf-doc .nsq-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.nsqconf-doc .nsq-sec{margin:14px 0;}
.nsqconf-doc .nsq-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.nsqconf-doc .nsq-grid{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;margin:4px 0;}
.nsqconf-doc .nsq-key{color:var(--fg-2,#888);font-size:12px;white-space:nowrap;}
.nsqconf-doc .nsq-val{font:12px/1.4 ui-monospace,monospace;font-weight:600;word-break:break-all;}
.nsqconf-doc .nsq-badge{display:inline-block;padding:1px 7px;border-radius:8px;font-size:11px;font-weight:700;vertical-align:middle;}
.nsqconf-doc .nsq-on{background:#dcfce7;color:#166534;}
.nsqconf-doc .nsq-off{background:#fee2e2;color:#991b1b;}
`;

function parseKV(text) {
  const entries = {};
  for (const line of text.split('\n')) {
    // Skip comments and blank lines; match key = value or key: value
    const m = line.match(/^\s*([^#=:\s][^=:]*?)\s*[=:]\s*(.*)$/);
    if (m) entries[m[1].trim()] = m[2].trim();
  }
  return entries;
}

function kv(label, val) {
  if (val == null || val === '') return '';
  return `<span class="nsq-key">${esc(label)}</span><span class="nsq-val">${esc(val)}</span>`;
}

function kvBool(label, val) {
  if (val == null || val === '') return '';
  const isTrue = val === 'true' || val === '1' || val === 'yes';
  const cls = isTrue ? 'nsq-on' : 'nsq-off';
  return `<span class="nsq-key">${esc(label)}</span><span class="nsq-badge ${cls}">${isTrue ? 'enabled' : 'disabled'}</span>`;
}

export function render(intake) {
  const text = intake.text || '';
  const filename = (intake.name || intake.filename || '').split('/').pop() || 'nsqd.cfg';
  const cfg = parseKV(text);

  // Network section
  const networkLines = [
    kv('tcp-address', cfg['tcp-address']),
    kv('http-address', cfg['http-address']),
    kv('https-address', cfg['https-address']),
    kv('broadcast-address', cfg['broadcast-address']),
    kv('lookupd-tcp-address', cfg['lookupd-tcp-address']),
  ].filter(Boolean);

  const networkHtml = networkLines.length
    ? `<div class="nsq-sec"><h3>Network</h3><div class="nsq-grid">${networkLines.join('')}</div></div>`
    : '';

  // Storage section
  const storageLines = [
    kv('data-path', cfg['data-path']),
    kv('mem-queue-size', cfg['mem-queue-size']),
    kv('max-bytes-per-file', cfg['max-bytes-per-file']),
    kv('sync-every', cfg['sync-every']),
  ].filter(Boolean);

  const storageHtml = storageLines.length
    ? `<div class="nsq-sec"><h3>Storage</h3><div class="nsq-grid">${storageLines.join('')}</div></div>`
    : '';

  // Timeouts section
  const timeoutLines = [
    kv('msg-timeout', cfg['msg-timeout']),
    kv('req-timeout', cfg['req-timeout']),
    kv('heartbeat-interval', cfg['heartbeat-interval']),
    kv('client-timeout', cfg['client-timeout']),
    kv('sync-timeout', cfg['sync-timeout']),
  ].filter(Boolean);

  const timeoutHtml = timeoutLines.length
    ? `<div class="nsq-sec"><h3>Timeouts</h3><div class="nsq-grid">${timeoutLines.join('')}</div></div>`
    : '';

  // TLS section
  const tlsLines = [
    cfg['tls-required'] != null ? kvBool('tls-required', cfg['tls-required']) : '',
    kv('tls-cert', cfg['tls-cert']),
    kv('tls-key', cfg['tls-key']),
    kv('tls-root-ca-file', cfg['tls-root-ca-file']),
    cfg['tls-client-auth-policy'] ? kv('tls-client-auth-policy', cfg['tls-client-auth-policy']) : '',
  ].filter(Boolean);

  const tlsHtml = tlsLines.length
    ? `<div class="nsq-sec"><h3>TLS</h3><div class="nsq-grid">${tlsLines.join('')}</div></div>`
    : '';

  // Auth section
  const authLines = [
    cfg['auth-http-address'] ? kv('auth-http-address', cfg['auth-http-address']) : '',
  ].filter(Boolean);

  const authHtml = authLines.length
    ? `<div class="nsq-sec"><h3>Auth</h3><div class="nsq-grid">${authLines.join('')}</div></div>`
    : '';

  // Limits section
  const limitLines = [
    kv('max-msg-size', cfg['max-msg-size']),
    kv('max-body-size', cfg['max-body-size']),
    kv('max-channel-consumers', cfg['max-channel-consumers']),
    kv('max-req-timeout', cfg['max-req-timeout']),
    kv('max-heartbeat-interval', cfg['max-heartbeat-interval']),
  ].filter(Boolean);

  const limitsHtml = limitLines.length
    ? `<div class="nsq-sec"><h3>Limits</h3><div class="nsq-grid">${limitLines.join('')}</div></div>`
    : '';

  // subtitle
  const parts = [];
  if (cfg['tcp-address']) parts.push(`tcp ${cfg['tcp-address']}`);
  if (cfg['data-path']) parts.push(`data ${cfg['data-path']}`);

  const host = document.createElement('div');
  host.className = 'nsqconf-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="nsq-title"><span class="badge-nsq">NSQ</span>${esc(filename)}</div>
<div class="nsq-sub">${esc(parts.join(' · ') || 'NSQ distributed messaging configuration')}</div>
${networkHtml}
${storageHtml}
${timeoutHtml}
${tlsHtml}
${authHtml}
${limitsHtml}`;

  return { parentNode: host };
}
