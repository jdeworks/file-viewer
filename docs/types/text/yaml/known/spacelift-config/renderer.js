import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.spl-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-spl{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1e293b;color:#fff;vertical-align:middle;margin-right:8px;}
.spl-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.spl-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.spl-sec{margin:12px 0;}
.spl-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.spl-table{width:100%;border-collapse:collapse;font-size:13px;}
.spl-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.spl-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.spl-mono{font:12px/1.4 ui-monospace,monospace;}
.spl-chip{display:inline-block;font-size:11px;padding:2px 9px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);margin:1px 3px 1px 0;}
.spl-chip.on{background:#f0fdf4;border-color:#86efac;color:#166534;}
.spl-chip.off{background:#fef2f2;border-color:#fca5a5;color:#b91c1c;}
`;

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  const stacks = Array.isArray(cfg.stacks) ? cfg.stacks : [];

  const stackRows = stacks.slice(0, 30).map((s) => {
    const name = s.name || '—';
    const backend = s.backend || '—';
    const branch = s.branch || '—';
    const projectRoot = s.project_root || s.projectRoot || '/';
    const autoApply = s.auto_apply != null ? s.auto_apply : null;
    const autoChip = autoApply != null
      ? `<span class="spl-chip ${autoApply ? 'on' : 'off'}">${autoApply ? 'yes' : 'no'}</span>`
      : '—';
    return `<tr>
      <td class="spl-mono">${esc(name)}</td>
      <td class="spl-mono">${esc(backend)}</td>
      <td class="spl-mono">${esc(branch)}</td>
      <td class="spl-mono">${esc(projectRoot)}</td>
      <td>${autoChip}</td>
    </tr>`;
  }).join('');

  const stacksHtml = stacks.length
    ? `<div class="spl-sec"><h3>Stacks (${stacks.length})</h3>
      <table class="spl-table">
        <thead><tr><th>Name</th><th>Backend</th><th>Branch</th><th>Root</th><th>Auto Apply</th></tr></thead>
        <tbody>${stackRows}</tbody>
      </table>
    </div>`
    : '<div style="color:var(--fg-2,#888);font-size:13px;">No stacks configured.</div>';

  const sub = stacks.length
    ? `${stacks.length} stack${stacks.length !== 1 ? 's' : ''}`
    : 'Spacelift IaC CI/CD configuration';

  const host = document.createElement('div');
  host.className = 'spl-doc spaceliftcfg-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="spl-title"><span class="badge-spl">Spacelift</span>Spacelift config</div>
<div class="spl-sub">${esc(sub)}</div>
${stacksHtml}`;

  return { parentNode: host };
}
