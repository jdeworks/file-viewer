import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const KIND_COLOR = { Pipeline: '#1a73e8', Task: '#0d904f', ClusterTask: '#6a1b9a', PipelineRun: '#e65100', TaskRun: '#00838f' };

export async function render(intake) {
  const jsYaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
  const text = intake.text || '';
  let doc = {};
  try { doc = (jsYaml.loadAll(text) || [])[0] || {}; } catch { /* ignore parse errors */ }

  const kind = doc.kind || 'Pipeline';
  const apiVersion = doc.apiVersion || '';
  const meta = doc.metadata || {};
  const name = meta.name || '';
  const namespace = meta.namespace || '';
  const spec = doc.spec || {};
  const params = spec.params || [];
  const tasks = spec.tasks || spec.steps || [];
  const results = spec.results || [];
  const workspaces = spec.workspaces || [];

  const color = KIND_COLOR[kind] || KIND_COLOR.Pipeline;

  const paramsHtml = params.length ? `<div class="tkn-sec"><h3>Parameters (${params.length})</h3>
<table class="tkn-table"><thead><tr><th>Name</th><th>Type</th><th>Default</th></tr></thead>
<tbody>${params.map(p => `<tr>
  <td><span class="tkn-mono">${esc(p.name || '')}</span></td>
  <td><span class="tkn-tag">${esc(p.type || 'string')}</span></td>
  <td><span class="tkn-default">${p.default != null ? esc(String(p.default)) : '—'}</span></td>
</tr>`).join('')}</tbody></table></div>` : '';

  const tasksLabel = kind === 'Task' ? 'Steps' : 'Tasks';
  const tasksHtml = tasks.length ? `<div class="tkn-sec"><h3>${tasksLabel} (${tasks.length})</h3>
<div class="tkn-task-list">${tasks.map(t => {
    const taskName = t.name || '';
    const ref = t.taskRef?.name || t.image || '';
    const params = t.params || [];
    return `<div class="tkn-task-card">
      <div class="tkn-task-header">
        <span class="tkn-task-name">${esc(taskName)}</span>
        ${ref ? `<span class="tkn-task-ref">${esc(ref)}</span>` : ''}
      </div>
      ${params.length ? `<div class="tkn-task-params">${params.slice(0, 4).map(p => `<span class="tkn-param-chip">${esc(p.name || '')}${p.value != null ? '=' + esc(String(p.value)).slice(0, 20) : ''}</span>`).join('')}${params.length > 4 ? `<span class="tkn-param-chip tkn-more">+${params.length - 4}</span>` : ''}</div>` : ''}
    </div>`;
  }).join('')}</div></div>` : '';

  const workspacesHtml = workspaces.length ? `<div class="tkn-sec"><h3>Workspaces (${workspaces.length})</h3><div class="tkn-branches">${workspaces.map(w => `<span class="tkn-branch-tag">${esc(w.name || String(w))}</span>`).join('')}</div></div>` : '';
  const resultsHtml = results.length ? `<div class="tkn-sec"><h3>Results (${results.length})</h3><div class="tkn-branches">${results.map(r => `<span class="tkn-branch-tag">${esc(r.name || String(r))}</span>`).join('')}</div></div>` : '';

  const host = document.createElement('div');
  host.className = 'tkn-doc';
  host.innerHTML = `<style>
.tkn-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;}
.badge-tkn{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1a73e8;color:#fff;margin-right:8px;vertical-align:middle;}
.tkn-kind-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;color:#fff;margin-right:6px;vertical-align:middle;}
.tkn-title{font-size:19px;font-weight:700;margin:0 0 4px;}
.tkn-meta{font-size:12px;color:var(--fg-2,#888);margin:2px 0 12px;}
.tkn-sec{margin:14px 0;}
.tkn-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.tkn-table{width:100%;border-collapse:collapse;font-size:13px;}
.tkn-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;letter-spacing:.03em;border-bottom:1px solid var(--border,#e0e0e0);padding:4px 10px 4px 0;}
.tkn-table td{padding:5px 10px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);}
.tkn-mono{font:12px ui-monospace,monospace;color:var(--accent,#0969da);}
.tkn-tag{font-size:11px;background:var(--bg-2,#f5f5f5);border:1px solid var(--border,#e0e0e0);padding:1px 6px;border-radius:4px;}
.tkn-default{font:12px ui-monospace,monospace;color:var(--fg-2,#888);}
.tkn-task-list{display:flex;flex-direction:column;gap:6px;}
.tkn-task-card{background:var(--bg-2,#f5f5f5);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:8px 12px;}
.tkn-task-header{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px;}
.tkn-task-name{font-weight:600;font-size:13px;}
.tkn-task-ref{font:11px ui-monospace,monospace;background:var(--bg-3,#e8e8e8);padding:1px 6px;border-radius:3px;color:var(--fg-2,#666);}
.tkn-task-params{display:flex;flex-wrap:wrap;gap:4px;}
.tkn-param-chip{font:11px ui-monospace,monospace;background:var(--bg-3,#e8e8e8);padding:1px 6px;border-radius:3px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.tkn-param-chip.tkn-more{color:var(--fg-2,#888);}
.tkn-branches{display:flex;flex-wrap:wrap;gap:6px;}
.tkn-branch-tag{padding:2px 10px;border-radius:10px;font-size:12px;background:var(--bg-2,#f5f5f5);border:1px solid var(--border,#e0e0e0);}
</style>
<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
  <span class="badge-tkn">Tekton</span>
  <span class="tkn-kind-badge" style="background:${color}">${esc(kind)}</span>
  ${name ? `<span class="tkn-title">${esc(name)}</span>` : ''}
</div>
${(namespace || apiVersion) ? `<div class="tkn-meta">${namespace ? `namespace: ${esc(namespace)}` : ''}${namespace && apiVersion ? ' · ' : ''}${apiVersion ? `apiVersion: ${esc(apiVersion)}` : ''}</div>` : ''}
${paramsHtml}${tasksHtml}${workspacesHtml}${resultsHtml}`;

  return { parentNode: host };
}
