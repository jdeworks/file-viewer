const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.dovecotcfg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.dovecotcfg-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1565C0;color:#fff;vertical-align:middle;margin-right:8px;}
.dovecotcfg-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.dovecotcfg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 16px;}
.dovecotcfg-section{margin:0 0 6px;font-size:13px;font-weight:600;color:var(--fg-2,#888);text-transform:uppercase;letter-spacing:.04em;}
.dovecotcfg-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:12px;}
.dovecotcfg-chips{display:flex;flex-wrap:wrap;gap:6px;padding:4px 0;}
.dovecotcfg-chip{display:inline-block;padding:2px 9px;border-radius:10px;font-size:12px;font-weight:600;}
.dovecotcfg-chip-imap{background:#1565C0;color:#fff;}
.dovecotcfg-chip-pop3{background:#E65100;color:#fff;}
.dovecotcfg-chip-lmtp{background:#6A1B9A;color:#fff;}
.dovecotcfg-chip-submission{background:#1B5E20;color:#fff;}
.dovecotcfg-chip-other{background:#546E7A;color:#fff;}
.dovecotcfg-chip-ssl-required{background:#1a7f37;color:#fff;}
.dovecotcfg-chip-ssl-yes{background:#bf8700;color:#fff;}
.dovecotcfg-chip-ssl-no{background:#cf222e;color:#fff;}
.dovecotcfg-chip-auth{background:#37474F;color:#fff;}
.dovecotcfg-chip-format{background:#004D40;color:#fff;}
.dovecotcfg-table{width:100%;border-collapse:collapse;font-size:13px;}
.dovecotcfg-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.dovecotcfg-table td:first-child{color:var(--fg-2,#666);width:40%;font-family:ui-monospace,monospace;font-size:12px;white-space:nowrap;}
.dovecotcfg-table td:last-child{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.dovecotcfg-table tr:last-child td{border-bottom:none;}
.dovecotcfg-warn{background:#fff8e1;border:1px solid #f9a825;border-radius:6px;padding:8px 12px;margin-bottom:12px;font-size:13px;color:#5d4037;}
.dovecotcfg-empty{color:var(--fg-2,#888);font-size:13px;}
`;

function parseDovecotConf(text) {
  const params = {};
  const services = [];
  const lines = text.split('\n');
  let inService = null;
  let inBlock = 0;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Count braces
    const openCount = (trimmed.match(/\{/g) || []).length;
    const closeCount = (trimmed.match(/\}/g) || []).length;

    // Service block detection
    if (trimmed.startsWith('service ') && trimmed.includes('{')) {
      const m = trimmed.match(/^service\s+(\S+)/);
      if (m) {
        inService = { name: m[1], listeners: [] };
        inBlock = 1;
        continue;
      }
    }

    if (inService) {
      inBlock += openCount - closeCount;
      if (inBlock <= 0) {
        services.push(inService);
        inService = null;
        inBlock = 0;
      } else {
        // Try to capture inet_listener lines for ports
        const lm = trimmed.match(/^inet_listener\s+(\S+)/);
        if (lm) {
          inService.listeners.push(lm[1]);
        }
      }
      continue;
    }

    // Simple passdb/userdb/namespace blocks — skip but track depth
    if ((trimmed.startsWith('passdb') || trimmed.startsWith('userdb') || trimmed.startsWith('namespace') || trimmed.startsWith('mailbox')) && trimmed.includes('{')) {
      inBlock = 1;
      inService = { _skip: true };
      continue;
    }

    // key = value
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (key && !key.includes(' ')) {
        params[key] = val;
      }
    }
  }

  return { params, services };
}

function mailFormat(location) {
  if (!location) return null;
  const m = location.match(/^(\w+):/);
  return m ? m[1] : null;
}

export function render(intake) {
  const text = intake.text || '';
  const { params, services } = parseDovecotConf(text);

  const get = (k) => params[k] || null;

  // Protocols
  const protocolsRaw = get('protocols') || '';
  const protocols = protocolsRaw.split(/\s+/).filter(Boolean);

  // Mail location
  const mailLocation = get('mail_location') || '';
  const fmt = mailFormat(mailLocation);

  // SSL
  const sslVal = (get('ssl') || '').toLowerCase();

  // Cert paths — do NOT show values, just "configured"
  const hasCert = !!(get('ssl_cert') || get('ssl_certificate'));
  const hasKey = !!(get('ssl_key') || get('ssl_privatekey'));

  // Auth mechanisms
  const authMechs = (get('auth_mechanisms') || '').split(/\s+/).filter(Boolean);

  // Security
  const disablePlaintext = (get('disable_plaintext_auth') || '').toLowerCase();

  // Mail privileged group
  const mailGroup = get('mail_privileged_group') || '';

  // Services present
  const serviceNames = services.filter((s) => !s._skip).map((s) => s.name);

  // --- Build HTML ---

  // Protocol chips
  let protocolChips = '';
  if (protocols.length) {
    protocolChips = protocols.map((p) => {
      const cl = p === 'imap' ? 'dovecotcfg-chip-imap'
        : p === 'pop3' ? 'dovecotcfg-chip-pop3'
        : p === 'lmtp' ? 'dovecotcfg-chip-lmtp'
        : p === 'submission' ? 'dovecotcfg-chip-submission'
        : 'dovecotcfg-chip-other';
      return `<span class="dovecotcfg-chip ${cl}">${esc(p)}</span>`;
    }).join('');
  }

  // SSL chip
  let sslChip = '';
  if (sslVal) {
    const cl = sslVal === 'required' ? 'dovecotcfg-chip-ssl-required'
      : sslVal === 'yes' ? 'dovecotcfg-chip-ssl-yes'
      : 'dovecotcfg-chip-ssl-no';
    const label = sslVal === 'required' ? 'SSL/TLS required'
      : sslVal === 'yes' ? 'SSL/TLS enabled'
      : 'SSL/TLS disabled';
    sslChip = `<span class="dovecotcfg-chip ${cl}">${esc(label)}</span>`;
  }

  // Auth mechanism chips
  let authChips = '';
  if (authMechs.length) {
    authChips = authMechs.map((m) =>
      `<span class="dovecotcfg-chip dovecotcfg-chip-auth">${esc(m)}</span>`
    ).join('');
  }

  // Security warning
  let warnHtml = '';
  if (disablePlaintext === 'no') {
    warnHtml = `<div class="dovecotcfg-warn">&#9888; <strong>disable_plaintext_auth = no</strong>: plaintext authentication is allowed over unencrypted connections.</div>`;
  }

  // Sections
  let sectionsHtml = '';

  if (protocolChips) {
    sectionsHtml += `<div class="dovecotcfg-section">Protocols</div>
<div class="dovecotcfg-card"><div class="dovecotcfg-chips">${protocolChips}</div></div>`;
  }

  if (mailLocation) {
    const fmtChip = fmt ? `<span class="dovecotcfg-chip dovecotcfg-chip-format">${esc(fmt)}</span> ` : '';
    sectionsHtml += `<div class="dovecotcfg-section">Mail Location</div>
<div class="dovecotcfg-card"><div class="dovecotcfg-chips">${fmtChip}<span style="font-family:ui-monospace,monospace;font-size:12px;">${esc(mailLocation)}</span></div></div>`;
  }

  if (sslChip || hasCert || hasKey) {
    const tlsRows = [];
    if (sslChip) tlsRows.push(`<tr><td>ssl</td><td>${sslChip}</td></tr>`);
    if (hasCert) tlsRows.push(`<tr><td>ssl_cert</td><td><em style="color:var(--fg-2,#888);font-style:normal;">configured</em></td></tr>`);
    if (hasKey) tlsRows.push(`<tr><td>ssl_key</td><td><em style="color:var(--fg-2,#888);font-style:normal;">configured</em></td></tr>`);
    sectionsHtml += `<div class="dovecotcfg-section">TLS / SSL</div>
<div class="dovecotcfg-card"><table class="dovecotcfg-table"><tbody>${tlsRows.join('')}</tbody></table></div>`;
  }

  if (authChips) {
    sectionsHtml += `<div class="dovecotcfg-section">Auth Mechanisms</div>
<div class="dovecotcfg-card"><div class="dovecotcfg-chips">${authChips}</div></div>`;
  }

  const miscRows = [
    mailGroup ? ['mail_privileged_group', mailGroup] : null,
    disablePlaintext ? ['disable_plaintext_auth', disablePlaintext] : null,
  ].filter(Boolean);

  if (miscRows.length) {
    const rowsHtml = miscRows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('');
    sectionsHtml += `<div class="dovecotcfg-section">Access</div>
<div class="dovecotcfg-card"><table class="dovecotcfg-table"><tbody>${rowsHtml}</tbody></table></div>`;
  }

  if (serviceNames.length) {
    const chips = serviceNames.map((n) =>
      `<span class="dovecotcfg-chip dovecotcfg-chip-other">${esc(n)}</span>`
    ).join('');
    sectionsHtml += `<div class="dovecotcfg-section">Services</div>
<div class="dovecotcfg-card"><div class="dovecotcfg-chips">${chips}</div></div>`;
  }

  const host = document.createElement('div');
  host.className = 'dovecotcfg-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="dovecotcfg-title"><span class="dovecotcfg-badge">Dovecot</span>dovecot.conf</div>
<div class="dovecotcfg-sub">Dovecot IMAP/POP3 server configuration</div>
${warnHtml}
${sectionsHtml || '<p class="dovecotcfg-empty">No configuration keys found.</p>'}`;

  return { parentNode: host };
}
