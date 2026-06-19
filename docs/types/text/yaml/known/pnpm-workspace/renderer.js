import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.pnw-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-pnw{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#f69220;color:#fff;vertical-align:middle;margin-right:8px;}
.pnw-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.pnw-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.pnw-sec{margin:12px 0;}
.pnw-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.pnw-pills{display:flex;flex-wrap:wrap;gap:6px;}
.pnw-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.pnw-cat-table{width:100%;border-collapse:collapse;font-size:12px;}
.pnw-cat-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.pnw-cat-table td{padding:3px 8px 3px 0;border-bottom:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
`;

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = jsyaml.load(intake.text || '') || {};
  } catch { cfg = {}; }

  const packages = Array.isArray(cfg.packages) ? cfg.packages : [];
  const catalog = cfg.catalog ? Object.entries(cfg.catalog) : [];
  const catalogs = cfg.catalogs ? Object.entries(cfg.catalogs) : [];

  const packHtml = packages.length
    ? `<div class="pnw-sec"><h3>Packages (${packages.length})</h3><div class="pnw-pills">${packages.slice(0, 8).map((p) => `<span class="pnw-pill">${esc(p)}</span>`).join('')}${packages.length > 8 ? `<span class="pnw-pill">+${packages.length - 8} more</span>` : ''}</div></div>`
    : '';

  const catHtml = catalog.length
    ? `<div class="pnw-sec"><h3>Catalog (${catalog.length} packages)</h3>
        <table class="pnw-cat-table"><thead><tr><th>Package</th><th>Version</th></tr></thead>
        <tbody>${catalog.slice(0, 8).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}
        ${catalog.length > 8 ? `<tr><td colspan="2" style="color:var(--fg-2,#888)">…and ${catalog.length - 8} more</td></tr>` : ''}
        </tbody></table></div>`
    : '';

  const catsHtml = catalogs.length
    ? `<div class="pnw-sec"><h3>Named catalogs (${catalogs.length})</h3><div class="pnw-pills">${catalogs.slice(0, 6).map(([k]) => `<span class="pnw-pill">${esc(k)}</span>`).join('')}</div></div>`
    : '';

  const sub = [
    packages.length ? `${packages.length} package glob${packages.length !== 1 ? 's' : ''}` : '',
    catalog.length ? `${catalog.length} catalog entries` : '',
  ].filter(Boolean).join(' · ');

  const host = document.createElement('div');
  host.className = 'pnw-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="pnw-title"><span class="badge-pnw">pnpm</span>pnpm-workspace.yaml</div>
<div class="pnw-sub">${esc(sub) || 'pnpm monorepo workspace'}</div>
${packHtml}${catHtml}${catsHtml}`;
  return { parentNode: host };
}
