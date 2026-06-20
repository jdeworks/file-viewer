import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.beats-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.beats-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#F04E98;color:#fff;vertical-align:middle;margin-right:8px;}
.beats-type{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:600;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);color:var(--fg,#24292f);vertical-align:middle;margin-right:6px;}
.beats-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.beats-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.beats-sec{margin:14px 0;}
.beats-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.beats-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin:6px 0;background:var(--bg,#fff);}
.beats-input-name{font:13px/1.4 ui-monospace,monospace;font-weight:700;margin-bottom:4px;}
.beats-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px;}
.beats-kv-k{color:var(--fg-2,#888);min-width:140px;flex-shrink:0;}
.beats-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.beats-masked{color:var(--fg-2,#999);font-style:italic;}
.beats-pills{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0;}
.beats-pill{display:inline-block;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.beats-output-chip{display:inline-block;font-size:12px;padding:3px 10px;border-radius:12px;background:#eff6ff;border:1px solid #bfdbfe;color:#1d4ed8;margin-right:6px;font-weight:600;}
`;

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<div class="beats-kv"><span class="beats-kv-k">${esc(label)}</span><span class="beats-kv-v">${esc(value)}</span></div>`;
}

function masked(label) {
  return `<div class="beats-kv"><span class="beats-kv-k">${esc(label)}</span><span class="beats-kv-v beats-masked">••••••••</span></div>`;
}

function beatType(filename) {
  const n = filename.toLowerCase();
  if (n.startsWith('filebeat')) return 'Filebeat';
  if (n.startsWith('metricbeat')) return 'Metricbeat';
  if (n.startsWith('heartbeat')) return 'Heartbeat';
  if (n.startsWith('auditbeat')) return 'Auditbeat';
  return 'Beat';
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = {}; }

  const filename = (intake.name || intake.filename || '').split('/').pop() || 'filebeat.yml';
  const beat = beatType(filename);

  // Inputs (filebeat) / modules (metricbeat, auditbeat) / monitors (heartbeat)
  const inputs = Array.isArray(cfg['filebeat.inputs']) ? cfg['filebeat.inputs']
    : (Array.isArray(cfg.inputs) ? cfg.inputs : []);
  const modules = Array.isArray(cfg['filebeat.modules']) ? cfg['filebeat.modules']
    : (Array.isArray(cfg.modules) ? cfg.modules : []);
  const monitors = Array.isArray(cfg.heartbeat?.monitors) ? cfg.heartbeat.monitors
    : (Array.isArray(cfg.monitors) ? cfg.monitors : []);

  const inputsHtml = inputs.length ? `
<div class="beats-sec"><h3>Inputs (${inputs.length})</h3>
${inputs.map((inp, i) => {
    const type = inp.type || 'log';
    const enabled = inp.enabled !== false;
    const paths = Array.isArray(inp.paths) ? inp.paths : [];
    const id = inp.id || inp.name || `Input ${i + 1}`;
    return `<div class="beats-card">
<div class="beats-input-name">${esc(id)} <span style="font-size:11px;font-weight:400;color:var(--fg-2,#888)">[${esc(type)}${enabled ? '' : ' · disabled'}]</span></div>
${paths.length ? `<div class="beats-kv"><span class="beats-kv-k">paths</span><span class="beats-kv-v">${paths.map((p) => esc(p)).join(', ')}</span></div>` : ''}
</div>`;
  }).join('')}
</div>` : '';

  const modulesHtml = modules.length ? `
<div class="beats-sec"><h3>Modules (${modules.length})</h3>
<div class="beats-pills">${modules.map((m) => `<span class="beats-pill">${esc(m.module || m.name || '(unnamed)')}</span>`).join('')}</div>
</div>` : '';

  const monitorsHtml = monitors.length ? `
<div class="beats-sec"><h3>Monitors (${monitors.length})</h3>
${monitors.map((m) => {
    const type = m.type || 'http';
    const urls = Array.isArray(m.urls) ? m.urls : (m.urls ? [m.urls] : []);
    const id = m.id || m.name || type;
    return `<div class="beats-card">
<div class="beats-input-name">${esc(id)} <span style="font-size:11px;font-weight:400;color:var(--fg-2,#888)">[${esc(type)}]</span></div>
${urls.length ? `<div class="beats-kv"><span class="beats-kv-k">urls</span><span class="beats-kv-v">${urls.map((u) => esc(u)).join(', ')}</span></div>` : ''}
${m.schedule ? kv('schedule', m.schedule) : ''}
</div>`;
  }).join('')}
</div>` : '';

  // Output
  const output = cfg.output || {};
  const outputType = Object.keys(output)[0] || '';
  const outputCfg = output[outputType] || {};

  let outputHtml = '';
  if (outputType) {
    const hosts = Array.isArray(outputCfg.hosts) ? outputCfg.hosts : (outputCfg.hosts ? [outputCfg.hosts] : []);
    const index = outputCfg.index || '';
    const topic = outputCfg.topic || '';
    const hasPassword = !!(outputCfg.password);
    const username = outputCfg.username || '';
    outputHtml = `
<div class="beats-sec"><h3>Output</h3><div class="beats-card">
<span class="beats-output-chip">${esc(outputType)}</span>
${hosts.length ? `<div class="beats-kv" style="margin-top:8px;"><span class="beats-kv-k">hosts</span><span class="beats-kv-v">${hosts.map((h) => esc(h)).join(', ')}</span></div>` : ''}
${kv('index', index)}
${kv('topic', topic)}
${username ? kv('username', username) : ''}
${hasPassword ? masked('password') : ''}
</div></div>`;
  }

  // Processors
  const processors = Array.isArray(cfg.processors) ? cfg.processors : [];
  const processorNames = processors.map((p) => {
    const keys = Object.keys(p);
    return keys[0] || '(processor)';
  });
  const processorsHtml = processorNames.length ? `
<div class="beats-sec"><h3>Processors (${processorNames.length})</h3>
<div class="beats-pills">${processorNames.map((n) => `<span class="beats-pill">${esc(n)}</span>`).join('')}</div>
</div>` : '';

  // Logging
  const logging = cfg.logging || {};
  const logLevel = logging.level || '';
  const loggingHtml = logLevel ? `
<div class="beats-sec"><h3>Logging</h3><div class="beats-card">
${kv('level', logLevel)}
</div></div>` : '';

  const countParts = [
    inputs.length ? `${inputs.length} input${inputs.length !== 1 ? 's' : ''}` : '',
    modules.length ? `${modules.length} module${modules.length !== 1 ? 's' : ''}` : '',
    monitors.length ? `${monitors.length} monitor${monitors.length !== 1 ? 's' : ''}` : '',
    outputType ? `→ ${outputType}` : '',
  ].filter(Boolean).join(' · ');

  const host = document.createElement('div');
  host.className = 'beats-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="beats-badge">Elastic Beats</span>
  <span class="beats-type">${esc(beat)}</span>
  <span class="beats-title">${esc(filename)}</span>
</div>
<div class="beats-sub">${esc(countParts)}</div>
${inputsHtml}${modulesHtml}${monitorsHtml}${outputHtml}${processorsHtml}${loggingHtml}`;
  return { parentNode: host };
}
