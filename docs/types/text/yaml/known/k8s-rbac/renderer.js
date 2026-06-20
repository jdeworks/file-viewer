import jsYaml from '../../../../vendor/js-yaml/js-yaml.min.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const VERB_COLORS = {
  get: '#22863a', list: '#22863a', watch: '#22863a',
  create: '#0969da', update: '#0969da', patch: '#b08000',
  delete: '#d73a49', deletecollection: '#d73a49',
};

function verbStyle(verb) {
  const col = VERB_COLORS[verb.toLowerCase()] || '#555';
  return `style="background:${col}20;color:${col};border:1px solid ${col}40;"`;
}

function chips(items, extraStyle = '') {
  if (!items || !items.length) return '<span class="rbac-tag" style="opacity:.5">—</span>';
  return items.map(v => `<span class="rbac-tag" ${extraStyle}>${esc(v)}</span>`).join('');
}

function verbChips(verbs) {
  if (!verbs || !verbs.length) return '<span class="rbac-tag" style="opacity:.5">—</span>';
  return verbs.map(v => `<span class="rbac-tag" ${verbStyle(v)}>${esc(v)}</span>`).join('');
}

function renderRules(rules) {
  if (!rules || !rules.length) return '<p style="color:var(--fg-2,#888);font-size:13px">No rules defined.</p>';
  const rows = rules.map((rule, i) => {
    const groups = rule.apiGroups || [];
    const resources = rule.resources || [];
    const verbs = rule.verbs || [];
    const nonResURLs = rule.nonResourceURLs || [];
    return `<tr>
      <td style="padding:8px 10px 8px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;font-size:12px;color:var(--fg-2,#888)">${i + 1}</td>
      <td style="padding:8px 10px 8px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top">${chips(groups.map(g => g === '' ? 'core' : g))}</td>
      <td style="padding:8px 10px 8px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top">${chips(resources)}</td>
      <td style="padding:8px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top">${verbChips(verbs)}${nonResURLs.length ? '<br><span style="font-size:11px;color:var(--fg-2,#888)">URLs: ' + nonResURLs.map(u => esc(u)).join(', ') + '</span>' : ''}</td>
    </tr>`;
  }).join('');
  return `<table style="width:100%;border-collapse:collapse;font-size:13px">
    <thead><tr>
      <th style="text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;letter-spacing:.03em;border-bottom:2px solid var(--border,#e0e0e0);padding:4px 10px 4px 0">#</th>
      <th style="text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;letter-spacing:.03em;border-bottom:2px solid var(--border,#e0e0e0);padding:4px 10px 4px 0">API Groups</th>
      <th style="text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;letter-spacing:.03em;border-bottom:2px solid var(--border,#e0e0e0);padding:4px 10px 4px 0">Resources</th>
      <th style="text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;letter-spacing:.03em;border-bottom:2px solid var(--border,#e0e0e0);padding:4px 4px 4px 0">Verbs</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function renderSubjects(subjects) {
  if (!subjects || !subjects.length) return '<p style="color:var(--fg-2,#888);font-size:13px">No subjects.</p>';
  const rows = subjects.map(s => `<tr>
    <td style="padding:6px 10px 6px 0;border-bottom:1px solid var(--border,#e0e0e0);font-size:13px"><span class="rbac-tag">${esc(s.kind)}</span></td>
    <td style="padding:6px 10px 6px 0;border-bottom:1px solid var(--border,#e0e0e0);font-size:13px;font-family:ui-monospace,monospace">${esc(s.name)}</td>
    <td style="padding:6px 0;border-bottom:1px solid var(--border,#e0e0e0);font-size:13px;color:var(--fg-2,#888)">${esc(s.namespace || '—')}</td>
  </tr>`).join('');
  return `<table style="width:100%;border-collapse:collapse">
    <thead><tr>
      <th style="text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;letter-spacing:.03em;border-bottom:2px solid var(--border,#e0e0e0);padding:4px 10px 4px 0">Kind</th>
      <th style="text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;letter-spacing:.03em;border-bottom:2px solid var(--border,#e0e0e0);padding:4px 10px 4px 0">Name</th>
      <th style="text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;letter-spacing:.03em;border-bottom:2px solid var(--border,#e0e0e0);padding:4px 0 4px 0">Namespace</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

export async function render(intake) {
  const text = intake.text || '';
  let doc = {};
  try { doc = jsYaml.load(text) || {}; } catch { /* fall through */ }

  const kind = doc.kind || 'RBAC';
  const meta = doc.metadata || {};
  const name = meta.name || '';
  const namespace = meta.namespace || '';
  const isBinding = kind === 'RoleBinding' || kind === 'ClusterRoleBinding';

  const host = document.createElement('div');
  host.className = 'rbac-doc';

  let details = '';
  if (isBinding) {
    const roleRef = doc.roleRef || {};
    details = `
<div class="rbac-sec">
  <h3>Role Reference</h3>
  <table style="border-collapse:collapse;font-size:13px">
    <tbody>
      <tr><td style="padding:4px 12px 4px 0;color:var(--fg-2,#888);font-size:12.5px">Kind</td><td><span class="rbac-tag">${esc(roleRef.kind)}</span></td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:var(--fg-2,#888);font-size:12.5px">Name</td><td style="font-family:ui-monospace,monospace;font-size:13px">${esc(roleRef.name)}</td></tr>
    </tbody>
  </table>
</div>
<div class="rbac-sec">
  <h3>Subjects (${(doc.subjects || []).length})</h3>
  ${renderSubjects(doc.subjects)}
</div>`;
  } else {
    const rules = doc.rules || [];
    details = `
<div class="rbac-sec">
  <h3>Rules (${rules.length})</h3>
  ${renderRules(rules)}
</div>`;
  }

  host.innerHTML = `<style>
.rbac-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;}
.rbac-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#326CE5;color:#fff;margin-right:8px;vertical-align:middle;}
.rbac-kind{font-size:19px;font-weight:700;margin:0;}
.rbac-api{font-size:12px;color:var(--fg-2,#888);margin:2px 0 10px;}
.rbac-sec{margin:16px 0;}
.rbac-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.rbac-tag{display:inline-block;padding:1px 7px;border-radius:4px;background:var(--bg-3,#eee);font-size:12px;margin:2px 2px 0 0;}
</style>
<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="rbac-badge">K8s RBAC</span>
  <span class="rbac-kind">${esc(kind)}</span>
</div>
<div class="rbac-api">${esc(doc.apiVersion || '')}</div>
<div class="rbac-sec">
  <table style="border-collapse:collapse;font-size:13px">
    <tbody>
      ${name ? `<tr><td style="padding:4px 12px 4px 0;color:var(--fg-2,#888);font-size:12.5px">Name</td><td style="font-family:ui-monospace,monospace">${esc(name)}</td></tr>` : ''}
      ${namespace ? `<tr><td style="padding:4px 12px 4px 0;color:var(--fg-2,#888);font-size:12.5px">Namespace</td><td><span class="rbac-tag">${esc(namespace)}</span></td></tr>` : '<tr><td style="padding:4px 12px 4px 0;color:var(--fg-2,#888);font-size:12.5px">Scope</td><td><span class="rbac-tag">Cluster-wide</span></td></tr>'}
    </tbody>
  </table>
</div>
${details}`;

  return { parentNode: host };
}
