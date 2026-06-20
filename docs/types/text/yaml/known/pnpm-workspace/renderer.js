import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.pnpmws-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-pnpmws{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#f69220;color:#fff;vertical-align:middle;margin-right:8px;}
.pnpmws-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.pnpmws-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.pnpmws-sec{margin:12px 0;}
.pnpmws-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.pnpmws-pills{display:flex;flex-wrap:wrap;gap:6px;}
.pnpmws-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.pnpmws-pill.negated{background:#fef2f2;border-color:#fca5a5;color:#991b1b;}
.pnpmws-cat-table{width:100%;border-collapse:collapse;font-size:12px;}
.pnpmws-cat-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.pnpmws-cat-table td{padding:3px 8px 3px 0;border-bottom:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.pnpmws-cat-card{margin-bottom:10px;}
.pnpmws-cat-card-title{font-size:12px;font-weight:600;color:var(--fg,#24292f);margin:0 0 4px;}
`;

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = {}; }

  const packages = Array.isArray(cfg.packages) ? cfg.packages : [];
  const catalog = cfg.catalog ? Object.entries(cfg.catalog) : [];
  const catalogs = cfg.catalogs ? Object.entries(cfg.catalogs) : [];

  const packHtml = packages.length
    ? `<div class="pnpmws-sec"><h3>Package Globs (${packages.length})</h3><div class="pnpmws-pills">${packages.map((p) => {
        const neg = String(p).startsWith('!');
        return `<span class="pnpmws-pill${neg ? ' negated' : ''}">${esc(p)}</span>`;
      }).join('')}</div></div>`
    : '';

  const catHtml = catalog.length
    ? `<div class="pnpmws-sec"><h3>Catalog (${catalog.length} packages)</h3>
        <table class="pnpmws-cat-table"><thead><tr><th>Package</th><th>Version</th></tr></thead>
        <tbody>${catalog.slice(0, 10).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}
        ${catalog.length > 10 ? `<tr><td colspan="2" style="color:var(--fg-2,#888)">…and ${catalog.length - 10} more</td></tr>` : ''}
        </tbody></table></div>`
    : '';

  const catsHtml = catalogs.length
    ? `<div class="pnpmws-sec"><h3>Named Catalogs (${catalogs.length})</h3>${catalogs.map(([name, pkgs]) => {
        const entries = pkgs ? Object.entries(pkgs) : [];
        return `<div class="pnpmws-cat-card">
          <div class="pnpmws-cat-card-title">${esc(name)}</div>
          <table class="pnpmws-cat-table"><thead><tr><th>Package</th><th>Version</th></tr></thead>
          <tbody>${entries.slice(0, 6).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}
          ${entries.length > 6 ? `<tr><td colspan="2" style="color:var(--fg-2,#888)">…and ${entries.length - 6} more</td></tr>` : ''}
          </tbody></table></div>`;
      }).join('')}</div>`
    : '';

  const totalCatalogEntries = catalog.length + catalogs.reduce((sum, [, pkgs]) => sum + (pkgs ? Object.keys(pkgs).length : 0), 0);
  const sub = [
    packages.length ? `${packages.length} workspace package${packages.length !== 1 ? 's' : ''}` : '',
    totalCatalogEntries ? `${totalCatalogEntries} catalog entries` : '',
  ].filter(Boolean).join(' · ');

  const host = document.createElement('div');
  host.className = 'pnpmws-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="pnpmws-title"><span class="badge-pnpmws">pnpm</span>pnpm-workspace.yaml</div>
<div class="pnpmws-sub">${esc(sub) || 'pnpm monorepo workspace'}</div>
${packHtml}${catHtml}${catsHtml}`;
  return { parentNode: host };
}
