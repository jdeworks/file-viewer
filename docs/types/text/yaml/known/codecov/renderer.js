import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.ccv-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-ccv{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#f01f7a;color:#fff;vertical-align:middle;margin-right:8px;}
.ccv-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.ccv-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.ccv-sec{margin:12px 0;}
.ccv-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.ccv-targets{display:flex;gap:12px;flex-wrap:wrap;margin:6px 0;}
.ccv-target{padding:8px 14px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);text-align:center;min-width:120px;}
.ccv-target-label{font-size:11px;color:var(--fg-2,#888);text-transform:uppercase;letter-spacing:.04em;}
.ccv-target-val{font-size:22px;font-weight:700;color:var(--accent,#0969da);line-height:1.2;}
.ccv-pills{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0;}
.ccv-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.ccv-flag{font:12px/1.4 ui-monospace,monospace;padding:2px 8px;border-radius:6px;background:#eff6ff;border:1px solid #93c5fd;color:#1d4ed8;margin:2px;}
.ccv-ignore{font:11px/1.4 ui-monospace,monospace;color:var(--fg-2,#888);padding:2px 6px;border-radius:4px;background:var(--bg-2,#f6f8fa);margin:2px;}
`;

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = jsyaml.load(intake.text || '') || {};
  } catch { cfg = intake.parsed || {}; }

  const coverage = cfg.coverage || {};
  const status = coverage.status || {};
  const project = status.project || {};
  const patch = status.patch || {};

  const projectTarget = project.default?.target ?? project.target ?? null;
  const patchTarget = patch.default?.target ?? patch.target ?? null;

  const flags = Array.isArray(cfg.flags) ? cfg.flags
    : cfg.flags && typeof cfg.flags === 'object' ? Object.keys(cfg.flags) : [];

  const ignore = Array.isArray(cfg.ignore) ? cfg.ignore : [];
  const comment = cfg.comment || {};
  const commentLayout = comment.layout;
  const commentBehavior = comment.behavior;
  const commentRequireChanges = comment.require_changes;

  const carryforward = Array.isArray(cfg.carryforward_flags) ? cfg.carryforward_flags : [];

  const host = document.createElement('div');
  host.className = 'ccv-doc';

  const targetHtml = (projectTarget != null || patchTarget != null)
    ? `<div class="ccv-sec"><h3>Coverage targets</h3><div class="ccv-targets">
        ${projectTarget != null ? `<div class="ccv-target"><div class="ccv-target-label">Project</div><div class="ccv-target-val">${esc(projectTarget)}%</div></div>` : ''}
        ${patchTarget != null ? `<div class="ccv-target"><div class="ccv-target-label">Patch</div><div class="ccv-target-val">${esc(patchTarget)}%</div></div>` : ''}
      </div></div>`
    : '';

  const flagsHtml = flags.length
    ? `<div class="ccv-sec"><h3>Flags (${flags.length})</h3><div class="ccv-pills">${flags.map((f) => `<span class="ccv-flag">${esc(f)}</span>`).join('')}</div></div>`
    : '';

  const ignoreHtml = ignore.length
    ? `<div class="ccv-sec"><h3>Ignored paths (${ignore.length})</h3><div class="ccv-pills">${ignore.map((p) => `<span class="ccv-ignore">${esc(p)}</span>`).join('')}</div></div>`
    : '';

  const commentHtml = (commentLayout || commentBehavior || commentRequireChanges != null)
    ? `<div class="ccv-sec"><h3>PR comments</h3><div class="ccv-pills">
        ${commentLayout ? `<span class="ccv-pill">layout: ${esc(commentLayout)}</span>` : ''}
        ${commentBehavior ? `<span class="ccv-pill">behavior: ${esc(commentBehavior)}</span>` : ''}
        ${commentRequireChanges != null ? `<span class="ccv-pill">require_changes: ${commentRequireChanges ? 'yes' : 'no'}</span>` : ''}
      </div></div>`
    : '';

  const cfHtml = carryforward.length
    ? `<div class="ccv-sec"><h3>Carryforward flags</h3><div class="ccv-pills">${carryforward.map((f) => `<span class="ccv-flag">${esc(f)}</span>`).join('')}</div></div>`
    : '';

  const hasMeta = targetHtml || flagsHtml || ignoreHtml || commentHtml || cfHtml;

  host.innerHTML = `<style>${CSS}</style>
<div class="ccv-title"><span class="badge-ccv">Codecov</span>Codecov config</div>
<div class="ccv-sub">${flags.length ? `${flags.length} flag${flags.length !== 1 ? 's' : ''}` : 'no flags'}${ignore.length ? ` · ${ignore.length} ignored path${ignore.length !== 1 ? 's' : ''}` : ''}</div>
${targetHtml}${flagsHtml}${ignoreHtml}${commentHtml}${cfHtml}
${!hasMeta ? '<div style="color:var(--fg-2,#888);font-size:13px">No coverage configuration found.</div>' : ''}`;

  return { parentNode: host };
}
