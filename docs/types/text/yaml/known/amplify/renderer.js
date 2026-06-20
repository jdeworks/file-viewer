import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.amp-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-amp{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#ff9900;color:#fff;vertical-align:middle;margin-right:8px;}
.amp-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.amp-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.amp-sec{margin:12px 0;}
.amp-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.amp-phase{border:1px solid var(--border,#e0e0e0);border-radius:6px;margin:6px 0;overflow:hidden;}
.amp-phase-hd{padding:6px 10px;background:var(--bg-2,#f6f8fa);font-size:13px;font-weight:600;}
.amp-cmd{font:12px/1.5 ui-monospace,monospace;padding:3px 10px;border-top:1px solid var(--border,#e0e0e0);white-space:pre-wrap;word-break:break-all;}
.amp-pills{display:flex;flex-wrap:wrap;gap:6px;}
.amp-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
`;

function renderPhase(name, phase) {
  if (!phase) return '';
  const cmds = Array.isArray(phase.commands) ? phase.commands : [];
  if (!cmds.length) return '';
  return `<div class="amp-phase">
    <div class="amp-phase-hd">${esc(name)}</div>
    ${cmds.slice(0, 5).map((c) => `<div class="amp-cmd">${esc(c)}</div>`).join('')}
    ${cmds.length > 5 ? `<div class="amp-cmd" style="color:var(--fg-2,#888)">…and ${cmds.length - 5} more</div>` : ''}
  </div>`;
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || \'\') || [])[0] || {};
  } catch { cfg = {}; }

  const version = cfg.version || '?';
  const apps = ['frontend', 'backend', 'test'];
  const sections = [];

  for (const appKey of apps) {
    if (!cfg[appKey]) continue;
    const app = cfg[appKey];
    const phases = app.phases || {};
    const artifacts = app.artifacts || {};
    const phaseHtml = ['preBuild', 'build', 'postBuild']
      .map((p) => renderPhase(p, phases[p]))
      .filter(Boolean).join('');
    const artFiles = Array.isArray(artifacts.files) ? artifacts.files : [];
    const artDir = artifacts.baseDirectory || '';
    const artHtml = (artFiles.length || artDir)
      ? `<div class="amp-sec"><h3>Artifacts</h3><div class="amp-pills">
          ${artDir ? `<span class="amp-pill">${esc(artDir)}</span>` : ''}
          ${artFiles.slice(0, 3).map((f) => `<span class="amp-pill">${esc(f)}</span>`).join('')}
        </div></div>`
      : '';
    sections.push(`<div class="amp-sec"><h3>${esc(appKey)} build phases</h3>${phaseHtml}</div>${artHtml}`);
  }

  const host = document.createElement('div');
  host.className = 'amp-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="amp-title"><span class="badge-amp">AWS Amplify</span>Build spec</div>
<div class="amp-sub">version ${esc(version)}</div>
${sections.join('') || '<div style="color:var(--fg-2,#888);font-size:13px">No build phases found</div>'}`;
  return { parentNode: host };
}
