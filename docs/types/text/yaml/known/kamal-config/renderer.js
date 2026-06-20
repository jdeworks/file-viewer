import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const SECRET_RE = /SECRET|PASSWORD|TOKEN|KEY|API|PRIVATE/i;

const CSS = `
.kamal-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-kamal{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#e74c3c;color:#fff;vertical-align:middle;margin-right:8px}
.kamal-title{font-size:18px;font-weight:700;margin:0 0 4px}
.kamal-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.kamal-sec{margin:12px 0}
.kamal-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;padding-bottom:4px;border-bottom:1px solid var(--border,#e0e0e0)}
.kamal-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px}
.kamal-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:8px 12px}
.kamal-card-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--fg-2,#888);margin-bottom:4px}
.kamal-card-val{font-size:13px;font-family:ui-monospace,monospace;word-break:break-all}
.kamal-table{width:100%;border-collapse:collapse;font-size:13px}
.kamal-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0)}
.kamal-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;font-size:12px;font-family:ui-monospace,monospace}
.kamal-pill{display:inline-block;font-size:11px;padding:2px 8px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);margin:2px 2px 2px 0;font-family:ui-monospace,monospace}
.kamal-secret{color:var(--fg-2,#888);font-style:italic}
.kamal-role{display:inline-block;padding:1px 6px;border-radius:6px;font-size:10px;font-weight:700;background:#fff3cd;border:1px solid #ffc107;color:#856404;margin-right:4px}
.kamal-kv{display:grid;grid-template-columns:180px 1fr;gap:2px 12px;font-size:12px}
.kamal-kv dt{color:var(--fg-2,#888);padding:3px 0;border-bottom:1px solid var(--border,#e0e0e0)}
.kamal-kv dd{padding:3px 0;border-bottom:1px solid var(--border,#e0e0e0);margin:0;font-family:ui-monospace,monospace;word-break:break-all}
`;

function maskEnv(envObj) {
  if (!envObj || typeof envObj !== 'object') return [];
  return Object.entries(envObj).map(([k, v]) => {
    const masked = SECRET_RE.test(k);
    return { key: k, value: masked ? '[configured]' : String(v ?? ''), masked };
  });
}

function flatEnv(envBlock) {
  if (!envBlock) return [];
  const rows = [];
  if (envBlock.clear && typeof envBlock.clear === 'object') {
    rows.push(...maskEnv(envBlock.clear));
  } else if (typeof envBlock === 'object' && !Array.isArray(envBlock)) {
    // flat style: env: { KEY: val, ... }
    rows.push(...maskEnv(envBlock));
  }
  if (Array.isArray(envBlock.secret)) {
    rows.push(...envBlock.secret.map((k) => ({ key: String(k), value: '[configured]', masked: true })));
  }
  return rows;
}

