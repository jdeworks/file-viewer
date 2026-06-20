import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.falco-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.falco-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#00aec7;color:#fff;vertical-align:middle;margin-right:8px}
.falco-title{font-size:18px;font-weight:700;margin:0 0 4px}
.falco-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.falco-sec{margin:12px 0}
.falco-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px}
.falco-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin-bottom:8px}
.falco-row{display:flex;gap:8px;font-size:13px;padding:3px 0;border-bottom:1px solid var(--border,#f0f0f0)}
.falco-row:last-child{border-bottom:none}
.falco-key{color:var(--fg-2,#888);min-width:160px;flex-shrink:0;font-size:12px}
.falco-val{font-family:ui-monospace,monospace;word-break:break-all}
.falco-chip{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;font-weight:600;margin:2px 3px 2px 0;border:1px solid}
.falco-chip.on{background:#dcfce7;border-color:#86efac;color:#14532d}
.falco-chip.off{background:#f1f5f9;border-color:#cbd5e1;color:#64748b}
.falco-chip.file{background:#dbeafe;border-color:#93c5fd;color:#1e40af}
`;

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  const rulesFiles = Array.isArray(cfg.rules_file) ? cfg.rules_file : (cfg.rules_file ? [cfg.rules_file] : []);
  const stdoutOutput = cfg.stdout_output || {};
  const fileOutput = cfg.file_output || {};
  const programOutput = cfg.program_output || {};
  const grpcOutput = cfg.grpc_output || {};
  const grpc = cfg.grpc || {};
  const logLevel = cfg.log_level || '';
  const priority = cfg.priority || '';
  const bufferedOutputs = cfg.buffered_outputs;
  const watchConfigFiles = cfg.watch_config_files;

  const row = (k, v) => v != null ? `<div class="falco-row"><span class="falco-key">${esc(k)}</span><span class="falco-val">${esc(String(v))}</span></div>` : '';
  const yn = (v) => v ? '<span class="falco-chip on">enabled</span>' : '<span class="falco-chip off">disabled</span>';

  const settingsRows = [
    row('log_level', logLevel),
    priority ? row('priority', priority) : '',
    bufferedOutputs != null ? `<div class="falco-row"><span class="falco-key">buffered_outputs</span><span class="falco-val">${yn(bufferedOutputs)}</span></div>` : '',
    watchConfigFiles != null ? `<div class="falco-row"><span class="falco-key">watch_config_files</span><span class="falco-val">${yn(watchConfigFiles)}</span></div>` : '',
  ].filter(Boolean).join('');

  const outputRows = [
    stdoutOutput.enabled != null ? `<div class="falco-row"><span class="falco-key">stdout_output</span><span class="falco-val">${yn(stdoutOutput.enabled)}</span></div>` : '',
    fileOutput.enabled != null ? `<div class="falco-row"><span class="falco-key">file_output</span><span class="falco-val">${yn(fileOutput.enabled)}${fileOutput.filename ? ` <span style="font-size:11px;color:var(--fg-2,#888)">${esc(fileOutput.filename)}</span>` : ''}</span></div>` : '',
    programOutput.enabled != null ? `<div class="falco-row"><span class="falco-key">program_output</span><span class="falco-val">${yn(programOutput.enabled)}${programOutput.program ? ` <span style="font-size:11px;color:var(--fg-2,#888)">${esc(String(programOutput.program).slice(0, 40))}</span>` : ''}</span></div>` : '',
    grpcOutput.enabled != null ? `<div class="falco-row"><span class="falco-key">grpc_output</span><span class="falco-val">${yn(grpcOutput.enabled)}</span></div>` : '',
  ].filter(Boolean).join('');

  const grpcRows = grpc.enabled != null ? [
    `<div class="falco-row"><span class="falco-key">grpc</span><span class="falco-val">${yn(grpc.enabled)}</span></div>`,
    grpc.bind_address ? row('grpc.bind_address', grpc.bind_address) : '',
  ].filter(Boolean).join('') : '';

  const host = document.createElement('div');
  host.className = 'falco-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="falco-title"><span class="falco-badge">Falco</span>falco.yaml</div>
<div class="falco-sub">Runtime security configuration · ${rulesFiles.length} rules file${rulesFiles.length !== 1 ? 's' : ''}</div>
${rulesFiles.length ? `<div class="falco-sec"><h3>Rules Files</h3><div class="falco-card">${rulesFiles.map(f => `<span class="falco-chip file">${esc(f)}</span>`).join('')}</div></div>` : ''}
${settingsRows ? `<div class="falco-sec"><h3>Settings</h3><div class="falco-card">${settingsRows}</div></div>` : ''}
${outputRows ? `<div class="falco-sec"><h3>Outputs</h3><div class="falco-card">${outputRows}</div></div>` : ''}
${grpcRows ? `<div class="falco-sec"><h3>gRPC</h3><div class="falco-card">${grpcRows}</div></div>` : ''}`;
  return { parentNode: host };
}
