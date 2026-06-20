const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.eximcfg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.eximcfg-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0D47A1;color:#fff;vertical-align:middle;margin-right:8px;}
.eximcfg-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.eximcfg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 16px;}
.eximcfg-section{margin:0 0 6px;font-size:13px;font-weight:600;color:var(--fg-2,#888);text-transform:uppercase;letter-spacing:.04em;}
.eximcfg-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:12px;}
.eximcfg-chips{display:flex;flex-wrap:wrap;gap:6px;padding:4px 0;}
.eximcfg-chip{display:inline-block;padding:2px 9px;border-radius:10px;font-size:12px;font-weight:600;}
.eximcfg-chip-driver-dnslookup{background:#1565C0;color:#fff;}
.eximcfg-chip-driver-accept{background:#1B5E20;color:#fff;}
.eximcfg-chip-driver-redirect{background:#E65100;color:#fff;}
.eximcfg-chip-driver-manualroute{background:#6A1B9A;color:#fff;}
.eximcfg-chip-driver-smtp{background:#004D40;color:#fff;}
.eximcfg-chip-driver-appendfile{background:#37474F;color:#fff;}
.eximcfg-chip-driver-autoreply{background:#795548;color:#fff;}
.eximcfg-chip-driver-pipe{background:#4E342E;color:#fff;}
.eximcfg-chip-driver-plaintext{background:#546E7A;color:#fff;}
.eximcfg-chip-driver-other{background:#78909C;color:#fff;}
.eximcfg-chip-tls{background:#1a7f37;color:#fff;}
.eximcfg-chip-notls{background:#cf222e;color:#fff;}
.eximcfg-chip-acl{background:#0277BD;color:#fff;}
.eximcfg-chip-auth{background:#4A148C;color:#fff;}
.eximcfg-table{width:100%;border-collapse:collapse;font-size:13px;}
.eximcfg-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.eximcfg-table td:first-child{color:var(--fg-2,#666);width:40%;font-family:ui-monospace,monospace;font-size:12px;white-space:nowrap;}
.eximcfg-table td:last-child{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.eximcfg-table tr:last-child td{border-bottom:none;}
.eximcfg-entry-table{width:100%;border-collapse:collapse;font-size:13px;}
.eximcfg-entry-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:middle;}
.eximcfg-entry-table td:first-child{font-family:ui-monospace,monospace;font-size:12px;white-space:nowrap;}
.eximcfg-entry-table tr:last-child td{border-bottom:none;}
.eximcfg-empty{color:var(--fg-2,#888);font-size:13px;}
`;

function parseEximConf(text) {
  const main = {};
  const routers = [];
  const transports = [];
  const acls = [];
  const authenticators = [];

  const lines = text.split('\n');
  let section = 'main'; // main | routers | transports | acl | authenticators
  let currentEntry = null;

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Section markers
    if (/^begin\s+routers\s*$/i.test(trimmed)) { section = 'routers'; currentEntry = null; continue; }
    if (/^begin\s+transports\s*$/i.test(trimmed)) { section = 'transports'; currentEntry = null; continue; }
    if (/^begin\s+acl\s*$/i.test(trimmed)) { section = 'acl'; currentEntry = null; continue; }
    if (/^begin\s+authenticators\s*$/i.test(trimmed)) { section = 'authenticators'; currentEntry = null; continue; }
    if (/^begin\s+\w+\s*$/i.test(trimmed)) { section = 'other'; currentEntry = null; continue; }

    if (section === 'main') {
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (key && !/\s/.test(key)) main[key] = val;
      }
      continue;
    }

    if (section === 'routers' || section === 'transports') {
      // Entry name: a line that is not indented and doesn't contain =
      if (!/^\s/.test(raw) && !trimmed.includes('=') && /^\w/.test(trimmed) && trimmed.endsWith(':')) {
        currentEntry = { name: trimmed.slice(0, -1).trim(), driver: null };
        if (section === 'routers') routers.push(currentEntry);
        else transports.push(currentEntry);
        continue;
      }
      // driver = <name>
      const dm = trimmed.match(/^driver\s*=\s*(\S+)/i);
      if (dm && currentEntry) { currentEntry.driver = dm[1]; }
      continue;
    }

    if (section === 'acl') {
      // ACL name: unindented, no =, ends with :
      if (!/^\s/.test(raw) && !trimmed.includes('=') && /^\w/.test(trimmed) && trimmed.endsWith(':')) {
        acls.push(trimmed.slice(0, -1).trim());
      }
      continue;
    }

    if (section === 'authenticators') {
      if (!/^\s/.test(raw) && !trimmed.includes('=') && /^\w/.test(trimmed) && trimmed.endsWith(':')) {
        currentEntry = { name: trimmed.slice(0, -1).trim(), driver: null, publicName: null };
        authenticators.push(currentEntry);
        continue;
      }
      if (currentEntry) {
        const dm = trimmed.match(/^driver\s*=\s*(\S+)/i);
        if (dm) currentEntry.driver = dm[1];
        const pn = trimmed.match(/^public_name\s*=\s*(\S+)/i);
        if (pn) currentEntry.publicName = pn[1];
      }
    }
  }

  return { main, routers, transports, acls, authenticators };
}

function driverChipClass(driver) {
  const d = (driver || '').toLowerCase();
  return `eximcfg-chip-driver-${['dnslookup','accept','redirect','manualroute','smtp','appendfile','autoreply','pipe','plaintext'].includes(d) ? d : 'other'}`;
}

export function render(intake) {
  const text = intake.text || '';
  const { main, routers, transports, acls, authenticators } = parseEximConf(text);

  const get = (k) => main[k] || null;

  const primaryHostname = get('primary_hostname') || '';
  const localDomains = get('domainlist local_domains') || get('local_domains') || '';
  const tlsAdvertise = get('tls_advertise_hosts') || '';
  const tlsCert = get('tls_certificate') || '';
  const tlsKey = get('tls_privatekey') || '';
  const daemonPorts = get('daemon_smtp_ports') || '';

  const hasTls = !!tlsAdvertise;

  // --- Identity section ---
  const identityRows = [
    primaryHostname ? ['primary_hostname', primaryHostname] : null,
    localDomains ? ['domainlist local_domains', localDomains] : null,
    daemonPorts ? ['daemon_smtp_ports', daemonPorts] : null,
  ].filter(Boolean);

  let identityHtml = '';
  if (identityRows.length) {
    const rows = identityRows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('');
    identityHtml = `<div class="eximcfg-section">Identity</div>
<div class="eximcfg-card"><table class="eximcfg-table"><tbody>${rows}</tbody></table></div>`;
  }

  // --- TLS section ---
  let tlsHtml = '';
  {
    const tlsRows = [];
    const tlsChip = hasTls
      ? `<span class="eximcfg-chip eximcfg-chip-tls">TLS enabled</span>`
      : `<span class="eximcfg-chip eximcfg-chip-notls">TLS not configured</span>`;
    tlsRows.push(`<tr><td>tls_advertise_hosts</td><td>${hasTls ? tlsChip + ' <span style="font-family:ui-monospace,font-size:12px">' + esc(tlsAdvertise) + '</span>' : tlsChip}</td></tr>`);
    if (tlsCert) tlsRows.push(`<tr><td>tls_certificate</td><td><span style="font-family:ui-monospace,monospace;font-size:12px;">${esc(tlsCert)}</span></td></tr>`);
    if (tlsKey) tlsRows.push(`<tr><td>tls_privatekey</td><td><em style="color:var(--fg-2,#888);font-style:normal;">configured</em></td></tr>`);
    tlsHtml = `<div class="eximcfg-section">TLS</div>
<div class="eximcfg-card"><table class="eximcfg-table"><tbody>${tlsRows.join('')}</tbody></table></div>`;
  }

  // --- Routers table ---
  let routersHtml = '';
  if (routers.length) {
    const rows = routers.map((r) => {
      const driverChip = r.driver
        ? `<span class="eximcfg-chip ${driverChipClass(r.driver)}">${esc(r.driver)}</span>`
        : '<em style="color:var(--fg-2,#888)">—</em>';
      return `<tr><td>${esc(r.name)}</td><td>${driverChip}</td></tr>`;
    }).join('');
    routersHtml = `<div class="eximcfg-section">Routers</div>
<div class="eximcfg-card"><table class="eximcfg-entry-table"><tbody>${rows}</tbody></table></div>`;
  }

  // --- Transports table ---
  let transportsHtml = '';
  if (transports.length) {
    const rows = transports.map((t) => {
      const driverChip = t.driver
        ? `<span class="eximcfg-chip ${driverChipClass(t.driver)}">${esc(t.driver)}</span>`
        : '<em style="color:var(--fg-2,#888)">—</em>';
      return `<tr><td>${esc(t.name)}</td><td>${driverChip}</td></tr>`;
    }).join('');
    transportsHtml = `<div class="eximcfg-section">Transports</div>
<div class="eximcfg-card"><table class="eximcfg-entry-table"><tbody>${rows}</tbody></table></div>`;
  }

  // --- ACLs list ---
  let aclsHtml = '';
  if (acls.length) {
    const chips = acls.map((a) => `<span class="eximcfg-chip eximcfg-chip-acl">${esc(a)}</span>`).join('');
    aclsHtml = `<div class="eximcfg-section">ACLs</div>
<div class="eximcfg-card"><div class="eximcfg-chips">${chips}</div></div>`;
  }

  // --- Authenticators list ---
  let authHtml = '';
  if (authenticators.length) {
    const chips = authenticators.map((a) => {
      const label = a.publicName || a.name;
      return `<span class="eximcfg-chip eximcfg-chip-auth">${esc(label)}</span>`;
    }).join('');
    authHtml = `<div class="eximcfg-section">Authenticators</div>
<div class="eximcfg-card"><div class="eximcfg-chips">${chips}</div></div>`;
  }

  const sections = [identityHtml, tlsHtml, routersHtml, transportsHtml, aclsHtml, authHtml].filter(Boolean).join('');

  const host = document.createElement('div');
  host.className = 'eximcfg-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="eximcfg-title"><span class="eximcfg-badge">Exim</span>exim4.conf</div>
<div class="eximcfg-sub">Exim MTA configuration${primaryHostname ? ' · ' + esc(primaryHostname) : ''}</div>
${sections || '<p class="eximcfg-empty">No configuration found.</p>'}`;

  return { parentNode: host };
}
