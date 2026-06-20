const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

const CSS = `
.prf-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.prf-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0d6efd;color:#fff;vertical-align:middle;margin-right:8px}
.prf-title{font-size:18px;font-weight:700;margin:0 0 4px}
.prf-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.prf-sec{margin:12px 0}
.prf-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px}
.prf-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin-bottom:8px}
.prf-row{display:flex;gap:8px;font-size:13px;padding:3px 0;border-bottom:1px solid var(--border,#f0f0f0)}
.prf-row:last-child{border-bottom:none}
.prf-key{color:var(--fg-2,#888);min-width:160px;flex-shrink:0;font-size:12px;font-family:ui-monospace,monospace}
.prf-val{font-family:ui-monospace,monospace;word-break:break-all}
.prf-chip{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:#e0f2fe;border:1px solid #7dd3fc;color:#0c4a6e;font-weight:600}
.prf-warn{background:#fef3c7;border:1px solid #fbbf24;border-radius:6px;padding:6px 10px;font-size:12px;color:#92400e;margin:4px 0}
`;

function parseProftpd(text) {
  const cfg = {};
  let inTls = false;
  let hasAnon = false;
  const modules = new Set();
  for (const line of (text || '').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    if (t.toLowerCase().startsWith('<ifmodule mod_tls') || t.toLowerCase() === '<ifmodule mod_tls.c>') inTls = true;
    if (t.toLowerCase() === '</ifmodule>') inTls = false;
    if (t.toLowerCase().startsWith('<anonymous')) hasAnon = true;
    const m = t.match(/^(\w+)\s+(.+)$/);
    if (!m) continue;
    const [, k, v] = m;
    const key = k.toLowerCase();
    if (key === 'loadmodule') modules.add(v.trim());
    if (!cfg[key]) cfg[key] = v.trim();
    if (inTls) cfg['tls_' + key] = v.trim();
  }
  cfg['_hasAnon'] = hasAnon;
  cfg['_modules'] = [...modules];
  return cfg;
}

export function render(intake) {
  const cfg = parseProftpd(intake.text || '');

  const serverName = cfg.servername ? cfg.servername.replace(/^"|"$/g, '') : '';
  const port = cfg.port || '21';
  const defaultRoot = cfg.defaultroot || '';
  const requireValidShell = cfg.requirevalidshell || '';
  const maxClients = cfg.maxclients || '';
  const maxInstances = cfg.maxinstances || '';
  const tlsEnabled = cfg.tls_tlsengine || cfg.tlsengine || '';
  const hasAnon = cfg._hasAnon;

  const row = (label, val) => val ? `<div class="prf-row"><span class="prf-key">${esc(label)}</span><span class="prf-val">${esc(val)}</span></div>` : '';

  const warnings = [];
  if (hasAnon) warnings.push('Anonymous FTP block detected');
  if (tlsEnabled.toLowerCase() === 'off' || (!tlsEnabled && !cfg['tls_tlsprotocol'])) {
    warnings.push('TLS not configured — credentials may be transmitted in plaintext');
  }

  const warningsHtml = warnings.map(w => `<div class="prf-warn">${esc(w)}</div>`).join('');

  const serverRows = [
    row('ServerName', serverName),
    row('Port', port),
    row('DefaultRoot', defaultRoot),
    row('RequireValidShell', requireValidShell),
    row('MaxClients', maxClients),
    row('MaxInstances', maxInstances),
  ].filter(Boolean).join('');

  const tlsRows = [
    row('TLSEngine', tlsEnabled || 'off'),
    row('TLSProtocol', cfg.tls_tlsprotocol || cfg.tlsprotocol || ''),
    cfg.tls_tlscertificatefile || cfg.tlscertificatefile ? row('TLSCertificateFile', cfg.tls_tlscertificatefile || cfg.tlscertificatefile) : '',
  ].filter(Boolean).join('');

  const host = document.createElement('div');
  host.className = 'prf-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="prf-title"><span class="prf-badge">ProFTPD</span>proftpd.conf</div>
<div class="prf-sub">ProFTPD FTP server configuration</div>
${warningsHtml}
${serverRows ? `<div class="prf-sec"><h3>Server</h3><div class="prf-card">${serverRows}</div></div>` : ''}
${tlsRows ? `<div class="prf-sec"><h3>TLS/SSL</h3><div class="prf-card">${tlsRows}</div></div>` : ''}
${hasAnon ? '<div class="prf-sec"><div class="prf-card"><span class="prf-chip">Anonymous FTP block present</span></div></div>' : ''}`;
  return { parentNode: host };
}
