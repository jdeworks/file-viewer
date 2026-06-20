import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.pubspeclock-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.pubspeclock-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;letter-spacing:.04em;background:#607D8B;color:#fff;margin-bottom:10px;}
.pubspeclock-title{font-size:20px;font-weight:700;margin:4px 0 2px;}
.pubspeclock-sub{font-size:13px;color:var(--fg-2,#888);margin:0 0 12px;}
.pubspeclock-stats{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:14px;}
.pubspeclock-stat{display:flex;flex-direction:column;align-items:center;padding:8px 16px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);min-width:80px;}
.pubspeclock-stat-n{font-size:22px;font-weight:700;color:var(--fg,#24292f);}
.pubspeclock-stat-l{font-size:11px;color:var(--fg-2,#888);text-transform:uppercase;letter-spacing:.04em;}
.pubspeclock-sdks{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;}
.pubspeclock-sdk-chip{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:4px;padding:2px 8px;font:12px ui-monospace,monospace;}
.pubspeclock-sec{margin:12px 0;}
.pubspeclock-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 4px;}
.pubspeclock-table{width:100%;border-collapse:collapse;font-size:12px;}
.pubspeclock-table th{text-align:left;padding:4px 8px;background:var(--bg-2,#f6f8fa);border-bottom:1px solid var(--border,#e0e0e0);color:var(--fg-2,#888);font-weight:600;text-transform:uppercase;font-size:11px;letter-spacing:.03em;}
.pubspeclock-table td{padding:3px 8px;border-bottom:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.pubspeclock-table td:first-child{color:var(--accent,#0175C2);}
.pubspeclock-type-direct{font-size:10px;padding:1px 5px;border-radius:3px;background:#e3f2fd;color:#1565c0;margin-left:4px;font-family:system-ui,sans-serif;}
.pubspeclock-type-transitive{font-size:10px;padding:1px 5px;border-radius:3px;background:var(--bg-3,#f0f0f0);color:var(--fg-2,#888);margin-left:4px;font-family:system-ui,sans-serif;}
.pubspeclock-url{color:var(--fg-2,#888);font-size:11px;max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
`;

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  const packages = cfg.packages && typeof cfg.packages === 'object' ? cfg.packages : {};
  const packageEntries = Object.entries(packages);
  const totalCount = packageEntries.length;

  const sdks = cfg.sdks && typeof cfg.sdks === 'object' ? cfg.sdks : {};
  const sdkEntries = Object.entries(sdks);

  // Group by source
  const groups = { hosted: [], git: [], sdk: [], path: [], other: [] };
  for (const [pkgName, info] of packageEntries) {
    if (!info || typeof info !== 'object') continue;
    const src = info.source || 'other';
    const dep = info.dependency || '';
    const isDirect = dep.startsWith('direct');
    const isTransitive = dep === 'transitive';
    const version = info.version || '';
    const desc = info.description;

    if (src === 'hosted') {
      const host = desc && typeof desc === 'object' ? (desc.url || desc.name || '') : String(desc || '');
      groups.hosted.push({ name: pkgName, version, host, isDirect, isTransitive });
    } else if (src === 'git') {
      const url = desc && typeof desc === 'object' ? (desc.url || '') : String(desc || '');
      const ref = desc && typeof desc === 'object' ? (desc.ref || desc.tag || '') : '';
      groups.git.push({ name: pkgName, version, url, ref, isDirect, isTransitive });
    } else if (src === 'sdk') {
      const sdkName = desc && typeof desc === 'object' ? (desc.sdk || '') : String(desc || '');
      groups.sdk.push({ name: pkgName, version, sdkName, isDirect, isTransitive });
    } else if (src === 'path') {
      const path = desc && typeof desc === 'object' ? (desc.path || '') : String(desc || '');
      groups.path.push({ name: pkgName, version, path, isDirect, isTransitive });
    } else {
      groups.other.push({ name: pkgName, version, isDirect, isTransitive });
    }
  }

  const directCount = packageEntries.filter(([, i]) => i && typeof i === 'object' && (i.dependency || '').startsWith('direct')).length;
  const transitiveCount = packageEntries.filter(([, i]) => i && typeof i === 'object' && i.dependency === 'transitive').length;

  function depTag(pkg) {
    if (pkg.isDirect) return '<span class="pubspeclock-type-direct">direct</span>';
    if (pkg.isTransitive) return '<span class="pubspeclock-type-transitive">transitive</span>';
    return '';
  }

  function renderHostedTable(pkgs) {
    if (!pkgs.length) return '';
    return `<table class="pubspeclock-table">
      <thead><tr><th>Package</th><th>Version</th><th>Host</th></tr></thead>
      <tbody>${pkgs.map((p) => `<tr>
        <td>${esc(p.name)}${depTag(p)}</td>
        <td>${esc(p.version)}</td>
        <td class="pubspeclock-url">${esc(p.host)}</td>
      </tr>`).join('')}</tbody>
    </table>`;
  }

  function renderGitTable(pkgs) {
    if (!pkgs.length) return '';
    return `<table class="pubspeclock-table">
      <thead><tr><th>Package</th><th>Version</th><th>URL / Ref</th></tr></thead>
      <tbody>${pkgs.map((p) => `<tr>
        <td>${esc(p.name)}${depTag(p)}</td>
        <td>${esc(p.version)}</td>
        <td class="pubspeclock-url">${esc(p.url)}${p.ref ? ' @ ' + esc(p.ref) : ''}</td>
      </tr>`).join('')}</tbody>
    </table>`;
  }

  function renderSdkTable(pkgs) {
    if (!pkgs.length) return '';
    return `<table class="pubspeclock-table">
      <thead><tr><th>Package</th><th>Version</th><th>SDK</th></tr></thead>
      <tbody>${pkgs.map((p) => `<tr>
        <td>${esc(p.name)}${depTag(p)}</td>
        <td>${esc(p.version)}</td>
        <td>${esc(p.sdkName)}</td>
      </tr>`).join('')}</tbody>
    </table>`;
  }

  function renderPathTable(pkgs) {
    if (!pkgs.length) return '';
    return `<table class="pubspeclock-table">
      <thead><tr><th>Package</th><th>Version</th><th>Path</th></tr></thead>
      <tbody>${pkgs.map((p) => `<tr>
        <td>${esc(p.name)}${depTag(p)}</td>
        <td>${esc(p.version)}</td>
        <td class="pubspeclock-url">${esc(p.path)}</td>
      </tr>`).join('')}</tbody>
    </table>`;
  }

  // Limit to 30 total shown across groups, proportionally
  const LIMIT = 30;
  let remaining = LIMIT;
  const hostedSlice = groups.hosted.slice(0, remaining); remaining -= hostedSlice.length;
  const gitSlice = groups.git.slice(0, remaining); remaining -= gitSlice.length;
  const sdkSlice = groups.sdk.slice(0, remaining); remaining -= sdkSlice.length;
  const pathSlice = groups.path.slice(0, remaining);

  const sdksHtml = sdkEntries.length
    ? `<div class="pubspeclock-sdks">${sdkEntries.map(([k, v]) => `<span class="pubspeclock-sdk-chip">${esc(k)}: ${esc(v)}</span>`).join('')}</div>`
    : '';

  const hostedHtml = hostedSlice.length
    ? `<div class="pubspeclock-sec"><h3>Hosted (${groups.hosted.length})</h3>${renderHostedTable(hostedSlice)}${groups.hosted.length > hostedSlice.length ? `<p style="font-size:12px;color:var(--fg-2,#888);margin:4px 0 0">… and ${groups.hosted.length - hostedSlice.length} more</p>` : ''}</div>`
    : '';

  const gitHtml = gitSlice.length
    ? `<div class="pubspeclock-sec"><h3>Git (${groups.git.length})</h3>${renderGitTable(gitSlice)}</div>`
    : '';

  const sdkSrcHtml = sdkSlice.length
    ? `<div class="pubspeclock-sec"><h3>SDK (${groups.sdk.length})</h3>${renderSdkTable(sdkSlice)}</div>`
    : '';

  const pathHtml = pathSlice.length
    ? `<div class="pubspeclock-sec"><h3>Path (${groups.path.length})</h3>${renderPathTable(pathSlice)}</div>`
    : '';

  const host = document.createElement('div');
  host.className = 'pubspeclock-doc';
  host.innerHTML = `<style>${CSS}</style>
<span class="pubspeclock-badge">pubspec.lock</span>
<div class="pubspeclock-title">pubspec.lock</div>
<div class="pubspeclock-sub">${totalCount} package${totalCount !== 1 ? 's' : ''} locked</div>
<div class="pubspeclock-stats">
  <div class="pubspeclock-stat"><span class="pubspeclock-stat-n">${esc(totalCount)}</span><span class="pubspeclock-stat-l">Total</span></div>
  ${directCount ? `<div class="pubspeclock-stat"><span class="pubspeclock-stat-n">${esc(directCount)}</span><span class="pubspeclock-stat-l">Direct</span></div>` : ''}
  ${transitiveCount ? `<div class="pubspeclock-stat"><span class="pubspeclock-stat-n">${esc(transitiveCount)}</span><span class="pubspeclock-stat-l">Transitive</span></div>` : ''}
</div>
${sdksHtml}
${hostedHtml}
${gitHtml}
${sdkSrcHtml}
${pathHtml}`;

  return { parentNode: host };
}
