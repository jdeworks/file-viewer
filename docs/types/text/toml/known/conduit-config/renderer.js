import { parseTOML } from '../../toml.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

const CSS = `
.conduit-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-conduit{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#7c3aed;color:#fff;vertical-align:middle;margin-right:8px}
.conduit-title{font-size:18px;font-weight:700;margin:0 0 4px}
.conduit-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.conduit-sec{margin:14px 0}
.conduit-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px}
.conduit-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff)}
.conduit-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px}
.conduit-kv-k{color:var(--fg-2,#888);min-width:180px;flex-shrink:0}
.conduit-kv-v{font-family:ui-monospace,monospace;word-break:break-all}
.conduit-masked{font-family:ui-monospace,monospace;color:var(--fg-2,#999);letter-spacing:2px}
.conduit-chip{display:inline-block;font-size:11px;padding:2px 8px;border-radius:8px;font-family:ui-monospace,monospace;font-weight:600;margin:1px}
.conduit-chip.on{background:#dcfce7;border:1px solid #86efac;color:#166534}
.conduit-chip.off{background:#fef2f2;border:1px solid #fca5a5;color:#991b1b}
.conduit-chip.info{background:#eff6ff;border:1px solid #93c5fd;color:#1e40af}
.conduit-chip.db{background:#f5f3ff;border:1px solid #c4b5fd;color:#5b21b6}
.conduit-chip.warn{background:#fef9c3;border:1px solid #fde047;color:#713f12}
.conduit-chips{display:flex;flex-wrap:wrap;gap:4px;margin-top:2px}
`;

function chip(val, cls) {
  return `<span class="conduit-chip ${cls}">${esc(val)}</span>`;
}

function boolChip(val, labelOn, labelOff) {
  return chip(val ? labelOn : labelOff, val ? 'on' : 'off');
}

function dbChip(backend) {
  if (!backend) return '';
  const cls = backend === 'rocksdb' ? 'db' : backend === 'sqlite' ? 'info' : 'warn';
  return chip(backend, cls);
}

