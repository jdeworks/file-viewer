import jsYaml from '../../../../vendor/js-yaml/js-yaml.min.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function row(label, value) {
  if (!value) return '';
  return `<tr><td class="acd-label">${esc(label)}</td><td class="acd-val">${esc(value)}</td></tr>`;
}

export async function render(intake) {
  const text = intake.text || '';
  let doc = {};
  try { doc = jsYaml.load(text) || {}; } catch { /* ignore parse errors */ }

  const kind = doc.kind || 'Application';
  const meta = doc.metadata || {};
  const name = meta.name || '';
  const namespace = meta.namespace || '';
  const spec = doc.spec || {};

  // Source
  const source = spec.source || {};
  const repoURL = source.repoURL || '';
  const targetRevision = source.targetRevision || '';
  const path = source.path || '';
  const chart = source.chart || '';

  // Destination
  const dest = spec.destination || {};
  const destServer = dest.server || '';
  const destNamespace = dest.namespace || '';

  // Sync policy
  const syncPolicy = spec.syncPolicy || {};
  const automated = syncPolicy.automated;
  const prune = automated?.prune;
  const selfHeal = automated?.selfHeal;
  const syncOptions = syncPolicy.syncOptions || [];

  // Project
  const project = spec.project || '';

  // AppProject specifics
  const sourceRepos = spec.sourceRepos || [];
  const destinations = spec.destinations || [];

  const host = document.createElement('div');
  host.className = 'acd-doc';
  host.innerHTML = `<style>
.acd-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;}
.badge-acd{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#e97000;color:#fff;margin-right:8px;vertical-align:middle;}
.acd-kind-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#ef5b25;color:#fff;margin-right:6px;vertical-align:middle;}
.acd-title{font-size:19px;font-weight:700;margin:0 0 4px;}
.acd-meta{font-size:12px;color:var(--fg-2,#888);margin:2px 0 12px;}
.acd-sec{margin:14px 0;}
.acd-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.acd-table{width:100%;border-collapse:collapse;font-size:13px;}
.acd-label{color:var(--fg-2,#888);font-size:12px;padding:4px 16px 4px 0;white-space:nowrap;vertical-align:top;min-width:120px;}
.acd-val{font:13px ui-monospace,monospace;padding:4px 0;word-break:break-all;}
.acd-table tr{border-bottom:1px solid var(--border,#e0e0e0);}
.acd-table tr:last-child{border-bottom:none;}
.acd-sync-pills{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;}
.acd-pill{padding:3px 10px;border-radius:10px;font-size:12px;font-weight:600;}
.acd-pill-on{background:#d4edda;color:#155724;border:1px solid #c3e6cb;}
.acd-pill-off{background:#f8d7da;color:#721c24;border:1px solid #f5c6cb;}
.acd-pill-neutral{background:var(--bg-2,#f5f5f5);border:1px solid var(--border,#e0e0e0);color:var(--fg,#333);}
.acd-repos{display:flex;flex-direction:column;gap:4px;margin-top:4px;}
.acd-repo{font:12px ui-monospace,monospace;background:var(--bg-2,#f5f5f5);padding:2px 8px;border-radius:4px;}
</style>
<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
  <span class="badge-acd">Argo CD</span>
  <span class="acd-kind-badge">${esc(kind)}</span>
  ${name ? `<span class="acd-title">${esc(name)}</span>` : ''}
</div>
${(namespace || project) ? `<div class="acd-meta">${namespace ? `namespace: ${esc(namespace)}` : ''}${namespace && project ? ' · ' : ''}${project ? `project: ${esc(project)}` : ''}</div>` : ''}
${(repoURL || targetRevision || path || chart) ? `<div class="acd-sec"><h3>Source</h3><table class="acd-table">
${row('Repository', repoURL)}
${row('Revision', targetRevision || 'HEAD')}
${path ? row('Path', path) : ''}
${chart ? row('Chart', chart) : ''}
</table></div>` : ''}
${(destServer || destNamespace) ? `<div class="acd-sec"><h3>Destination</h3><table class="acd-table">
${row('Server', destServer)}
${row('Namespace', destNamespace)}
</table></div>` : ''}
${(automated !== undefined) ? `<div class="acd-sec"><h3>Sync policy</h3><div class="acd-sync-pills">
<span class="acd-pill ${automated ? 'acd-pill-on' : 'acd-pill-off'}">automated: ${automated ? 'yes' : 'no'}</span>
${prune != null ? `<span class="acd-pill ${prune ? 'acd-pill-on' : 'acd-pill-off'}">prune: ${prune ? 'yes' : 'no'}</span>` : ''}
${selfHeal != null ? `<span class="acd-pill ${selfHeal ? 'acd-pill-on' : 'acd-pill-off'}">selfHeal: ${selfHeal ? 'yes' : 'no'}</span>` : ''}
${syncOptions.map(o => `<span class="acd-pill acd-pill-neutral">${esc(o)}</span>`).join('')}
</div></div>` : ''}
${sourceRepos.length ? `<div class="acd-sec"><h3>Source repos (${sourceRepos.length})</h3><div class="acd-repos">${sourceRepos.map(r => `<div class="acd-repo">${esc(r)}</div>`).join('')}</div></div>` : ''}
${destinations.length ? `<div class="acd-sec"><h3>Allowed destinations (${destinations.length})</h3><table class="acd-table">
<thead><tr><th style="text-align:left;font-size:11px;color:var(--fg-2,#888);text-transform:uppercase;letter-spacing:.03em;padding:4px 16px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);">Server</th><th style="text-align:left;font-size:11px;color:var(--fg-2,#888);text-transform:uppercase;letter-spacing:.03em;border-bottom:1px solid var(--border,#e0e0e0);">Namespace</th></tr></thead>
<tbody>${destinations.map(d => `<tr><td class="acd-val" style="padding:4px 16px 4px 0;">${esc(d.server || '')}</td><td class="acd-val">${esc(d.namespace || '')}</td></tr>`).join('')}</tbody>
</table></div>` : ''}`;

  return { parentNode: host };
}
