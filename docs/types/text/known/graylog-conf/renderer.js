const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.graylog-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-graylog{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#FF3633;color:#fff;vertical-align:middle;margin-right:8px;}
.graylog-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.graylog-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.graylog-sec{margin:14px 0;}
.graylog-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.graylog-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.graylog-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px;}
.graylog-kv-k{color:var(--fg-2,#888);min-width:220px;flex-shrink:0;font:12px/1.6 ui-monospace,monospace;}
.graylog-kv-v{font:12px/1.6 ui-monospace,monospace;word-break:break-all;}
.graylog-masked{color:var(--fg-2,#888);font-style:italic;}
.graylog-chip{display:inline-block;font-size:11px;padding:2px 9px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.graylog-chip.master{background:#dcfce7;border-color:#86efac;color:#166534;}
.graylog-chip.replica{background:#f3f4f6;border-color:#d1d5db;color:#6b7280;}
.graylog-pills{display:flex;flex-wrap:wrap;gap:6px;}
.graylog-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
`;

function parseKV(text) {
  const result = {};
  for (const line of (text || '').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    result[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
  }
  return result;
}

function masked() {
  return `<span class="graylog-masked">[configured]</span>`;
}

function kv(label, value, isSecret = false) {
  if (value == null || value === '') return '';
  const display = isSecret ? masked() : `<span class="graylog-kv-v">${esc(value)}</span>`;
  return `<div class="graylog-kv"><span class="graylog-kv-k">${esc(label)}</span>${display}</div>`;
}

function maskCredentialsInUrl(url) {
  if (!url) return url;
  try {
    // Mask user:pass@ in URLs
    return url.replace(/(:\/\/)([^@]+)@/, '$1[credentials]@');
  } catch {
    return url;
  }
}

function extractMongoHost(uri) {
  if (!uri) return uri;
  try {
    // Strip credentials and extract host
    const stripped = uri.replace(/(:\/\/)([^@]+)@/, '$1');
    // Remove protocol and trailing path
    const noProto = stripped.replace(/^[^:]+:\/\//, '');
    const hostPart = noProto.split('/')[0];
    const credInUri = /(:\/\/)([^@]+)@/.test(uri);
    return (credInUri ? '[credentials]@' : '') + hostPart;
  } catch {
    return uri;
  }
}

export function render(intake) {
  const kv_ = parseKV(intake.text || '');

  const isMaster = kv_['is_master'] || '';
  const nodeIdFile = kv_['node_id_file'] || '';
  const httpBindAddress = kv_['http_bind_address'] || '';
  const httpExternalUri = kv_['http_external_uri'] || '';
  const restListenUri = kv_['rest_listen_uri'] || '';
  const elasticsearchHosts = kv_['elasticsearch_hosts'] || '';
  const mongodbUri = kv_['mongodb_uri'] || '';
  const passwordSecret = kv_['password_secret'] || '';
  const rootPasswordSha2 = kv_['root_password_sha2'] || '';
  const maxInitialLine = kv_['http_max_initial_line_length'] || '';
  const retentionStrategy = kv_['retention_strategy'] || '';
  const rotationStrategy = kv_['rotation_strategy'] || '';
  const maxIndices = kv_['max_number_of_indices'] || '';
  const outputBatchSize = kv_['output_batch_size'] || '';
  const processbufferProcessors = kv_['processbuffer_processors'] || '';

  // is_master chip
  const masterVal = isMaster.toLowerCase();
  const masterChip = isMaster
    ? `<span class="graylog-chip ${masterVal === 'true' ? 'master' : 'replica'}">${masterVal === 'true' ? 'master' : 'replica'}</span>`
    : '';

  // Summary line
  const subParts = [];
  if (httpBindAddress) subParts.push(`http: ${httpBindAddress}`);
  if (elasticsearchHosts) subParts.push(`elasticsearch: ${elasticsearchHosts.split(',')[0].trim()}`);
  const sub = subParts.join(' · ');

  // Node / identity section
  const nodeHtml = (isMaster || nodeIdFile) ? `
<div class="graylog-sec"><h3>Node</h3><div class="graylog-card">
${isMaster ? `<div class="graylog-kv"><span class="graylog-kv-k">is_master</span>${masterChip}</div>` : ''}
${kv('node_id_file', nodeIdFile)}
</div></div>` : '';

  // HTTP / REST section
  const httpHtml = (httpBindAddress || httpExternalUri || restListenUri || maxInitialLine) ? `
<div class="graylog-sec"><h3>HTTP &amp; REST</h3><div class="graylog-card">
${kv('http_bind_address', httpBindAddress)}
${kv('http_external_uri', httpExternalUri)}
${kv('rest_listen_uri', restListenUri)}
${kv('http_max_initial_line_length', maxInitialLine)}
</div></div>` : '';

  // Elasticsearch section
  const esHosts = elasticsearchHosts
    ? `<div class="graylog-kv"><span class="graylog-kv-k">elasticsearch_hosts</span><div class="graylog-pills">${elasticsearchHosts.split(',').map(h => `<span class="graylog-pill">${esc(h.trim())}</span>`).join('')}</div></div>`
    : '';
  const esHtml = elasticsearchHosts ? `
<div class="graylog-sec"><h3>Elasticsearch</h3><div class="graylog-card">
${esHosts}
</div></div>` : '';

  // MongoDB section — show host only, mask credentials
  const mongoHost = extractMongoHost(mongodbUri);
  const mongoHtml = mongodbUri ? `
<div class="graylog-sec"><h3>MongoDB</h3><div class="graylog-card">
${kv('mongodb_uri (host)', mongoHost)}
</div></div>` : '';

  // Security section
  const secHtml = (passwordSecret || rootPasswordSha2) ? `
<div class="graylog-sec"><h3>Security</h3><div class="graylog-card">
${passwordSecret ? `<div class="graylog-kv"><span class="graylog-kv-k">password_secret</span>${masked()}</div>` : ''}
${rootPasswordSha2 ? `<div class="graylog-kv"><span class="graylog-kv-k">root_password_sha2</span>${masked()}</div>` : ''}
</div></div>` : '';

  // Retention section
  const retentionHtml = (retentionStrategy || rotationStrategy || maxIndices) ? `
<div class="graylog-sec"><h3>Data Retention</h3><div class="graylog-card">
${kv('rotation_strategy', rotationStrategy)}
${kv('retention_strategy', retentionStrategy)}
${kv('max_number_of_indices', maxIndices)}
</div></div>` : '';

  // Processing section
  const processingHtml = (outputBatchSize || processbufferProcessors) ? `
<div class="graylog-sec"><h3>Processing</h3><div class="graylog-card">
${kv('output_batch_size', outputBatchSize)}
${kv('processbuffer_processors', processbufferProcessors)}
</div></div>` : '';

  const host = document.createElement('div');
  host.className = 'graylog-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-graylog">Graylog</span>
  <span class="graylog-title">Graylog Server</span>
</div>
<div class="graylog-sub">${esc(sub || 'Graylog log management server configuration')}</div>
${nodeHtml}${httpHtml}${esHtml}${mongoHtml}${secHtml}${retentionHtml}${processingHtml}`;

  return { parentNode: host };
}
