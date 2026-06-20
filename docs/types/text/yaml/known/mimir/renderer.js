import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const REDACT_KEYS = new Set(['access_key', 'secret_access_key', 'secret_key', 'password', 'account_key', 'client_secret', 'credentials']);
function redact(key, val) {
  if (REDACT_KEYS.has(String(key).toLowerCase())) return '[configured]';
  return val;
}

const CSS = `
.mimir-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-mimir{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#FF7600;color:#fff;vertical-align:middle;margin-right:8px}
.mimir-title{font-size:18px;font-weight:700;margin:0 0 4px}
.mimir-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.mimir-sec{margin:14px 0}
.mimir-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px}
.mimir-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);margin:6px 0}
.mimir-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px}
.mimir-kv-k{color:var(--fg-2,#888);min-width:200px;flex-shrink:0}
.mimir-kv-v{font-family:ui-monospace,monospace;word-break:break-all}
.mimir-tag{display:inline-block;font-size:11px;padding:2px 7px;border-radius:5px;background:#fff4ee;border:1px solid #ffccaa;color:#b84500;margin-left:4px}
.mimir-redact{font-size:11px;color:var(--fg-2,#888);font-style:italic}
`;

function kv(label, value) {
  if (value == null || value === '' || value === false) return '';
  return `<div class="mimir-kv"><span class="mimir-kv-k">${esc(label)}</span><span class="mimir-kv-v">${esc(String(value))}</span></div>`;
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  // Common / Server
  const server = cfg.server || cfg.common?.server || {};
  const httpPort = server.http_listen_port || cfg.common?.http_listen_port || '';
  const grpcPort = server.grpc_listen_port || '';
  const serverHtml = (httpPort || grpcPort) ? `<div class="mimir-sec"><h3>Server</h3><div class="mimir-card">
${kv('http_listen_port', httpPort)}
${kv('grpc_listen_port', grpcPort)}
</div></div>` : '';

  // Target (multiprocess mode)
  const target = cfg.target || '';
  const targetHtml = target ? `<div class="mimir-sec"><h3>Target</h3><div class="mimir-card">
${kv('target', target)}
</div></div>` : '';

  // Blocks storage
  const blocksCfg = cfg.blocks_storage || cfg.common?.blocks_storage || {};
  const storageBackend = blocksCfg.backend || cfg.common?.storage?.backend || '';
  let storageDetails = '';
  if (storageBackend === 's3' || blocksCfg.s3) {
    const s3 = blocksCfg.s3 || {};
    storageDetails = [
      kv('backend', 's3'),
      kv('bucket_name', s3.bucket_name || s3.bucket || ''),
      kv('endpoint', s3.endpoint || ''),
      kv('region', s3.region || ''),
      kv('access_key_id', redact('access_key', s3.access_key_id || '')),
      kv('secret_access_key', redact('secret_access_key', s3.secret_access_key || '')),
    ].join('');
  } else if (storageBackend === 'gcs' || blocksCfg.gcs) {
    const gcs = blocksCfg.gcs || {};
    storageDetails = [kv('backend', 'gcs'), kv('bucket_name', gcs.bucket_name || '')].join('');
  } else if (storageBackend === 'azure' || blocksCfg.azure) {
    const az = blocksCfg.azure || {};
    storageDetails = [
      kv('backend', 'azure'),
      kv('container_name', az.container_name || ''),
      kv('account_key', redact('account_key', az.account_key || '')),
    ].join('');
  } else if (storageBackend === 'filesystem' || blocksCfg.filesystem) {
    const fs = blocksCfg.filesystem || {};
    storageDetails = [kv('backend', 'filesystem'), kv('dir', fs.dir || '')].join('');
  } else if (storageBackend) {
    storageDetails = kv('backend', storageBackend);
  }

  const tsdbDir = blocksCfg.tsdb?.dir || '';
  const storageHtml = (storageDetails || tsdbDir) ? `<div class="mimir-sec"><h3>Blocks Storage</h3><div class="mimir-card">
${storageDetails}
${tsdbDir ? kv('tsdb.dir', tsdbDir) : ''}
</div></div>` : '';

  // Distributor
  const distributor = cfg.distributor || {};
  const distRingStore = distributor.ring?.kvstore?.store || '';
  const haTracker = distributor.ha_tracker?.enable_ha_tracker;
  const distributorHtml = (distRingStore || haTracker != null) ? `<div class="mimir-sec"><h3>Distributor</h3><div class="mimir-card">
${kv('ring.kvstore.store', distRingStore)}
${haTracker != null ? kv('ha_tracker.enable_ha_tracker', haTracker) : ''}
</div></div>` : '';

  // Ingester
  const ingester = cfg.ingester || {};
  const ingReplFactor = ingester.ring?.replication_factor || '';
  const ingKvStore = ingester.ring?.kvstore?.store || '';
  const ingesterHtml = (ingReplFactor || ingKvStore) ? `<div class="mimir-sec"><h3>Ingester</h3><div class="mimir-card">
${kv('ring.replication_factor', ingReplFactor)}
${kv('ring.kvstore.store', ingKvStore)}
</div></div>` : '';

  // Store gateway
  const storeGateway = cfg.store_gateway || {};
  const sgSharding = storeGateway.sharding_enabled != null ? String(storeGateway.sharding_enabled) : '';
  const sgKvStore = storeGateway.sharding_ring?.kvstore?.store || storeGateway.ring?.kvstore?.store || '';
  const storeGatewayHtml = (sgSharding || sgKvStore) ? `<div class="mimir-sec"><h3>Store Gateway</h3><div class="mimir-card">
${kv('sharding_enabled', sgSharding)}
${kv('ring.kvstore.store', sgKvStore)}
</div></div>` : '';

  // Compactor
  const compactor = cfg.compactor || {};
  const compactorHtml = compactor.working_directory ? `<div class="mimir-sec"><h3>Compactor</h3><div class="mimir-card">
${kv('working_directory', compactor.working_directory)}
</div></div>` : '';

  // Limits
  const limits = cfg.limits || {};
  const limitKeys = ['ingestion_rate', 'ingestion_burst_size', 'max_global_series_per_user', 'max_global_series_per_metric', 'max_fetched_chunks_per_query', 'ruler_max_rules_per_rule_group'];
  const limitsRows = limitKeys.filter((k) => limits[k] != null).map((k) => kv(k, limits[k])).join('');
  const limitsHtml = limitsRows ? `<div class="mimir-sec"><h3>Limits</h3><div class="mimir-card">${limitsRows}</div></div>` : '';

  // Ruler storage
  const rulerStorage = cfg.ruler_storage || {};
  const rulerBackend = rulerStorage.backend || '';
  const rulerHtml = rulerBackend ? `<div class="mimir-sec"><h3>Ruler Storage</h3><div class="mimir-card">
${kv('backend', rulerBackend)}
</div></div>` : '';

  // Summary line
  const subParts = [];
  if (httpPort) subParts.push(`port ${httpPort}`);
  if (target) subParts.push(`target: ${target}`);
  if (storageBackend) subParts.push(`storage: ${storageBackend}`);

  const host = document.createElement('div');
  host.className = 'mimir-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-mimir">Mimir</span>
  <span class="mimir-title">Grafana Mimir</span>
</div>
<div class="mimir-sub">${esc(subParts.join(' · '))}</div>
${serverHtml}${targetHtml}${storageHtml}${distributorHtml}${ingesterHtml}${storeGatewayHtml}${compactorHtml}${limitsHtml}${rulerHtml}`;
  return { parentNode: host };
}
