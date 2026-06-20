// aria2 config renderer. Parses key=value format; # comments ignored.
// Pure text parsing — no eval, no execution.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function parseConf(text) {
  const map = Object.create(null);
  for (const line of text.split('\n')) {
    const stripped = line.replace(/#.*$/, '').trim();
    if (!stripped) continue;
    const eq = stripped.indexOf('=');
    if (eq < 1) continue;
    const key = stripped.slice(0, eq).trim();
    const val = stripped.slice(eq + 1).trim();
    if (key) map[key] = val;
  }
  return map;
}

function maskProxyUrl(url) {
  // mask password in http://user:pass@host style URLs
  return url.replace(/:\/\/([^:@]+):([^@]+)@/, '://$1:[hidden]@');
}

function chip(label, color, textColor) {
  return '<span class="aria2cfg-chip" style="display:inline-block;padding:1px 7px;border-radius:3px;background:' + color + ';color:' + (textColor || '#fff') + ';font-size:0.82em;font-weight:600;margin-right:4px">' + esc(label) + '</span>';
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'aria2cfg-doc';
  const text = intake.text || '';
  const cfg = parseConf(text);

  const badge = '<span class="aria2cfg-badge" style="display:inline-block;padding:2px 8px;border-radius:4px;background:#e65c00;color:#fff;font-weight:700;font-size:0.85em">aria2</span>';

  let html = '<header class="pj-head"><div class="pj-title">' + badge + ' <span style="font-weight:600;margin-left:6px">aria2 Download Config</span></div>'
    + '<div class="pj-meta">';
  if (cfg['max-concurrent-downloads']) html += '<span class="pj-tag">' + esc(cfg['max-concurrent-downloads']) + ' concurrent</span>';
  if (cfg['enable-rpc'] === 'true') html += '<span class="pj-tag">RPC enabled</span>';
  const hasBt = Object.keys(cfg).some((k) => k.startsWith('bt-') || k.startsWith('dht'));
  if (hasBt) html += '<span class="pj-tag">BitTorrent</span>';
  html += '</div></header>';

  // General settings card
  const hasGeneral = cfg['dir'] || cfg['max-concurrent-downloads'] || cfg['continue'] || cfg['input-file'] || cfg['save-session'];
  if (hasGeneral) {
    html += '<section class="kf-svc"><h3>General</h3><ul class="kf-list">';
    if (cfg['dir']) html += '<li class="kf-pat"><code class="ts-key">dir</code><span class="ts-doc" style="flex:1;padding-left:8px">' + esc(cfg['dir']) + '</span></li>';
    if (cfg['max-concurrent-downloads']) {
      html += '<li class="kf-pat"><code class="ts-key">max-concurrent-downloads</code>'
        + chip(cfg['max-concurrent-downloads'], '#e65c00') + '</li>';
    }
    if (cfg['continue']) {
      const yes = cfg['continue'] === 'true';
      html += '<li class="kf-pat"><code class="ts-key">continue</code>'
        + chip(yes ? 'yes' : 'no', yes ? '#2a7a2a' : '#7a2a2a') + '</li>';
    }
    if (cfg['input-file']) html += '<li class="kf-pat"><code class="ts-key">input-file</code><span class="ts-doc" style="flex:1;padding-left:8px">' + esc(cfg['input-file']) + '</span></li>';
    if (cfg['save-session']) html += '<li class="kf-pat"><code class="ts-key">save-session</code><span class="ts-doc" style="flex:1;padding-left:8px">' + esc(cfg['save-session']) + '</span></li>';
    html += '</ul></section>';
  }

  // Connection settings card
  const hasConn = cfg['split'] || cfg['max-connection-per-server'] || cfg['min-split-size'] || cfg['max-download-limit'] || cfg['max-upload-limit'];
  if (hasConn) {
    html += '<section class="kf-svc"><h3>Connection</h3><ul class="kf-list">';
    if (cfg['split']) {
      html += '<li class="kf-pat"><code class="ts-key">split</code>'
        + chip(cfg['split'] + ' connections', '#555') + '</li>';
    }
    if (cfg['max-connection-per-server']) {
      html += '<li class="kf-pat"><code class="ts-key">max-connection-per-server</code>'
        + chip(cfg['max-connection-per-server'], '#555') + '</li>';
    }
    if (cfg['min-split-size']) html += '<li class="kf-pat"><code class="ts-key">min-split-size</code><span class="ts-doc" style="flex:1;padding-left:8px">' + esc(cfg['min-split-size']) + '</span></li>';
    if (cfg['max-download-limit'] !== undefined) {
      const lim = cfg['max-download-limit'];
      html += '<li class="kf-pat"><code class="ts-key">max-download-limit</code>'
        + chip(lim === '0' ? 'unlimited' : lim, lim === '0' ? '#2a7a2a' : '#555') + '</li>';
    }
    if (cfg['max-upload-limit'] !== undefined) {
      const ulim = cfg['max-upload-limit'];
      html += '<li class="kf-pat"><code class="ts-key">max-upload-limit</code>'
        + chip(ulim === '0' ? 'unlimited' : ulim, '#555') + '</li>';
    }
    html += '</ul></section>';
  }

  // BitTorrent card
  if (hasBt) {
    html += '<section class="kf-svc"><h3>BitTorrent</h3><ul class="kf-list">';
    if (cfg['bt-enable-lpd'] !== undefined) {
      const on = cfg['bt-enable-lpd'] === 'true';
      html += '<li class="kf-pat"><code class="ts-key">bt-enable-lpd</code>'
        + chip(on ? 'on' : 'off', on ? '#2a7a2a' : '#7a2a2a') + '</li>';
    }
    if (cfg['bt-max-peers']) html += '<li class="kf-pat"><code class="ts-key">bt-max-peers</code><span class="ts-doc" style="flex:1;padding-left:8px">' + esc(cfg['bt-max-peers']) + '</span></li>';
    if (cfg['bt-seed-unverified']) html += '<li class="kf-pat"><code class="ts-key">bt-seed-unverified</code><span class="ts-doc" style="flex:1;padding-left:8px">' + esc(cfg['bt-seed-unverified']) + '</span></li>';
    if (cfg['enable-dht'] !== undefined) {
      const on = cfg['enable-dht'] === 'true';
      html += '<li class="kf-pat"><code class="ts-key">enable-dht</code>'
        + chip(on ? 'on' : 'off', on ? '#2a7a2a' : '#7a2a2a') + '</li>';
    }
    if (cfg['peer-id-prefix']) html += '<li class="kf-pat"><code class="ts-key">peer-id-prefix</code><span class="ts-doc" style="flex:1;padding-left:8px">' + esc(cfg['peer-id-prefix']) + '</span></li>';
    if (cfg['seed-ratio']) html += '<li class="kf-pat"><code class="ts-key">seed-ratio</code><span class="ts-doc" style="flex:1;padding-left:8px">' + esc(cfg['seed-ratio']) + '</span></li>';
    html += '</ul></section>';
  }

  // RPC card
  if (cfg['enable-rpc'] === 'true') {
    html += '<section class="kf-svc"><h3>RPC</h3><ul class="kf-list">';
    if (cfg['rpc-listen-port']) html += '<li class="kf-pat"><code class="ts-key">rpc-listen-port</code><span class="ts-doc" style="flex:1;padding-left:8px">' + esc(cfg['rpc-listen-port']) + '</span></li>';
    if (cfg['rpc-allow-origin-all']) html += '<li class="kf-pat"><code class="ts-key">rpc-allow-origin-all</code><span class="ts-doc" style="flex:1;padding-left:8px">' + esc(cfg['rpc-allow-origin-all']) + '</span></li>';
    if (cfg['rpc-secret']) {
      html += '<li class="kf-pat"><code class="ts-key">rpc-secret</code>'
        + '<span class="aria2cfg-chip" style="display:inline-block;padding:1px 7px;border-radius:3px;background:#555;color:#ccc;font-size:0.82em;margin-left:8px">[configured]</span></li>';
    }
    html += '</ul></section>';
  }

  // Proxy
  if (cfg['all-proxy']) {
    html += '<section class="kf-svc"><h3>Proxy</h3><ul class="kf-list">';
    html += '<li class="kf-pat"><code class="ts-key">all-proxy</code><span class="ts-doc" style="flex:1;padding-left:8px">' + esc(maskProxyUrl(cfg['all-proxy'])) + '</span></li>';
    html += '</ul></section>';
  }

  if (!hasGeneral && !hasConn && !hasBt && cfg['enable-rpc'] !== 'true') {
    html += '<p class="kf-note">No aria2 config directives detected.</p>';
  }

  host.innerHTML = html;
  return { parentNode: host };
}
