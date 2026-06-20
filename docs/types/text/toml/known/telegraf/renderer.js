const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.telegraf-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-telegraf{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#4c4cff;color:#fff;vertical-align:middle;margin-right:8px}
.tg-title{font-size:18px;font-weight:700;margin:0 0 2px}
.tg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.tg-sec{margin:14px 0}
.tg-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px}
.tg-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin:6px 0;background:var(--bg,#fff)}
.tg-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:12px}
.tg-kv-k{color:var(--fg-2,#888);min-width:140px}
.tg-kv-v{font-family:ui-monospace,monospace;word-break:break-all}
.tg-pills{display:flex;flex-wrap:wrap;gap:5px;margin-top:4px}
.tg-pill{display:inline-flex;align-items:center;font-size:11px;padding:2px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.tg-pill.in{background:#eff6ff;border-color:#bfdbfe;color:#1e40af}
.tg-pill.out{background:#f0fdf4;border-color:#86efac;color:#166534}
.tg-pill.proc{background:#fefce8;border-color:#fde047;color:#854d0e}
.tg-pill.agg{background:#fdf4ff;border-color:#e879f9;color:#7e22ce}
.tg-pill.warn{background:#fff7ed;border-color:#fed7aa;color:#92400e}
.tg-tag{display:inline-block;font-size:11px;padding:2px 7px;border-radius:5px;background:#ede9fe;border:1px solid #c4b5fd;color:#5b21b6;margin-left:4px}
`;

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<div class="tg-kv"><span class="tg-kv-k">${esc(label)}</span><span class="tg-kv-v">${esc(value)}</span></div>`;
}

// Mask sensitive fields in an object
function maskSensitive(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const sensitive = /^(token|password|api_key|secret|credential|passwd)$/i;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = sensitive.test(k) ? '[configured]' : v;
  }
  return out;
}

// Collect plugin names from a section like cfg.inputs or cfg.outputs
// These are objects where each key is a plugin name and value is an array of config tables
function collectPlugins(section) {
  if (!section || typeof section !== 'object') return [];
  return Object.keys(section);
}

// Get first table entry for a plugin (array-of-tables gives an array)
function firstEntry(section, name) {
  const val = section[name];
  if (Array.isArray(val)) return val[0] || {};
  if (val && typeof val === 'object') return val;
  return {};
}

export function render(intake) {
  const cfg = intake.parsed || {};

  // [agent] section
  const agent = cfg.agent || {};
  const interval = agent.interval || '';
  const flushInterval = agent.flush_interval || '';
  const hostname = agent.hostname || '';
  const debug = agent.debug != null ? String(agent.debug) : '';

  const agentHtml = (interval || flushInterval || hostname || debug) ? `
<div class="tg-sec"><h3>Agent</h3><div class="tg-card">
${kv('interval', interval)}
${kv('flush_interval', flushInterval)}
${kv('hostname', hostname)}
${debug ? kv('debug', debug) : ''}
</div></div>` : '';

  // Inputs
  const inputsSection = cfg.inputs || {};
  const inputNames = collectPlugins(inputsSection);
  const inputsHtml = inputNames.length ? `
<div class="tg-sec"><h3>Inputs (${inputNames.length})</h3>
<div class="tg-pills">
${inputNames.map((n) => `<span class="tg-pill in">${esc(n)}</span>`).join('')}
</div></div>` : '';

  // Outputs — show details for common ones
  const outputsSection = cfg.outputs || {};
  const outputNames = collectPlugins(outputsSection);
  const outputDetailsHtml = outputNames.map((name) => {
    const entry = maskSensitive(firstEntry(outputsSection, name));
    const urlVal = entry.url || entry.urls || entry.address || '';
    const urlStr = Array.isArray(urlVal) ? urlVal[0] : urlVal;
    const token = entry.token ? '[configured]' : null;
    const org = entry.org || '';
    const bucket = entry.bucket || '';
    const port = entry.listen || entry.port || '';
    const details = [];
    if (urlStr) details.push(kv('url', String(urlStr)));
    if (token) details.push(kv('token', token));
    if (org) details.push(kv('org', org));
    if (bucket) details.push(kv('bucket', bucket));
    if (port) details.push(kv('listen', String(port)));
    return details.length ? `<div class="tg-card" style="margin-bottom:6px"><div style="font:12px/1.4 ui-monospace,monospace;font-weight:600;margin-bottom:4px">${esc(name)}</div>${details.join('')}</div>` : '';
  }).join('');

  const outputsHtml = outputNames.length ? `
<div class="tg-sec"><h3>Outputs (${outputNames.length})</h3>
<div class="tg-pills" style="margin-bottom:8px">
${outputNames.map((n) => `<span class="tg-pill out">${esc(n)}</span>`).join('')}
</div>
${outputDetailsHtml}
</div>` : '';

  // Processors
  const processorsSection = cfg.processors || {};
  const processorNames = collectPlugins(processorsSection);
  const processorsHtml = processorNames.length ? `
<div class="tg-sec"><h3>Processors (${processorNames.length})</h3>
<div class="tg-pills">
${processorNames.map((n) => `<span class="tg-pill proc">${esc(n)}</span>`).join('')}
</div></div>` : '';

  // Aggregators
  const aggregatorsSection = cfg.aggregators || {};
  const aggregatorNames = collectPlugins(aggregatorsSection);
  const aggregatorsHtml = aggregatorNames.length ? `
<div class="tg-sec"><h3>Aggregators (${aggregatorNames.length})</h3>
<div class="tg-pills">
${aggregatorNames.map((n) => `<span class="tg-pill agg">${esc(n)}</span>`).join('')}
</div></div>` : '';

  const subParts = [
    inputNames.length ? `${inputNames.length} input${inputNames.length !== 1 ? 's' : ''}` : '',
    outputNames.length ? `${outputNames.length} output${outputNames.length !== 1 ? 's' : ''}` : '',
    processorNames.length ? `${processorNames.length} processor${processorNames.length !== 1 ? 's' : ''}` : '',
    aggregatorNames.length ? `${aggregatorNames.length} aggregator${aggregatorNames.length !== 1 ? 's' : ''}` : '',
  ].filter(Boolean);

  const host = document.createElement('div');
  host.className = 'telegraf-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-telegraf">Telegraf</span>
  <span class="tg-title">Metrics Agent Configuration</span>
  ${inputNames.length ? `<span class="tg-tag">${inputNames.length} input${inputNames.length !== 1 ? 's' : ''}</span>` : ''}
  ${outputNames.length ? `<span class="tg-tag">${outputNames.length} output${outputNames.length !== 1 ? 's' : ''}</span>` : ''}
</div>
<div class="tg-sub">${esc(subParts.join(' · '))}</div>
${agentHtml}${inputsHtml}${outputsHtml}${processorsHtml}${aggregatorsHtml}`;
  return { parentNode: host };
}
