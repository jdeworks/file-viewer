// Apache Cassandra cassandra.yaml enhanced view.
import jsYaml from '../../../../vendor/js-yaml/js-yaml.min.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.cass-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-cass{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1287B1;color:#fff;vertical-align:middle;margin-right:8px;}
.cass-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.cass-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.cass-sec{margin:14px 0;}
.cass-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.cass-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.cass-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:12px;}
.cass-kv-k{color:var(--fg-2,#888);min-width:200px;font-family:ui-monospace,monospace;}
.cass-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.cass-pills{display:flex;flex-wrap:wrap;gap:6px;}
.cass-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.cass-pill.seed{background:#dbeafe;border-color:#93c5fd;color:#1e40af;}
.cass-tag{display:inline-block;font-size:11px;padding:2px 7px;border-radius:5px;background:#eff8ff;border:1px solid #bfdbfe;color:#1e40af;margin-left:4px;}
`;

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<div class="cass-kv"><span class="cass-kv-k">${esc(label)}</span><span class="cass-kv-v">${esc(String(value))}</span></div>`;
}

function extractSeeds(seedProvider) {
  if (!Array.isArray(seedProvider)) return [];
  const seeds = [];
  for (const sp of seedProvider) {
    const params = sp?.parameters;
    if (!Array.isArray(params)) continue;
    for (const p of params) {
      if (p?.seeds) {
        seeds.push(...String(p.seeds).split(',').map((s) => s.trim()).filter(Boolean));
      }
    }
  }
  return seeds;
}

export function render(intake) {
  const text = intake.text || '';
  let doc = {};
  try { doc = jsYaml.load(text) || {}; } catch { /* ignore parse errors */ }

  const clusterName = doc['cluster_name'] || '';
  const listenAddress = doc['listen_address'] || '';
  const rpcAddress = doc['rpc_address'] || doc['broadcast_rpc_address'] || '';
  const nativeTransportPort = doc['native_transport_port'] || '';
  const storagePort = doc['storage_port'] || '';
  const sslStoragePort = doc['ssl_storage_port'] || '';

  const seedProvider = doc['seed_provider'];
  const seeds = extractSeeds(seedProvider);

  const dataFileDirectories = doc['data_file_directories'];
  const dataDirs = Array.isArray(dataFileDirectories)
    ? dataFileDirectories
    : dataFileDirectories ? [dataFileDirectories] : [];
  const commitlogDir = doc['commitlog_directory'] || '';
  const savedCachesDir = doc['saved_caches_directory'] || '';

  const compactionThroughput = doc['compaction_throughput_mb_per_sec'] != null
    ? String(doc['compaction_throughput_mb_per_sec']) + ' MB/s'
    : '';
  const endpointSnitch = doc['endpoint_snitch'] || '';
  const authenticator = doc['authenticator'] || '';
  const authorizer = doc['authorizer'] || '';
  const partitioner = doc['partitioner'] || '';
  const numTokens = doc['num_tokens'] != null ? String(doc['num_tokens']) : '';

  const subParts = [];
  if (clusterName) subParts.push(clusterName);
  if (listenAddress) subParts.push(listenAddress);
  if (nativeTransportPort) subParts.push(`:${nativeTransportPort}`);
  if (endpointSnitch) subParts.push(endpointSnitch.replace(/^.*\./, ''));

  const networkHtml = (listenAddress || rpcAddress || nativeTransportPort || storagePort) ? `
<div class="cass-sec"><h3>Network</h3><div class="cass-card">
${kv('listen_address', listenAddress)}
${kv('rpc_address', rpcAddress)}
${kv('native_transport_port', nativeTransportPort)}
${kv('storage_port', storagePort)}
${kv('ssl_storage_port', sslStoragePort)}
</div></div>` : '';

  const seedsHtml = seeds.length ? `
<div class="cass-sec"><h3>Seeds</h3><div class="cass-card">
<div class="cass-pills">${seeds.map((s) => `<span class="cass-pill seed">${esc(s)}</span>`).join('')}</div>
</div></div>` : '';

  const storageHtml = (dataDirs.length || commitlogDir || savedCachesDir) ? `
<div class="cass-sec"><h3>Storage</h3><div class="cass-card">
${dataDirs.length ? `<div class="cass-kv"><span class="cass-kv-k">data_file_directories</span><span class="cass-pills">${dataDirs.map((d) => `<span class="cass-pill">${esc(d)}</span>`).join('')}</span></div>` : ''}
${kv('commitlog_directory', commitlogDir)}
${kv('saved_caches_directory', savedCachesDir)}
</div></div>` : '';

  const configHtml = (compactionThroughput || endpointSnitch || numTokens || partitioner) ? `
<div class="cass-sec"><h3>Configuration</h3><div class="cass-card">
${kv('num_tokens', numTokens)}
${kv('partitioner', partitioner ? partitioner.replace(/^.*\./, '') : '')}
${kv('endpoint_snitch', endpointSnitch ? endpointSnitch.replace(/^.*\./, '') : '')}
${kv('compaction_throughput', compactionThroughput)}
</div></div>` : '';

  const authHtml = (authenticator || authorizer) ? `
<div class="cass-sec"><h3>Authentication &amp; Authorization</h3><div class="cass-card">
${kv('authenticator', authenticator)}
${kv('authorizer', authorizer)}
</div></div>` : '';

  const host = document.createElement('div');
  host.className = 'cass-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-cass">Cassandra</span>
  <span class="cass-title">${esc(clusterName || 'Cluster Configuration')}</span>
  ${nativeTransportPort ? `<span class="cass-tag">:${esc(nativeTransportPort)}</span>` : ''}
</div>
<div class="cass-sub">${esc(subParts.join(' · '))}</div>
${networkHtml}${seedsHtml}${storageHtml}${configHtml}${authHtml}`;

  return { parentNode: host };
}