export function render(intake) {
  let cfg = {};
  try { cfg = parseTOML(intake.text || '') || {}; } catch { cfg = {}; }
  const g = cfg.global || {};
  const tls = g.tls || {};
  const wellKnown = g.well_known || {};

  const subParts = [
    g.server_name ? g.server_name : null,
    g.port ? `:${g.port}` : null,
    g.database_backend ? g.database_backend : null,
  ].filter(Boolean).join(' · ');

  // Server section
  const serverRows = [
    g.server_name != null ? `<div class="conduit-kv"><span class="conduit-kv-k">server_name</span><span class="conduit-kv-v">${esc(g.server_name)}</span></div>` : '',
    g.port != null ? `<div class="conduit-kv"><span class="conduit-kv-k">port</span><span class="conduit-kv-v">${esc(g.port)}</span></div>` : '',
    g.address != null ? `<div class="conduit-kv"><span class="conduit-kv-k">address</span><span class="conduit-kv-v">${esc(g.address)}</span></div>` : '',
  ].filter(Boolean).join('');
  const serverHtml = serverRows ? `<div class="conduit-sec"><h3>Server</h3><div class="conduit-card">${serverRows}</div></div>` : '';

  // Database section
  const dbRows = [
    g.database_backend != null ? `<div class="conduit-kv"><span class="conduit-kv-k">database_backend</span><span class="conduit-kv-v">${dbChip(g.database_backend)}</span></div>` : '',
    g.database_path != null ? `<div class="conduit-kv"><span class="conduit-kv-k">database_path</span><span class="conduit-kv-v">${esc(g.database_path)}</span></div>` : '',
  ].filter(Boolean).join('');
  const dbHtml = dbRows ? `<div class="conduit-sec"><h3>Database</h3><div class="conduit-card">${dbRows}</div></div>` : '';

  // Federation section
  const trustedChips = Array.isArray(g.trusted_servers) && g.trusted_servers.length
    ? `<div class="conduit-kv"><span class="conduit-kv-k">trusted_servers</span><span class="conduit-kv-v"><div class="conduit-chips">${g.trusted_servers.map(s => chip(s, 'info')).join('')}</div></span></div>`
    : '';
  const fedRows = [
    g.allow_federation != null ? `<div class="conduit-kv"><span class="conduit-kv-k">allow_federation</span><span class="conduit-kv-v">${boolChip(g.allow_federation, 'enabled', 'disabled')}</span></div>` : '',
    trustedChips,
  ].filter(Boolean).join('');
  const fedHtml = fedRows ? `<div class="conduit-sec"><h3>Federation</h3><div class="conduit-card">${fedRows}</div></div>` : '';

  // Registration section
  const regRows = [
    g.allow_registration != null ? `<div class="conduit-kv"><span class="conduit-kv-k">allow_registration</span><span class="conduit-kv-v">${boolChip(g.allow_registration, 'open', 'closed')}</span></div>` : '',
    g.registration_token != null ? `<div class="conduit-kv"><span class="conduit-kv-k">registration_token</span><span class="conduit-masked">[configured]</span></div>` : '',
  ].filter(Boolean).join('');
  const regHtml = regRows ? `<div class="conduit-sec"><h3>Registration</h3><div class="conduit-card">${regRows}</div></div>` : '';

  // TLS section
  const tlsRows = [
    tls.certs != null ? `<div class="conduit-kv"><span class="conduit-kv-k">tls.certs</span><span class="conduit-kv-v">${esc(tls.certs)}</span></div>` : '',
    tls.key != null ? `<div class="conduit-kv"><span class="conduit-kv-k">tls.key</span><span class="conduit-kv-v">${esc(tls.key)}</span></div>` : '',
  ].filter(Boolean).join('');
  const tlsHtml = tlsRows ? `<div class="conduit-sec"><h3>TLS</h3><div class="conduit-card">${tlsRows}</div></div>` : '';

  // Well-known section
  const wkRows = [
    wellKnown.client != null ? `<div class="conduit-kv"><span class="conduit-kv-k">well_known.client</span><span class="conduit-kv-v">${esc(wellKnown.client)}</span></div>` : '',
    wellKnown.server != null ? `<div class="conduit-kv"><span class="conduit-kv-k">well_known.server</span><span class="conduit-kv-v">${esc(wellKnown.server)}</span></div>` : '',
  ].filter(Boolean).join('');
  const wkHtml = wkRows ? `<div class="conduit-sec"><h3>Well-known</h3><div class="conduit-card">${wkRows}</div></div>` : '';

  // Limits section
  const limRows = [
    g.max_request_size != null ? `<div class="conduit-kv"><span class="conduit-kv-k">max_request_size</span><span class="conduit-kv-v">${esc(g.max_request_size)}</span></div>` : '',
    g.max_concurrent_requests != null ? `<div class="conduit-kv"><span class="conduit-kv-k">max_concurrent_requests</span><span class="conduit-kv-v">${esc(g.max_concurrent_requests)}</span></div>` : '',
  ].filter(Boolean).join('');
  const limHtml = limRows ? `<div class="conduit-sec"><h3>Limits</h3><div class="conduit-card">${limRows}</div></div>` : '';

  // Logging section
  const logHtml = g.log != null ? `<div class="conduit-sec"><h3>Logging</h3><div class="conduit-card">
<div class="conduit-kv"><span class="conduit-kv-k">log</span><span class="conduit-kv-v">${chip(g.log, 'info')}</span></div>
</div></div>` : '';

  const host = document.createElement('div');
  host.className = 'conduit-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px">
  <span class="badge-conduit">Conduit</span>
  <span class="conduit-title">${esc(g.server_name || 'Conduit Config')}</span>
</div>
<div class="conduit-sub">${esc(subParts)}</div>
${serverHtml}${dbHtml}${fedHtml}${regHtml}${tlsHtml}${wkHtml}${limHtml}${logHtml}`;
  return { parentNode: host };
}
