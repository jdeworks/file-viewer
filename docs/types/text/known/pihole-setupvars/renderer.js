const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.pihole-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.pihole-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#E11D48;color:#fff;vertical-align:middle;margin-right:8px}
.pihole-title{font-size:18px;font-weight:700;margin:0 0 4px}
.pihole-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.pihole-sec{margin:14px 0}
.pihole-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px}
.pihole-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);margin:6px 0}
.pihole-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px}
.pihole-kv-k{color:var(--fg-2,#888);min-width:180px;flex-shrink:0}
.pihole-kv-v{font-family:ui-monospace,monospace;word-break:break-all}
.pihole-status-ok{display:inline-block;padding:1px 8px;border-radius:8px;font-size:11px;font-weight:700;background:#d4edda;color:#155724;border:1px solid #c3e6cb}
.pihole-status-off{display:inline-block;padding:1px 8px;border-radius:8px;font-size:11px;font-weight:700;background:#f8d7da;color:#721c24;border:1px solid #f5c6cb}
.pihole-bool-yes{color:#1a7f37;font-weight:600}
.pihole-bool-no{color:var(--fg-2,#888)}
.pihole-mask{font-family:ui-monospace,monospace;color:var(--fg-2,#888);font-style:italic}
.pihole-dns-pill{display:inline-block;font-size:11px;padding:2px 9px;border-radius:10px;background:#fff3f3;border:1px solid #ffb3b3;font-family:ui-monospace,monospace;color:#8b0000;margin:2px}
`;

function parseEnvStyle(text) {
  const result = {};
  for (const line of (text || '').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    result[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
  }
  return result;
}

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<div class="pihole-kv"><span class="pihole-kv-k">${esc(label)}</span><span class="pihole-kv-v">${esc(value)}</span></div>`;
}

function boolRow(label, value, trueText = 'enabled', falseText = 'disabled') {
  if (value == null) return '';
  const isTrue = value === true || value === 'true' || value === '1' || value === 'TRUE';
  const cls = isTrue ? 'pihole-bool-yes' : 'pihole-bool-no';
  return `<div class="pihole-kv"><span class="pihole-kv-k">${esc(label)}</span><span class="${cls}">${isTrue ? trueText : falseText}</span></div>`;
}

export function render(intake) {
  const kv_ = parseEnvStyle(intake.text || '');

  const blockingEnabled = kv_['BLOCKING_ENABLED'];
  const iface = kv_['PIHOLE_INTERFACE'] || '';
  const ipv4 = kv_['IPV4_ADDRESS'] || '';
  const ipv6 = kv_['IPV6_ADDRESS'] || '';
  const dns1 = kv_['PIHOLE_DNS_1'] || '';
  const dns2 = kv_['PIHOLE_DNS_2'] || '';
  const dns3 = kv_['PIHOLE_DNS_3'] || '';
  const dns4 = kv_['PIHOLE_DNS_4'] || '';
  const dnssec = kv_['DNSSEC'];
  const bogusPriv = kv_['DNS_BOGUS_PRIV'];
  const queryLogging = kv_['QUERY_LOGGING'];
  const webpassword = kv_['WEBPASSWORD'];
  const temperatureUnit = kv_['TEMPERATUREUNIT'] || '';
  const webuiBoxedLayout = kv_['WEBUIBOXEDLAYOUT'] || '';

  const blockingIsOn = blockingEnabled === 'true' || blockingEnabled === 'TRUE' || blockingEnabled == null;
  const blockingBadge = blockingEnabled != null
    ? (blockingIsOn
      ? `<span class="pihole-status-ok">blocking on</span>`
      : `<span class="pihole-status-off">blocking off</span>`)
    : '';

  const dnsServers = [dns1, dns2, dns3, dns4].filter(Boolean);

  const subParts = [
    iface ? `interface: ${iface}` : '',
    ipv4 ? ipv4.split('/')[0] : '',
    dnsServers.length ? `${dnsServers.length} DNS server${dnsServers.length !== 1 ? 's' : ''}` : '',
  ].filter(Boolean);

  const networkRows = [
    kv('Interface', iface),
    kv('IPv4 address', ipv4),
    kv('IPv6 address', ipv6),
  ].filter(Boolean).join('');

  const dnsRows = dnsServers.length
    ? `<div class="pihole-kv"><span class="pihole-kv-k">Upstream DNS</span><span>${dnsServers.map((d) => `<span class="pihole-dns-pill">${esc(d)}</span>`).join('')}</span></div>`
    : '';

  const dnsSecRows = [
    dnssec != null ? boolRow('DNSSEC', dnssec) : '',
    bogusPriv != null ? boolRow('DNS bogus private', bogusPriv) : '',
  ].filter(Boolean).join('');

  const loggingRows = [
    queryLogging != null ? boolRow('Query logging', queryLogging) : '',
  ].filter(Boolean).join('');

  const authRows = webpassword != null
    ? `<div class="pihole-kv"><span class="pihole-kv-k">Web password</span><span class="pihole-mask">[configured]</span></div>`
    : '';

  const miscRows = [
    temperatureUnit ? kv('Temperature unit', temperatureUnit) : '',
    webuiBoxedLayout ? kv('UI layout', webuiBoxedLayout) : '',
  ].filter(Boolean).join('');

  // pihole-FTL.conf uses a disjoint key set (BLOCKINGMODE, MAXDBDAYS, etc.) from
  // setupVars.conf — fall back to a generic key/value listing so it isn't blank.
  const knownKeys = new Set([
    'BLOCKING_ENABLED', 'PIHOLE_INTERFACE', 'IPV4_ADDRESS', 'IPV6_ADDRESS',
    'PIHOLE_DNS_1', 'PIHOLE_DNS_2', 'PIHOLE_DNS_3', 'PIHOLE_DNS_4',
    'DNSSEC', 'DNS_BOGUS_PRIV', 'QUERY_LOGGING', 'WEBPASSWORD',
    'TEMPERATUREUNIT', 'WEBUIBOXEDLAYOUT',
  ]);
  const otherRows = Object.entries(kv_)
    .filter(([k]) => !knownKeys.has(k))
    .map(([k, v]) => kv(k, k === 'WEBPASSWORD_BACKUP' ? '[configured]' : v))
    .join('');

  const host = document.createElement('div');
  host.className = 'pihole-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="pihole-title"><span class="pihole-badge">Pi-hole</span>Pi-hole Configuration ${blockingBadge}</div>
<div class="pihole-sub">${esc(subParts.join(' · ') || 'Pi-hole DNS ad-blocker configuration')}</div>
${networkRows || dnsRows ? `<div class="pihole-sec"><h3>Network</h3><div class="pihole-card">${networkRows}${dnsRows}</div></div>` : ''}
${dnsSecRows ? `<div class="pihole-sec"><h3>DNS Settings</h3><div class="pihole-card">${dnsSecRows}</div></div>` : ''}
${loggingRows ? `<div class="pihole-sec"><h3>Logging</h3><div class="pihole-card">${loggingRows}</div></div>` : ''}
${authRows ? `<div class="pihole-sec"><h3>Security</h3><div class="pihole-card">${authRows}</div></div>` : ''}
${miscRows ? `<div class="pihole-sec"><h3>Miscellaneous</h3><div class="pihole-card">${miscRows}</div></div>` : ''}
${otherRows ? `<div class="pihole-sec"><h3>Other Settings</h3><div class="pihole-card">${otherRows}</div></div>` : ''}`;

  return { parentNode: host };
}
