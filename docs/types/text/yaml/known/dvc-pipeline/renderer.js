// Enhanced dvc.yaml viewer.
// Shows pipeline stages as cards: stage name, command, deps, outputs, params.
import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.dvc-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-dvc{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#945DD6;color:#fff;vertical-align:middle;margin-right:8px}
.dvc-title{font-size:18px;font-weight:700;margin:0 0 4px}
.dvc-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.dvc-sec{margin:14px 0}
.dvc-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px}
.dvc-stage{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin:8px 0;background:var(--bg,#fff)}
.dvc-stage-name{font-size:15px;font-weight:700;margin-bottom:8px;display:flex;align-items:center;gap:6px}
.dvc-stage-badge{display:inline-block;font-size:10px;padding:2px 7px;border-radius:8px;background:#f3eafd;border:1px solid #c792ea;color:#7c3aed;font-family:system-ui,sans-serif;font-weight:600}
.dvc-cmd{font:12px/1.5 ui-monospace,monospace;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:4px;padding:6px 10px;margin:6px 0;word-break:break-all;white-space:pre-wrap}
.dvc-list-label{font-size:11px;font-weight:600;color:var(--fg-2,#888);text-transform:uppercase;letter-spacing:.04em;margin:8px 0 3px}
.dvc-items{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:4px}
.dvc-item{font:11px/1.4 ui-monospace,monospace;padding:2px 8px;border-radius:4px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0)}
.dvc-item.dep{background:#e8f5e9;border-color:#81c784;color:#1b5e20}
.dvc-item.out{background:#e3f2fd;border-color:#64b5f6;color:#0d47a1}
.dvc-item.param{background:#fff3e0;border-color:#ffb74d;color:#e65100}
.dvc-row{display:flex;gap:8px;font-size:13px;padding:3px 0;border-bottom:1px solid var(--border,#f0f0f0)}
.dvc-row:last-child{border-bottom:none}
.dvc-key{color:var(--fg-2,#888);min-width:110px;flex-shrink:0;font-size:12px}
.dvc-val{font-family:ui-monospace,monospace;word-break:break-all}
`;

function flattenList(v) {
  if (!v) return [];
  if (typeof v === 'string') return [v];
  if (Array.isArray(v)) {
    return v.flatMap((item) => {
      if (typeof item === 'string') return [item];
      if (item && typeof item === 'object') return Object.keys(item);
      return [];
    });
  }
  return [];
}

function stageHtml(name, def) {
  if (!def || typeof def !== 'object') return '';
  const cmd = def.cmd || def.command || '';
  const deps = flattenList(def.deps);
  const outs = flattenList(def.outs);
  const params = flattenList(def.params);
  const wdir = def.wdir;
  const frozen = def.frozen;

  const badges = [frozen ? '<span class="dvc-stage-badge">frozen</span>' : ''].filter(Boolean).join('');

  const cmdHtml = cmd ? `<div class="dvc-cmd">${esc(cmd)}</div>` : '';

  function itemList(items, cls, label) {
    if (!items.length) return '';
    return `<div class="dvc-list-label">${label}</div><ul class="dvc-items">${items.slice(0, 20).map((i) => `<li class="dvc-item ${cls}">${esc(i)}</li>`).join('')}${items.length > 20 ? `<li class="dvc-item">+${items.length - 20} more</li>` : ''}</ul>`;
  }

  const extraRows = [
    wdir ? `<div class="dvc-row"><span class="dvc-key">working dir</span><span class="dvc-val">${esc(wdir)}</span></div>` : '',
  ].filter(Boolean).join('');

  return `<div class="dvc-stage">
    <div class="dvc-stage-name">${esc(name)}${badges}</div>
    ${cmdHtml}
    ${itemList(deps, 'dep', 'Dependencies')}
    ${itemList(outs, 'out', 'Outputs')}
    ${itemList(params, 'param', 'Parameters')}
    ${extraRows ? `<div style="margin-top:6px">${extraRows}</div>` : ''}
  </div>`;
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch {
    cfg = intake.parsed || {};
  }

  const stages = cfg.stages || {};
  const stageNames = Object.keys(stages);
  const stagesHtml = stageNames.map((n) => stageHtml(n, stages[n])).join('');

  // Vars / params at top level
  const vars = Array.isArray(cfg.vars) ? cfg.vars : [];
  const varsHtml = vars.length ? `<div class="dvc-sec"><h3>Vars / param files (${vars.length})</h3>
    <ul class="dvc-items">${vars.slice(0, 20).map((v) => `<li class="dvc-item param">${esc(typeof v === 'string' ? v : JSON.stringify(v))}</li>`).join('')}</ul></div>` : '';

  const host = document.createElement('div');
  host.className = 'dvc-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="dvc-title"><span class="badge-dvc">DVC</span>dvc.yaml</div>
<div class="dvc-sub">DVC pipeline — ${stageNames.length} stage${stageNames.length !== 1 ? 's' : ''}</div>
${stageNames.length ? `<div class="dvc-sec"><h3>Stages (${stageNames.length})</h3>${stagesHtml}</div>` : ''}
${varsHtml}`;
  return { parentNode: host };
}
