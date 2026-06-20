const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

const CSS = `
.vsf-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.vsf-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1565c0;color:#fff;vertical-align:middle;margin-right:8px}
.vsf-title{font-size:18px;font-weight:700;margin:0 0 4px}
.vsf-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.vsf-sec{margin:12px 0}
.vsf-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px}
.vsf-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin-bottom:8px}
.vsf-row{display:flex;gap:8px;font-size:13px;padding:3px 0;border-bottom:1px solid var(--border,#f0f0f0)}
.vsf-row:last-child{border-bottom:none}
.vsf-key{color:var(--fg-2,#888);min-width:180px;flex-shrink:0;font-size:12px;font-family:ui-monospace,monospace}
.vsf-val{font-family:ui-monospace,monospace;word-break:break-all}
.vsf-yes{color:#166534;font-weight:600}
.vsf-no{color:#991b1b;font-weight:600}
.vsf-warn{background:#fef3c7;border:1px solid #fbbf24;border-radius:6px;padding:6px 10px;font-size:12px;color:#92400e;margin:4px 0}
`;

function parseVsftpd(text) {
  const result = {};
  for (const line of (text || '').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 0) continue;
    result[t.slice(0, eq).trim().toLowerCase()] = t.slice(eq + 1).trim();
  }
  return result;
}

export function render(intake) {
  const cfg = parseVsftpd(intake.text || '');
  const get = (k) => cfg[k.toLowerCase()];

  const anonEnable = get('anonymous_enable') || 'NO';
  const localEnable = get('local_enable') || 'NO';
  const writeEnable = get('write_enable') || 'NO';
  const listenPort = get('listen_port') || '21';
  const listen = get('listen') || 'NO';
  const listenIpv6 = get('listen_ipv6') || 'NO';
  const chroot = get('chroot_local_user') || 'NO';
  const ftpRootDir = get('local_root') || get('anon_root') || '';
  const sslEnable = get('ssl_enable') || 'NO';
  const forceSsl = get('force_local_data_ssl') || get('force_local_logins_ssl') || '';
  const passvMinPort = get('pasv_min_port') || '';
  const passvMaxPort = get('pasv_max_port') || '';
  const maxClients = get('max_clients') || '';
  const banner = get('ftpd_banner') || '';

  const yn = (v) => {
    const upper = String(v || '').toUpperCase();
    if (upper === 'YES') return '<span class="vsf-yes">YES</span>';
    if (upper === 'NO') return '<span class="vsf-no">NO</span>';
    return esc(v);
  };

  const row = (label, val) => val != null ? `<div class="vsf-row"><span class="vsf-key">${esc(label)}</span><span class="vsf-val">${val}</span></div>` : '';

  const warnings = [];
  if (anonEnable.toUpperCase() === 'YES') warnings.push('anonymous_enable=YES — anonymous FTP login is enabled');
  if (writeEnable.toUpperCase() === 'YES' && anonEnable.toUpperCase() === 'YES') warnings.push('write_enable=YES with anonymous access — files can be uploaded anonymously');
  if (sslEnable.toUpperCase() === 'NO') warnings.push('ssl_enable=NO — credentials transmitted in plaintext');

  const warningsHtml = warnings.map(w => `<div class="vsf-warn">${esc(w)}</div>`).join('');

  const listenRows = [
    row('listen_port', esc(listenPort)),
    row('listen (IPv4)', yn(listen)),
    row('listen_ipv6', yn(listenIpv6)),
    passvMinPort ? row('pasv_port_range', esc(`${passvMinPort}–${passvMaxPort}`)) : '',
    maxClients ? row('max_clients', esc(maxClients)) : '',
    banner ? row('ftpd_banner', esc(banner)) : '',
  ].filter(Boolean).join('');

  const accessRows = [
    row('anonymous_enable', yn(anonEnable)),
    row('local_enable', yn(localEnable)),
    row('write_enable', yn(writeEnable)),
    row('chroot_local_user', yn(chroot)),
    ftpRootDir ? row('root dir', esc(ftpRootDir)) : '',
  ].filter(Boolean).join('');

  const tlsRows = [
    row('ssl_enable', yn(sslEnable)),
    forceSsl ? row('force_ssl', yn(forceSsl)) : '',
    get('rsa_cert_file') ? row('rsa_cert_file', esc(get('rsa_cert_file'))) : '',
  ].filter(Boolean).join('');

  const host = document.createElement('div');
  host.className = 'vsf-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="vsf-title"><span class="vsf-badge">vsftpd</span>vsftpd.conf</div>
<div class="vsf-sub">Very Secure FTP Daemon configuration</div>
${warningsHtml}
<div class="vsf-sec"><h3>Listen</h3><div class="vsf-card">${listenRows}</div></div>
<div class="vsf-sec"><h3>Access</h3><div class="vsf-card">${accessRows}</div></div>
${tlsRows ? `<div class="vsf-sec"><h3>TLS/SSL</h3><div class="vsf-card">${tlsRows}</div></div>` : ''}`;
  return { parentNode: host };
}