function serverList(servers) {
  if (!servers) return [];
  if (Array.isArray(servers)) return servers.map(String);
  if (typeof servers === 'object') {
    const out = [];
    for (const [role, hosts] of Object.entries(servers)) {
      const list = Array.isArray(hosts) ? hosts : (hosts?.hosts ? hosts.hosts : [hosts]);
      for (const h of list) out.push(`${role}:${h}`);
    }
    return out;
  }
  return [String(servers)];
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  const service = cfg.service || '';
  const image = cfg.image || '';
  const registry = cfg.registry || {};
  const proxy = cfg.proxy || {};
  const servers = cfg.servers || {};
  const volumes = Array.isArray(cfg.volumes) ? cfg.volumes : (cfg.volumes ? [cfg.volumes] : []);
  const labels = cfg.labels || {};
  const accessories = cfg.accessories || {};
  const boot = cfg.boot || {};
  const envRows = flatEnv(cfg.env);

  // Separate web vs worker servers
  const serverEntries = servers
    ? (Array.isArray(servers) ? [{ role: 'web', hosts: servers }] : Object.entries(servers).map(([role, v]) => ({
        role,
        hosts: Array.isArray(v) ? v : (v?.hosts || [v]),
      })))
    : [];

  const subParts = [];
  if (service) subParts.push(service);
  const totalServers = serverEntries.reduce((acc, e) => acc + (Array.isArray(e.hosts) ? e.hosts.length : 1), 0);
  if (totalServers) subParts.push(`${totalServers} server${totalServers !== 1 ? 's' : ''}`);
  const accCount = Object.keys(accessories).length;
  if (accCount) subParts.push(`${accCount} accessor${accCount !== 1 ? 'ies' : 'y'}`);

  // Overview cards
  const overviewItems = [];
  if (service) overviewItems.push({ label: 'Service', val: service });
  if (image) overviewItems.push({ label: 'Image', val: image });
  const regServer = registry.server || registry.hostname || '';
  if (regServer) overviewItems.push({ label: 'Registry', val: regServer });
  const healthcheck = proxy?.healthcheck?.path || proxy?.healthcheck || '';
  if (healthcheck) overviewItems.push({ label: 'Healthcheck', val: typeof healthcheck === 'string' ? healthcheck : (healthcheck.path || '') });
  const proxyPort = proxy?.app_port || proxy?.host_port || '';
  if (proxyPort) overviewItems.push({ label: 'App Port', val: String(proxyPort) });

  const overviewHtml = overviewItems.length
    ? `<div class="kamal-sec"><h3>Overview</h3><div class="kamal-grid">${overviewItems.map((i) =>
        `<div class="kamal-card"><div class="kamal-card-title">${esc(i.label)}</div><div class="kamal-card-val">${esc(i.val)}</div></div>`
      ).join('')}</div></div>`
    : '';

  // Servers
  const serversHtml = serverEntries.length
    ? `<div class="kamal-sec"><h3>Servers</h3>${serverEntries.map((e) => {
        const hosts = Array.isArray(e.hosts) ? e.hosts : [e.hosts];
        return `<div style="margin-bottom:6px"><span class="kamal-role">${esc(e.role)}</span>${hosts.map((h) => `<span class="kamal-pill">${esc(h)}</span>`).join('')}</div>`;
      }).join('')}</div>`
    : '';

  // Env vars
  const envHtml = envRows.length
    ? `<div class="kamal-sec"><h3>Environment (${envRows.length} var${envRows.length !== 1 ? 's' : ''})</h3>
      <table class="kamal-table">
        <thead><tr><th>Key</th><th>Value</th></tr></thead>
        <tbody>${envRows.map((r) =>
          `<tr><td>${esc(r.key)}</td><td>${r.masked ? `<span class="kamal-secret">[configured]</span>` : esc(r.value)}</td></tr>`
        ).join('')}</tbody>
      </table></div>`
    : '';

  // Volumes
  const volHtml = volumes.length
    ? `<div class="kamal-sec"><h3>Volumes (${volumes.length})</h3><div>${volumes.map((v) => `<span class="kamal-pill">${esc(v)}</span>`).join('')}</div></div>`
    : '';

  // Labels
  const labelEntries = typeof labels === 'object' ? Object.entries(labels) : [];
  const labelsHtml = labelEntries.length
    ? `<div class="kamal-sec"><h3>Labels</h3><dl class="kamal-kv">${labelEntries.map(([k, v]) =>
        `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`
      ).join('')}</dl></div>`
    : '';

  // Accessories
  const accEntries = Object.entries(accessories);
  const accHtml = accEntries.length
    ? `<div class="kamal-sec"><h3>Accessories (${accEntries.length})</h3><div>${accEntries.map(([name, acc]) => {
        const accImg = acc?.image || '';
        return `<span class="kamal-pill" title="${esc(accImg)}">${esc(name)}${accImg ? ` <span style="color:var(--fg-2,#888);font-size:10px">(${esc(accImg)})</span>` : ''}</span>`;
      }).join('')}</div></div>`
    : '';

  // Boot settings
  const bootItems = [];
  if (boot.limit != null) bootItems.push({ label: 'Limit', val: String(boot.limit) });
  if (boot.wait != null) bootItems.push({ label: 'Wait', val: String(boot.wait) });
  const bootHtml = bootItems.length
    ? `<div class="kamal-sec"><h3>Boot Settings</h3><dl class="kamal-kv">${bootItems.map((i) =>
        `<dt>${esc(i.label)}</dt><dd>${esc(i.val)}</dd>`
      ).join('')}</dl></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'kamal-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="kamal-title"><span class="badge-kamal">Kamal</span>${esc(service || 'kamal.yml')}</div>
<div class="kamal-sub">${esc(subParts.join(' · ') || 'Kamal 2 deployment config')}</div>
${overviewHtml}${serversHtml}${envHtml}${volHtml}${labelsHtml}${accHtml}${bootHtml}`;
  return { parentNode: host };
}
