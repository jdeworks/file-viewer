import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
import { expandDotted } from '../dotted-keys.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.filebeat-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.fb-badge{display:inline-block;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;background:#00BFB3;color:#fff;vertical-align:middle;margin-right:8px;letter-spacing:.01em;}
.fb-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.fb-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.fb-sec{margin:14px 0;}
.fb-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.fb-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin:6px 0;background:var(--bg,#fff);}
.fb-input-name{font:13px/1.4 ui-monospace,monospace;font-weight:700;margin-bottom:4px;}
.fb-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px;}
.fb-kv-k{color:var(--fg-2,#888);min-width:140px;flex-shrink:0;}
.fb-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.fb-masked{color:var(--fg-2,#999);font-style:italic;}
.fb-pills{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0;}
.fb-chip{display:inline-block;font-size:11px;font-weight:600;padding:2px 8px;border-radius:10px;vertical-align:middle;}
.fb-chip-type{background:#e0f7f5;border:1px solid #80ded9;color:#00827f;}
.fb-chip-disabled{background:#f3f4f6;border:1px solid #d1d5db;color:#9ca3af;}
.fb-pill{display:inline-block;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.fb-output-chip{display:inline-block;font-size:12px;padding:3px 10px;border-radius:12px;background:#eff6ff;border:1px solid #bfdbfe;color:#1d4ed8;margin-right:6px;font-weight:600;}
.fb-paths{font-size:12px;font-family:ui-monospace,monospace;color:var(--fg-2,#666);margin:3px 0 0 0;padding-left:8px;border-left:2px solid var(--border,#e0e0e0);}
`;

const INPUT_TYPE_COLORS = {
  log: '#e0f7f5:#80ded9:#00827f',
  filestream: '#e0f2fe:#7dd3fc:#0369a1',
  stdin: '#f3e8ff:#c4b5fd:#6d28d9',
  tcp: '#fff7ed:#fed7aa:#c2410c',
  udp: '#fff7ed:#fed7aa:#c2410c',
  s3: '#fffbeb:#fcd34d:#92400e',
  kafka: '#fdf2f8:#f9a8d4:#9d174d',
  redis: '#fef2f2:#fca5a5:#b91c1c',
  journald: '#f0fdf4:#86efac:#166534',
};

function inputTypeChip(type) {
  const colors = INPUT_TYPE_COLORS[type] || '#f3f4f6:#d1d5db:#374151';
  const [bg, border, color] = colors.split(':');
  return `<span style="display:inline-block;font-size:11px;font-weight:600;padding:2px 8px;border-radius:10px;background:${bg};border:1px solid ${border};color:${color};vertical-align:middle;">${esc(type)}</span>`;
}

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<div class="fb-kv"><span class="fb-kv-k">${esc(label)}</span><span class="fb-kv-v">${esc(value)}</span></div>`;
}

function masked(label) {
  return `<div class="fb-kv"><span class="fb-kv-k">${esc(label)}</span><span class="fb-kv-v fb-masked">[configured]</span></div>`;
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }
  cfg = expandDotted(cfg);

  const filename = (intake.name || intake.filename || 'filebeat.yml').split('/').pop();

  // Inputs — support both nested `filebeat.inputs` and flat `inputs`
  const rawInputs = Array.isArray(cfg.filebeat?.inputs) ? cfg.filebeat.inputs
    : (Array.isArray(cfg.inputs) ? cfg.inputs : []);

  const inputsHtml = rawInputs.length ? `
<div class="fb-sec"><h3>Inputs (${rawInputs.length})</h3>
${rawInputs.map((inp, i) => {
    const type = inp.type || 'log';
    const enabled = inp.enabled !== false;
    const id = inp.id || inp.name || `Input ${i + 1}`;
    const paths = Array.isArray(inp.paths) ? inp.paths : (inp.path ? [inp.path] : []);
    const globs = Array.isArray(inp.paths) ? inp.paths : (inp.path ? [inp.path] : []);
    const streamsArr = Array.isArray(inp.streams) ? inp.streams : [];
    const allPaths = [...globs, ...streamsArr.flatMap((s) => Array.isArray(s.paths) ? s.paths : [])];
    const displayPaths = allPaths.slice(0, 4);
    const pathsHtml = displayPaths.length
      ? `<div class="fb-paths">${displayPaths.map((p) => esc(p)).join('<br>')}${allPaths.length > 4 ? `<br><span style="color:var(--fg-2,#999)">+${allPaths.length - 4} more</span>` : ''}</div>`
      : '';
    const encoding = inp.encoding ? kv('encoding', inp.encoding) : '';
    const multiline = inp.multiline ? kv('multiline', 'enabled') : '';
    return `<div class="fb-card">
<div class="fb-input-name">${esc(id)} ${inputTypeChip(type)}${!enabled ? ' <span class="fb-chip fb-chip-disabled">disabled</span>' : ''}</div>
${pathsHtml}${encoding}${multiline}
</div>`;
  }).join('')}
</div>` : '';

  // Modules
  const cfgModules = cfg.filebeat?.config?.modules;
  const inlineModules = Array.isArray(cfg.filebeat?.modules) ? cfg.filebeat.modules
    : (Array.isArray(cfg.modules) ? cfg.modules : []);
  let modulesHtml = '';
  if (cfgModules || inlineModules.length) {
    const parts = [];
    if (cfgModules) parts.push(kv('config path', typeof cfgModules === 'object' ? (cfgModules.path || JSON.stringify(cfgModules)) : String(cfgModules)));
    if (inlineModules.length) {
      const names = inlineModules.map((m) => m.module || m.name || '(unnamed)');
      parts.push(`<div class="fb-pills">${names.map((n) => `<span class="fb-pill">${esc(n)}</span>`).join('')}</div>`);
    }
    modulesHtml = `<div class="fb-sec"><h3>Modules</h3><div class="fb-card">${parts.join('')}</div></div>`;
  }

  // Output
  const output = cfg.output || {};
  const outputType = Object.keys(output)[0] || '';
  const outputCfg = output[outputType] || {};

  let outputHtml = '';
  if (outputType) {
    const hosts = Array.isArray(outputCfg.hosts) ? outputCfg.hosts : (outputCfg.hosts ? [outputCfg.hosts] : []);
    const displayHosts = hosts.slice(0, 4);
    const hostsText = displayHosts.map((h) => esc(h)).join(', ') + (hosts.length > 4 ? `, +${hosts.length - 4} more` : '');
    const hasPassword = !!(outputCfg.password);
    const hasApiKey = !!(outputCfg.api_key);
    const hasSslKey = !!(outputCfg.ssl?.key || outputCfg.ssl?.certificate_key);
    outputHtml = `
<div class="fb-sec"><h3>Output</h3><div class="fb-card">
<div style="margin-bottom:6px;"><span class="fb-output-chip">${esc(outputType)}</span></div>
${hosts.length ? `<div class="fb-kv"><span class="fb-kv-k">hosts</span><span class="fb-kv-v">${hostsText}</span></div>` : ''}
${outputCfg.username ? kv('username', outputCfg.username) : ''}
${hasPassword ? masked('password') : ''}
${hasApiKey ? masked('api_key') : ''}
${outputCfg.index ? kv('index', outputCfg.index) : ''}
${outputCfg.topic ? kv('topic', outputCfg.topic) : ''}
${outputCfg.pipeline ? kv('pipeline', outputCfg.pipeline) : ''}
${hasSslKey ? masked('ssl.key') : ''}
</div></div>`;
  }

  // Processors
  const processors = Array.isArray(cfg.processors) ? cfg.processors : [];
  const procNames = processors.map((p) => Object.keys(p)[0] || '(processor)');
  const processorsHtml = procNames.length ? `
<div class="fb-sec"><h3>Processors (${procNames.length})</h3>
<div class="fb-pills">${procNames.map((n) => `<span class="fb-pill">${esc(n)}</span>`).join('')}</div>
</div>` : '';

  // Logging
  const logging = cfg.logging || {};
  const logLevel = logging.level || '';
  const logToFiles = logging.to_files;
  const loggingHtml = (logLevel || logToFiles != null) ? `
<div class="fb-sec"><h3>Logging</h3><div class="fb-card">
${kv('level', logLevel)}
${logToFiles != null ? kv('to_files', String(logToFiles)) : ''}
</div></div>` : '';

  const subParts = [
    rawInputs.length ? `${rawInputs.length} input${rawInputs.length !== 1 ? 's' : ''}` : '',
    inlineModules.length ? `${inlineModules.length} module${inlineModules.length !== 1 ? 's' : ''}` : '',
    procNames.length ? `${procNames.length} processor${procNames.length !== 1 ? 's' : ''}` : '',
    outputType ? `→ ${outputType}` : '',
  ].filter(Boolean).join(' · ');

  const host = document.createElement('div');
  host.className = 'filebeat-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="fb-badge">Elastic Filebeat</span>
  <span class="fb-title">${esc(filename)}</span>
</div>
<div class="fb-sub">${esc(subParts)}</div>
${inputsHtml}${modulesHtml}${outputHtml}${processorsHtml}${loggingHtml}`;
  return { parentNode: host };
}
