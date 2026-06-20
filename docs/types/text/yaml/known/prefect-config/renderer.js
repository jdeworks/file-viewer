import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.prefect-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-prefect{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1469c7;color:#fff;vertical-align:middle;margin-right:8px}
.prefect-title{font-size:18px;font-weight:700;margin:0 0 4px}
.prefect-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.prefect-sec{margin:12px 0}
.prefect-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;padding-bottom:4px;border-bottom:1px solid var(--border,#e0e0e0)}
.prefect-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px}
.prefect-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:8px 12px}
.prefect-card-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--fg-2,#888);margin-bottom:4px}
.prefect-card-val{font-size:13px;font-family:ui-monospace,monospace;word-break:break-all}
.prefect-dep{background:var(--bg,#fff);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin-bottom:10px}
.prefect-dep h4{font-size:14px;font-weight:700;margin:0 0 6px;color:var(--fg,#24292f)}
.prefect-kv{display:grid;grid-template-columns:160px 1fr;gap:2px 12px;font-size:12px}
.prefect-kv dt{color:var(--fg-2,#888);padding:3px 0;border-bottom:1px solid var(--border,#e0e0e0)}
.prefect-kv dd{padding:3px 0;border-bottom:1px solid var(--border,#e0e0e0);margin:0;font-family:ui-monospace,monospace;word-break:break-all}
.prefect-pill{display:inline-block;font-size:11px;padding:2px 8px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);margin:2px 2px 2px 0;font-family:ui-monospace,monospace}
.prefect-sched{font-size:11px;padding:2px 8px;border-radius:8px;background:#e8f4fd;border:1px solid #93c5fd;color:#1d4ed8;display:inline-block;margin:2px 2px 2px 0;font-family:ui-monospace,monospace}
.prefect-step{font-size:12px;padding:4px 8px;border-left:3px solid var(--border,#e0e0e0);margin:4px 0;font-family:ui-monospace,monospace;background:var(--bg-2,#f6f8fa)}
`;

function stepsHtml(steps, label) {
  if (!Array.isArray(steps) || !steps.length) return '';
  const items = steps.map((s) => {
    if (typeof s === 'string') return `<div class="prefect-step">${esc(s)}</div>`;
    const keys = Object.keys(s);
    const key = keys[0] || '';
    return `<div class="prefect-step">${esc(key)}</div>`;
  }).join('');
  return `<div style="margin-top:6px"><span style="font-size:11px;font-weight:600;color:var(--fg-2,#888)">${esc(label)}</span>${items}</div>`;
}

function scheduleStr(sched) {
  if (!sched) return '';
  if (typeof sched === 'string') return sched;
  if (sched.cron) return `cron: ${sched.cron}`;
  if (sched.interval) return `every ${sched.interval}s`;
  if (sched.rrule) return `rrule: ${String(sched.rrule).slice(0, 40)}`;
  return JSON.stringify(sched).slice(0, 60);
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  const project = cfg.name || cfg['prefect-project'] || '';
  const prefectVersion = cfg['prefect-version'] || '';
  const deployments = Array.isArray(cfg.deployments) ? cfg.deployments : [];
  const buildSteps = cfg.build || [];
  const pullSteps = cfg.pull || [];
  const pushSteps = cfg.push || [];

  const subParts = [];
  if (project) subParts.push(project);
  if (prefectVersion) subParts.push(`Prefect ${prefectVersion}`);
  if (deployments.length) subParts.push(`${deployments.length} deployment${deployments.length !== 1 ? 's' : ''}`);

  // Overview cards
  const overviewItems = [];
  if (project) overviewItems.push({ label: 'Project', val: project });
  if (prefectVersion) overviewItems.push({ label: 'Prefect Version', val: prefectVersion });
  const overviewHtml = overviewItems.length
    ? `<div class="prefect-sec"><h3>Overview</h3><div class="prefect-grid">${overviewItems.map((i) =>
        `<div class="prefect-card"><div class="prefect-card-title">${esc(i.label)}</div><div class="prefect-card-val">${esc(i.val)}</div></div>`
      ).join('')}</div></div>`
    : '';

  // Deployments
  const depsHtml = deployments.length
    ? `<div class="prefect-sec"><h3>Deployments (${deployments.length})</h3>${deployments.map((dep) => {
        const name = dep.name || '(unnamed)';
        const entrypoint = dep.entrypoint || '';
        const workPool = dep.work_pool?.name || dep['work-pool']?.name || dep.work_pool || '';
        const workPoolJobVars = dep.work_pool?.job_variables || {};
        const schedules = Array.isArray(dep.schedules) ? dep.schedules : (dep.schedule ? [dep.schedule] : []);
        const parameters = dep.parameters || {};
        const tags = Array.isArray(dep.tags) ? dep.tags : [];

        const kvItems = [];
        if (entrypoint) kvItems.push({ label: 'Entrypoint', val: entrypoint });
        if (workPool) kvItems.push({ label: 'Work Pool', val: workPool });
        const imageVar = workPoolJobVars.image || '';
        if (imageVar) kvItems.push({ label: 'Image', val: imageVar });

        const schedsHtml = schedules.length
          ? `<div style="margin-top:6px">${schedules.map((s) => `<span class="prefect-sched">${esc(scheduleStr(s))}</span>`).join('')}</div>`
          : '';

        const tagsHtml = tags.length
          ? `<div style="margin-top:4px">${tags.map((t) => `<span class="prefect-pill">${esc(t)}</span>`).join('')}</div>`
          : '';

        const paramKeys = Object.keys(parameters);
        const paramsHtml = paramKeys.length
          ? `<div style="margin-top:6px;font-size:11px;color:var(--fg-2,#888)">${paramKeys.length} parameter${paramKeys.length !== 1 ? 's' : ''}: ${paramKeys.map(esc).join(', ')}</div>`
          : '';

        return `<div class="prefect-dep">
          <h4>${esc(name)}</h4>
          ${kvItems.length ? `<dl class="prefect-kv">${kvItems.map((i) => `<dt>${esc(i.label)}</dt><dd>${esc(i.val)}</dd>`).join('')}</dl>` : ''}
          ${schedsHtml}${tagsHtml}${paramsHtml}
        </div>`;
      }).join('')}</div>`
    : '';

  // Build / Pull / Push steps
  const pipelineHtml = (buildSteps.length || pullSteps.length || pushSteps.length)
    ? `<div class="prefect-sec"><h3>Pipeline Steps</h3>
      ${stepsHtml(buildSteps, 'Build')}
      ${stepsHtml(pullSteps, 'Pull')}
      ${stepsHtml(pushSteps, 'Push')}
    </div>`
    : '';

  const host = document.createElement('div');
  host.className = 'prefect-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="prefect-title"><span class="badge-prefect">Prefect</span>${esc(project || 'prefect.yaml')}</div>
<div class="prefect-sub">${esc(subParts.join(' · ') || 'Prefect 2 workflow config')}</div>
${overviewHtml}${depsHtml}${pipelineHtml}`;
  return { parentNode: host };
}
