import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.cod-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-cod{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#232f3e;color:#ff9900;vertical-align:middle;margin-right:8px;}
.cod-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.cod-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.cod-sec{margin:12px 0;}
.cod-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.cod-phase{border:1px solid var(--border,#e0e0e0);border-radius:6px;margin:6px 0;overflow:hidden;}
.cod-phase-hd{padding:6px 10px;background:var(--bg-2,#f6f8fa);font-size:13px;font-weight:600;}
.cod-cmd{font:12px/1.5 ui-monospace,monospace;padding:3px 10px;border-top:1px solid var(--border,#e0e0e0);white-space:pre-wrap;word-break:break-all;}
.cod-pills{display:flex;flex-wrap:wrap;gap:6px;}
.cod-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
`;

function renderPhase(name, phase) {
  if (!phase) return '';
  const cmds = Array.isArray(phase.commands) ? phase.commands : [];
  if (!cmds.length) return '';
  return `<div class="cod-phase">
    <div class="cod-phase-hd">${esc(name)}</div>
    ${cmds.slice(0, 5).map((c) => `<div class="cod-cmd">${esc(String(c))}</div>`).join('')}
    ${cmds.length > 5 ? `<div class="cod-cmd" style="color:var(--fg-2,#888)">…and ${cmds.length - 5} more</div>` : ''}
  </div>`;
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = {}; }

  const version = cfg.version || '?';
  const phases = cfg.phases || {};
  const artifacts = cfg.artifacts || {};
  const cache = cfg.cache || {};

  const PHASE_NAMES = ['install', 'pre_build', 'build', 'post_build'];
  const phasesHtml = PHASE_NAMES.map((p) => renderPhase(p, phases[p])).filter(Boolean).join('');

  const artFiles = Array.isArray(artifacts.files) ? artifacts.files : [];
  const artHtml = artFiles.length
    ? `<div class="cod-sec"><h3>Artifacts</h3><div class="cod-pills">${artFiles.slice(0, 5).map((f) => `<span class="cod-pill">${esc(f)}</span>`).join('')}</div></div>`
    : '';

  const cachePaths = Array.isArray(cache.paths) ? cache.paths : [];
  const cacheHtml = cachePaths.length
    ? `<div class="cod-sec"><h3>Cache paths</h3><div class="cod-pills">${cachePaths.slice(0, 5).map((p) => `<span class="cod-pill">${esc(p)}</span>`).join('')}</div></div>`
    : '';

  const totalCmds = PHASE_NAMES.reduce((n, p) => n + (Array.isArray(phases[p]?.commands) ? phases[p].commands.length : 0), 0);

  const host = document.createElement('div');
  host.className = 'cod-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="cod-title"><span class="badge-cod">CodeBuild</span>Buildspec</div>
<div class="cod-sub">version ${esc(version)}${totalCmds ? ` · ${totalCmds} command${totalCmds !== 1 ? 's' : ''}` : ''}</div>
${phasesHtml ? `<div class="cod-sec"><h3>Build phases</h3>${phasesHtml}</div>` : ''}${artHtml}${cacheHtml}`;
  return { parentNode: host };
}
