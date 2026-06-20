const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.apm-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.apm-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#F04E98;color:#fff;vertical-align:middle;margin-right:8px;}
.apm-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.apm-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.apm-sec{margin:14px 0;}
.apm-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.apm-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin:6px 0;background:var(--bg,#fff);}
.apm-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px;}
.apm-kv-k{color:var(--fg-2,#888);min-width:180px;flex-shrink:0;}
.apm-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.apm-masked{color:var(--fg-2,#999);font-style:italic;}
.apm-pills{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0;}
.apm-pill{display:inline-block;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
`;

function parseProps(text) {
  const props = new Map();
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#') || t.startsWith('!')) continue;
    const eq = t.indexOf('=');
    if (eq < 0) continue;
    props.set(t.slice(0, eq).trim(), t.slice(eq + 1).trim());
  }
  return props;
}

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<div class="apm-kv"><span class="apm-kv-k">${esc(label)}</span><span class="apm-kv-v">${esc(value)}</span></div>`;
}

function masked(label) {
  return `<div class="apm-kv"><span class="apm-kv-k">${esc(label)}</span><span class="apm-kv-v apm-masked">••••••••</span></div>`;
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes || new Uint8Array());
  const props = parseProps(text);
  const filename = (intake.name || intake.filename || '').split('/').pop() || 'elastic-apm-agent.properties';

  const serviceName = props.get('service_name') || props.get('elastic.apm.service_name') || '';
  const serviceVersion = props.get('service_version') || props.get('elastic.apm.service_version') || '';
  const environment = props.get('environment') || props.get('elastic.apm.environment') || '';
  const serverUrls = props.get('server_urls') || props.get('server_url') || props.get('elastic.apm.server_urls') || props.get('elastic.apm.server_url') || '';
  const hasSecretToken = !!(props.get('secret_token') || props.get('elastic.apm.secret_token'));
  const logLevel = props.get('log_level') || props.get('elastic.apm.log_level') || '';
  const sampleRate = props.get('transaction_sample_rate') || props.get('elastic.apm.transaction_sample_rate') || '';
  const captureBody = props.get('capture_body') || props.get('elastic.apm.capture_body') || '';
  const enableMetrics = props.get('enable_log_correlation') || props.get('elastic.apm.enable_log_correlation') || '';
  const cloudProvider = props.get('cloud_provider') || props.get('elastic.apm.cloud_provider') || '';

  // Parse server URLs into pills
  const urlList = serverUrls ? serverUrls.split(',').map((u) => u.trim()).filter(Boolean) : [];

  const serviceHtml = `
<div class="apm-sec"><h3>Service Identity</h3><div class="apm-card">
${kv('service_name', serviceName)}
${kv('service_version', serviceVersion)}
${kv('environment', environment)}
</div></div>`;

  const connectionHtml = `
<div class="apm-sec"><h3>Server Connection</h3><div class="apm-card">
${urlList.length ? `<div class="apm-kv"><span class="apm-kv-k">server_urls</span><span class="apm-kv-v">${urlList.map((u) => esc(u)).join(', ')}</span></div>` : ''}
${hasSecretToken ? masked('secret_token') : ''}
</div></div>`;

  const samplingHtml = (sampleRate || logLevel || captureBody || enableMetrics || cloudProvider) ? `
<div class="apm-sec"><h3>Agent Settings</h3><div class="apm-card">
${kv('transaction_sample_rate', sampleRate)}
${kv('log_level', logLevel)}
${kv('capture_body', captureBody)}
${kv('log_correlation', enableMetrics)}
${kv('cloud_provider', cloudProvider)}
</div></div>` : '';

  // Remaining props
  const shownKeys = new Set([
    'service_name', 'service_version', 'environment', 'server_urls', 'server_url',
    'secret_token', 'log_level', 'transaction_sample_rate', 'capture_body',
    'enable_log_correlation', 'cloud_provider',
    'elastic.apm.service_name', 'elastic.apm.service_version', 'elastic.apm.environment',
    'elastic.apm.server_urls', 'elastic.apm.server_url', 'elastic.apm.secret_token',
    'elastic.apm.log_level', 'elastic.apm.transaction_sample_rate',
    'elastic.apm.capture_body', 'elastic.apm.enable_log_correlation', 'elastic.apm.cloud_provider',
  ]);

  const otherRows = [...props.entries()]
    .filter(([k]) => !shownKeys.has(k))
    .map(([k, v]) => `<div class="apm-kv"><span class="apm-kv-k">${esc(k)}</span><span class="apm-kv-v">${esc(v)}</span></div>`)
    .join('');
  const otherHtml = otherRows ? `
<div class="apm-sec"><h3>Additional Settings</h3><div class="apm-card">${otherRows}</div></div>` : '';

  const sub = [
    serviceName,
    environment,
    serviceVersion ? `v${serviceVersion}` : '',
  ].filter(Boolean).join(' · ');

  const host = document.createElement('div');
  host.className = 'apm-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="apm-badge">Elastic APM</span>
  <span class="apm-title">${esc(filename)}</span>
</div>
<div class="apm-sub">${esc(sub)}</div>
${serviceHtml}${connectionHtml}${samplingHtml}${otherHtml}`;
  return { parentNode: host };
}
