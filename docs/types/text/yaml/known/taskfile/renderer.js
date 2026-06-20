import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.tkf-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-tkf{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#29BEB0;color:#fff;vertical-align:middle;margin-right:8px;}
.tkf-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.tkf-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.tkf-sec{margin:12px 0;}
.tkf-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.tkf-pills{display:flex;flex-wrap:wrap;gap:6px;}
.tkf-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.tkf-tasks{display:flex;flex-direction:column;gap:8px;}
.tkf-task{border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:8px 12px;background:var(--bg,#fff);}
.tkf-task-name{font-weight:700;font-size:13px;font-family:ui-monospace,monospace;}
.tkf-task-desc{font-size:12px;color:var(--fg-2,#555);margin-top:2px;}
.tkf-task-deps{font-size:11px;color:var(--fg-2,#888);margin-top:4px;}
.tkf-task-dep{display:inline-block;background:#e0fdf4;border:1px solid #6ee7b7;border-radius:8px;padding:1px 7px;margin:2px 2px 0 0;color:#065f46;}
`;

function getTaskDeps(task) {
  if (!task || typeof task !== 'object') return [];
  const deps = [];
  const cmds = Array.isArray(task.cmds) ? task.cmds : [];
  for (const cmd of cmds) {
    if (typeof cmd === 'object' && cmd !== null && typeof cmd.task === 'string') {
      deps.push(cmd.task);
    }
  }
  const deps2 = Array.isArray(task.deps) ? task.deps : [];
  for (const d of deps2) {
    if (typeof d === 'string') deps.push(d);
    else if (typeof d === 'object' && d !== null && typeof d.task === 'string') deps.push(d.task);
  }
  return deps;
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = {}; }

  const version = cfg.version;
  const dotenv = Array.isArray(cfg.dotenv) ? cfg.dotenv : (cfg.dotenv ? [String(cfg.dotenv)] : []);
  const tasks = cfg.tasks && typeof cfg.tasks === 'object' ? cfg.tasks : {};
  const taskNames = Object.keys(tasks);
  const vars = cfg.vars && typeof cfg.vars === 'object' ? Object.keys(cfg.vars) : [];

  const metaHtml = `<div class="tkf-sec"><h3>Info</h3><div class="tkf-pills">
    ${version != null ? `<span class="tkf-pill">version: ${esc(version)}</span>` : ''}
    ${taskNames.length ? `<span class="tkf-pill">${taskNames.length} task${taskNames.length !== 1 ? 's' : ''}</span>` : ''}
    ${vars.length ? `<span class="tkf-pill">${vars.length} var${vars.length !== 1 ? 's' : ''}</span>` : ''}
  </div></div>`;

  const dotenvHtml = dotenv.length
    ? `<div class="tkf-sec"><h3>Dotenv Files</h3><div class="tkf-pills">${dotenv.map((f) => `<span class="tkf-pill">${esc(f)}</span>`).join('')}</div></div>`
    : '';

  const taskItems = taskNames.slice(0, 15).map((name) => {
    const task = tasks[name];
    const desc = typeof task === 'object' && task !== null ? (task.desc || task.summary || '') : '';
    const deps = getTaskDeps(task);
    const depsHtml = deps.length ? `<div class="tkf-task-deps">deps: ${deps.map((d) => `<span class="tkf-task-dep">${esc(d)}</span>`).join(' ')}</div>` : '';
    return `<div class="tkf-task"><div class="tkf-task-name">${esc(name)}</div>${desc ? `<div class="tkf-task-desc">${esc(desc)}</div>` : ''}${depsHtml}</div>`;
  }).join('');

  const taskHtml = taskNames.length
    ? `<div class="tkf-sec"><h3>Tasks (${taskNames.length})</h3><div class="tkf-tasks">${taskItems}</div>${taskNames.length > 15 ? `<div style="font-size:12px;color:var(--fg-2,#888);margin-top:6px">…and ${taskNames.length - 15} more</div>` : ''}</div>`
    : '';

  const sub = [version != null ? `v${version}` : '', taskNames.length ? `${taskNames.length} tasks` : ''].filter(Boolean).join(' · ');

  const host = document.createElement('div');
  host.className = 'tkf-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="tkf-title"><span class="badge-tkf">Taskfile</span>Task runner config</div>
<div class="tkf-sub">${esc(sub)}</div>
${metaHtml}${dotenvHtml}${taskHtml}`;
  return { parentNode: host };
}
