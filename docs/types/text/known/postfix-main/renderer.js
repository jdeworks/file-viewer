const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.postfix-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.postfix-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#005890;color:#fff;vertical-align:middle;margin-right:8px;}
.postfix-badge-master{background:#1B5E20;}
.postfix-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.postfix-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 16px;}
.postfix-sec{margin:0 0 14px;}
.postfix-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.postfix-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;}
.postfix-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:12px;}
.postfix-kv-k{color:var(--fg-2,#888);min-width:220px;flex-shrink:0;font-family:ui-monospace,monospace;font-size:11px;}
.postfix-kv-v{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.postfix-tls{display:inline-block;padding:1px 7px;border-radius:8px;font-size:11px;font-weight:700;margin-left:6px;}
.postfix-tls-may{background:#fff3cd;color:#856404;border:1px solid #ffe69c;}
.postfix-tls-none{background:#f8d7da;color:#721c24;border:1px solid #f5c6cb;}
.postfix-tls-verify{background:#d1fae5;color:#065f46;border:1px solid #6ee7b7;}
.postfix-pills{display:flex;flex-wrap:wrap;gap:5px;}
.postfix-pill{display:inline-flex;align-items:center;font-size:11px;padding:2px 9px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.postfix-table{width:100%;border-collapse:collapse;font-size:12px;}
.postfix-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.postfix-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
.postfix-table tr:last-child td{border-bottom:none;}
.postfix-empty{color:var(--fg-2,#888);font-size:13px;}
`;

/**
 * Parse Postfix key = value config with continuation lines.
 * Redacts any key containing "password".
 */
function parseMainCf(text) {
  const params = {};
  const lines = text.split('\n');
  let currentKey = null;
  for (const raw of lines) {
    if (!raw.trim() || raw.trim().startsWith('#')) { currentKey = null; continue; }
    // Continuation line (leading whitespace, no '=')
    if (/^\s+/.test(raw) && currentKey && !raw.includes('=')) {
      params[currentKey] = (params[currentKey] || '') + ' ' + raw.trim();
      continue;
    }
    const eqIdx = raw.indexOf('=');
    if (eqIdx < 0) { currentKey = null; continue; }
    const key = raw.slice(0, eqIdx).trim();
    const val = raw.slice(eqIdx + 1).trim();
    if (!key) continue;
    // Security: redact password keys
    if (/password/i.test(key)) {
      params[key] = '[configured]';
    } else {
      params[key] = val;
    }
    currentKey = key;
  }
  return params;
}

/**
 * Parse master.cf service table.
 * Each non-comment line: service type private unpriv chroot wakeup maxproc command args
 */
function parseMasterCf(text) {
  const services = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const parts = line.split(/\s+/);
    if (parts.length < 8) continue;
    const [service, type, , , , , , ...cmdParts] = parts;
    services.push({ service, type, command: cmdParts.join(' ') });
  }
  return services;
}

function tlsChip(level) {
  if (!level) return '';
  const v = level.toLowerCase();
  if (v === 'none' || v === 'disabled') return `<span class="postfix-tls postfix-tls-none">TLS disabled</span>`;
  if (v === 'may' || v === 'encrypt') return `<span class="postfix-tls postfix-tls-may">TLS opportunistic</span>`;
  if (v === 'verify' || v === 'secure' || v === 'dane' || v === 'fingerprint') return `<span class="postfix-tls postfix-tls-verify">TLS mandatory</span>`;
  return '';
}

function maskPrivateIPs(val) {
  // Mask private IP subnets in mynetworks but keep localhost
  return val.replace(/\b(10\.\d+\.\d+\.\d+\/\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+\/\d+|192\.168\.\d+\.\d+\/\d+)\b/g, '***.***.***/**');
}

function restrictionNames(val) {
  // Return only the restriction policy names (comma/space separated), not their values
  return (val || '').split(/[\s,]+/).filter((s) => s && !s.startsWith('$')).slice(0, 8).join(', ');
}

export function render(intake) {
  const text = intake.text || '';
  const filename = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
  const isMasterCf = filename === 'master.cf';

  const host = document.createElement('div');
  host.className = 'postfix-doc';

  if (isMasterCf) {
    const services = parseMasterCf(text);
    const badgeHtml = '<span class="postfix-badge postfix-badge-master">Postfix Master</span>';
    const tableRows = services.map((s) => `<tr><td>${esc(s.service)}</td><td>${esc(s.type)}</td><td>${esc(s.command)}</td></tr>`).join('');
    const tableHtml = services.length
      ? `<div class="postfix-sec"><h3>Services</h3><table class="postfix-table"><thead><tr><th>Service</th><th>Type</th><th>Command</th></tr></thead><tbody>${tableRows}</tbody></table></div>`
      : '<p class="postfix-empty">No services parsed.</p>';

    host.innerHTML = `<style>${CSS}</style>
<div class="postfix-title">${badgeHtml}master.cf</div>
<div class="postfix-sub">${services.length} service${services.length !== 1 ? 's' : ''} defined</div>
${tableHtml}`;
    return { parentNode: host };
  }

  // main.cf
  const p = parseMainCf(text);
  const get = (k) => p[k] || null;

  const hostname = get('myhostname') || '';
  const mydomain = get('mydomain') || '';
  const relayhost = get('relayhost') || '';
  const smtpdTls = get('smtpd_tls_security_level');
  const smtpTls = get('smtp_tls_security_level');
  const mynetworksRaw = get('mynetworks') || '';
  const mynetworks = mynetworksRaw ? maskPrivateIPs(mynetworksRaw) : '';

  // Badge label
  const badgeLabel = 'Postfix Main';
  const badgeHtml = `<span class="postfix-badge">${esc(badgeLabel)}</span>`;

  // Sub-summary
  const subParts = [];
  if (hostname) subParts.push(hostname);
  const paramCount = Object.keys(p).length;
  subParts.push(`${paramCount} parameter${paramCount !== 1 ? 's' : ''}`);
  if (relayhost) subParts.push(`relay → ${relayhost}`);

  // Identity section
  const identRows = [
    ['myhostname', hostname],
    ['mydomain', mydomain],
    ['myorigin', get('myorigin')],
    ['mydestination', get('mydestination')],
  ].filter(([, v]) => v);

  const identHtml = identRows.length ? `<div class="postfix-sec"><h3>Identity</h3><div class="postfix-card">${
    identRows.map(([k, v]) => `<div class="postfix-kv"><span class="postfix-kv-k">${esc(k)}</span><span class="postfix-kv-v">${esc(v)}</span></div>`).join('')
  }</div></div>` : '';

  // Relay section
  const relayRows = [
    ['relayhost', relayhost],
    ['relay_domains', get('relay_domains')],
    ['mynetworks', mynetworks],
    ['virtual_mailbox_domains', get('virtual_mailbox_domains')],
    ['virtual_mailbox_base', get('virtual_mailbox_base')],
  ].filter(([, v]) => v);

  const relayHtml = relayRows.length ? `<div class="postfix-sec"><h3>Relay &amp; Networks</h3><div class="postfix-card">${
    relayRows.map(([k, v]) => `<div class="postfix-kv"><span class="postfix-kv-k">${esc(k)}</span><span class="postfix-kv-v">${esc(v)}</span></div>`).join('')
  }</div></div>` : '';

  // TLS section
  const tlsRows = [
    ['smtpd_tls_security_level', smtpdTls],
    ['smtp_tls_security_level', smtpTls],
    ['smtpd_tls_cert_file', get('smtpd_tls_cert_file')],
    ['smtpd_tls_protocols', get('smtpd_tls_protocols')],
    ['smtp_tls_note_starttls_offer', get('smtp_tls_note_starttls_offer')],
  ].filter(([, v]) => v);

  const smtpdChip = tlsChip(smtpdTls);
  const smtpChip = tlsChip(smtpTls);

  const tlsHtml = tlsRows.length ? `<div class="postfix-sec"><h3>TLS${smtpdChip}${smtpChip}</h3><div class="postfix-card">${
    tlsRows.map(([k, v]) => `<div class="postfix-kv"><span class="postfix-kv-k">${esc(k)}</span><span class="postfix-kv-v">${esc(v)}</span></div>`).join('')
  }</div></div>` : '';

  // Restrictions — names only
  const restrictKeys = ['smtpd_recipient_restrictions', 'smtpd_relay_restrictions', 'smtpd_client_restrictions'];
  const restrictPairs = restrictKeys.map((k) => [k, get(k)]).filter(([, v]) => v);
  const restrictHtml = restrictPairs.length ? `<div class="postfix-sec"><h3>Restriction Lists</h3><div class="postfix-card">${
    restrictPairs.map(([k, v]) => `<div class="postfix-kv"><span class="postfix-kv-k">${esc(k)}</span><span class="postfix-kv-v">${esc(restrictionNames(v))}</span></div>`).join('')
  }</div></div>` : '';

  // Queue directories
  const queueRows = [
    ['queue_directory', get('queue_directory')],
    ['data_directory', get('data_directory')],
    ['mail_spool_directory', get('mail_spool_directory')],
  ].filter(([, v]) => v);
  const queueHtml = queueRows.length ? `<div class="postfix-sec"><h3>Queue Directories</h3><div class="postfix-card">${
    queueRows.map(([k, v]) => `<div class="postfix-kv"><span class="postfix-kv-k">${esc(k)}</span><span class="postfix-kv-v">${esc(v)}</span></div>`).join('')
  }</div></div>` : '';

  host.innerHTML = `<style>${CSS}</style>
<div class="postfix-title">${badgeHtml}main.cf</div>
<div class="postfix-sub">${esc(subParts.join(' · '))}</div>
${identHtml}${relayHtml}${tlsHtml}${restrictHtml}${queueHtml}`;

  return { parentNode: host };
}
