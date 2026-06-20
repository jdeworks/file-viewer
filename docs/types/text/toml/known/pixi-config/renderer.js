import { parseTOML } from '../../toml.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.pxi-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-pxi{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#FFC833;color:#1a1a1a;vertical-align:middle;margin-right:8px}
.pxi-title{font-size:18px;font-weight:700;margin:0 0 4px}
.pxi-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.pxi-sec{margin:14px 0}
.pxi-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px}
.pxi-table{width:100%;border-collapse:collapse;font-size:13px}
.pxi-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:4px 8px;border-bottom:1px solid var(--border,#e0e0e0)}
.pxi-table td{padding:5px 8px;border-bottom:1px solid var(--border,#e0e0e0)}
.pxi-pkg{font:13px/1.4 ui-monospace,monospace;font-weight:600}
.pxi-ver{font:12px/1.4 ui-monospace,monospace;color:var(--fg-2,#888)}
.pxi-cmd{font:12px/1.4 ui-monospace,monospace;color:var(--fg-2,#555)}
.pxi-pills{display:flex;flex-wrap:wrap;gap:6px}
.pxi-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.pxi-kv{font-size:13px;margin:0 0 4px}
.pxi-kv span{color:var(--fg-2,#888);margin-right:6px}
`;

function depTableHtml(deps, prefix) {
  if (!deps || typeof deps !== 'object') return '';
  const entries = Object.entries(deps);
  if (!entries.length) return '';
  return `<div class="pxi-sec"><h3>${esc(prefix)} (${entries.length})</h3><table class="pxi-table"><thead><tr><th>Package</th><th>Version</th></tr></thead><tbody>${entries.map(([pkg, ver]) => {
    const verStr = typeof ver === 'string' ? ver : (typeof ver === 'object' && ver !== null ? JSON.stringify(ver) : String(ver));
    return `<tr><td><span class="pxi-pkg">${esc(pkg)}</span></td><td><span class="pxi-ver">${esc(verStr)}</span></td></tr>`;
  }).join('')}</tbody></table></div>`;
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  let data = {};
  try { data = parseTOML(text); } catch (_) {}

  const project = data.project || {};
  const name = project.name || '';
  const version = project.version || '';
  const description = project.description || '';
  const channels = Array.isArray(project.channels) ? project.channels : [];
  const platforms = Array.isArray(project.platforms) ? project.platforms : [];

  const deps = data['dependencies'] || {};
  const pypiDeps = data['pypi-dependencies'] || {};
  const buildDeps = data['build-dependencies'] || {};

  const tasks = data['tasks'] || {};
  const taskEntries = Object.entries(tasks).filter(([, v]) => typeof v === 'string' || (typeof v === 'object' && v !== null));

  const totalDeps = Object.keys(deps).length + Object.keys(pypiDeps).length + Object.keys(buildDeps).length;

  // Title line
  const titleSuffix = name ? ` <span style="font-weight:400;color:var(--fg-2,#888)">(${esc(name)})</span>` : '';
  const subParts = [
    totalDeps ? `${totalDeps} dep${totalDeps !== 1 ? 's' : ''}` : '',
    taskEntries.length ? `${taskEntries.length} task${taskEntries.length !== 1 ? 's' : ''}` : '',
  ].filter(Boolean);

  // Project info kv rows
  const kvRows = [
    name ? `<div class="pxi-kv"><span>Name</span><strong>${esc(name)}</strong></div>` : '',
    version ? `<div class="pxi-kv"><span>Version</span><strong>${esc(version)}</strong></div>` : '',
    description ? `<div class="pxi-kv"><span>Description</span>${esc(description)}</div>` : '',
  ].filter(Boolean).join('');

  const projectHtml = kvRows
    ? `<div class="pxi-sec"><h3>Project</h3>${kvRows}</div>`
    : '';

  const channelsHtml = channels.length
    ? `<div class="pxi-sec"><h3>Channels (${channels.length})</h3><div class="pxi-pills">${channels.map((c) => `<span class="pxi-pill">${esc(c)}</span>`).join('')}</div></div>`
    : '';

  const platformsHtml = platforms.length
    ? `<div class="pxi-sec"><h3>Platforms (${platforms.length})</h3><div class="pxi-pills">${platforms.map((p) => `<span class="pxi-pill">${esc(p)}</span>`).join('')}</div></div>`
    : '';

  const depsHtml = depTableHtml(deps, 'Dependencies');
  const pypiHtml = depTableHtml(pypiDeps, 'PyPI Dependencies');
  const buildHtml = depTableHtml(buildDeps, 'Build Dependencies');

  const tasksHtml = taskEntries.length
    ? `<div class="pxi-sec"><h3>Tasks (${taskEntries.length})</h3><table class="pxi-table"><thead><tr><th>Task</th><th>Command</th></tr></thead><tbody>${taskEntries.map(([task, cmd]) => {
        const cmdStr = typeof cmd === 'string' ? cmd : (cmd.cmd || JSON.stringify(cmd));
        const truncated = cmdStr.length > 70 ? cmdStr.slice(0, 70) + '…' : cmdStr;
        return `<tr><td><span class="pxi-pkg">${esc(task)}</span></td><td><span class="pxi-cmd">${esc(truncated)}</span></td></tr>`;
      }).join('')}</tbody></table></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'pxi-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="pxi-title"><span class="badge-pxi">pixi</span>pixi.toml${titleSuffix}</div>
<div class="pxi-sub">${esc(subParts.join(' · ')) || 'pixi project configuration'}</div>
${projectHtml}${channelsHtml}${platformsHtml}${depsHtml}${pypiHtml}${buildHtml}${tasksHtml}`;
  return { parentNode: host };
}
