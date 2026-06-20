const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

const CSS = `
.rec-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.rec-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#7c3aed;color:#fff;vertical-align:middle;margin-right:8px}
.rec-title{font-size:18px;font-weight:700;margin:0 0 4px}
.rec-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.rec-sec{margin:12px 0}
.rec-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px}
.rec-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin-bottom:8px}
.rec-row{display:flex;gap:8px;font-size:13px;padding:3px 0;border-bottom:1px solid var(--border,#f0f0f0)}
.rec-row:last-child{border-bottom:none}
.rec-key{color:var(--fg-2,#888);min-width:170px;flex-shrink:0;font-size:12px;font-family:ui-monospace,monospace}
.rec-val{font-family:ui-monospace,monospace;word-break:break-all}
.rec-chip{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:#f3e8ff;border:1px solid #d8b4fe;color:#3b0764;font-weight:600;margin:1px 2px}
`;

function parseRecursor(text) {
  const cfg = {};
  for (const line of (text || '').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 0) continue;
    cfg[t.slice(0, eq).trim().toLowerCase()] = t.slice(eq + 1).trim();
  }
  return cfg;
}

export function render(intake) {
  const cfg = parseRecursor(intake.text || '');
  const get = (k) => cfg[k.toLowerCase()] || '';
  const row = (k, v) => v ? `<div class="rec-row"><span class="rec-key">${esc(k)}</span><span class="rec-val">${esc(v)}</span></div>` : '';

  const localAddr = get('local-address') || '127.0.0.1';
  const localPort = get('local-port') || '53';
  const allowFrom = get('allow-from') || '';
  const forwardZones = get('forward-zones') || get('forward-zones-file') || '';
  const apiEnabled = get('api-readonly') || get('api') || '';
  const apiKey = get('api-key') || '';
  const webserver = get('webserver') || '';
  const webserverAddr = get('webserver-address') || '';
  const cacheSize = get('max-cache-entries') || '';
  const threads = get('threads') || '';
  const quietEnabled = get('quiet') || '';
  const rpz = get('rpz') || '';
  const dnssec = get('dnssec') || '';

  const networkRows = [
    row('local-address', localAddr),
    row('local-port', localPort),
    row('allow-from', allowFrom),
    threads ? row('threads', threads) : '',
  ].filter(Boolean).join('');

  const resolverRows = [
    row('dnssec', dnssec || 'off'),
    cacheSize ? row('max-cache-entries', cacheSize) : '',
    forwardZones ? row('forward-zones', forwardZones.slice(0, 80)) : '',
    rpz ? row('rpz', rpz.slice(0, 60)) : '',
  ].filter(Boolean).join('');

  const apiRows = [
    apiEnabled ? row('api', apiEnabled) : '',
    apiKey ? `<div class="rec-row"><span class="rec-key">api-key</span><span class="rec-val">[configured]</span></div>` : '',
    webserver ? row('webserver', webserver) : '',
    webserverAddr ? row('webserver-address', webserverAddr) : '',
  ].filter(Boolean).join('');

  const host = document.createElement('div');
  host.className = 'rec-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="rec-title"><span class="rec-badge">PowerDNS Recursor</span>recursor.conf</div>
<div class="rec-sub">PowerDNS recursive resolver configuration</div>
${networkRows ? `<div class="rec-sec"><h3>Network</h3><div class="rec-card">${networkRows}</div></div>` : ''}
${resolverRows ? `<div class="rec-sec"><h3>Resolver</h3><div class="rec-card">${resolverRows}</div></div>` : ''}
${apiRows ? `<div class="rec-sec"><h3>API &amp; Web</h3><div class="rec-card">${apiRows}</div></div>` : ''}`;
  return { parentNode: host };
}
