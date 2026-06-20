import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.pt-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-pt{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#f5a623;color:#fff;vertical-align:middle;margin-right:8px;}
.pt-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.pt-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.pt-sec{margin:14px 0;}
.pt-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.pt-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin:6px 0;background:var(--bg,#fff);}
.pt-card-name{font:700 13px/1.4 ui-monospace,monospace;margin-bottom:4px;}
.pt-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:12px;}
.pt-kv-k{color:var(--fg-2,#888);min-width:130px;}
.pt-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.pt-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:2px 3px 2px 0;}
.pt-tag{display:inline-block;font-size:11px;padding:2px 7px;border-radius:5px;background:#fff7ed;border:1px solid #fed7aa;color:#c2410c;margin-left:4px;}
`;

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<div class="pt-kv"><span class="pt-kv-k">${esc(label)}</span><span class="pt-kv-v">${esc(String(value))}</span></div>`;
}

function extractHost(url) {
  try { return new URL(url).host; } catch { return url; }
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = {}; }

  // Server settings
  const server = cfg.server || {};
  const httpPort = server.http_listen_port || '';
  const grpcPort = server.grpc_listen_port || '';

  const serverHtml = (httpPort || grpcPort) ? `
<div class="pt-sec"><h3>Server</h3><div class="pt-card">
${kv('http_listen_port', httpPort)}
${kv('grpc_listen_port', grpcPort)}
</div></div>` : '';

  // Clients (Loki endpoints)
  const clients = Array.isArray(cfg.clients) ? cfg.clients : [];
  const clientUrls = clients.map((c) => c.url || '').filter(Boolean);
  const clientsHtml = clientUrls.length ? `
<div class="pt-sec"><h3>Loki Endpoints (${clientUrls.length})</h3>
<div class="pt-card">
${clientUrls.map((u) => `<div class="pt-kv"><span class="pt-kv-k">url</span><span class="pt-pill">${esc(extractHost(u))}</span></div>`).join('')}
</div></div>` : '';

  // Positions
  const positions = cfg.positions || {};
  const positionsHtml = positions.filename ? `
<div class="pt-sec"><h3>Positions</h3><div class="pt-card">
${kv('filename', positions.filename)}
</div></div>` : '';

  // Scrape configs
  const scrapeConfigs = Array.isArray(cfg.scrape_configs) ? cfg.scrape_configs : [];
  const scrapeHtml = scrapeConfigs.length ? `
<div class="pt-sec"><h3>Scrape Configs (${scrapeConfigs.length})</h3>
${scrapeConfigs.map((job) => {
    const staticConfigs = Array.isArray(job.static_configs) ? job.static_configs : [];
    const targets = staticConfigs.flatMap((sc) => Array.isArray(sc.targets) ? sc.targets : []);
    const labels = staticConfigs[0]?.labels ? Object.entries(staticConfigs[0].labels) : [];
    const pipeline = Array.isArray(job.pipeline_stages) ? job.pipeline_stages : [];
    return `<div class="pt-card">
<div class="pt-card-name">${esc(job.job_name || '(unnamed)')}</div>
${targets.length ? `<div class="pt-kv"><span class="pt-kv-k">targets</span><span style="display:flex;flex-wrap:wrap;gap:4px;">${targets.slice(0, 4).map((t) => `<span class="pt-pill">${esc(t)}</span>`).join('')}${targets.length > 4 ? `<span style="font-size:11px;color:var(--fg-2,#888)">+${targets.length - 4} more</span>` : ''}</span></div>` : ''}
${labels.length ? `<div class="pt-kv"><span class="pt-kv-k">labels</span><span style="display:flex;flex-wrap:wrap;gap:4px;">${labels.slice(0, 5).map(([k, v]) => `<span class="pt-pill">${esc(k)}=${esc(v)}</span>`).join('')}</span></div>` : ''}
${pipeline.length ? kv('pipeline_stages', String(pipeline.length)) : ''}
</div>`;
  }).join('')}
</div>` : '';

  const subParts = [];
  if (httpPort) subParts.push(`port ${httpPort}`);
  if (clientUrls.length) subParts.push(`→ ${clientUrls.slice(0, 2).map(extractHost).join(', ')}`);
  if (scrapeConfigs.length) subParts.push(`${scrapeConfigs.length} scrape job${scrapeConfigs.length !== 1 ? 's' : ''}`);

  const host = document.createElement('div');
  host.className = 'pt-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-pt">Promtail</span>
  <span class="pt-title">Config</span>
  ${scrapeConfigs.length ? `<span class="pt-tag">${scrapeConfigs.length} job${scrapeConfigs.length !== 1 ? 's' : ''}</span>` : ''}
</div>
<div class="pt-sub">${esc(subParts.join(' · '))}</div>
${serverHtml}${clientsHtml}${positionsHtml}${scrapeHtml}`;

  return { parentNode: host };
}
