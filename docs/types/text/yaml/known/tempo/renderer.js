import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const REDACT = new Set(['access_key', 'secret_access_key', 'secret_key', 'password', 'credentials', 'account_key', 'client_secret', 'endpoint_credential']);
function redact(key, val) {
  if (REDACT.has(String(key).toLowerCase())) return '[configured]';
  return val;
}

const CSS = `
.tempo-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-tempo{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#FF5900;color:#fff;vertical-align:middle;margin-right:8px}
.tempo-title{font-size:18px;font-weight:700;margin:0 0 4px}
.tempo-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.tempo-sec{margin:14px 0}
.tempo-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px}
.tempo-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);margin:6px 0}
.tempo-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px}
.tempo-kv-k{color:var(--fg-2,#888);min-width:160px;flex-shrink:0}
.tempo-kv-v{font-family:ui-monospace,monospace;word-break:break-all}
.tempo-chip{display:inline-flex;align-items:center;font-size:11px;padding:3px 9px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:2px 4px 2px 0}
.tempo-tag{display:inline-block;font-size:11px;padding:2px 7px;border-radius:5px;background:#fff3ee;border:1px solid #ffc9a8;color:#c04000;margin-left:4px}
.tempo-redact{font-size:11px;color:var(--fg-2,#888);font-style:italic}
`;

function kv(label, value) {
  if (value == null || value === '' || value === false) return '';
  return `<div class="tempo-kv"><span class="tempo-kv-k">${esc(label)}</span><span class="tempo-kv-v">${esc(String(value))}</span></div>`;
}

function chips(items) {
  if (!items || !items.length) return '';
  return items.map((i) => `<span class="tempo-chip">${esc(String(i))}</span>`).join('');
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  // Server
  const server = cfg.server || {};
  const httpPort = server.http_listen_port || '';
  const grpcPort = server.grpc_listen_port || '';
  const serverHtml = (httpPort || grpcPort) ? `<div class="tempo-sec"><h3>Server</h3><div class="tempo-card">
${kv('http_listen_port', httpPort)}
${kv('grpc_listen_port', grpcPort)}
</div></div>` : '';

  // Distributor / receivers
  const distributor = cfg.distributor || {};
  const receiversObj = distributor.receivers || cfg.receivers || {};
  const receiverNames = Object.keys(receiversObj);
  const distributorHtml = receiverNames.length ? `<div class="tempo-sec"><h3>Distributor</h3><div class="tempo-card">
<div class="tempo-kv"><span class="tempo-kv-k">receivers</span><span>${chips(receiverNames)}</span></div>
</div></div>` : '';

  // Ingester
  const ingester = cfg.ingester || {};
  const lifecycler = ingester.lifecycler || {};
  const ring = lifecycler.ring || {};
  const replFactor = ring.replication_factor || ingester.replication_factor || '';
  const traceIdle = ingester.trace_idle_period || '';
  const maxBlockDur = ingester.max_block_duration || '';
  const ingesterHtml = (replFactor || traceIdle || maxBlockDur) ? `<div class="tempo-sec"><h3>Ingester</h3><div class="tempo-card">
${kv('replication_factor', replFactor)}
${kv('trace_idle_period', traceIdle)}
${kv('max_block_duration', maxBlockDur)}
</div></div>` : '';

  // Storage
  const storageCfg = cfg.storage || cfg.trace || {};
  const backend = storageCfg.backend || storageCfg.trace?.backend || '';
  let bucketName = '';
  let storageDetails = '';
  if (backend === 's3' || storageCfg.s3) {
    const s3 = storageCfg.s3 || {};
    bucketName = s3.bucket || '';
    storageDetails = [
      kv('backend', 's3'),
      kv('bucket', bucketName),
      kv('endpoint', s3.endpoint || ''),
      kv('access_key', redact('access_key', s3.access_key || '')),
      kv('secret_key', redact('secret_key', s3.secret_key || '')),
    ].join('');
  } else if (backend === 'gcs' || storageCfg.gcs) {
    const gcs = storageCfg.gcs || {};
    bucketName = gcs.bucket_name || '';
    storageDetails = [kv('backend', 'gcs'), kv('bucket_name', bucketName)].join('');
  } else if (backend === 'azure' || storageCfg.azure) {
    const az = storageCfg.azure || {};
    storageDetails = [
      kv('backend', 'azure'),
      kv('container_name', az.container_name || ''),
      kv('account_key', redact('account_key', az.account_key || '')),
    ].join('');
  } else if (backend === 'local' || storageCfg.local) {
    const local = storageCfg.local || {};
    storageDetails = [kv('backend', 'local'), kv('path', local.path || '')].join('');
  } else if (backend) {
    storageDetails = kv('backend', backend);
  }

  const storageHtml = storageDetails ? `<div class="tempo-sec"><h3>Storage</h3><div class="tempo-card">${storageDetails}</div></div>` : '';

  // Compactor
  const compactor = cfg.compactor || {};
  const compactorBlock = compactor.ring || compactor.compaction || compactor;
  const compactorHtml = Object.keys(compactor).length ? `<div class="tempo-sec"><h3>Compactor</h3><div class="tempo-card">
${kv('working_directory', compactor.working_directory || '')}
${kv('block_retention', compactor.block_retention || '')}
</div></div>` : '';

  // Query frontend
  const queryFrontend = cfg.query_frontend || {};
  const searchMaxDur = queryFrontend.search?.max_duration || '';
  const queryFrontendHtml = searchMaxDur ? `<div class="tempo-sec"><h3>Query Frontend</h3><div class="tempo-card">
${kv('search.max_duration', searchMaxDur)}
</div></div>` : '';

  // Querier
  const querier = cfg.querier || {};
  const frontendWorkerAddr = querier.frontend_worker?.address || querier.frontend_worker?.grpc_client_config?.grpc_compression || '';
  const frontendWorkerDisplay = querier.frontend_worker?.address || '';
  const querierHtml = frontendWorkerDisplay ? `<div class="tempo-sec"><h3>Querier</h3><div class="tempo-card">
${kv('frontend_worker.address', frontendWorkerDisplay)}
</div></div>` : '';

  // Metrics generator
  const metricsGen = cfg.metrics_generator || {};
  const metricsGenEnabled = cfg.enabled_features ? String(cfg.enabled_features).includes('metrics-generator') : Object.keys(metricsGen).length > 0;
  const metricsGenHtml = Object.keys(metricsGen).length ? `<div class="tempo-sec"><h3>Metrics Generator</h3><div class="tempo-card">
${kv('storage.path', metricsGen.storage?.path || '')}
${kv('ring.kvstore.store', metricsGen.ring?.kvstore?.store || '')}
</div></div>` : '';

  // Summary line
  const subParts = [];
  if (httpPort) subParts.push(`port ${httpPort}`);
  if (receiverNames.length) subParts.push(`receivers: ${receiverNames.slice(0, 3).join(', ')}`);
  if (backend) subParts.push(`storage: ${backend}`);

  const host = document.createElement('div');
  host.className = 'tempo-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-tempo">Tempo</span>
  <span class="tempo-title">Grafana Tempo</span>
</div>
<div class="tempo-sub">${esc(subParts.join(' · '))}</div>
${serverHtml}${distributorHtml}${ingesterHtml}${storageHtml}${compactorHtml}${queryFrontendHtml}${querierHtml}${metricsGenHtml}`;
  return { parentNode: host };
}
