import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.pkl-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-pkl{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#f69220;color:#fff;vertical-align:middle;margin-right:8px;}
.pkl-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.pkl-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.pkl-stats{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 14px;}
.pkl-stat{display:flex;flex-direction:column;align-items:center;padding:8px 16px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);min-width:80px;}
.pkl-stat-n{font-size:22px;font-weight:700;color:var(--fg,#24292f);}
.pkl-stat-l{font-size:11px;color:var(--fg-2,#888);text-transform:uppercase;letter-spacing:.04em;}
.pkl-sec{margin:12px 0;}
.pkl-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.pkl-pills{display:flex;flex-wrap:wrap;gap:6px;}
.pkl-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.pkl-note{font-size:12px;color:var(--fg-2,#888);margin:8px 0 0;}
`;

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = jsyaml.load(intake.text || '') || {};
  } catch { cfg = {}; }

  const lockfileVersion = cfg.lockfileVersion != null ? String(cfg.lockfileVersion) : '?';

  // importers: workspaces/projects in the lockfile
  const importers = cfg.importers && typeof cfg.importers === 'object' ? cfg.importers : {};
  const importerKeys = Object.keys(importers);
  const importerCount = importerKeys.length;

  // packages: resolved packages
  const packages = cfg.packages && typeof cfg.packages === 'object' ? cfg.packages : {};
  const packageKeys = Object.keys(packages);
  const packageCount = packageKeys.length;

  // snapshots (pnpm v9+) — fallback count
  const snapshots = cfg.snapshots && typeof cfg.snapshots === 'object' ? cfg.snapshots : {};
  const snapshotCount = Object.keys(snapshots).length;
  const totalPkgs = packageCount || snapshotCount;

  const SHOW = 50;
  // Extract readable package names from keys like "accepts@1.3.8"
  const sampleNames = packageKeys.slice(0, SHOW).map((k) => k.replace(/@[\d.]+.*$/, '') || k);

  const statsHtml = `<div class="pkl-stats">
    <div class="pkl-stat"><span class="pkl-stat-n">${esc(importerCount || 1)}</span><span class="pkl-stat-l">Importers</span></div>
    <div class="pkl-stat"><span class="pkl-stat-n">${esc(totalPkgs)}</span><span class="pkl-stat-l">Packages</span></div>
  </div>`;

  const pillsHtml = sampleNames.length
    ? `<div class="pkl-sec"><h3>Packages</h3><div class="pkl-pills">${sampleNames.map((n) => `<span class="pkl-pill">${esc(n)}</span>`).join('')}</div>${totalPkgs > SHOW ? `<p class="pkl-note">… and ${totalPkgs - SHOW} more packages</p>` : ''}</div>`
    : '';

  const importerHtml = importerCount > 1
    ? `<div class="pkl-sec"><h3>Importers (${importerCount})</h3><div class="pkl-pills">${importerKeys.slice(0, 20).map((k) => `<span class="pkl-pill">${esc(k)}</span>`).join('')}${importerCount > 20 ? `<span class="pkl-pill">+${importerCount - 20} more</span>` : ''}</div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'pkl-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="pkl-title"><span class="badge-pkl">pnpm</span>pnpm-lock.yaml</div>
<div class="pkl-sub">lockfileVersion ${esc(lockfileVersion)} · ${totalPkgs} package${totalPkgs !== 1 ? 's' : ''}</div>
${statsHtml}
${importerHtml}${pillsHtml}`;

  return { parentNode: host };
}
