// Enhanced MLproject viewer.
// Shows project name, environment, and entry points with parameters.
import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.mlf-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-mlf{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0194E2;color:#fff;vertical-align:middle;margin-right:8px}
.mlf-title{font-size:18px;font-weight:700;margin:0 0 4px}
.mlf-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.mlf-sec{margin:14px 0}
.mlf-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px}
.mlf-card{background:var(--bg,#fff);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin:8px 0}
.mlf-ep-name{font-size:14px;font-weight:700;margin-bottom:6px}
.mlf-cmd{font:12px/1.5 ui-monospace,monospace;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:4px;padding:6px 10px;margin:6px 0;word-break:break-all;white-space:pre-wrap}
.mlf-row{display:flex;gap:8px;font-size:13px;padding:3px 0;border-bottom:1px solid var(--border,#f0f0f0)}
.mlf-row:last-child{border-bottom:none}
.mlf-key{color:var(--fg-2,#888);min-width:120px;flex-shrink:0;font-size:12px}
.mlf-val{font-family:ui-monospace,monospace;word-break:break-all}
.mlf-params{margin-top:8px}
.mlf-params-title{font-size:11px;font-weight:600;color:var(--fg-2,#888);text-transform:uppercase;letter-spacing:.04em;margin:0 0 4px}
.mlf-param-item{display:flex;gap:8px;font-size:12px;padding:3px 6px;border-radius:4px;background:var(--bg-2,#f6f8fa);margin-bottom:3px}
.mlf-param-name{font-family:ui-monospace,monospace;font-weight:600;min-width:100px}
.mlf-param-type{color:#0194E2;min-width:60px;font-size:11px;padding-top:1px}
.mlf-param-default{color:var(--fg-2,#888);font-family:ui-monospace,monospace;font-size:11px}
`;

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch {
    cfg = intake.parsed || {};
  }

  const name = cfg.name || (intake.filename || intake.name || 'MLproject').split('/').pop();
  const condaEnv = cfg.conda_env;
  const pythonEnv = cfg.python_env;
  const dockerEnv = cfg.docker_env;
  const entryPoints = cfg.entry_points || {};
  const epNames = Object.keys(entryPoints);

  // Environment section
  const envRows = [
    condaEnv ? `<div class="mlf-row"><span class="mlf-key">conda_env</span><span class="mlf-val">${esc(condaEnv)}</span></div>` : '',
    pythonEnv ? `<div class="mlf-row"><span class="mlf-key">python_env</span><span class="mlf-val">${esc(pythonEnv)}</span></div>` : '',
    dockerEnv && typeof dockerEnv === 'object' && dockerEnv.image
      ? `<div class="mlf-row"><span class="mlf-key">docker image</span><span class="mlf-val">${esc(dockerEnv.image)}</span></div>` : '',
  ].filter(Boolean).join('');

  // Entry points
  function paramHtml(params) {
    if (!params || typeof params !== 'object' || !Object.keys(params).length) return '';
    const items = Object.entries(params).slice(0, 20).map(([pname, pdef]) => {
      const ptype = typeof pdef === 'object' && pdef ? pdef.type || '' : '';
      const pdefault = typeof pdef === 'object' && pdef ? (pdef.default != null ? String(pdef.default) : '') : (pdef != null ? String(pdef) : '');
      return `<div class="mlf-param-item">
        <span class="mlf-param-name">${esc(pname)}</span>
        ${ptype ? `<span class="mlf-param-type">${esc(ptype)}</span>` : ''}
        ${pdefault !== '' ? `<span class="mlf-param-default">default: ${esc(pdefault)}</span>` : ''}
      </div>`;
    }).join('');
    return `<div class="mlf-params"><div class="mlf-params-title">Parameters</div>${items}</div>`;
  }

  const epsHtml = epNames.map((epName) => {
    const ep = entryPoints[epName] || {};
    const cmd = ep.command || ep.cmd || '';
    const params = ep.parameters || ep.params || {};
    return `<div class="mlf-card">
      <div class="mlf-ep-name">${esc(epName)}</div>
      ${cmd ? `<div class="mlf-cmd">${esc(cmd)}</div>` : ''}
      ${paramHtml(params)}
    </div>`;
  }).join('');

  const host = document.createElement('div');
  host.className = 'mlf-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="mlf-title"><span class="badge-mlf">MLflow</span>${esc(name)}</div>
<div class="mlf-sub">MLflow Project — ${epNames.length} entry point${epNames.length !== 1 ? 's' : ''}</div>
${envRows ? `<div class="mlf-sec"><h3>Environment</h3><div class="mlf-card">${envRows}</div></div>` : ''}
${epNames.length ? `<div class="mlf-sec"><h3>Entry Points (${epNames.length})</h3>${epsHtml}</div>` : ''}`;
  return { parentNode: host };
}
