const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.stunnelcfg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.stunnelcfg-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#2B2D42;color:#fff;vertical-align:middle;margin-right:8px;}
.stunnelcfg-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.stunnelcfg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.stunnelcfg-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:12px 16px;margin-bottom:10px;}
.stunnelcfg-card-hd{font-weight:700;font-size:13px;margin-bottom:8px;display:flex;align-items:center;gap:6px;}
.stunnelcfg-table{width:100%;border-collapse:collapse;font-size:12px;}
.stunnelcfg-table td{padding:3px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.stunnelcfg-table td:first-child{font-family:ui-monospace,monospace;color:var(--fg-2,#888);width:40%;white-space:nowrap;padding-right:8px;}
.stunnelcfg-table td:last-child{font-family:ui-monospace,monospace;word-break:break-word;}
.stunnelcfg-table tr:last-child td{border-bottom:none;}
.stunnelcfg-tunnels-table{width:100%;border-collapse:collapse;font-size:12px;margin-top:4px;}
.stunnelcfg-tunnels-table th{text-align:left;padding:5px 10px;background:var(--bg-3,#eaeef2);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);}
.stunnelcfg-tunnels-table td{padding:6px 10px;border-top:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;font-size:12px;vertical-align:middle;}
.stunnelcfg-tunnels-table tr:first-child td{border-top:none;}
.stunnelcfg-tag{display:inline-flex;align-items:center;font-size:10px;font-weight:700;padding:1px 7px;border-radius:8px;text-transform:uppercase;letter-spacing:.03em;}
.stunnelcfg-tag-client{background:#cce5ff;color:#004085;border:1px solid #b8daff;}
.stunnelcfg-tag-server{background:#d4edda;color:#155724;border:1px solid #c3e6cb;}
.stunnelcfg-path{color:var(--fg-2,#888);font-size:11px;}
.stunnelcfg-addr{color:#0969da;}
.stunnelcfg-connect{color:#6f42c1;}
`;

function parseStunnelConf(text) {
  const global = {};
  const tunnels = [];
  let curTunnel = null;

  for (const raw of text.split('\n')) {
    // strip inline comments (; and #)
    const line = raw.replace(/\s*[;#].*$/, '').trim();
    if (!line) continue;

    const secMatch = line.match(/^\[([^\]]+)\]$/);
    if (secMatch) {
      curTunnel = { name: secMatch[1], entries: {} };
      tunnels.push(curTunnel);
      continue;
    }

    const kvMatch = line.match(/^([^=]+?)\s*=\s*(.*)/);
    if (kvMatch) {
      const k = kvMatch[1].trim();
      const v = kvMatch[2].trim();
      if (curTunnel) {
        curTunnel.entries[k.toLowerCase()] = v;
        curTunnel.entries[`_raw_${k.toLowerCase()}`] = k; // preserve original case
      } else {
        global[k.toLowerCase()] = v;
        global[`_raw_${k.toLowerCase()}`] = k;
      }
    }
  }

  return { global, tunnels };
}

export function render(intake) {
  const { global, tunnels } = parseStunnelConf(intake.text || '');

  // Global settings
  const cert = global['cert'];
  const key = global['key'];
  const cafile = global['cafile'];
  const capath = global['capath'];
  const verify = global['verify'];
  const sslVersion = global['sslversion'];
  const ciphers = global['ciphers'];
  const pid = global['pid'];
  const debug = global['debug'];
  const output = global['output'];

  const globalEntries = [
    cert ? ['cert', cert] : null,
    key ? ['key', key] : null,
    cafile ? ['CAfile', cafile] : null,
    capath ? ['CApath', capath] : null,
    verify ? ['verify', verify] : null,
    sslVersion ? ['sslVersion', sslVersion] : null,
    ciphers ? ['ciphers', ciphers] : null,
    pid ? ['pid', pid] : null,
    debug ? ['debug', debug] : null,
    output ? ['output', output] : null,
  ].filter(Boolean);

  const globalRows = globalEntries
    .map(([k, v]) => `<tr><td>${esc(k)}</td><td><span class="stunnelcfg-path">${esc(v)}</span></td></tr>`)
    .join('');

  // Tunnels table
  const tunnelRows = tunnels.map((t) => {
    const isClient = (t.entries['client'] || '').toLowerCase() === 'yes';
    const accept = t.entries['accept'] || '';
    const connect = t.entries['connect'] || '';
    const modeTag = isClient
      ? `<span class="stunnelcfg-tag stunnelcfg-tag-client">client</span>`
      : `<span class="stunnelcfg-tag stunnelcfg-tag-server">server</span>`;
    return `<tr>
  <td><strong>${esc(t.name)}</strong></td>
  <td>${modeTag}</td>
  <td><span class="stunnelcfg-addr">${esc(accept)}</span></td>
  <td><span class="stunnelcfg-connect">${esc(connect)}</span></td>
</tr>`;
  }).join('');

  const tunCount = tunnels.length;
  const clientCount = tunnels.filter((t) => (t.entries['client'] || '').toLowerCase() === 'yes').length;
  const serverCount = tunCount - clientCount;

  const subParts = [];
  if (tunCount) subParts.push(`${tunCount} tunnel${tunCount !== 1 ? 's' : ''}`);
  if (clientCount) subParts.push(`${clientCount} client`);
  if (serverCount) subParts.push(`${serverCount} server`);

  const host = document.createElement('div');
  host.className = 'stunnelcfg-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="stunnelcfg-title"><span class="stunnelcfg-badge">stunnel</span>SSL/TLS Tunnel Configuration</div>
<div class="stunnelcfg-sub">${subParts.join(' · ') || 'stunnel configuration'}</div>
${globalRows ? `<div class="stunnelcfg-card">
  <div class="stunnelcfg-card-hd">🔐 Global Settings</div>
  <table class="stunnelcfg-table"><tbody>${globalRows}</tbody></table>
</div>` : ''}
${tunCount ? `<div class="stunnelcfg-card">
  <div class="stunnelcfg-card-hd">🔗 Tunnels</div>
  <table class="stunnelcfg-tunnels-table">
    <thead><tr><th>Name</th><th>Mode</th><th>Accept (local)</th><th>Connect (remote)</th></tr></thead>
    <tbody>${tunnelRows}</tbody>
  </table>
</div>` : ''}
${!tunCount && !globalRows ? '<p style="color:var(--fg-2,#888);font-size:13px;">No stunnel configuration found.</p>' : ''}`;

  return { parentNode: host };
}
