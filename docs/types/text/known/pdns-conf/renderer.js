const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

const CSS = `
.pdns-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.pdns-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0ea5e9;color:#fff;vertical-align:middle;margin-right:8px}
.pdns-title{font-size:18px;font-weight:700;margin:0 0 4px}
.pdns-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.pdns-sec{margin:12px 0}
.pdns-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px}
.pdns-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin-bottom:8px}
.pdns-row{display:flex;gap:8px;font-size:13px;padding:3px 0;border-bottom:1px solid var(--border,#f0f0f0)}
.pdns-row:last-child{border-bottom:none}
.pdns-key{color:var(--fg-2,#888);min-width:170px;flex-shrink:0;font-size:12px;font-family:ui-monospace,monospace}
.pdns-val{font-family:ui-monospace,monospace;word-break:break-all}
.pdns-chip{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:#e0f2fe;border:1px solid #7dd3fc;color:#0c4a6e;font-weight:600;margin:1px 2px}
`;

function parsePdns(text) {
  const cfg = {};
  for (const line of (text || '').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim().toLowerCase();
    const v = t.slice(eq + 1).trim();
    cfg[k] = v;
  }
  return cfg;
}

export function render(intake) {
  const cfg = parsePdns(intake.text || '');

  const get = (k) => cfg[k.toLowerCase()];
  const row = (k, v) => v != null && v !== '' ? `<div class="pdns-row"><span class="pdns-key">${esc(k)}</span><span class="pdns-val">${esc(v)}</span></div>` : '';

  const launch = get('launch') || '';
  const localAddr = get('local-address') || get('local-ipv4') || '0.0.0.0';
  const localPort = get('local-port') || '53';
  const apiEnabled = get('api') || '';
  const apiKey = get('api-key') || '';
  const webserver = get('webserver') || '';
  const webserverAddr = get('webserver-address') || '';
  const webserverPort = get('webserver-port') || '';
  const dnssec = get('default-dnssec') || get('dnssec') || '';
  const allowAxfr = get('allow-axfr-ips') || '';
  const alsoDomain = get('also-notify') || '';
  const masterEnabled = get('primary') || get('master') || '';
  const slaveEnabled = get('secondary') || get('slave') || '';
  const guardDog = get('guardian') || '';

  const networkRows = [
    row('launch (backend)', launch),
    row('local-address', localAddr),
    row('local-port', localPort),
    row('guardian', guardDog),
  ].filter(Boolean).join('');

  const apiRows = [
    apiEnabled ? row('api', apiEnabled) : '',
    apiKey ? `<div class="pdns-row"><span class="pdns-key">api-key</span><span class="pdns-val">[configured]</span></div>` : '',
    webserver ? row('webserver', webserver) : '',
    webserverAddr ? row('webserver-address', `${webserverAddr}${webserverPort ? ':' + webserverPort : ''}`) : '',
  ].filter(Boolean).join('');

  const zoneRows = [
    masterEnabled ? row('primary (master)', masterEnabled) : '',
    slaveEnabled ? row('secondary (slave)', slaveEnabled) : '',
    allowAxfr ? row('allow-axfr-ips', allowAxfr) : '',
    dnssec ? row('default-dnssec', dnssec) : '',
  ].filter(Boolean).join('');

  const host = document.createElement('div');
  host.className = 'pdns-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="pdns-title"><span class="pdns-badge">PowerDNS</span>pdns.conf</div>
<div class="pdns-sub">PowerDNS Authoritative Server configuration</div>
${networkRows ? `<div class="pdns-sec"><h3>Network</h3><div class="pdns-card">${networkRows}</div></div>` : ''}
${apiRows ? `<div class="pdns-sec"><h3>API &amp; Web</h3><div class="pdns-card">${apiRows}</div></div>` : ''}
${zoneRows ? `<div class="pdns-sec"><h3>Zone Transfer</h3><div class="pdns-card">${zoneRows}</div></div>` : ''}`;
  return { parentNode: host };
}
