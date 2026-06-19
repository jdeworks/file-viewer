const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.plk-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-plk{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#cb3837;color:#fff;vertical-align:middle;margin-right:8px;}
.plk-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.plk-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.plk-stats{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 14px;}
.plk-stat{display:flex;flex-direction:column;align-items:center;padding:8px 16px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);min-width:80px;}
.plk-stat-n{font-size:22px;font-weight:700;color:var(--fg,#24292f);}
.plk-stat-l{font-size:11px;color:var(--fg-2,#888);text-transform:uppercase;letter-spacing:.04em;}
.plk-sec{margin:12px 0;}
.plk-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.plk-pills{display:flex;flex-wrap:wrap;gap:6px;}
.plk-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.plk-note{font-size:12px;color:var(--fg-2,#888);margin:8px 0 0;}
`;

export function render(intake) {
  let lock = {};
  try { lock = JSON.parse(new TextDecoder().decode(intake.bytes)); } catch { lock = {}; }

  const version = lock.lockfileVersion ?? '?';
  const name = lock.name || '';

  // v2/v3 use `packages`, v1 uses `dependencies`
  const packages = lock.packages && typeof lock.packages === 'object' ? lock.packages : null;
  const dependencies = lock.dependencies && typeof lock.dependencies === 'object' ? lock.dependencies : null;

  let totalCount = 0;
  let directCount = 0;
  let sampleNames = [];

  if (packages) {
    // v2/v3: keys are "" (root) and "node_modules/foo" paths
    const pkgKeys = Object.keys(packages).filter((k) => k !== '');
    totalCount = pkgKeys.length;
    // Direct deps are those without nested node_modules in path (simple "node_modules/name")
    directCount = pkgKeys.filter((k) => (k.match(/node_modules\//g) || []).length === 1).length;
    sampleNames = pkgKeys.slice(0, 50).map((k) => k.replace(/^.*node_modules\//, ''));
  } else if (dependencies) {
    // v1: flat dependencies object
    const depKeys = Object.keys(dependencies);
    totalCount = depKeys.length;
    directCount = depKeys.filter((k) => !dependencies[k].dev).length;
    sampleNames = depKeys.slice(0, 50);
  }

  const versionLabel = version === 1 ? 'v1 (legacy)' : version === 2 ? 'v2' : version === 3 ? 'v3' : `v${version}`;
  const transitive = totalCount - directCount;

  const statsHtml = `<div class="plk-stats">
    <div class="plk-stat"><span class="plk-stat-n">${esc(totalCount)}</span><span class="plk-stat-l">Total</span></div>
    <div class="plk-stat"><span class="plk-stat-n">${esc(directCount)}</span><span class="plk-stat-l">Direct</span></div>
    <div class="plk-stat"><span class="plk-stat-n">${esc(transitive)}</span><span class="plk-stat-l">Transitive</span></div>
  </div>`;

  const SHOW = 50;
  const pillsHtml = sampleNames.length
    ? `<div class="plk-sec"><h3>Packages</h3><div class="plk-pills">${sampleNames.slice(0, SHOW).map((n) => `<span class="plk-pill">${esc(n)}</span>`).join('')}</div>${totalCount > SHOW ? `<p class="plk-note">… and ${totalCount - SHOW} more packages</p>` : ''}</div>`
    : '';

  const host = document.createElement('div');
  host.className = 'plk-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="plk-title"><span class="badge-plk">npm</span>${esc(name ? `${name} — package-lock.json` : 'package-lock.json')}</div>
<div class="plk-sub">lockfileVersion ${esc(versionLabel)} · ${totalCount} package${totalCount !== 1 ? 's' : ''}</div>
${statsHtml}
${pillsHtml}`;

  return { parentNode: host };
}
