import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.loki-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-loki{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#f5a623;color:#fff;vertical-align:middle;margin-right:8px;}
.loki-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.loki-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.loki-sec{margin:14px 0;}
.loki-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.loki-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin:6px 0;background:var(--bg,#fff);}
.loki-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:12px;}
.loki-kv-k{color:var(--fg-2,#888);min-width:150px;}
.loki-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.loki-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:2px 3px 2px 0;}
.loki-tag{display:inline-block;font-size:11px;padding:2px 7px;border-radius:5px;background:#fff7ed;border:1px solid #fed7aa;color:#c2410c;margin-left:4px;}
`;

function kv(label, value) {
  if (value == null || value === '' || value === false) return '';
  return `<div class="loki-kv"><span class="loki-kv-k">${esc(label)}</span><span class="loki-kv-v">${esc(String(value))}</span></div>`;
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
  const authEnabled = cfg.auth_enabled != null ? String(cfg.auth_enabled) : '';

  const serverHtml = (httpPort || grpcPort || authEnabled) ? `
<div class="loki-sec"><h3>Server</h3><div class="loki-card">
${kv('auth_enabled', authEnabled)}
${kv('http_listen_port', httpPort)}
${kv('grpc_listen_port', grpcPort)}
</div></div>` : '';

  // Storage
  const storageCfg = cfg.storage_config || {};
  const storageKeys = Object.keys(storageCfg);
  const backendName = storageKeys.find((k) => !['filesystem', 'boltdb_shipper', 'index_queries_cache_config'].includes(k) || storageKeys.length === 1)
    || storageKeys[0] || '';
  const fsDir = storageCfg.filesystem?.directory || '';
  const boltdbDir = storageCfg.boltdb_shipper?.active_index_directory || '';

  const storageHtml = storageKeys.length ? `
<div class="loki-sec"><h3>Storage</h3><div class="loki-card">
${storageKeys.map((k) => kv(k, typeof storageCfg[k] === 'object' ? JSON.stringify(storageCfg[k]).slice(0, 80) : storageCfg[k])).join('')}
</div></div>` : '';

  // Schema config
  const schemaCfg = cfg.schema_config || {};
  const periods = Array.isArray(schemaCfg.configs) ? schemaCfg.configs : [];
  const schemaHtml = periods.length ? `
<div class="loki-sec"><h3>Schema Periods (${periods.length})</h3>
${periods.map((p) => `<div class="loki-card">
${kv('from', p.from)}
${kv('store', p.store)}
${kv('object_store', p.object_store)}
${kv('schema', p.schema)}
</div>`).join('')}
</div>` : '';

  // Compactor
  const compactor = cfg.compactor || {};
  const compactorHtml = Object.keys(compactor).length ? `
<div class="loki-sec"><h3>Compactor</h3><div class="loki-card">
${kv('working_directory', compactor.working_directory)}
${kv('shared_store', compactor.shared_store)}
</div></div>` : '';

  // Limits
  const limits = cfg.limits_config || {};
  const limitsHtml = Object.keys(limits).length ? `
<div class="loki-sec"><h3>Limits</h3><div class="loki-card">
${kv('reject_old_samples', limits.reject_old_samples)}
${kv('reject_old_samples_max_age', limits.reject_old_samples_max_age)}
${kv('ingestion_rate_mb', limits.ingestion_rate_mb)}
${kv('ingestion_burst_size_mb', limits.ingestion_burst_size_mb)}
</div></div>` : '';

  const subParts = [];
  if (httpPort) subParts.push(`port ${httpPort}`);
  if (periods.length) subParts.push(`${periods.length} schema period${periods.length !== 1 ? 's' : ''}`);
  if (storageKeys.length) subParts.push(`storage: ${storageKeys.slice(0, 2).join(', ')}`);

  const host = document.createElement('div');
  host.className = 'loki-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-loki">Loki</span>
  <span class="loki-title">Configuration</span>
  ${periods.length ? `<span class="loki-tag">${periods.length} schema period${periods.length !== 1 ? 's' : ''}</span>` : ''}
</div>
<div class="loki-sub">${esc(subParts.join(' · '))}</div>
${serverHtml}${storageHtml}${schemaHtml}${compactorHtml}${limitsHtml}`;

  return { parentNode: host };
}
