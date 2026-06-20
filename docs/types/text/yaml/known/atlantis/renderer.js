import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.atl-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-atl{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1a56db;color:#fff;vertical-align:middle;margin-right:8px;}
.atl-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.atl-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.atl-sec{margin:12px 0;}
.atl-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.atl-table{width:100%;border-collapse:collapse;font-size:13px;}
.atl-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.atl-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.atl-mono{font:12px/1.4 ui-monospace,monospace;}
.atl-chip{display:inline-block;font-size:11px;padding:2px 9px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);margin:1px 3px 1px 0;}
.atl-chip.on{background:#eff6ff;border-color:#93c5fd;color:#1d4ed8;}
.atl-chip.off{background:#fef2f2;border-color:#fca5a5;color:#b91c1c;}
.atl-kv{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;font-size:13px;margin:6px 0;}
.atl-k{font:12px/1.6 ui-monospace,monospace;color:var(--fg-2,#888);}
.atl-v{font:12px/1.6 ui-monospace,monospace;font-weight:600;}
`;

function boolChip(val, label) {
  const on = val === true || val === 'true';
  return `<span class="atl-chip ${on ? 'on' : 'off'}">${esc(label)}: ${on ? 'yes' : 'no'}</span>`;
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = {}; }

  const version = cfg.version;
  const projects = Array.isArray(cfg.projects) ? cfg.projects : [];
  const workflows = cfg.workflows && typeof cfg.workflows === 'object' ? Object.keys(cfg.workflows) : [];
  const automerge = cfg.automerge;
  const parallelPlan = cfg.parallel_plan;
  const parallelApply = cfg.parallel_apply;

  const projectRows = projects.map((p) => {
    const name = p.name || '—';
    const dir = p.dir || '.';
    const workspace = p.workspace || 'default';
    const workflow = p.workflow || '—';
    return `<tr>
      <td class="atl-mono">${esc(name)}</td>
      <td class="atl-mono">${esc(dir)}</td>
      <td class="atl-mono">${esc(workspace)}</td>
      <td class="atl-mono">${esc(workflow)}</td>
    </tr>`;
  }).join('');

  const hasFlags = automerge !== undefined || parallelPlan !== undefined || parallelApply !== undefined;

  const flagsHtml = hasFlags ? `<div class="atl-sec"><h3>Flags</h3><div>
    ${automerge !== undefined ? boolChip(automerge, 'automerge') : ''}
    ${parallelPlan !== undefined ? boolChip(parallelPlan, 'parallel_plan') : ''}
    ${parallelApply !== undefined ? boolChip(parallelApply, 'parallel_apply') : ''}
  </div></div>` : '';

  const workflowHtml = workflows.length ? `<div class="atl-sec"><h3>Workflows (${workflows.length})</h3><div>
    ${workflows.map((w) => `<span class="atl-chip">${esc(w)}</span>`).join('')}
  </div></div>` : '';

  const projectHtml = projects.length ? `<div class="atl-sec"><h3>Projects (${projects.length})</h3>
    <table class="atl-table">
      <thead><tr><th>Name</th><th>Dir</th><th>Workspace</th><th>Workflow</th></tr></thead>
      <tbody>${projectRows}</tbody>
    </table>
  </div>` : '<div style="color:var(--fg-2,#888);font-size:13px;">No projects configured.</div>';

  const sub = [
    projects.length ? `${projects.length} project${projects.length !== 1 ? 's' : ''}` : '',
    workflows.length ? `${workflows.length} workflow${workflows.length !== 1 ? 's' : ''}` : '',
    version ? `version ${version}` : '',
  ].filter(Boolean).join(' · ') || 'Atlantis Terraform PR automation';

  const host = document.createElement('div');
  host.className = 'atl-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="atl-title"><span class="badge-atl">Atlantis</span>Atlantis config</div>
<div class="atl-sub">${esc(sub)}</div>
${flagsHtml}${workflowHtml}${projectHtml}`;

  return { parentNode: host };
}
