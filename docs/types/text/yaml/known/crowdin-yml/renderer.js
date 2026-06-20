import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.cwd-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-cwd{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#2d7be5;color:#fff;vertical-align:middle;margin-right:8px;}
.cwd-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.cwd-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.cwd-sec{margin:14px 0;}
.cwd-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.cwd-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin:0 0 8px;display:grid;grid-template-columns:max-content 1fr;gap:4px 12px;font-size:13px;}
.cwd-lbl{color:var(--fg-2,#888);font-size:12px;white-space:nowrap;}
.cwd-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.cwd-table{width:100%;border-collapse:collapse;font-size:13px;}
.cwd-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.cwd-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
.cwd-chip{display:inline-block;font-size:11px;padding:1px 7px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.cwd-bool-true{color:#166534;}
.cwd-bool-false{color:var(--fg-2,#888);}
`;

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || \'\') || [])[0] || {};
  } catch {
    cfg = intake.parsed || {};
  }

  const host = document.createElement('div');
  host.className = 'cwd-doc';

  if (!cfg || typeof cfg !== 'object') {
    host.innerHTML = `<style>${CSS}</style><div class="cwd-title"><span class="badge-cwd">Crowdin</span>Could not parse YAML</div>`;
    return { parentNode: host };
  }

  const projectId = cfg.project_id ?? cfg['project-id'] ?? '';
  const apiTokenEnv = cfg.api_token_env ?? cfg['api-token-env'] ?? '';
  const basePath = cfg.base_path ?? cfg['base-path'] ?? '';
  const baseUrl = cfg.base_url ?? cfg['base-url'] ?? '';
  const preserveHierarchy = cfg.preserve_hierarchy ?? cfg['preserve-hierarchy'];
  const files = Array.isArray(cfg.files) ? cfg.files : [];

  const isEnterprise = baseUrl && !String(baseUrl).includes('crowdin.com/api/v2');

  const settingsRows = [
    projectId && `<div class="cwd-lbl">Project ID</div><div class="cwd-val">${esc(projectId)}</div>`,
    apiTokenEnv && `<div class="cwd-lbl">API token env</div><div class="cwd-val">${esc(apiTokenEnv)}</div>`,
    basePath && `<div class="cwd-lbl">Base path</div><div class="cwd-val">${esc(basePath)}</div>`,
    baseUrl && `<div class="cwd-lbl">Base URL</div><div class="cwd-val">${esc(baseUrl)}${isEnterprise ? ' <span class="cwd-chip">Enterprise</span>' : ''}</div>`,
    preserveHierarchy != null && `<div class="cwd-lbl">Preserve hierarchy</div><div class="cwd-val ${preserveHierarchy ? 'cwd-bool-true' : 'cwd-bool-false'}">${preserveHierarchy ? 'yes' : 'no'}</div>`,
  ].filter(Boolean).join('');

  const fileRows = files.map((f) => {
    const src = f.source || '';
    const trans = f.translation || '';
    const type = f.type || '';
    return `<tr>
      <td>${esc(src)}</td>
      <td>${esc(trans)}</td>
      <td>${type ? `<span class="cwd-chip">${esc(type)}</span>` : '—'}</td>
    </tr>`;
  }).join('');

  host.innerHTML = `<style>${CSS}</style>
<div class="cwd-title"><span class="badge-cwd">Crowdin</span>Crowdin config</div>
<div class="cwd-sub">${files.length} file mapping${files.length !== 1 ? 's' : ''}${projectId ? ` · project ${esc(String(projectId))}` : ''}</div>
${settingsRows ? `<div class="cwd-sec"><h3>Settings</h3><div class="cwd-card">${settingsRows}</div></div>` : ''}
${files.length ? `<div class="cwd-sec"><h3>File mappings</h3>
  <table class="cwd-table">
    <thead><tr><th>Source pattern</th><th>Translation pattern</th><th>Type</th></tr></thead>
    <tbody>${fileRows}</tbody>
  </table>
</div>` : '<div style="color:var(--fg-2,#888);font-size:13px;">No file mappings found.</div>'}`;

  return { parentNode: host };
}
