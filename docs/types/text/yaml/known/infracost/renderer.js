import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.ifc-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-ifc{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#059669;color:#fff;vertical-align:middle;margin-right:8px;}
.ifc-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.ifc-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.ifc-sec{margin:12px 0;}
.ifc-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.ifc-table{width:100%;border-collapse:collapse;font-size:13px;}
.ifc-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.ifc-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.ifc-mono{font:12px/1.4 ui-monospace,monospace;}
.ifc-chip{display:inline-block;font-size:11px;padding:2px 9px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);margin:1px 3px 1px 0;font-family:ui-monospace,monospace;}
.ifc-kv{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;font-size:13px;margin:6px 0;}
.ifc-k{font:12px/1.6 ui-monospace,monospace;color:var(--fg-2,#888);}
.ifc-v{font:12px/1.6 ui-monospace,monospace;font-weight:600;}
`;

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = {}; }

  const version = cfg.version;
  const projects = Array.isArray(cfg.projects) ? cfg.projects : [];
  const currency = cfg.currency || null;

  // Detect VCS provider hint from project paths or git_diff_target
  const vcsProvider = projects.some((p) => (p.path || '').includes('github'))
    ? 'GitHub'
    : projects.some((p) => (p.path || '').includes('gitlab'))
    ? 'GitLab'
    : null;

  const settingsEntries = [
    version != null ? `<span class="ifc-k">version</span><span class="ifc-v">${esc(String(version))}</span>` : '',
    currency ? `<span class="ifc-k">currency</span><span class="ifc-v">${esc(currency)}</span>` : '',
    vcsProvider ? `<span class="ifc-k">VCS</span><span class="ifc-v">${esc(vcsProvider)}</span>` : '',
  ].filter(Boolean);

  const settingsHtml = settingsEntries.length ? `<div class="ifc-sec"><h3>Config</h3><div class="ifc-kv">
    ${settingsEntries.join('')}
  </div></div>` : '';

  const projectRows = projects.map((p) => {
    const path = p.path || '—';
    const tfVarsFiles = Array.isArray(p.terraform_vars_files) ? p.terraform_vars_files.join(', ') : '';
    const envPrefix = p.env && p.env.INFRACOST_TERRAFORM_WORKSPACE ? p.env.INFRACOST_TERRAFORM_WORKSPACE : '';
    return `<tr>
      <td class="ifc-mono">${esc(path)}</td>
      <td class="ifc-mono">${tfVarsFiles ? esc(tfVarsFiles) : '—'}</td>
      <td class="ifc-mono">${envPrefix ? esc(envPrefix) : '—'}</td>
    </tr>`;
  }).join('');

  const projectHtml = projects.length ? `<div class="ifc-sec"><h3>Projects (${projects.length})</h3>
    <table class="ifc-table">
      <thead><tr><th>Path</th><th>Var files</th><th>Workspace</th></tr></thead>
      <tbody>${projectRows}</tbody>
    </table>
  </div>` : '<div style="color:var(--fg-2,#888);font-size:13px;">No projects configured.</div>';

  const sub = [
    projects.length ? `${projects.length} project${projects.length !== 1 ? 's' : ''}` : '',
    currency ? `currency: ${currency}` : '',
    version ? `version ${version}` : '',
  ].filter(Boolean).join(' · ') || 'Infracost cloud cost estimation config';

  const host = document.createElement('div');
  host.className = 'ifc-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="ifc-title"><span class="badge-ifc">Infracost</span>Infracost config</div>
<div class="ifc-sub">${esc(sub)}</div>
${settingsHtml}${projectHtml}`;

  return { parentNode: host };
}
