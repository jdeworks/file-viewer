import { parseTOML } from '../../toml.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.plo-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-plo{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1e78b4;color:#fff;vertical-align:middle;margin-right:8px;}
.plo-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.plo-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.plo-stats{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 14px;}
.plo-stat{display:flex;flex-direction:column;align-items:center;padding:8px 16px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);min-width:80px;}
.plo-stat-n{font-size:22px;font-weight:700;color:var(--fg,#24292f);}
.plo-stat-l{font-size:11px;color:var(--fg-2,#888);text-transform:uppercase;letter-spacing:.04em;}
.plo-sec{margin:12px 0;}
.plo-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.plo-pills{display:flex;flex-wrap:wrap;gap:6px;}
.plo-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.plo-note{font-size:12px;color:var(--fg-2,#888);margin:8px 0 0;}
`;

export function render(intake) {
  let lock = {};
  try { lock = parseTOML(intake.text || '') || {}; } catch { lock = {}; }

  const packages = Array.isArray(lock.package) ? lock.package : [];
  const totalCount = packages.length;

  // Extract Python version constraints from metadata
  const meta = lock.metadata && typeof lock.metadata === 'object' ? lock.metadata : {};
  const pythonVersions = meta['python-versions'] || meta.python_versions || '';

  // Content hash
  const contentHash = meta['content-hash'] || meta.content_hash || '';

  const SHOW = 50;
  const sampleNames = packages.slice(0, SHOW).map((p) => p.name || '?');

  const statsHtml = `<div class="plo-stats">
    <div class="plo-stat"><span class="plo-stat-n">${esc(totalCount)}</span><span class="plo-stat-l">Packages</span></div>
  </div>`;

  const pyHtml = pythonVersions
    ? `<div class="plo-sec"><h3>Python version</h3><div class="plo-pills"><span class="plo-pill">${esc(pythonVersions)}</span></div></div>`
    : '';

  const pillsHtml = sampleNames.length
    ? `<div class="plo-sec"><h3>Packages</h3><div class="plo-pills">${sampleNames.map((n) => `<span class="plo-pill">${esc(n)}</span>`).join('')}</div>${totalCount > SHOW ? `<p class="plo-note">… and ${totalCount - SHOW} more packages</p>` : ''}</div>`
    : '';

  const host = document.createElement('div');
  host.className = 'plo-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="plo-title"><span class="badge-plo">Poetry</span>poetry.lock</div>
<div class="plo-sub">${totalCount} package${totalCount !== 1 ? 's' : ''}${pythonVersions ? ` · Python ${esc(pythonVersions)}` : ''}</div>
${statsHtml}
${pyHtml}${pillsHtml}`;

  return { parentNode: host };
}
