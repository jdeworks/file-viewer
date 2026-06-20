const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.postfixcfg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.postfixcfg-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#005890;color:#fff;vertical-align:middle;margin-right:8px;}
.postfixcfg-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.postfixcfg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 16px;}
.postfixcfg-section{margin:0 0 6px;font-size:13px;font-weight:600;color:var(--fg-2,#888);text-transform:uppercase;letter-spacing:.04em;}
.postfixcfg-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:12px;}
.postfixcfg-table{width:100%;border-collapse:collapse;font-size:13px;}
.postfixcfg-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.postfixcfg-table td:first-child{color:var(--fg-2,#666);width:42%;font-family:ui-monospace,monospace;font-size:12px;white-space:nowrap;}
.postfixcfg-table td:last-child{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.postfixcfg-table tr:last-child td{border-bottom:none;}
.postfixcfg-tls-chip{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;margin-left:4px;vertical-align:middle;}
.postfixcfg-tls-disabled{background:#cf222e;color:#fff;}
.postfixcfg-tls-opportunistic{background:#bf8700;color:#fff;}
.postfixcfg-tls-mandatory{background:#1a7f37;color:#fff;}
.postfixcfg-empty{color:var(--fg-2,#888);font-size:13px;}
`;

function parsePostfixConf(text) {
  const params = {};
  // Postfix uses key = value with optional continuation lines (leading whitespace)
  const lines = text.split('\n');
  let currentKey = null;
  for (const raw of lines) {
    if (!raw.trim() || raw.trim().startsWith('#')) { currentKey = null; continue; }
    // Continuation line (leading whitespace and no = sign at start)
    if (/^\s+/.test(raw) && currentKey && !raw.includes('=')) {
      params[currentKey] = (params[currentKey] || '') + ' ' + raw.trim();
      continue;
    }
    const eqIdx = raw.indexOf('=');
    if (eqIdx < 0) { currentKey = null; continue; }
    const key = raw.slice(0, eqIdx).trim();
    const val = raw.slice(eqIdx + 1).trim();
    if (key) {
      params[key] = val;
      currentKey = key;
    }
  }
  return params;
}

function tlsLevel(val) {
  if (!val) return null;
  const v = val.toLowerCase();
  if (v === 'none' || v === 'disabled') return 'disabled';
  if (v === 'may' || v === 'encrypt') return 'opportunistic';
  if (v === 'verify' || v === 'secure' || v === 'dane' || v === 'fingerprint') return 'mandatory';
  return null;
}

function makeSectionHtml(title, rows) {
  if (!rows.length) return '';
  const rowsHtml = rows.map(([k, v]) =>
    `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`
  ).join('');
  return `<div class="postfixcfg-section">${esc(title)}</div>
<div class="postfixcfg-card"><table class="postfixcfg-table"><tbody>${rowsHtml}</tbody></table></div>`;
}

export function render(intake) {
  const text = intake.text || '';
  const p = parsePostfixConf(text);

  const get = (key) => p[key] || null;

  // Identity
  const identityRows = [
    ['myhostname', get('myhostname')],
    ['mydomain', get('mydomain')],
    ['myorigin', get('myorigin')],
    ['mydestination', get('mydestination')],
  ].filter(([, v]) => v != null);

  // Network
  const networkRows = [
    ['inet_interfaces', get('inet_interfaces')],
    ['inet_protocols', get('inet_protocols')],
    ['mynetworks', get('mynetworks')],
    ['relay_domains', get('relay_domains')],
    ['virtual_alias_domains', get('virtual_alias_domains')],
  ].filter(([, v]) => v != null);

  // TLS
  const smtpdTlsLevel = get('smtpd_tls_security_level');
  const smtpTlsLevel = get('smtp_tls_security_level');
  const tlsRows = [
    ['smtpd_tls_cert_file', get('smtpd_tls_cert_file')],
    ['smtpd_tls_security_level', smtpdTlsLevel],
    ['smtpd_tls_protocols', get('smtpd_tls_protocols')],
    ['smtp_tls_security_level', smtpTlsLevel],
    ['smtp_tls_note_starttls_offer', get('smtp_tls_note_starttls_offer')],
  ].filter(([, v]) => v != null);

  // SASL
  const saslRows = [
    ['smtpd_sasl_auth_enable', get('smtpd_sasl_auth_enable')],
    ['smtpd_sasl_type', get('smtpd_sasl_type')],
    ['smtpd_sasl_path', get('smtpd_sasl_path')],
    ['smtpd_sasl_security_options', get('smtpd_sasl_security_options')],
  ].filter(([, v]) => v != null);

  // Delivery / limits
  const deliveryRows = [
    ['mailbox_size_limit', get('mailbox_size_limit')],
    ['message_size_limit', get('message_size_limit')],
  ].filter(([, v]) => v != null);

  // Anti-spam
  const antispamRows = [
    ['smtpd_relay_restrictions', get('smtpd_relay_restrictions')],
    ['smtpd_recipient_restrictions', get('smtpd_recipient_restrictions')],
  ].filter(([, v]) => v != null);

  // TLS chip
  const inboundLevel = tlsLevel(smtpdTlsLevel);
  let tlsChipHtml = '';
  if (inboundLevel) {
    const chipClass = `postfixcfg-tls-${inboundLevel}`;
    const label = inboundLevel === 'disabled' ? 'TLS disabled' : inboundLevel === 'opportunistic' ? 'TLS opportunistic' : 'TLS mandatory';
    tlsChipHtml = `<span class="postfixcfg-tls-chip ${chipClass}">${esc(label)}</span>`;
  }

  const saslEnabled = (get('smtpd_sasl_auth_enable') || '').toLowerCase() === 'yes';
  const totalParams = Object.keys(p).length;
  const hostname = get('myhostname') || '';

  const sections = [
    makeSectionHtml('Identity', identityRows),
    makeSectionHtml('Network', networkRows),
    makeSectionHtml('TLS', tlsRows),
    makeSectionHtml('SASL Authentication', saslRows),
    makeSectionHtml('Limits', deliveryRows),
    makeSectionHtml('Anti-spam restrictions', antispamRows),
  ].filter(Boolean).join('');

  const host = document.createElement('div');
  host.className = 'postfixcfg-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="postfixcfg-title"><span class="postfixcfg-badge">Postfix</span>main.cf${tlsChipHtml}</div>
<div class="postfixcfg-sub">Postfix mail server configuration${hostname ? ' · ' + esc(hostname) : ''} · ${totalParams} parameter${totalParams !== 1 ? 's' : ''}${saslEnabled ? ' · SASL auth enabled' : ''}</div>
${sections || '<p class="postfixcfg-empty">No parameters found.</p>'}`;

  return { parentNode: host };
}
