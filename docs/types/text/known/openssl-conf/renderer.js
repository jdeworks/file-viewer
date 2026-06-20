const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.opensslcfg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.opensslcfg-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#CC2020;color:#fff;vertical-align:middle;margin-right:8px}
.opensslcfg-title{font-size:18px;font-weight:700;margin:0 0 10px;display:flex;align-items:center;gap:6px}
.opensslcfg-warn{display:flex;align-items:flex-start;gap:8px;padding:8px 12px;border-radius:6px;background:#fff8f0;border:1px solid #f0c04a;font-size:12px;color:#7a5c00;margin:0 0 14px}
.opensslcfg-warn-icon{font-size:14px;line-height:1.4;flex-shrink:0}
.opensslcfg-sec{margin:14px 0}
.opensslcfg-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.opensslcfg-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px}
.opensslcfg-row{display:flex;align-items:baseline;gap:10px;padding:3px 0;font-size:13px}
.opensslcfg-row:not(:last-child){border-bottom:1px solid var(--border,#e0e0e0)}
.opensslcfg-key{min-width:200px;color:var(--fg-2,#888);font-size:12px}
.opensslcfg-val{font:13px/1 ui-monospace,monospace;color:var(--fg,#24292f)}
.opensslcfg-flag{display:inline-block;padding:1px 7px;border-radius:8px;font-size:11px;font-weight:600}
.opensslcfg-flag-yes{background:#dafbe1;color:#1a7f37}
.opensslcfg-flag-no{background:#fdd;color:#c00}
.opensslcfg-pills{display:flex;flex-wrap:wrap;gap:5px;margin:4px 0}
.opensslcfg-pill{font:12px ui-monospace,monospace;padding:2px 8px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);color:var(--fg,#24292f)}
.opensslcfg-san-type{font-size:11px;color:var(--fg-2,#888);margin-right:4px}
`;

function parseSections(text) {
  const sections = {};
  let current = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/;[^=]*$/, '').replace(/#.*$/, '').trim();
    if (!line) continue;
    // Section header: [ name ] or [name]
    const secM = line.match(/^\[\s*([\w_]+)\s*\]$/);
    if (secM) {
      current = secM[1].toLowerCase();
      if (!sections[current]) sections[current] = {};
      continue;
    }
    if (current && line.includes('=')) {
      const eq = line.indexOf('=');
      const k = line.slice(0, eq).trim().toLowerCase().replace(/\s+/g, '_');
      const v = line.slice(eq + 1).trim();
      sections[current][k] = v;
    }
  }
  return sections;
}

function get(sections, ...sectionNames) {
  for (const n of sectionNames) {
    if (sections[n.toLowerCase()]) return sections[n.toLowerCase()];
  }
  return null;
}

function parseKeyUsage(val) {
  if (!val) return [];
  return val.split(',').map((s) => s.trim()).filter((s) => s && s !== 'critical');
}

function parseSANs(altNamesSection) {
  if (!altNamesSection) return [];
  return Object.entries(altNamesSection).map(([k, v]) => {
    const typeM = k.match(/^(dns|ip|email|uri)\.?\d*$/i);
    const type = typeM ? typeM[1].toUpperCase() : k.toUpperCase();
    return { type, value: v };
  });
}

export function render(intake) {
  const text = intake.text || '';
  const sections = parseSections(text);

  const req = get(sections, 'req');
  const dn = get(sections, 'req_distinguished_name', 'distinguished_name');
  const ca = get(sections, 'ca_default');
  const v3ca = get(sections, 'v3_ca');
  const v3req = get(sections, 'v3_req', 'server_cert');
  const altNames = get(sections, 'alt_names');

  const host = document.createElement('div');
  host.className = 'opensslcfg-doc';

  let html = `<style>${CSS}</style>`;
  html += `<div class="opensslcfg-title"><span class="opensslcfg-badge">OpenSSL</span>openssl.cnf</div>`;
  html += `<div class="opensslcfg-warn"><span class="opensslcfg-warn-icon">&#9888;</span><span><strong>Security note:</strong> This file configures PKI — never include private key material in configuration files.</span></div>`;

  // Request settings
  if (req) {
    html += `<div class="opensslcfg-sec"><h3>Request Settings</h3><div class="opensslcfg-card">`;
    if (req['default_bits']) html += `<div class="opensslcfg-row"><span class="opensslcfg-key">Key size</span><span class="opensslcfg-val">${esc(req['default_bits'])} bits</span></div>`;
    if (req['default_md']) html += `<div class="opensslcfg-row"><span class="opensslcfg-key">Digest algorithm</span><span class="opensslcfg-val">${esc(req['default_md'])}</span></div>`;
    if (req['x509_extensions']) html += `<div class="opensslcfg-row"><span class="opensslcfg-key">x509 extensions</span><span class="opensslcfg-val">${esc(req['x509_extensions'])}</span></div>`;
    if (req['req_extensions']) html += `<div class="opensslcfg-row"><span class="opensslcfg-key">Request extensions</span><span class="opensslcfg-val">${esc(req['req_extensions'])}</span></div>`;
    const prompt = req['prompt'] || '';
    if (prompt) html += `<div class="opensslcfg-row"><span class="opensslcfg-key">Prompt for input</span><span class="opensslcfg-flag ${prompt === 'no' ? 'opensslcfg-flag-no' : 'opensslcfg-flag-yes'}">${esc(prompt)}</span></div>`;
    html += `</div></div>`;
  }

  // Distinguished Name defaults
  if (dn && Object.keys(dn).length) {
    const labelMap = {
      countryname: 'Country', stateorprovincename: 'State/Province', localityname: 'Locality',
      organizationname: 'Organization', organizationalunitname: 'Org Unit', commonname: 'Common Name', emailaddress: 'Email',
    };
    const relevant = Object.entries(dn).filter(([k]) => !k.endsWith('_default') && !k.endsWith('_min') && !k.endsWith('_max') && labelMap[k]);
    if (relevant.length) {
      html += `<div class="opensslcfg-sec"><h3>Distinguished Name Defaults</h3><div class="opensslcfg-card">`;
      for (const [k, v] of relevant) {
        html += `<div class="opensslcfg-row"><span class="opensslcfg-key">${esc(labelMap[k])}</span><span class="opensslcfg-val">${esc(v)}</span></div>`;
      }
      html += `</div></div>`;
    }
  }

  // CA Settings
  if (ca) {
    html += `<div class="opensslcfg-sec"><h3>CA Settings</h3><div class="opensslcfg-card">`;
    if (ca['dir']) html += `<div class="opensslcfg-row"><span class="opensslcfg-key">CA directory</span><span class="opensslcfg-val">${esc(ca['dir'])}</span></div>`;
    if (ca['default_days']) html += `<div class="opensslcfg-row"><span class="opensslcfg-key">Certificate validity</span><span class="opensslcfg-val">${esc(ca['default_days'])} days</span></div>`;
    if (ca['default_md']) html += `<div class="opensslcfg-row"><span class="opensslcfg-key">Digest algorithm</span><span class="opensslcfg-val">${esc(ca['default_md'])}</span></div>`;
    if (ca['database']) html += `<div class="opensslcfg-row"><span class="opensslcfg-key">Certificate database</span><span class="opensslcfg-val">${esc(ca['database'])}</span></div>`;
    if (ca['certificate']) html += `<div class="opensslcfg-row"><span class="opensslcfg-key">CA certificate</span><span class="opensslcfg-val">${esc(ca['certificate'])}</span></div>`;
    html += `</div></div>`;
  }

  // x509 Extensions (CA flags, key usage)
  if (v3ca || v3req) {
    const ext = v3ca || v3req;
    const bc = ext['basicconstraints'] || ext['basic_constraints'] || '';
    const isCA = /CA:true/i.test(bc);
    const keyUsage = parseKeyUsage(ext['keyusage'] || ext['key_usage'] || '');
    const extKeyUsage = parseKeyUsage(ext['extendedkeyusage'] || ext['extended_key_usage'] || '');

    html += `<div class="opensslcfg-sec"><h3>x509 Extensions</h3><div class="opensslcfg-card">`;
    if (bc) html += `<div class="opensslcfg-row"><span class="opensslcfg-key">CA certificate</span><span class="opensslcfg-flag ${isCA ? 'opensslcfg-flag-yes' : 'opensslcfg-flag-no'}">${isCA ? 'Yes' : 'No'}</span></div>`;
    if (keyUsage.length) {
      html += `<div class="opensslcfg-row"><span class="opensslcfg-key">Key usage</span><span><div class="opensslcfg-pills">`;
      for (const u of keyUsage) html += `<span class="opensslcfg-pill">${esc(u)}</span>`;
      html += `</div></span></div>`;
    }
    if (extKeyUsage.length) {
      html += `<div class="opensslcfg-row"><span class="opensslcfg-key">Extended key usage</span><span><div class="opensslcfg-pills">`;
      for (const u of extKeyUsage) html += `<span class="opensslcfg-pill">${esc(u)}</span>`;
      html += `</div></span></div>`;
    }
    html += `</div></div>`;
  }

  // Subject Alternative Names
  const sans = parseSANs(altNames);
  if (sans.length) {
    html += `<div class="opensslcfg-sec"><h3>Subject Alternative Names <span style="font-size:11px;color:var(--fg-2,#888);font-weight:400">(${sans.length})</span></h3>`;
    html += `<div class="opensslcfg-pills">`;
    for (const { type, value } of sans) {
      html += `<span class="opensslcfg-pill"><span class="opensslcfg-san-type">${esc(type)}</span>${esc(value)}</span>`;
    }
    html += `</div></div>`;
  }

  host.innerHTML = html;
  return { parentNode: host };
}
