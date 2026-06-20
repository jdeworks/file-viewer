import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.otel-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-otel{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#425cc7;color:#fff;vertical-align:middle;margin-right:8px}
.otel-title{font-size:18px;font-weight:700;margin:0 0 4px}
.otel-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.otel-sec{margin:14px 0}
.otel-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px}
.otel-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);margin:6px 0}
.otel-pills{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0}
.otel-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.otel-pipeline{margin:6px 0;font-size:13px}
.otel-pipe-name{font:700 12px/1.4 ui-monospace,monospace;color:var(--fg,#24292f);margin-bottom:4px}
.otel-pipe-row{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:12px}
.otel-pipe-label{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);min-width:80px}
.otel-tag{display:inline-block;font-size:11px;padding:2px 7px;border-radius:5px;background:#e0e7ff;border:1px solid #a5b4fc;color:#3730a3;margin-left:4px}
`;

function keys(obj) {
  return obj && typeof obj === 'object' ? Object.keys(obj) : [];
}

function pillList(items) {
  if (!items.length) return '<span style="font-size:12px;color:var(--fg-2,#888)">none</span>';
  return `<div class="otel-pills">${items.map((n) => `<span class="otel-pill">${esc(n)}</span>`).join('')}</div>`;
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || \'\') || [])[0] || {};
  } catch { cfg = {}; }

  const receivers = keys(cfg.receivers);
  const processors = keys(cfg.processors);
  const exporters = keys(cfg.exporters);
  const extensions = keys(cfg.extensions);
  const connectors = keys(cfg.connectors);

  const receiversHtml = `
<div class="otel-sec"><h3>Receivers (${receivers.length})</h3>
${pillList(receivers)}
</div>`;

  const processorsHtml = processors.length ? `
<div class="otel-sec"><h3>Processors (${processors.length})</h3>
${pillList(processors)}
</div>` : '';

  const exportersHtml = `
<div class="otel-sec"><h3>Exporters (${exporters.length})</h3>
${pillList(exporters)}
</div>`;

  const extensionsHtml = extensions.length ? `
<div class="otel-sec"><h3>Extensions (${extensions.length})</h3>
${pillList(extensions)}
</div>` : '';

  const connectorsHtml = connectors.length ? `
<div class="otel-sec"><h3>Connectors (${connectors.length})</h3>
${pillList(connectors)}
</div>` : '';

  // Service pipelines
  const pipelines = (cfg.service && cfg.service.pipelines) ? cfg.service.pipelines : {};
  const pipelineNames = Object.keys(pipelines);
  const pipelinesHtml = pipelineNames.length ? `
<div class="otel-sec"><h3>Pipelines (${pipelineNames.length})</h3>
${pipelineNames.map((name) => {
    const p = pipelines[name] || {};
    const pReceivers = Array.isArray(p.receivers) ? p.receivers : [];
    const pProcessors = Array.isArray(p.processors) ? p.processors : [];
    const pExporters = Array.isArray(p.exporters) ? p.exporters : [];
    return `<div class="otel-card">
<div class="otel-pipe-name">${esc(name)}</div>
${pReceivers.length ? `<div class="otel-pipe-row"><span class="otel-pipe-label">receivers</span>${pReceivers.map((r) => `<span class="otel-pill">${esc(r)}</span>`).join('')}</div>` : ''}
${pProcessors.length ? `<div class="otel-pipe-row"><span class="otel-pipe-label">processors</span>${pProcessors.map((p) => `<span class="otel-pill">${esc(p)}</span>`).join('')}</div>` : ''}
${pExporters.length ? `<div class="otel-pipe-row"><span class="otel-pipe-label">exporters</span>${pExporters.map((e) => `<span class="otel-pill">${esc(e)}</span>`).join('')}</div>` : ''}
</div>`;
  }).join('')}
</div>` : '';

  const subParts = [
    receivers.length ? `${receivers.length} receiver${receivers.length !== 1 ? 's' : ''}` : '',
    exporters.length ? `${exporters.length} exporter${exporters.length !== 1 ? 's' : ''}` : '',
    pipelineNames.length ? `${pipelineNames.length} pipeline${pipelineNames.length !== 1 ? 's' : ''}` : '',
  ].filter(Boolean);

  const host = document.createElement('div');
  host.className = 'otel-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-otel">OpenTelemetry</span>
  <span class="otel-title">Collector Configuration</span>
  ${pipelineNames.length ? `<span class="otel-tag">${pipelineNames.length} pipeline${pipelineNames.length !== 1 ? 's' : ''}</span>` : ''}
</div>
<div class="otel-sub">${esc(subParts.join(' · '))}</div>
${receiversHtml}${processorsHtml}${exportersHtml}${extensionsHtml}${connectorsHtml}${pipelinesHtml}`;
  return { parentNode: host };
}
