// Enhanced meltano.yml viewer.
// Shows project name, version, default_environment, environments, plugins table, schedules, jobs.
import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.meltano-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-meltano{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#8b5cf6;color:#fff;vertical-align:middle;margin-right:8px}
.meltano-title{font-size:18px;font-weight:700;margin:0 0 4px}
.meltano-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.meltano-sec{margin:14px 0}
.meltano-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px}
.meltano-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin-bottom:8px}
.meltano-row{display:flex;gap:8px;font-size:13px;padding:3px 0;border-bottom:1px solid var(--border,#f0f0f0)}
.meltano-row:last-child{border-bottom:none}
.meltano-key{color:var(--fg-2,#888);min-width:160px;flex-shrink:0;font-size:12px}
.meltano-val{font-family:ui-monospace,monospace;word-break:break-all}
.meltano-env-chip{display:inline-block;font-size:11px;padding:2px 9px;border-radius:10px;background:#ede9fe;border:1px solid #a78bfa;color:#5b21b6;margin:2px 3px 2px 0;font-weight:600}
.meltano-env-chip.active{background:#8b5cf6;color:#fff;border-color:#8b5cf6}
.meltano-table{width:100%;border-collapse:collapse;font-size:13px}
.meltano-table th{text-align:left;padding:5px 10px;font-size:11px;font-weight:600;color:var(--fg-2,#888);text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid var(--border,#e0e0e0)}
.meltano-table td{padding:5px 10px;border-bottom:1px solid var(--border,#f0f0f0);vertical-align:top}
.meltano-table tr:last-child td{border-bottom:none}
.meltano-count{display:inline-block;font-size:12px;font-weight:700;background:#ede9fe;color:#5b21b6;border-radius:12px;padding:1px 8px;margin-right:4px}
.meltano-sched-name{font-family:ui-monospace,monospace;font-size:12px;font-weight:600;color:var(--fg,#24292f)}
.meltano-cron{font-family:ui-monospace,monospace;font-size:11px;color:#8b5cf6;background:#ede9fe;padding:1px 6px;border-radius:4px}
.meltano-tap{font-family:ui-monospace,monospace;font-size:12px;color:#059669}
.meltano-target{font-family:ui-monospace,monospace;font-size:12px;color:#d97706}
.meltano-job-name{font-family:ui-monospace,monospace;font-size:12px;font-weight:600}
.meltano-task{font-family:ui-monospace,monospace;font-size:11px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:4px;padding:2px 6px;word-break:break-all}
`;

function pluginTypeCount(plugins, type) {
  if (!plugins) return 0;
  const arr = plugins[type];
  return Array.isArray(arr) ? arr.length : 0;
}

function pluginList(plugins, type) {
  if (!plugins) return [];
  const arr = plugins[type];
  return Array.isArray(arr) ? arr : [];
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch {
    cfg = intake.parsed || {};
  }

  const projectName = cfg.project_id || cfg.name || (intake.filename || intake.name || 'meltano.yml').split('/').pop();
  const version = cfg.version;
  const defaultEnv = cfg.default_environment;
  const environments = Array.isArray(cfg.environments) ? cfg.environments : [];
  const plugins = cfg.plugins || {};
  const schedules = Array.isArray(cfg.schedules) ? cfg.schedules : [];
  const jobs = Array.isArray(cfg.jobs) ? cfg.jobs : [];

  // Identity section
  const identityRows = [
    projectName ? `<div class="meltano-row"><span class="meltano-key">project_id / name</span><span class="meltano-val">${esc(projectName)}</span></div>` : '',
    version != null ? `<div class="meltano-row"><span class="meltano-key">version</span><span class="meltano-val">${esc(version)}</span></div>` : '',
    defaultEnv ? `<div class="meltano-row"><span class="meltano-key">default_environment</span><span class="meltano-val">${esc(defaultEnv)}</span></div>` : '',
  ].filter(Boolean).join('');

  // Environments section
  let envsHtml = '';
  if (environments.length) {
    const envChips = environments.map((e) => {
      const name = typeof e === 'string' ? e : (e && e.name) || '';
      const isDefault = name === defaultEnv;
      return `<span class="meltano-env-chip${isDefault ? ' active' : ''}">${esc(name)}</span>`;
    }).join('');
    envsHtml = `<div class="meltano-sec"><h3>Environments (${environments.length})</h3><div class="meltano-card">${envChips}</div></div>`;
  }

  // Plugins table
  const pluginTypes = [
    { key: 'extractors', label: 'Extractors' },
    { key: 'loaders', label: 'Loaders' },
    { key: 'transforms', label: 'Transforms' },
    { key: 'orchestrators', label: 'Orchestrators' },
    { key: 'utilities', label: 'Utilities' },
    { key: 'mappers', label: 'Mappers' },
    { key: 'files', label: 'Files' },
  ];
  const pluginsWithData = pluginTypes.filter((pt) => pluginTypeCount(plugins, pt.key) > 0);
  let pluginsHtml = '';
  if (pluginsWithData.length) {
    const countRow = pluginsWithData.map((pt) =>
      `<tr><td>${esc(pt.label)}</td><td><span class="meltano-count">${pluginTypeCount(plugins, pt.key)}</span></td><td>${pluginList(plugins, pt.key).map((p) => `<span style="font-family:ui-monospace,monospace;font-size:12px">${esc(p && p.name ? p.name : p)}</span>`).join(', ')}</td></tr>`
    ).join('');
    pluginsHtml = `<div class="meltano-sec"><h3>Plugins</h3><div class="meltano-card"><table class="meltano-table"><thead><tr><th>Type</th><th>Count</th><th>Names</th></tr></thead><tbody>${countRow}</tbody></table></div></div>`;
  }

  // Schedules section
  let schedulesHtml = '';
  if (schedules.length) {
    const schedRows = schedules.map((s) => {
      const name = s.name || '';
      const jobRef = s.job || '';
      const extractor = s.extractor || '';
      const loader = s.loader || '';
      const cron = s.interval || s.cron || '';
      return `<tr>
        <td><span class="meltano-sched-name">${esc(name)}</span></td>
        <td>${jobRef ? `<span style="font-family:ui-monospace,monospace;font-size:12px">${esc(jobRef)}</span>` : [extractor && `<span class="meltano-tap">${esc(extractor)}</span>`, loader && `<span class="meltano-target"> → ${esc(loader)}</span>`].filter(Boolean).join('')}</td>
        <td>${cron ? `<span class="meltano-cron">${esc(cron)}</span>` : ''}</td>
      </tr>`;
    }).join('');
    schedulesHtml = `<div class="meltano-sec"><h3>Schedules (${schedules.length})</h3><div class="meltano-card"><table class="meltano-table"><thead><tr><th>Name</th><th>Job / Pipeline</th><th>Interval</th></tr></thead><tbody>${schedRows}</tbody></table></div></div>`;
  }

  // Jobs section
  let jobsHtml = '';
  if (jobs.length) {
    const jobRows = jobs.map((j) => {
      const name = j.name || '';
      const tasks = Array.isArray(j.tasks) ? j.tasks : (j.tasks ? [j.tasks] : []);
      const tasksHtml = tasks.map((t) => `<div class="meltano-task">${esc(Array.isArray(t) ? t.join(' | ') : t)}</div>`).join('');
      return `<tr><td><span class="meltano-job-name">${esc(name)}</span></td><td>${tasksHtml}</td></tr>`;
    }).join('');
    jobsHtml = `<div class="meltano-sec"><h3>Jobs (${jobs.length})</h3><div class="meltano-card"><table class="meltano-table"><thead><tr><th>Name</th><th>Tasks</th></tr></thead><tbody>${jobRows}</tbody></table></div></div>`;
  }

  const host = document.createElement('div');
  host.className = 'meltano-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="meltano-title"><span class="badge-meltano">Meltano</span>${esc(projectName)}</div>
<div class="meltano-sub">Meltano ELT platform configuration</div>
${identityRows ? `<div class="meltano-sec"><h3>Project</h3><div class="meltano-card">${identityRows}</div></div>` : ''}
${envsHtml}
${pluginsHtml}
${schedulesHtml}
${jobsHtml}`;
  return { parentNode: host };
}
