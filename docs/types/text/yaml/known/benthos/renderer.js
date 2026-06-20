import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.benthos-doc { padding: 16px 18px; max-width: 860px; margin: 0 auto; font: 14px/1.55 system-ui, sans-serif; color: var(--fg, #24292f); }
.benthos-doc .bt-badge { display: inline-block; padding: 2px 10px; border-radius: 10px; font-size: 11px; font-weight: 700; background: #E8390E; color: #fff; vertical-align: middle; margin-right: 8px; }
.benthos-doc .bt-title { font-size: 18px; font-weight: 700; margin: 0 0 3px; }
.benthos-doc .bt-sub { font-size: 12px; color: var(--fg-2, #888); margin: 0 0 14px; }
.benthos-doc .bt-sec { margin: 14px 0; }
.benthos-doc .bt-sec h3 { font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: var(--fg-2, #888); margin: 0 0 6px; }
.benthos-doc .bt-card { border: 1px solid var(--border, #e0e0e0); border-radius: 8px; padding: 10px 14px; margin: 6px 0; background: var(--bg, #fff); }
.benthos-doc .bt-type { display: inline-block; font-size: 12px; font-weight: 700; padding: 2px 9px; border-radius: 10px; background: #fff3eb; border: 1px solid #f7c59f; color: #c05000; margin-bottom: 6px; }
.benthos-doc .bt-kv { display: flex; gap: 8px; align-items: baseline; margin: 2px 0; font-size: 13px; }
.benthos-doc .bt-kv-k { color: var(--fg-2, #888); min-width: 130px; flex-shrink: 0; }
.benthos-doc .bt-kv-v { font-family: ui-monospace, monospace; word-break: break-all; }
.benthos-doc .bt-masked { color: var(--fg-2, #999); font-style: italic; }
.benthos-doc .bt-pills { display: flex; flex-wrap: wrap; gap: 6px; margin: 4px 0; }
.benthos-doc .bt-pill { display: inline-block; font-size: 12px; padding: 3px 10px; border-radius: 12px; background: var(--bg-2, #f6f8fa); border: 1px solid var(--border, #e0e0e0); font-family: ui-monospace, monospace; }
.benthos-doc .bt-chip { display: inline-block; font-size: 12px; padding: 2px 9px; border-radius: 10px; background: #eff6ff; border: 1px solid #bfdbfe; color: #1d4ed8; font-weight: 600; }
`;

const SENSITIVE = /password|token|secret|key|credentials|api_?key|auth/i;

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<div class="bt-kv"><span class="bt-kv-k">${esc(label)}</span><span class="bt-kv-v">${esc(value)}</span></div>`;
}

function kvMaybeRedact(label, value) {
  if (value == null || value === '') return '';
  if (SENSITIVE.test(label)) return `<div class="bt-kv"><span class="bt-kv-k">${esc(label)}</span><span class="bt-kv-v bt-masked">[configured]</span></div>`;
  return kv(label, value);
}

function renderObj(obj, depth = 0) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return '';
  const lines = [];
  for (const [k, v] of Object.entries(obj)) {
    if (depth > 1) break; // keep it shallow
    if (v == null || typeof v === 'object') continue;
    lines.push(kvMaybeRedact(k, String(v)));
  }
  return lines.join('');
}

function sectionFromMap(map, title, cls = 'bt-chip') {
  if (!map || typeof map !== 'object') return '';
  const type = Object.keys(map)[0];
  if (!type) return '';
  const sub = map[type] && typeof map[type] === 'object' ? map[type] : {};
  const details = renderObj(sub);
  return `<div class="bt-sec"><h3>${title}</h3><div class="bt-card">
<span class="${cls}">${esc(type)}</span>
${details}
</div></div>`;
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  const filename = (intake.name || intake.filename || '').split('/').pop() || 'benthos.yaml';

  // ── Input ──
  const inputMap = cfg.input && typeof cfg.input === 'object' ? cfg.input : null;
  const inputType = inputMap ? Object.keys(inputMap)[0] : null;
  let inputHtml = '';
  if (inputType) {
    const inputCfg = inputMap[inputType] && typeof inputMap[inputType] === 'object' ? inputMap[inputType] : {};
    const broker = inputCfg.addresses || inputCfg.address || inputCfg.brokers || inputCfg.seed_brokers
      || inputCfg.url || inputCfg.endpoint || '';
    const topic = inputCfg.topics || inputCfg.topic || inputCfg.queue_url || inputCfg.bucket || inputCfg.path || '';
    const consumerGroup = inputCfg.consumer_group || '';
    const lines = [
      broker ? kv('broker / address', Array.isArray(broker) ? broker.join(', ') : String(broker)) : '',
      topic ? kv('topic / resource', Array.isArray(topic) ? topic.join(', ') : String(topic)) : '',
      consumerGroup ? kv('consumer group', consumerGroup) : '',
    ].filter(Boolean);
    inputHtml = `<div class="bt-sec"><h3>Input</h3><div class="bt-card">
<span class="bt-type">${esc(inputType)}</span>
${lines.join('')}
</div></div>`;
  }

  // ── Output ──
  const outputMap = cfg.output && typeof cfg.output === 'object' ? cfg.output : null;
  const outputType = outputMap ? Object.keys(outputMap)[0] : null;
  let outputHtml = '';
  if (outputType) {
    const outputCfg = outputMap[outputType] && typeof outputMap[outputType] === 'object' ? outputMap[outputType] : {};
    const broker = outputCfg.addresses || outputCfg.address || outputCfg.brokers || outputCfg.seed_brokers
      || outputCfg.url || outputCfg.endpoint || '';
    const topic = outputCfg.topics || outputCfg.topic || outputCfg.queue_url || outputCfg.bucket || outputCfg.path || '';
    const lines = [
      broker ? kv('broker / address', Array.isArray(broker) ? broker.join(', ') : String(broker)) : '',
      topic ? kv('topic / resource', Array.isArray(topic) ? topic.join(', ') : String(topic)) : '',
    ].filter(Boolean);
    // check for password/token in output config
    for (const [k, v] of Object.entries(outputCfg)) {
      if (SENSITIVE.test(k) && v) lines.push(`<div class="bt-kv"><span class="bt-kv-k">${esc(k)}</span><span class="bt-kv-v bt-masked">[configured]</span></div>`);
    }
    outputHtml = `<div class="bt-sec"><h3>Output</h3><div class="bt-card">
<span class="bt-type">${esc(outputType)}</span>
${lines.join('')}
</div></div>`;
  }

  // ── Pipeline / Processors ──
  const pipeline = cfg.pipeline && typeof cfg.pipeline === 'object' ? cfg.pipeline : {};
  const processors = Array.isArray(pipeline.processors) ? pipeline.processors
    : (Array.isArray(cfg.pipeline) ? cfg.pipeline : []);
  let pipelineHtml = '';
  if (processors.length) {
    const procTypes = processors.map((p) => {
      if (typeof p === 'object' && p !== null) return Object.keys(p)[0] || '(processor)';
      return String(p);
    });
    const threads = pipeline.threads != null ? `<div class="bt-kv"><span class="bt-kv-k">threads</span><span class="bt-kv-v">${esc(String(pipeline.threads))}</span></div>` : '';
    pipelineHtml = `<div class="bt-sec"><h3>Pipeline — ${processors.length} processor${processors.length !== 1 ? 's' : ''}</h3>
<div class="bt-pills">${procTypes.map((t) => `<span class="bt-pill">${esc(t)}</span>`).join('')}</div>
${threads}
</div>`;
  }

  // ── Buffer ──
  const buffer = cfg.buffer && typeof cfg.buffer === 'object' ? cfg.buffer : null;
  const bufferHtml = buffer ? sectionFromMap(buffer, 'Buffer') : '';

  // ── Logger ──
  const logger = cfg.logger && typeof cfg.logger === 'object' ? cfg.logger : {};
  const logLevel = logger.level || '';
  const loggerHtml = logLevel ? `<div class="bt-sec"><h3>Logger</h3><div class="bt-card">
${kv('level', logLevel)}
</div></div>` : '';

  // ── Metrics ──
  const metrics = cfg.metrics && typeof cfg.metrics === 'object' ? cfg.metrics : null;
  const metricsHtml = metrics ? sectionFromMap(metrics, 'Metrics') : '';

  // Summary
  const parts = [];
  if (inputType) parts.push(`input: ${inputType}`);
  if (processors.length) parts.push(`${processors.length} processor${processors.length !== 1 ? 's' : ''}`);
  if (outputType) parts.push(`output: ${outputType}`);
  if (buffer) parts.push('buffered');

  const host = document.createElement('div');
  host.className = 'benthos-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="bt-title"><span class="bt-badge">Redpanda Connect</span>${esc(filename)}</div>
<div class="bt-sub">${esc(parts.join(' · ') || 'Benthos / Redpanda Connect pipeline')}</div>
${inputHtml}
${outputHtml}
${pipelineHtml}
${bufferHtml}
${loggerHtml}
${metricsHtml}`;

  return { parentNode: host };
}
