import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.snmpexp-doc{padding:16px 18px;max-width:960px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.snmp-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#e6522c;color:#fff;vertical-align:middle;margin-right:8px;}
.snmp-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.snmp-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.snmp-sec{margin:16px 0;}
.snmp-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.snmp-table{width:100%;border-collapse:collapse;font-size:13px;}
.snmp-table th{text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:5px 10px;border-bottom:2px solid var(--border,#e0e0e0);}
.snmp-table td{padding:8px 10px;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.snmp-table tr:last-child td{border-bottom:none;}
.snmp-pill{display:inline-block;font-size:11px;padding:2px 7px;border-radius:4px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px;}
.snmp-tag{display:inline-block;font-size:11px;padding:2px 7px;border-radius:5px;background:#fff7ed;border:1px solid #fed7aa;color:#c2410c;margin-left:4px;}
.snmp-mono{font-family:ui-monospace,monospace;}
.snmp-kv{font-size:12px;color:var(--fg-2,#888);display:block;}
.snmp-kv span{color:var(--fg,#24292f);font-family:ui-monospace,monospace;}
.snmp-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin:6px 0;background:var(--bg,#fff);}
.snmp-card-name{font:13px/1.4 ui-monospace,monospace;font-weight:700;margin-bottom:6px;}
`;

function truncateOids(oids, max) {
  if (!Array.isArray(oids) || !oids.length) return '';
  const shown = oids.slice(0, max);
  const rest = oids.length - shown.length;
  return shown.map((o) => `<span class="snmp-pill">${esc(o)}</span>`).join('') +
    (rest > 0 ? `<span style="font-size:11px;color:var(--fg-2,#888)"> +${rest} more</span>` : '');
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  const modules = cfg.modules || {};
  const auths = cfg.auths || {};
  const moduleNames = Object.keys(modules);
  const authNames = Object.keys(auths);

  // Modules table
  const moduleRows = moduleNames.map((name) => {
    const mod = modules[name] || {};
    const walk = mod.walk || [];
    const get = mod.get || [];
    const metrics = Array.isArray(mod.metrics) ? mod.metrics.length : 0;
    const version = mod.version != null ? String(mod.version) : (mod.auth ? '' : '');
    const authRef = mod.auth ? String(mod.auth) : '';

    return `<tr>
<td class="snmp-mono" style="font-weight:600">${esc(name)}</td>
<td>${truncateOids(walk, 4) || '<span style="color:var(--fg-2,#888);font-size:12px">—</span>'}</td>
<td>${truncateOids(get, 3) || '<span style="color:var(--fg-2,#888);font-size:12px">—</span>'}</td>
<td style="text-align:center">${metrics ? `<strong>${metrics}</strong>` : '—'}</td>
<td class="snmp-mono">${esc(version)}</td>
<td class="snmp-mono">${esc(authRef)}</td>
</tr>`;
  }).join('');

  const modulesHtml = moduleNames.length ? `
<div class="snmp-sec">
<h3>Modules (${moduleNames.length})</h3>
<table class="snmp-table">
<thead><tr><th>Name</th><th>Walk OIDs</th><th>Get OIDs</th><th>Metrics</th><th>Version</th><th>Auth</th></tr></thead>
<tbody>${moduleRows}</tbody>
</table>
</div>` : '';

  // Auths section
  let authsHtml = '';
  if (authNames.length) {
    const authCards = authNames.map((name) => {
      const auth = auths[name] || {};
      const rows = [];
      if (auth.community != null) rows.push(`<span class="snmp-kv">community: <span>[configured]</span></span>`);
      if (auth.security_level) rows.push(`<span class="snmp-kv">security_level: <span>${esc(auth.security_level)}</span></span>`);
      if (auth.username) rows.push(`<span class="snmp-kv">username: <span>${esc(auth.username)}</span></span>`);
      if (auth.auth_protocol) rows.push(`<span class="snmp-kv">auth_protocol: <span>${esc(auth.auth_protocol)}</span></span>`);
      if (auth.auth_password != null) rows.push(`<span class="snmp-kv">auth_password: <span>[configured]</span></span>`);
      if (auth.priv_protocol) rows.push(`<span class="snmp-kv">priv_protocol: <span>${esc(auth.priv_protocol)}</span></span>`);
      if (auth.priv_password != null) rows.push(`<span class="snmp-kv">priv_password: <span>[configured]</span></span>`);
      if (auth.version != null) rows.push(`<span class="snmp-kv">version: <span>${esc(String(auth.version))}</span></span>`);
      return `<div class="snmp-card"><div class="snmp-card-name">${esc(name)}</div>${rows.join('')}</div>`;
    }).join('');
    authsHtml = `<div class="snmp-sec"><h3>Auth Profiles (${authNames.length})</h3>${authCards}</div>`;
  }

  const sub = [
    moduleNames.length ? `${moduleNames.length} module${moduleNames.length !== 1 ? 's' : ''}` : '',
    authNames.length ? `${authNames.length} auth profile${authNames.length !== 1 ? 's' : ''}` : '',
  ].filter(Boolean).join(' · ');

  const host = document.createElement('div');
  host.className = 'snmpexp-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="snmp-badge">Prometheus</span>
  <span class="snmp-title">SNMP Exporter</span>
  ${moduleNames.length ? `<span class="snmp-tag">${moduleNames.length} module${moduleNames.length !== 1 ? 's' : ''}</span>` : ''}
</div>
<div class="snmp-sub">${esc(sub)}</div>
${modulesHtml}${authsHtml}`;
  return { parentNode: host };
}
