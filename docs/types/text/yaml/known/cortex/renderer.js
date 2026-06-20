import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const REDACT_KEYS = new Set(['access_key', 'secret_access_key', 'secret_key', 'password', 'account_key', 'client_secret', 'credentials']);
function redact(key, val) {
  if (REDACT_KEYS.has(String(key).toLowerCase())) return '[configured]';
  return val;
}

const CSS = `
.cortex-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-cortex{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#FF7600;color:#fff;vertical-align:middle;margin-right:8px}
.cortex-title{font-size:18px;font-weight:700;margin:0 0 4px}
.cortex-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.cortex-sec{margin:14px 0}
.cortex-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px}
.cortex-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);margin:6px 0}
.cortex-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px}
.cortex-kv-k{color:var(--fg-2,#888);min-width:200px;flex-shrink:0}
.cortex-kv-v{font-family:ui-monospace,monospace;word-break:break-all}
.cortex-tag{display:inline-block;font-size:11px;padding:2px 7px;border-radius:5px;background:#fff4ee;border:1px solid #ffccaa;color:#b84500;margin-left:4px}
.cortex-chip{display:inline-block;font-size:12px;padding:2px 8px;border-radius:6px;background:#fff4ee;border:1px solid #ffccaa;color:#b84500;font-family:ui-monospace,monospace;margin-left:6px}
`;

function kv(label, value) {
  if (value == null || value === '' || value === false) return '';
  return `<div class="cortex-kv"><span class="cortex-kv-k">${esc(label)}</span><span class="cortex-kv-v">${esc(String(value))}</span></div>`;
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  // Target
  const target = cfg.target || '';
  const targetHtml = target ? `<div class="cortex-sec"><h3>Target</h3><div class="cortex-card">
${kv('target', target)}
</div></div>` : '';

  // Server
  const server = cfg.server || {};
  const httpPort = server.http_listen_port || '';
  const grpcPort = server.grpc_listen_port || '';
  const serverHtml = (httpPort || grpcPort) ? `<div class="cortex-sec"><h3>Server</h3><div class="cortex-card">
${kv('http_listen_port', httpPort)}
${kv('grpc_listen_port', grpcPort)}
</div></div>` : '';

  // Blocks storage
  const blocksCfg = cfg.blocks_storage || {};
  const storageBackend = blocksCfg.backend || '';
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
  const storageHtml = (storageDetails || tsdbDir) ? `<div class="cortex-sec"><h3>Blocks Storage</h3><div class="cortex-card">
${storageDetails}
${tsdbDir ? kv('tsdb.dir', tsdbDir) : ''}
</div></div>` : '';

  // Distributor
  const distributor = cfg.distributor || {};
  const distRingStore = distributor.ring?.kvstore?.store || '';
  const distReplFactor = distributor.ring?.replication_factor || '';
  const distributorHtml = (distRingStore || distReplFactor) ? `<div class="cortex-sec"><h3>Distributor</h3><div class="cortex-card">
${kv('ring.kvstore.store', distRingStore)}
${kv('ring.replication_factor', distReplFactor)}
</div></div>` : '';

  // Ingester
  const ingester = cfg.ingester || {};
  const ingKvStore = ingester.ring?.kvstore?.store || ingester.lifecycler?.ring?.kvstore?.store || '';
  const ingReplFactor = ingester.ring?.replication_factor || ingester.lifecycler?.replication_factor || '';
  const ingesterHtml = (ingKvStore || ingReplFactor) ? `<div class="cortex-sec"><h3>Ingester</h3><div class="cortex-card">
${kv('ring.kvstore.store', ingKvStore)}
${kv('ring.replication_factor', ingReplFactor)}
</div></div>` : '';

  // Store gateway
  const storeGateway = cfg.store_gateway || {};
  const sgSharding = storeGateway.sharding_enabled != null ? String(storeGateway.sharding_enabled) : '';
  const storeGatewayHtml = sgSharding ? `<div class="cortex-sec"><h3>Store Gateway</h3><div class="cortex-card">
${kv('sharding_enabled', sgSharding)}
</div></div>` : '';

  // Compactor
  const compactor = cfg.compactor || {};
  const compactorHtml = compactor.working_directory ? `<div class="cortex-sec"><h3>Compactor</h3><div class="cortex-card">
${kv('working_directory', compactor.working_directory)}
</div></div>` : '';

  // Ruler storage
  const rulerStorage = cfg.ruler_storage || {};
  const rulerBackend = rulerStorage.backend || '';
  const rulerHtml = rulerBackend ? `<div class="cortex-sec"><h3>Ruler Storage</h3><div class="cortex-card">
${kv('backend', rulerBackend)}
</div></div>` : '';

  // Frontend
  const frontend = cfg.frontend || {};
  const frontendAddr = frontend.address || frontend.downstream_url || '';
  const frontendHtml = frontendAddr ? `<div class="cortex-sec"><h3>Frontend</h3><div class="cortex-card">
${kv('address', frontendAddr)}
</div></div>` : '';

  // Summary
  const subParts = [];
  if (httpPort) subParts.push(`port ${httpPort}`);
  if (target) subParts.push(`target: ${target}`);
  if (storageBackend) subParts.push(`storage: ${storageBackend}`);

  const host = document.createElement('div');
  host.className = 'cortex-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-cortex">Cortex</span>
  <span class="cortex-title">Grafana Cortex</span>
  ${target ? `<span class="cortex-chip">${esc(target)}</span>` : ''}
</div>
<div class="cortex-sub">${esc(subParts.join(' · '))}</div>
${serverHtml}${targetHtml}${storageHtml}${distributorHtml}${ingesterHtml}${storeGatewayHtml}${compactorHtml}${rulerHtml}${frontendHtml}`;
  return { parentNode: host };
}
