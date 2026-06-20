import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.azp-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-azp{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0078d4;color:#fff;vertical-align:middle;margin-right:8px;}
.azp-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.azp-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.azp-sec{margin:12px 0;}
.azp-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.azp-pills{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0;}
.azp-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.azp-pill.trigger{background:#eff6ff;border-color:#93c5fd;color:#1d4ed8;}
.azp-stage{padding:6px 10px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);margin:4px 0;font-size:13px;}
.azp-stage-name{font-weight:600;}
.azp-kv{font-size:12px;color:var(--fg-2,#888);margin-left:8px;}
.azp-var-table{width:100%;border-collapse:collapse;font-size:13px;}
.azp-var-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.azp-var-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);}
.azp-mono{font:12px/1.4 ui-monospace,monospace;}
`;

function normalizeBranches(trigger) {
  if (!trigger) return [];
  if (trigger === 'none') return [];
  if (Array.isArray(trigger)) return trigger;
  if (typeof trigger === 'object') {
    const inc = trigger.branches?.include || trigger.include || [];
    return Array.isArray(inc) ? inc : [inc];
  }
  return [String(trigger)];
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || \'\') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  const trigger = normalizeBranches(cfg.trigger);
  const prTrigger = normalizeBranches(cfg.pr);
  const pool = cfg.pool || {};
  const vmImage = typeof pool === 'string' ? pool : (pool.vmImage || pool.name || '');

  const stages = Array.isArray(cfg.stages) ? cfg.stages : [];
  const jobs = Array.isArray(cfg.jobs) ? cfg.jobs : [];
  const steps = Array.isArray(cfg.steps) ? cfg.steps : [];

  const variables = cfg.variables
    ? (Array.isArray(cfg.variables)
        ? cfg.variables.filter((v) => v.name).map((v) => ({ key: v.name, val: v.value ?? '' }))
        : Object.entries(cfg.variables).map(([k, v]) => ({ key: k, val: String(v) })))
    : [];

  const strategyMatrix = cfg.strategy?.matrix;

  const host = document.createElement('div');
  host.className = 'azp-doc';

  const triggerHtml = trigger.length
    ? `<div class="azp-sec"><h3>Trigger branches</h3><div class="azp-pills">${trigger.map((b) => `<span class="azp-pill trigger">${esc(b)}</span>`).join('')}</div></div>`
    : '';

  const prHtml = prTrigger.length
    ? `<div class="azp-sec"><h3>PR trigger</h3><div class="azp-pills">${prTrigger.map((b) => `<span class="azp-pill trigger">${esc(b)}</span>`).join('')}</div></div>`
    : '';

  const poolHtml = vmImage
    ? `<div class="azp-sec"><h3>Pool</h3><div class="azp-pills"><span class="azp-pill">${esc(vmImage)}</span></div></div>`
    : '';

  const stagesHtml = stages.length
    ? `<div class="azp-sec"><h3>Stages (${stages.length})</h3>${stages.map((s) => {
        const name = s.stage || s.displayName || '?';
        const jobCount = Array.isArray(s.jobs) ? s.jobs.length : 0;
        return `<div class="azp-stage"><span class="azp-stage-name">${esc(name)}</span>${jobCount ? `<span class="azp-kv">${jobCount} job${jobCount !== 1 ? 's' : ''}</span>` : ''}</div>`;
      }).join('')}</div>`
    : jobs.length
    ? `<div class="azp-sec"><h3>Jobs (${jobs.length})</h3>${jobs.map((j) => {
        const name = j.job || j.displayName || '?';
        const stepCount = Array.isArray(j.steps) ? j.steps.length : 0;
        return `<div class="azp-stage"><span class="azp-stage-name">${esc(name)}</span>${stepCount ? `<span class="azp-kv">${stepCount} step${stepCount !== 1 ? 's' : ''}</span>` : ''}</div>`;
      }).join('')}</div>`
    : steps.length
    ? `<div class="azp-sec"><h3>Steps</h3><div class="azp-pills"><span class="azp-pill">${steps.length} step${steps.length !== 1 ? 's' : ''}</span></div></div>`
    : '';

  const varRows = variables.slice(0, 20).map((v) => `<tr><td><span class="azp-mono">${esc(v.key)}</span></td><td><span class="azp-mono">${esc(v.val) || '—'}</span></td></tr>`).join('');
  const varHtml = variables.length
    ? `<div class="azp-sec"><h3>Variables (${variables.length})</h3>
      <table class="azp-var-table"><thead><tr><th>Name</th><th>Value</th></tr></thead>
      <tbody>${varRows}${variables.length > 20 ? `<tr><td colspan="2" style="color:var(--fg-2,#888);font-size:12px">…and ${variables.length - 20} more</td></tr>` : ''}</tbody>
      </table></div>`
    : '';

  const matrixKeys = strategyMatrix ? Object.keys(strategyMatrix) : [];
  const matrixHtml = matrixKeys.length
    ? `<div class="azp-sec"><h3>Strategy matrix</h3><div class="azp-pills">${matrixKeys.map((k) => {
        const vals = [].concat(strategyMatrix[k]);
        return `<span class="azp-pill">${esc(k)}: ${vals.map(esc).join(', ')}</span>`;
      }).join('')}</div></div>`
    : '';

  const totalSteps = stages.reduce((acc, s) => {
    if (!Array.isArray(s.jobs)) return acc;
    return acc + s.jobs.reduce((a, j) => a + (Array.isArray(j.steps) ? j.steps.length : 0), 0);
  }, steps.length || jobs.reduce((a, j) => a + (Array.isArray(j.steps) ? j.steps.length : 0), 0));

  host.innerHTML = `<style>${CSS}</style>
<div class="azp-title"><span class="badge-azp">Azure Pipelines</span>Pipeline config</div>
<div class="azp-sub">${stages.length ? `${stages.length} stage${stages.length !== 1 ? 's' : ''}` : jobs.length ? `${jobs.length} job${jobs.length !== 1 ? 's' : ''}` : 'no stages'}${totalSteps ? ` · ${totalSteps} step${totalSteps !== 1 ? 's' : ''}` : ''}${trigger.length ? ` · triggers on ${trigger.length} branch${trigger.length !== 1 ? 'es' : ''}` : ''}</div>
${triggerHtml}${prHtml}${poolHtml}${stagesHtml}${varHtml}${matrixHtml}`;

  return { parentNode: host };
}
