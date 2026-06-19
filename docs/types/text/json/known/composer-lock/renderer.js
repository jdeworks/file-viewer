const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.cpl-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-cpl{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#6c3483;color:#fff;vertical-align:middle;margin-right:8px;}
.cpl-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.cpl-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.cpl-stats{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 14px;}
.cpl-stat{display:flex;flex-direction:column;align-items:center;padding:8px 16px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);min-width:80px;}
.cpl-stat-n{font-size:22px;font-weight:700;color:var(--fg,#24292f);}
.cpl-stat-l{font-size:11px;color:var(--fg-2,#888);text-transform:uppercase;letter-spacing:.04em;}
.cpl-sec{margin:12px 0;}
.cpl-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.cpl-pills{display:flex;flex-wrap:wrap;gap:6px;}
.cpl-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.cpl-hash{font:11px/1.4 ui-monospace,monospace;color:var(--fg-2,#888);word-break:break-all;padding:4px 8px;background:var(--bg-2,#f6f8fa);border-radius:4px;}
.cpl-note{font-size:12px;color:var(--fg-2,#888);margin:8px 0 0;}
`;

export function render(intake) {
  let lock = {};
  try { lock = JSON.parse(new TextDecoder().decode(intake.bytes)); } catch { lock = {}; }

  const packages = Array.isArray(lock.packages) ? lock.packages : [];
  const packagesDev = Array.isArray(lock['packages-dev']) ? lock['packages-dev'] : [];
  const platform = lock.platform && typeof lock.platform === 'object' ? lock.platform : {};
  const contentHash = lock['content-hash'] || '';

  const totalCount = packages.length + packagesDev.length;

  const platformEntries = Object.entries(platform);
  const platformHtml = platformEntries.length
    ? `<div class="cpl-sec"><h3>Platform requirements</h3><div class="cpl-pills">${platformEntries.map(([k, v]) => `<span class="cpl-pill">${esc(k)}: ${esc(v)}</span>`).join('')}</div></div>`
    : '';

  const SHOW = 50;
  const allPkgs = [...packages, ...packagesDev];
  const sampleNames = allPkgs.slice(0, SHOW).map((p) => p.name || '?');

  const pillsHtml = sampleNames.length
    ? `<div class="cpl-sec"><h3>Packages</h3><div class="cpl-pills">${sampleNames.map((n) => `<span class="cpl-pill">${esc(n)}</span>`).join('')}</div>${totalCount > SHOW ? `<p class="cpl-note">… and ${totalCount - SHOW} more packages</p>` : ''}</div>`
    : '';

  const hashHtml = contentHash
    ? `<div class="cpl-sec"><h3>Content-hash</h3><div class="cpl-hash">${esc(contentHash)}</div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'cpl-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="cpl-title"><span class="badge-cpl">Composer</span>composer.lock</div>
<div class="cpl-sub">${totalCount} package${totalCount !== 1 ? 's' : ''}${packagesDev.length ? ` (${packages.length} prod + ${packagesDev.length} dev)` : ''}</div>
<div class="cpl-stats">
  <div class="cpl-stat"><span class="cpl-stat-n">${esc(packages.length)}</span><span class="cpl-stat-l">Prod</span></div>
  <div class="cpl-stat"><span class="cpl-stat-n">${esc(packagesDev.length)}</span><span class="cpl-stat-l">Dev</span></div>
  <div class="cpl-stat"><span class="cpl-stat-n">${esc(totalCount)}</span><span class="cpl-stat-l">Total</span></div>
</div>
${platformHtml}${pillsHtml}${hashHtml}`;

  return { parentNode: host };
}
