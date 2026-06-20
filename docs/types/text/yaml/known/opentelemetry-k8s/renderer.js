import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.otk-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-otk{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#425cc7;color:#fff;vertical-align:middle;margin-right:8px}
.otk-title{font-size:18px;font-weight:700;margin:0 0 4px}
.otk-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.otk-sec{margin:14px 0}
.otk-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px}
.otk-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);margin:6px 0}
.otk-card-name{font:700 13px/1.4 ui-monospace,monospace;margin-bottom:6px}
.otk-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px}
.otk-kv-k{color:var(--fg-2,#888);min-width:120px;flex-shrink:0}
.otk-kv-v{font-family:ui-monospace,monospace;word-break:break-all}
.otk-pills{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0}
.otk-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.otk-tag{display:inline-block;font-size:11px;padding:2px 7px;border-radius:5px;background:#e0e7ff;border:1px solid #a5b4fc;color:#3730a3;margin-left:4px}
.otk-pipe-row{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:12px;margin:2px 0}
.otk-pipe-label{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);min-width:80px}
`;

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<div class="otk-kv"><span class="otk-kv-k">${esc(label)}</span><span class="otk-kv-v">${esc(value)}</span></div>`;
}

function pills(items) {
  if (!Array.isArray(items) || !items.length) return '';
  return `<div class="otk-pills">${items.map((i) => `<span class="otk-pill">${esc(i)}</span>`).join('')}</div>`;
}

function keys(obj) {
  return obj && typeof obj === 'object' ? Object.keys(obj) : [];
}

function renderCollector(doc, jsyaml) {
  const meta = doc.metadata || {};
  const spec = doc.spec || {};
  const name = meta.name || '';
  const namespace = meta.namespace || '';
  const mode = spec.mode || '';

  // Parse spec.config (embedded YAML string or object)
  let pipeline = {};
  if (typeof spec.config === 'string') {
    try { pipeline = jsyaml.load(spec.config) || {}; } catch { pipeline = {}; }
  } else if (spec.config && typeof spec.config === 'object') {
    pipeline = spec.config;
  }

  const receivers = keys(pipeline.receivers);
  const processors = keys(pipeline.processors);
  const exporters = keys(pipeline.exporters);
  const pipelines = pipeline.service?.pipelines ? Object.keys(pipeline.service.pipelines) : [];

  const pipelineRows = pipelines.map((pname) => {
    const p = pipeline.service.pipelines[pname] || {};
    return `<div style="margin:6px 0;border-left:3px solid #a5b4fc;padding-left:10px">
<div style="font:700 12px/1.4 ui-monospace,monospace;margin-bottom:3px">${esc(pname)}</div>
${Array.isArray(p.receivers) && p.receivers.length ? `<div class="otk-pipe-row"><span class="otk-pipe-label">receivers</span>${p.receivers.map((r) => `<span class="otk-pill">${esc(r)}</span>`).join('')}</div>` : ''}
${Array.isArray(p.processors) && p.processors.length ? `<div class="otk-pipe-row"><span class="otk-pipe-label">processors</span>${p.processors.map((r) => `<span class="otk-pill">${esc(r)}</span>`).join('')}</div>` : ''}
${Array.isArray(p.exporters) && p.exporters.length ? `<div class="otk-pipe-row"><span class="otk-pipe-label">exporters</span>${p.exporters.map((r) => `<span class="otk-pill">${esc(r)}</span>`).join('')}</div>` : ''}
</div>`;
  }).join('');

  return `<div class="otk-sec"><h3>OpenTelemetryCollector</h3><div class="otk-card">
<div class="otk-card-name">${esc(name)}${namespace ? `<span class="otk-tag">${esc(namespace)}</span>` : ''}${mode ? `<span class="otk-tag">${esc(mode)}</span>` : ''}</div>
${receivers.length ? `<div class="otk-kv"><span class="otk-kv-k">Receivers</span><span>${pills(receivers)}</span></div>` : ''}
${processors.length ? `<div class="otk-kv"><span class="otk-kv-k">Processors</span><span>${pills(processors)}</span></div>` : ''}
${exporters.length ? `<div class="otk-kv"><span class="otk-kv-k">Exporters</span><span>${pills(exporters)}</span></div>` : ''}
${pipelineRows ? `<div style="margin-top:8px"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin-bottom:4px">Pipelines (${pipelines.length})</div>${pipelineRows}</div>` : ''}
</div></div>`;
}

function renderInstrumentation(doc) {
  const meta = doc.metadata || {};
  const spec = doc.spec || {};
  const name = meta.name || '';
  const namespace = meta.namespace || '';
  const endpoint = spec.exporter?.endpoint || '';
  const propagators = Array.isArray(spec.propagators) ? spec.propagators : [];
  const samplerType = spec.sampler?.type || '';
  const samplerArg = spec.sampler?.argument || '';

  return `<div class="otk-sec"><h3>Instrumentation</h3><div class="otk-card">
<div class="otk-card-name">${esc(name)}${namespace ? `<span class="otk-tag">${esc(namespace)}</span>` : ''}</div>
${kv('Exporter endpoint', endpoint)}
${samplerType ? kv('Sampler type', samplerType) : ''}
${samplerArg ? kv('Sampler argument', samplerArg) : ''}
${propagators.length ? `<div class="otk-kv"><span class="otk-kv-k">Propagators</span><span>${pills(propagators)}</span></div>` : ''}
</div></div>`;
}

export async function render(intake) {
  let jsyaml;
  try {
    jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
  } catch {
    return { parentNode: Object.assign(document.createElement('div'), { textContent: 'Failed to load YAML parser.' }) };
  }

  let docs = [];
  try {
    jsyaml.loadAll(intake.text || '', (doc) => { if (doc) docs.push(doc); });
  } catch { docs = []; }

  const firstDoc = docs[0] || {};
  const kind = firstDoc.kind || '';
  const name = firstDoc.metadata?.name || '';
  const namespace = firstDoc.metadata?.namespace || '';

  const subParts = [kind, name, namespace].filter(Boolean);

  let docsHtml = '';
  docs.forEach((doc) => {
    if (doc.kind === 'OpenTelemetryCollector') {
      docsHtml += renderCollector(doc, jsyaml);
    } else if (doc.kind === 'Instrumentation') {
      docsHtml += renderInstrumentation(doc);
    }
  });

  const host = document.createElement('div');
  host.className = 'otk-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-otk">OpenTelemetry</span>
  <span class="otk-title">Kubernetes Operator Resource</span>
</div>
<div class="otk-sub">${esc(subParts.join(' · '))}</div>
${docsHtml}`;
  return { parentNode: host };
}
