import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.codecov-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-codecov{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#f01f7a;color:#fff;vertical-align:middle;margin-right:8px;}
.codecov-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.codecov-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.codecov-sec{margin:12px 0;}
.codecov-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.codecov-targets{display:flex;gap:12px;flex-wrap:wrap;margin:6px 0;}
.codecov-target{padding:8px 14px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);min-width:140px;}
.codecov-target-label{font-size:11px;color:var(--fg-2,#888);text-transform:uppercase;letter-spacing:.04em;}
.codecov-target-val{font-size:22px;font-weight:700;color:var(--accent,#0969da);line-height:1.2;}
.codecov-target-sub{font-size:11px;color:var(--fg-2,#888);}
.codecov-pills{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0;}
.codecov-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.codecov-flag-table{width:100%;border-collapse:collapse;font-size:13px;}
.codecov-flag-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.codecov-flag-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.codecov-flag-name{font:12px/1.4 ui-monospace,monospace;padding:2px 8px;border-radius:6px;background:#fef0f7;border:1px solid #f9a8d4;color:#9d174d;}
.codecov-chip{display:inline-flex;align-items:center;font-size:11px;padding:2px 7px;border-radius:10px;border:1px solid var(--border,#e0e0e0);background:var(--bg-2,#f6f8fa);margin:2px;}
.codecov-chip-yes{background:#d1fae5;border-color:#6ee7b7;color:#065f46;}
.codecov-chip-no{background:#fee2e2;border-color:#fca5a5;color:#991b1b;}
.codecov-ignore{font:11px/1.4 ui-monospace,monospace;color:var(--fg-2,#888);padding:2px 6px;border-radius:4px;background:var(--bg-2,#f6f8fa);margin:2px;}
`;

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  const coverage = cfg.coverage || {};
  const status = coverage.status || {};
  const project = status.project || {};
  const patch = status.patch || {};

  const projectDefault = project.default || {};
  const patchDefault = patch.default || {};
  const projectTarget = projectDefault.target ?? project.target ?? null;
  const projectThreshold = projectDefault.threshold ?? project.threshold ?? null;
  const patchTarget = patchDefault.target ?? patch.target ?? null;
  const patchThreshold = patchDefault.threshold ?? patch.threshold ?? null;

  // flags can be an object (name → {paths, carryforward}) or array of strings
  const flagsObj = cfg.flags && typeof cfg.flags === 'object' && !Array.isArray(cfg.flags) ? cfg.flags : null;
  const flagsList = Array.isArray(cfg.flags) ? cfg.flags : (flagsObj ? Object.keys(flagsObj) : []);

  const ignore = Array.isArray(coverage.ignore) ? coverage.ignore
    : Array.isArray(cfg.ignore) ? cfg.ignore : [];
  const comment = cfg.comment || {};
  const commentLayout = comment.layout;
  const commentBehavior = comment.behavior;
  const commentRequireChanges = comment.require_changes;

  const host = document.createElement('div');
  host.className = 'codecov-doc';

  const targetHtml = (projectTarget != null || patchTarget != null)
    ? `<div class="codecov-sec"><h3>Coverage targets</h3><div class="codecov-targets">
        ${projectTarget != null ? `<div class="codecov-target"><div class="codecov-target-label">Project</div><div class="codecov-target-val">${esc(projectTarget)}</div>${projectThreshold != null ? `<div class="codecov-target-sub">threshold: ${esc(projectThreshold)}</div>` : ''}</div>` : ''}
        ${patchTarget != null ? `<div class="codecov-target"><div class="codecov-target-label">Patch</div><div class="codecov-target-val">${esc(patchTarget)}</div>${patchThreshold != null ? `<div class="codecov-target-sub">threshold: ${esc(patchThreshold)}</div>` : ''}</div>` : ''}
      </div></div>`
    : '';

  const flagsHtml = flagsList.length
    ? `<div class="codecov-sec"><h3>Flags (${flagsList.length})</h3><table class="codecov-flag-table"><thead><tr><th>Flag</th><th>Paths</th><th>Carryforward</th></tr></thead><tbody>${flagsList.map((f) => {
        const fd = (flagsObj && flagsObj[f]) || {};
        const paths = Array.isArray(fd.paths) ? fd.paths : [];
        const cf = fd.carryforward;
        const cfChip = cf !== undefined
          ? `<span class="codecov-chip ${cf ? 'codecov-chip-yes' : 'codecov-chip-no'}">${cf ? 'yes' : 'no'}</span>`
          : '<span class="codecov-chip">—</span>';
        return `<tr><td><span class="codecov-flag-name">${esc(f)}</span></td><td>${paths.map((p) => `<span class="codecov-ignore">${esc(p)}</span>`).join(' ') || '<span style="color:var(--fg-2,#888)">—</span>'}</td><td>${cfChip}</td></tr>`;
      }).join('')}</tbody></table></div>`
    : '';

  const ignoreHtml = ignore.length
    ? `<div class="codecov-sec"><h3>Ignored paths (${ignore.length})</h3><div class="codecov-pills">${ignore.map((p) => `<span class="codecov-ignore">${esc(p)}</span>`).join('')}</div></div>`
    : '';

  const commentHtml = (commentLayout || commentBehavior || commentRequireChanges != null)
    ? `<div class="codecov-sec"><h3>Comment layout</h3><div class="codecov-pills">
        ${commentLayout ? commentLayout.split(',').map((seg) => `<span class="codecov-pill">${esc(seg.trim())}</span>`).join('') : ''}
        ${commentBehavior ? `<span class="codecov-pill">behavior: ${esc(commentBehavior)}</span>` : ''}
        ${commentRequireChanges != null ? `<span class="codecov-pill">require_changes: ${commentRequireChanges ? 'yes' : 'no'}</span>` : ''}
      </div></div>`
    : '';

  const hasMeta = targetHtml || flagsHtml || ignoreHtml || commentHtml;

  host.innerHTML = `<style>${CSS}</style>
<div class="codecov-title"><span class="badge-codecov">Codecov</span>codecov.yml</div>
<div class="codecov-sub">Coverage reporting${flagsList.length ? ` · ${flagsList.length} flag${flagsList.length !== 1 ? 's' : ''}` : ''}${ignore.length ? ` · ${ignore.length} ignored path${ignore.length !== 1 ? 's' : ''}` : ''}</div>
${targetHtml}${flagsHtml}${ignoreHtml}${commentHtml}
${!hasMeta ? '<div style="color:var(--fg-2,#888);font-size:13px">No coverage configuration found.</div>' : ''}`;

  return { parentNode: host };
}
