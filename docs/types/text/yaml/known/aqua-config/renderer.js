import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export async function render(intake) {
  const text = intake.text || '';
  let doc = {};
  try { doc = (jsYaml.loadAll(text) || [])[0] || {}; } catch { /* ignore */ }

  const registries = Array.isArray(doc.registries) ? doc.registries : [];
  const packages = Array.isArray(doc.packages) ? doc.packages : [];

  // Summarise first registry for subtitle
  const firstReg = registries[0] || {};
  const firstRegType = firstReg.type || 'standard';

  // Registry rows
  const registryRows = registries.map((reg) => {
    const type = reg.type || 'standard';
    const ref = reg.ref || '';
    const path = reg.path || '';
    const name = reg.name || '';
    let details = `<span class="aqc-reg-type">${esc(type)}</span>`;
    if (ref) details += `<span class="aqc-reg-ref">${esc(ref)}</span>`;
    if (name) details += `<span class="aqc-reg-name">${esc(name)}</span>`;
    if (path) details += `<span class="aqc-reg-path">${esc(path)}</span>`;
    return `<div class="aqc-reg-row">${details}</div>`;
  }).join('');

  // Package chips — up to 50
  const pkgChips = packages.slice(0, 50).map((pkg) => {
    const raw = (pkg.name || '').trim();
    const atIdx = raw.indexOf('@');
    if (atIdx === -1) {
      return `<span class="aqc-pkg"><span class="aqc-pkg-name">${esc(raw)}</span></span>`;
    }
    const pkgName = raw.slice(0, atIdx);
    const version = raw.slice(atIdx + 1);
    return `<span class="aqc-pkg"><span class="aqc-pkg-name">${esc(pkgName)}</span><span class="aqc-pkg-ver">${esc(version)}</span></span>`;
  }).join('');

  const overflow = packages.length > 50 ? `<span class="aqc-overflow">+${packages.length - 50} more</span>` : '';

  const host = document.createElement('div');
  host.className = 'aqc-doc';
  host.innerHTML = `<style>
.aqc-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-aqc{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0EA5E9;color:#fff;vertical-align:middle;margin-right:8px;}
.aqc-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.aqc-meta{font-size:12px;color:var(--fg-2,#888);margin:2px 0 12px;}
.aqc-sec{margin:12px 0;}
.aqc-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.aqc-reg-row{display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--border,#e8e8e8);font-size:13px;}
.aqc-reg-row:last-child{border-bottom:none;}
.aqc-reg-type{font:12px/1.6 ui-monospace,monospace;font-weight:700;color:#0EA5E9;}
.aqc-reg-ref{font:12px/1.6 ui-monospace,monospace;color:var(--fg-2,#888);}
.aqc-reg-name{font:12px/1.6 ui-monospace,monospace;color:var(--fg,#24292f);}
.aqc-reg-path{font:12px/1.6 ui-monospace,monospace;color:var(--fg-2,#888);font-style:italic;}
.aqc-pkgs{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;}
.aqc-pkg{display:inline-flex;align-items:center;gap:0;border-radius:8px;overflow:hidden;border:1px solid var(--border,#e0e0e0);font-size:12px;}
.aqc-pkg-name{padding:2px 8px;font-family:ui-monospace,monospace;background:var(--bg-2,#f6f8fa);}
.aqc-pkg-ver{padding:2px 8px;font-family:ui-monospace,monospace;background:var(--bg-3,#eaf4fd);color:#0EA5E9;border-left:1px solid var(--border,#e0e0e0);}
.aqc-overflow{font-size:12px;color:var(--fg-2,#888);align-self:center;}
</style>
<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
  <span class="badge-aqc">aqua</span>
  <span class="aqc-title">aqua.yaml</span>
</div>
<div class="aqc-meta">${packages.length} package${packages.length !== 1 ? 's' : ''} · registry: ${esc(firstRegType)}</div>
${registries.length ? `<div class="aqc-sec"><h3>Registries (${registries.length})</h3>${registryRows}</div>` : ''}
${packages.length ? `<div class="aqc-sec"><h3>Packages (${packages.length})</h3><div class="aqc-pkgs">${pkgChips}${overflow}</div></div>` : ''}`;

  return { parentNode: host };
}
