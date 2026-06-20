import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.mky-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-mky{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#375EAB;color:#fff;vertical-align:middle;margin-right:8px;}
.mky-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.mky-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.mky-sec{margin:12px 0;}
.mky-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.mky-pills{display:flex;flex-wrap:wrap;gap:6px;}
.mky-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.mky-pkg{border:1px solid var(--border,#e0e0e0);border-radius:6px;margin:6px 0;padding:8px 12px;background:var(--bg,#fff);}
.mky-pkg-name{font:13px/1.4 ui-monospace,monospace;font-weight:700;margin-bottom:4px;}
.mky-ifaces{font-size:12px;color:var(--fg-2,#666);margin-top:4px;}
.mky-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;}
.mky-kv-k{font-size:12px;color:var(--fg-2,#888);min-width:130px;}
.mky-kv-v{font-size:13px;font-family:ui-monospace,monospace;}
`;

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || \'\') || [])[0] || {};
  } catch { cfg = {}; }

  // --- Packages ---
  const packages = cfg.packages && typeof cfg.packages === 'object'
    ? Object.entries(cfg.packages)
    : [];

  const pkgsHtml = packages.slice(0, 8).map(([pkgPath, pkgCfg]) => {
    const shortName = pkgPath.split('/').pop();
    const ifaces = pkgCfg?.interfaces && typeof pkgCfg.interfaces === 'object'
      ? Object.keys(pkgCfg.interfaces)
      : [];
    return `<div class="mky-pkg">
      <div class="mky-pkg-name">${esc(shortName)}</div>
      <div style="font-size:11px;color:var(--fg-2,#888);font-family:ui-monospace,monospace;">${esc(pkgPath)}</div>
      ${ifaces.length ? `<div class="mky-ifaces">Interfaces: ${ifaces.slice(0, 6).map((i) => `<span style="font-weight:600">${esc(i)}</span>`).join(', ')}${ifaces.length > 6 ? ` +${ifaces.length - 6}` : ''}</div>` : ''}
    </div>`;
  }).join('');

  // --- Top-level settings ---
  const outDir = cfg.dir || '';
  const outPkg = cfg['output-dir'] || cfg.outpkg || '';
  const withExpecter = cfg['with-expecter'] != null ? String(cfg['with-expecter']) : null;
  const tags = cfg['mock-build-tags'] || cfg.tags || '';
  const allInterfaces = packages.reduce((acc, [, v]) => {
    if (v?.interfaces && typeof v.interfaces === 'object') acc += Object.keys(v.interfaces).length;
    return acc;
  }, 0);

  const subtitle = [
    packages.length ? `${packages.length} package${packages.length !== 1 ? 's' : ''}` : '',
    allInterfaces ? `${allInterfaces} interface${allInterfaces !== 1 ? 's' : ''}` : '',
  ].filter(Boolean).join(' · ');

  const host = document.createElement('div');
  host.className = 'mky-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="mky-title"><span class="badge-mky">mockery</span>Mock generation config</div>
<div class="mky-sub">${esc(subtitle) || 'Go interface mock generator'}</div>

${packages.length ? `<div class="mky-sec"><h3>Packages</h3>${pkgsHtml}${packages.length > 8 ? `<div style="font-size:12px;color:var(--fg-2,#888)">…and ${packages.length - 8} more</div>` : ''}</div>` : ''}

${outDir || outPkg || withExpecter !== null || tags ? `<div class="mky-sec"><h3>Settings</h3>
  ${outDir ? `<div class="mky-kv"><span class="mky-kv-k">output dir</span><span class="mky-kv-v">${esc(outDir)}</span></div>` : ''}
  ${outPkg ? `<div class="mky-kv"><span class="mky-kv-k">output package</span><span class="mky-kv-v">${esc(outPkg)}</span></div>` : ''}
  ${withExpecter !== null ? `<div class="mky-kv"><span class="mky-kv-k">with-expecter</span><span class="mky-kv-v">${esc(withExpecter)}</span></div>` : ''}
  ${tags ? `<div class="mky-kv"><span class="mky-kv-k">build tags</span><span class="mky-kv-v">${esc(Array.isArray(tags) ? tags.join(', ') : tags)}</span></div>` : ''}
</div>` : ''}
`;
  return { parentNode: host };
}
