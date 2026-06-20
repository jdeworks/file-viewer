const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.coturn-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-ct{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1565C0;color:#fff;vertical-align:middle;margin-right:8px;}
.ct-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.ct-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.ct-sec{margin:14px 0;}
.ct-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.ct-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.ct-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px;}
.ct-kv-k{color:var(--fg-2,#888);min-width:180px;flex-shrink:0;}
.ct-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.ct-masked{font-family:ui-monospace,monospace;color:var(--fg-2,#999);font-style:italic;}
.ct-chip{display:inline-flex;align-items:center;font-size:11px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:2px;}
.ct-chip-auth{background:#e3f2fd;border-color:#90caf9;color:#0d47a1;}
.ct-chip-flag{background:#f3e5f5;border-color:#ce93d8;color:#4a148c;}
.ct-chip-warn{background:#fff8e1;border-color:#ffe082;color:#6d4c41;}
`;

function parseCoturn(text) {
  const kv = {}, flags = [];
  for (const line of (text || '').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) { flags.push(t); continue; }
    kv[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
  return { kv, flags };
}

function kvRow(label, value, masked) {
  if (value == null || value === '') return '';
  const valHtml = masked
    ? `<span class="ct-masked">[configured]</span>`
    : `<span class="ct-kv-v">${esc(String(value))}</span>`;
  return `<div class="ct-kv"><span class="ct-kv-k">${esc(label)}</span>${valHtml}</div>`;
}

export function render(intake) {
  const { kv, flags } = parseCoturn(intake.text || '');

  // Auth method
  const usesAuthSecret = flags.includes('use-auth-secret') || kv['use-auth-secret'] != null;
  const usesLtCredMech = flags.includes('lt-cred-mech') || kv['lt-cred-mech'] != null;
  const authMethod = usesAuthSecret ? 'use-auth-secret (ephemeral HMAC)' : usesLtCredMech ? 'lt-cred-mech (long-term)' : null;

  // TLS disable flags
  const noTlsv1 = flags.includes('no-tlsv1') || kv['no-tlsv1'] != null;
  const noTlsv11 = flags.includes('no-tlsv1_1') || kv['no-tlsv1_1'] != null;
  const fingerprint = flags.includes('fingerprint') || kv['fingerprint'] != null;
  const verbose = flags.includes('verbose') || kv['verbose'] != null;

  // Denied peer IPs
  const deniedPeerIps = Object.keys(kv).filter((k) => k === 'denied-peer-ip').length +
    (Array.isArray(kv['denied-peer-ip']) ? kv['denied-peer-ip'].length - 1 : 0);
  // Count lines in raw text for denied-peer-ip
  const deniedCount = (intake.text || '').split('\n').filter((l) => l.trim().startsWith('denied-peer-ip')).length;

  // Relay port range
  const minPort = kv['min-port'] || null;
  const maxPort = kv['max-port'] || null;
  const portRange = (minPort && maxPort) ? `${minPort}–${maxPort}` : (minPort || maxPort || null);

  // Summary
  const subParts = [
    kv.realm ? `realm: ${kv.realm}` : null,
    kv['external-ip'] ? `external-ip: ${kv['external-ip']}` : null,
    authMethod || null,
    portRange ? `relay ports: ${portRange}` : null,
  ].filter(Boolean).join(' · ');

  // Network section
  const networkHtml = `<div class="ct-sec"><h3>Network</h3><div class="ct-card">
${kvRow('listening-ip', kv['listening-ip'])}
${kvRow('listening-port', kv['listening-port'])}
${kvRow('tls-listening-port', kv['tls-listening-port'])}
${kvRow('alt-listening-port', kv['alt-listening-port'])}
${kvRow('external-ip', kv['external-ip'])}
${kvRow('relay-ip', kv['relay-ip'])}
${kvRow('realm', kv.realm)}
</div></div>`;

  // Auth section
  const authHtml = authMethod ? `<div class="ct-sec"><h3>Authentication</h3><div class="ct-card">
<div class="ct-kv"><span class="ct-kv-k">Method</span><span class="ct-chip ct-chip-auth">${esc(authMethod)}</span></div>
${(kv['static-auth-secret'] != null || usesAuthSecret) && kv['static-auth-secret'] != null ? kvRow('static-auth-secret', '***', true) : ''}
${kvRow('userdb', kv['userdb'])}
${kv['mysql-userdb'] != null ? `<div class="ct-kv"><span class="ct-kv-k">mysql-userdb</span><span class="ct-masked">[configured]</span></div>` : ''}
${kv['redis-userdb'] != null ? `<div class="ct-kv"><span class="ct-kv-k">redis-userdb</span><span class="ct-masked">[configured]</span></div>` : ''}
${kv['cli-password'] != null ? kvRow('cli-password', '***', true) : ''}
</div></div>` : '';

  // TLS section
  const tlsHtml = (kv.cert || kv.pkey || noTlsv1 || noTlsv11) ? `<div class="ct-sec"><h3>TLS / Certificates</h3><div class="ct-card">
${kvRow('cert', kv.cert)}
${kvRow('pkey', kv.pkey)}
${noTlsv1 ? `<div class="ct-kv"><span class="ct-kv-k">no-tlsv1</span><span class="ct-chip ct-chip-warn">TLSv1.0 disabled</span></div>` : ''}
${noTlsv11 ? `<div class="ct-kv"><span class="ct-kv-k">no-tlsv1_1</span><span class="ct-chip ct-chip-warn">TLSv1.1 disabled</span></div>` : ''}
</div></div>` : '';

  // Relay port range section
  const relayHtml = (minPort || maxPort) ? `<div class="ct-sec"><h3>Relay Port Range</h3><div class="ct-card">
${kvRow('min-port', minPort)}
${kvRow('max-port', maxPort)}
</div></div>` : '';

  // Logging & misc
  const flagChips = [
    fingerprint ? `<span class="ct-chip ct-chip-flag">fingerprint</span>` : '',
    verbose ? `<span class="ct-chip ct-chip-flag">verbose</span>` : '',
  ].filter(Boolean).join('');

  const miscHtml = (kv['log-file'] || flagChips || deniedCount > 0) ? `<div class="ct-sec"><h3>Misc</h3><div class="ct-card">
${kvRow('log-file', kv['log-file'])}
${deniedCount > 0 ? `<div class="ct-kv"><span class="ct-kv-k">denied-peer-ip</span><span class="ct-kv-v">${deniedCount} range${deniedCount !== 1 ? 's' : ''}</span></div>` : ''}
${flagChips ? `<div class="ct-kv"><span class="ct-kv-k">Flags</span><div style="display:flex;flex-wrap:wrap;">${flagChips}</div></div>` : ''}
</div></div>` : '';

  const host = document.createElement('div');
  host.className = 'coturn-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-ct">coturn</span>
  <span class="ct-title">TURN/STUN Server</span>
</div>
<div class="ct-sub">${esc(subParts)}</div>
${networkHtml}${authHtml}${tlsHtml}${relayHtml}${miscHtml}`;
  return { parentNode: host };
}
