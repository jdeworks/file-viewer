import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.jg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-jg{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#60acf9;color:#fff;vertical-align:middle;margin-right:8px}
.jg-title{font-size:18px;font-weight:700;margin:0 0 4px}
.jg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.jg-sec{margin:14px 0}
.jg-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px}
.jg-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);margin:6px 0}
.jg-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px}
.jg-kv-k{color:var(--fg-2,#888);min-width:140px;flex-shrink:0}
.jg-kv-v{font-family:ui-monospace,monospace;word-break:break-all}
.jg-pill{display:inline-block;font-size:11px;padding:2px 8px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin-right:4px}
.jg-tag{display:inline-block;font-size:11px;padding:2px 7px;border-radius:5px;background:#e8f4ff;border:1px solid #a5d3f7;color:#1565c0;margin-left:4px}
`;

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<div class="jg-kv"><span class="jg-kv-k">${esc(label)}</span><span class="jg-kv-v">${esc(value)}</span></div>`;
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = jsyaml.load(intake.text || '') || {};
  } catch { cfg = {}; }

  const storageType = cfg.span_storage_type || cfg.storage?.type || 'memory';
  const samplingStrategy = cfg.sampling?.strategies_file
    ? `file: ${cfg.sampling.strategies_file}`
    : cfg.sampling?.default_sampling_probability != null
      ? `probability: ${cfg.sampling.default_sampling_probability}`
      : cfg.sampling?.type || 'default';

  const subParts = [
    `storage: ${storageType}`,
    samplingStrategy ? `sampling: ${samplingStrategy}` : '',
  ].filter(Boolean);

  // Query section
  const queryPort = cfg.query?.port || cfg.http_server?.port || 16686;
  const queryBasePath = cfg.query?.['base-path'] || cfg.query?.base_path || '';
  const queryHtml = `<div class="jg-sec"><h3>Query</h3><div class="jg-card">
${kv('Port', queryPort)}
${queryBasePath ? kv('Base path', queryBasePath) : ''}
</div></div>`;

  // Collector section
  const zipkinPort = cfg.collector?.zipkin?.['host-port'] || cfg.collector?.zipkin?.host_port || '';
  const httpPort = cfg.collector?.['http-port'] || cfg.collector?.http_port || '';
  const grpcPort = cfg.collector?.['grpc-port'] || cfg.collector?.grpc_port || '';
  const numWorkers = cfg.collector?.['num-workers'] || cfg.collector?.num_workers || '';
  const queueSize = cfg.collector?.['queue-size'] || cfg.collector?.queue_size || '';
  const collectorHtml = (zipkinPort || httpPort || grpcPort || numWorkers) ? `<div class="jg-sec"><h3>Collector</h3><div class="jg-card">
${zipkinPort ? kv('Zipkin port', zipkinPort) : ''}
${httpPort ? kv('HTTP port', httpPort) : ''}
${grpcPort ? kv('gRPC port', grpcPort) : ''}
${numWorkers ? kv('Workers', numWorkers) : ''}
${queueSize ? kv('Queue size', queueSize) : ''}
</div></div>` : '';

  // Storage section
  let storageDetailsHtml = '';
  if (storageType === 'elasticsearch' || cfg.storage?.elasticsearch) {
    const es = cfg.storage?.elasticsearch || {};
    storageDetailsHtml = `<div class="jg-sec"><h3>Storage · Elasticsearch</h3><div class="jg-card">
${kv('Type', storageType)}
${kv('Server URLs', es['server-urls'] || es.server_urls || '')}
${kv('Index prefix', es['index-prefix'] || es.index_prefix || '')}
${es['num-shards'] != null ? kv('Shards', es['num-shards']) : ''}
${es['num-replicas'] != null ? kv('Replicas', es['num-replicas']) : ''}
</div></div>`;
  } else if (storageType === 'cassandra' || cfg.storage?.cassandra) {
    const cas = cfg.storage?.cassandra || {};
    storageDetailsHtml = `<div class="jg-sec"><h3>Storage · Cassandra</h3><div class="jg-card">
${kv('Type', storageType)}
${kv('Servers', cas.servers || '')}
${kv('Keyspace', cas.keyspace || '')}
</div></div>`;
  } else {
    storageDetailsHtml = `<div class="jg-sec"><h3>Storage</h3><div class="jg-card">
${kv('Type', storageType)}
</div></div>`;
  }

  // Sampling section
  const samplingFile = cfg.sampling?.['strategies-file'] || cfg.sampling?.strategies_file || '';
  const samplingHtml = (cfg.sampling || samplingFile) ? `<div class="jg-sec"><h3>Sampling</h3><div class="jg-card">
${samplingFile ? kv('Strategies file', samplingFile) : ''}
${cfg.sampling?.default_sampling_probability != null ? kv('Default probability', cfg.sampling.default_sampling_probability) : ''}
${cfg.sampling?.type ? kv('Type', cfg.sampling.type) : ''}
</div></div>` : '';

  // Agent section
  const agentReporterType = cfg.agent?.reporter?.type || '';
  const agentGrpcHost = cfg.agent?.reporter?.grpc?.['host-port'] || cfg.agent?.reporter?.grpc?.host_port || '';
  const agentHtml = (agentReporterType || agentGrpcHost) ? `<div class="jg-sec"><h3>Agent</h3><div class="jg-card">
${agentReporterType ? kv('Reporter type', agentReporterType) : ''}
${agentGrpcHost ? kv('gRPC host', agentGrpcHost) : ''}
</div></div>` : '';

  const host = document.createElement('div');
  host.className = 'jg-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-jg">Jaeger</span>
  <span class="jg-title">Tracing Configuration</span>
</div>
<div class="jg-sub">${esc(subParts.join(' · '))}</div>
${queryHtml}${collectorHtml}${storageDetailsHtml}${samplingHtml}${agentHtml}`;
  return { parentNode: host };
}
