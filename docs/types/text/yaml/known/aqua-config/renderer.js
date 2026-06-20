import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export async function render(intake) {
  const jsYaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
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
    let details = `<span class="aqua-reg-type">${esc(type)}</span>`;
    if (ref) details += `<span class="aqua-reg-ref">${esc(ref)}</span>`;
    if (name) details += `<span class="aqua-reg-name">${esc(name)}</span>`;
    if (path) details += `<span class="aqua-reg-path">${esc(path)}</span>`;
    return `<div class="aqua-reg-row">${details}</div>`;
  }).join('');

  // Package chips — up to 50
  const pkgChips = packages.slice(0, 50).map((pkg) => {
    const raw = (pkg.name || '').trim();
    const atIdx = raw.indexOf('@');
    if (atIdx === -1) {
      return `<span class="aqua-pkg"><span class="aqua-pkg-name">${esc(raw)}</span></span>`;
    }
    const pkgName = raw.slice(0, atIdx);
    const version = raw.slice(atIdx + 1);
    return `<span class="aqua-pkg"><span class="aqua-pkg-name">${esc(pkgName)}</span><span class="aqua-pkg-ver">${esc(version)}</span></span>`;
  }).join('');

  const overflow = packages.length > 50 ? `<span class="aqua-overflow">+${packages.length - 50} more</span>` : '';

  const host = document.createElement('div');
  host.className = 'aqua-doc';
  host.innerHTML = `<style>
.aqua-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-aqua{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0EA5E9;color:#fff;vertical-align:middle;margin-right:8px;}
.aqua-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.aqua-meta{font-size:12px;color:var(--fg-2,#888);margin:2px 0 12px;}
.aqua-sec{margin:12px 0;}
.aqua-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.aqua-reg-row{display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--border,#e8e8e8);font-size:13px;}
.aqua-reg-row:last-child{border-bottom:none;}
.aqua-reg-type{font:12px/1.6 ui-monospace,monospace;font-weight:700;color:#0EA5E9;}
.aqua-reg-ref{font:12px/1.6 ui-monospace,monospace;color:var(--fg-2,#888);}
.aqua-reg-name{font:12px/1.6 ui-monospace,monospace;color:var(--fg,#24292f);}
.aqua-reg-path{font:12px/1.6 ui-monospace,monospace;color:var(--fg-2,#888);font-style:italic;}
.aqua-pkgs{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;}
.aqua-pkg{display:inline-flex;align-items:center;gap:0;border-radius:8px;overflow:hidden;border:1px solid var(--border,#e0e0e0);font-size:12px;}
.aqua-pkg-name{padding:2px 8px;font-family:ui-monospace,monospace;background:var(--bg-2,#f6f8fa);}
.aqua-pkg-ver{padding:2px 8px;font-family:ui-monospace,monospace;background:var(--bg-3,#eaf4fd);color:#0EA5E9;border-left:1px solid var(--border,#e0e0e0);}
.aqua-overflow{font-size:12px;color:var(--fg-2,#888);align-self:center;}
</style>
<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
  <span class="badge-aqua">aqua</span>
  <span class="aqua-title">aqua.yaml</span>
</div>
<div class="aqua-meta">${packages.length} package${packages.length !== 1 ? 's' : ''} · registry: ${esc(firstRegType)}</div>
${registries.length ? `<div class="aqua-sec"><h3>Registries (${registries.length})</h3>${registryRows}</div>` : ''}
${packages.length ? `<div class="aqua-sec"><h3>Packages (${packages.length})</h3><div class="aqua-pkgs">${pkgChips}${overflow}</div></div>` : ''}`;

  return { parentNode: host };
}
