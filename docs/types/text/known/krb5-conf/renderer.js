const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.krb5cfg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.krb5cfg-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#003087;color:#fff;vertical-align:middle;margin-right:8px}
.krb5cfg-title{font-size:18px;font-weight:700;margin:0 0 10px;display:flex;align-items:center;gap:6px}
.krb5cfg-realm-chip{display:inline-block;padding:2px 10px;border-radius:10px;font-size:12px;font-weight:600;background:#e8f0fe;color:#1a3f9e;border:1px solid #b3c8f9;font-family:ui-monospace,monospace;margin:0 0 14px}
.krb5cfg-sec{margin:14px 0}
.krb5cfg-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.krb5cfg-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px}
.krb5cfg-row{display:flex;align-items:baseline;gap:10px;padding:3px 0;font-size:13px}
.krb5cfg-row:not(:last-child){border-bottom:1px solid var(--border,#e0e0e0)}
.krb5cfg-key{min-width:200px;color:var(--fg-2,#888);font-size:12px}
.krb5cfg-val{font:13px/1.4 ui-monospace,monospace;color:var(--fg,#24292f)}
.krb5cfg-flag{display:inline-block;padding:1px 7px;border-radius:8px;font-size:11px;font-weight:600}
.krb5cfg-flag-yes{background:#dafbe1;color:#1a7f37}
.krb5cfg-flag-no{background:#fdd;color:#c00}
.krb5cfg-pills{display:flex;flex-wrap:wrap;gap:5px;margin:2px 0}
.krb5cfg-pill{font:11px ui-monospace,monospace;padding:2px 8px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);color:var(--fg,#24292f)}
.krb5cfg-table{width:100%;border-collapse:collapse;font-size:13px}
.krb5cfg-table th{text-align:left;font-size:11px;font-weight:600;color:var(--fg-2,#888);padding:4px 8px 4px 0;border-bottom:2px solid var(--border,#e0e0e0)}
.krb5cfg-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;font-size:12px;vertical-align:top}
.krb5cfg-table tr:last-child td{border-bottom:none}
.krb5cfg-table td:first-child{font-weight:600;color:var(--fg,#24292f)}
.krb5cfg-kdc-list{margin:0;padding:0;list-style:none}
.krb5cfg-kdc-list li{padding:1px 0}
`;

function parseKrb5(text) {
  const result = { libdefaults: {}, realms: {}, domainRealm: {}, capaths: {}, logging: {} };
  let section = null;
  let realmName = null;
  let realmDepth = 0;
  let inRealmsSection = false;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;

    // Top-level section header
    const secM = line.match(/^\[\s*([\w_]+)\s*\]$/);
    if (secM) {
      section = secM[1].toLowerCase();
      inRealmsSection = (section === 'realms');
      realmName = null;
      realmDepth = 0;
      continue;
    }

    if (section === 'libdefaults') {
      const eq = line.indexOf('=');
      if (eq > 0) {
        const k = line.slice(0, eq).trim().toLowerCase();
        const v = line.slice(eq + 1).trim();
        result.libdefaults[k] = v;
      }
    } else if (inRealmsSection) {
      // Detect realm name: REALM = {
      const realmStart = line.match(/^([\w.@:-]+)\s*=\s*\{/);
      if (realmStart && realmDepth === 0) {
        realmName = realmStart[1];
        result.realms[realmName] = { kdcs: [], admin_server: null, master_kdc: null, default_domain: null };
        realmDepth = 1;
        continue;
      }
      if (line === '{') { realmDepth++; continue; }
      if (line === '}') {
        realmDepth = Math.max(0, realmDepth - 1);
        if (realmDepth === 0) realmName = null;
        continue;
      }
      if (realmName && realmDepth > 0) {
        const eq = line.indexOf('=');
        if (eq > 0) {
          const k = line.slice(0, eq).trim().toLowerCase();
          const v = line.slice(eq + 1).trim().replace(/;$/, '').trim();
          if (k === 'kdc') {
            result.realms[realmName].kdcs.push(v);
          } else if (k === 'admin_server') {
            result.realms[realmName].admin_server = v;
          } else if (k === 'master_kdc') {
            result.realms[realmName].master_kdc = v;
          } else if (k === 'default_domain') {
            result.realms[realmName].default_domain = v;
          }
        }
      }
    } else if (section === 'domain_realm') {
      const eq = line.indexOf('=');
      if (eq > 0) {
        const domain = line.slice(0, eq).trim();
        const realm = line.slice(eq + 1).trim();
        result.domainRealm[domain] = realm;
      }
    } else if (section === 'logging') {
      const eq = line.indexOf('=');
      if (eq > 0) {
        const k = line.slice(0, eq).trim().toLowerCase();
        const v = line.slice(eq + 1).trim();
        result.logging[k] = v;
      }
    }
  }

  return result;
}

export function render(intake) {
  const text = intake.text || '';
  const parsed = parseKrb5(text);
  const ld = parsed.libdefaults;

  const host = document.createElement('div');
  host.className = 'krb5cfg-doc';

  let html = `<style>${CSS}</style>`;
  html += `<div class="krb5cfg-title"><span class="krb5cfg-badge">Kerberos</span>krb5.conf</div>`;

  // Default realm chip
  if (ld['default_realm']) {
    html += `<div><span class="krb5cfg-realm-chip">Default realm: ${esc(ld['default_realm'])}</span></div>`;
  }

  // libdefaults card
  {
    const rows = [];
    if (ld['ticket_lifetime']) rows.push(['Ticket lifetime', ld['ticket_lifetime']]);
    if (ld['renew_lifetime']) rows.push(['Renewable lifetime', ld['renew_lifetime']]);
    if (ld['forwardable'] != null) rows.push(['Forwardable', ld['forwardable']]);
    if (ld['dns_lookup_realm'] != null) rows.push(['DNS realm lookup', ld['dns_lookup_realm']]);
    if (ld['dns_lookup_kdc'] != null) rows.push(['DNS KDC lookup', ld['dns_lookup_kdc']]);
    if (ld['rdns'] != null) rows.push(['Reverse DNS', ld['rdns']]);
    if (ld['no_addresses'] != null) rows.push(['No addresses', ld['no_addresses']]);

    const boolFlag = (v) => {
      const t = v === 'true';
      return `<span class="krb5cfg-flag ${t ? 'krb5cfg-flag-yes' : 'krb5cfg-flag-no'}">${esc(v)}</span>`;
    };
    const boolKeys = new Set(['forwardable', 'dns_lookup_realm', 'dns_lookup_kdc', 'rdns', 'no_addresses']);

    if (rows.length) {
      html += `<div class="krb5cfg-sec"><h3>Default Settings</h3><div class="krb5cfg-card">`;
      for (const [label, val] of rows) {
        const keyLower = label.toLowerCase().replace(/ /g, '_');
        // map label back to key for bool check
        const keyMap = {
          'Forwardable': 'forwardable', 'DNS realm lookup': 'dns_lookup_realm',
          'DNS KDC lookup': 'dns_lookup_kdc', 'Reverse DNS': 'rdns', 'No addresses': 'no_addresses',
        };
        const origKey = keyMap[label] || '';
        const valHtml = boolKeys.has(origKey) ? boolFlag(val) : `<span class="krb5cfg-val">${esc(val)}</span>`;
        html += `<div class="krb5cfg-row"><span class="krb5cfg-key">${esc(label)}</span>${valHtml}</div>`;
      }
      html += `</div></div>`;
    }

    // Encryption types
    const encTypes = ld['permitted_enctypes'] || ld['default_tkt_enctypes'] || ld['default_tgs_enctypes'] || '';
    if (encTypes) {
      const types = encTypes.split(/\s+/).filter(Boolean);
      html += `<div class="krb5cfg-sec"><h3>Encryption Types</h3>`;
      html += `<div class="krb5cfg-pills">`;
      for (const t of types) html += `<span class="krb5cfg-pill">${esc(t)}</span>`;
      html += `</div></div>`;
    }
  }

  // Realms table
  const realmEntries = Object.entries(parsed.realms);
  if (realmEntries.length) {
    html += `<div class="krb5cfg-sec"><h3>Realms <span style="font-size:11px;font-weight:400;color:var(--fg-2,#888)">(${realmEntries.length})</span></h3>`;
    html += `<div class="krb5cfg-card"><table class="krb5cfg-table"><thead><tr>`;
    html += `<th>Realm</th><th>KDC host(s)</th><th>Admin server</th></tr></thead><tbody>`;
    for (const [name, info] of realmEntries) {
      const kdcHtml = info.kdcs.length
        ? `<ul class="krb5cfg-kdc-list">${info.kdcs.map((k) => `<li>${esc(k)}</li>`).join('')}</ul>`
        : '—';
      html += `<tr><td>${esc(name)}</td><td>${kdcHtml}</td><td>${esc(info.admin_server || '—')}</td></tr>`;
    }
    html += `</tbody></table></div></div>`;
  }

  // Domain → Realm mappings
  const domainEntries = Object.entries(parsed.domainRealm);
  if (domainEntries.length) {
    html += `<div class="krb5cfg-sec"><h3>Domain → Realm Mappings <span style="font-size:11px;font-weight:400;color:var(--fg-2,#888)">(${domainEntries.length})</span></h3>`;
    html += `<div class="krb5cfg-card"><table class="krb5cfg-table"><thead><tr><th>Domain</th><th>Realm</th></tr></thead><tbody>`;
    for (const [domain, realm] of domainEntries) {
      html += `<tr><td>${esc(domain)}</td><td>${esc(realm)}</td></tr>`;
    }
    html += `</tbody></table></div></div>`;
  }

  // Logging
  const logEntries = Object.entries(parsed.logging);
  if (logEntries.length) {
    html += `<div class="krb5cfg-sec"><h3>Logging</h3><div class="krb5cfg-card">`;
    for (const [k, v] of logEntries) {
      html += `<div class="krb5cfg-row"><span class="krb5cfg-key">${esc(k)}</span><span class="krb5cfg-val">${esc(v)}</span></div>`;
    }
    html += `</div></div>`;
  }

  host.innerHTML = html;
  return { parentNode: host };
}
