import { parseTOML } from '../../toml.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.gvc-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-gvc{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#02303A;color:#fff;vertical-align:middle;margin-right:8px}
.gvc-title{font-size:18px;font-weight:700;margin:0 0 4px}
.gvc-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.gvc-sec{margin:14px 0}
.gvc-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px}
.gvc-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;background:var(--bg,#fff);overflow:hidden}
.gvc-table{width:100%;border-collapse:collapse;font-size:13px}
.gvc-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:6px 12px;border-bottom:1px solid var(--border,#e0e0e0);background:var(--bg-2,#f6f8fa)}
.gvc-table td{padding:5px 12px;border-bottom:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;font-size:12px;vertical-align:top}
.gvc-table tr:last-child td{border-bottom:none}
.gvc-alias{color:#02303A;font-weight:600}
.gvc-ver{color:var(--fg,#24292f)}
.gvc-ref{color:var(--fg-2,#888);font-size:11px}
.gvc-pills{display:flex;flex-wrap:wrap;gap:4px;padding:8px 12px}
.gvc-pill{display:inline-flex;align-items:center;gap:3px;font-size:12px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.gvc-more{font-size:12px;color:var(--fg-2,#888);padding:4px 12px}
.gvc-err{color:#b91c1c;font-size:13px;padding:8px 0}
`;

function resolveVersion(val, versions) {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    if (val.ref) return `${val.ref} → ${versions?.[val.ref] || '?'}`;
    if (val.require) return val.require;
    if (val.prefer) return val.prefer;
    if (val.strictly) return `=${val.strictly}`;
  }
  return String(val);
}

function resolveLibrary(libVal, versions) {
  if (!libVal) return { module: '', version: '' };
  if (typeof libVal === 'string') return { module: libVal, version: '' };

  const module_ = libVal.module || (libVal.group && libVal.name ? `${libVal.group}:${libVal.name}` : '');
  const vRef = libVal['version.ref'] || (libVal.version && typeof libVal.version === 'object' && libVal.version.ref);
  let version = '';
  if (vRef && versions) version = `ref:${vRef} (${versions[vRef] || '?'})`;
  else if (typeof libVal.version === 'string') version = libVal.version;
  else if (libVal.version && typeof libVal.version === 'object') version = resolveVersion(libVal.version, versions);

  return { module: module_, version };
}

export function render(intake) {
  let cfg = {};
  try { cfg = parseTOML(intake.text || '') || {}; } catch { cfg = {}; }

  const versions = cfg.versions || {};
  const libraries = cfg.libraries || {};
  const bundles = cfg.bundles || {};
  const plugins = cfg.plugins || {};

  const versionEntries = Object.entries(versions);
  const libraryEntries = Object.entries(libraries);
  const bundleEntries = Object.entries(bundles);
  const pluginEntries = Object.entries(plugins);

  const SHOW = 50;

  // Versions table
  const versionsHtml = versionEntries.length
    ? `<div class="gvc-sec"><h3>Versions (${versionEntries.length})</h3><div class="gvc-card">
<table class="gvc-table"><thead><tr><th>Alias</th><th>Version</th></tr></thead><tbody>
${versionEntries.slice(0, SHOW).map(([alias, ver]) => `<tr>
<td class="gvc-alias">${esc(alias)}</td>
<td class="gvc-ver">${esc(resolveVersion(ver, versions))}</td>
</tr>`).join('')}
</tbody></table>
${versionEntries.length > SHOW ? `<div class="gvc-more">…and ${versionEntries.length - SHOW} more</div>` : ''}
</div></div>` : '';

  // Libraries table
  const librariesHtml = libraryEntries.length
    ? `<div class="gvc-sec"><h3>Libraries (${libraryEntries.length})</h3><div class="gvc-card">
<table class="gvc-table"><thead><tr><th>Alias</th><th>Module</th><th>Version</th></tr></thead><tbody>
${libraryEntries.slice(0, SHOW).map(([alias, val]) => {
    const { module: mod, version } = resolveLibrary(val, versions);
    return `<tr>
<td class="gvc-alias">${esc(alias)}</td>
<td>${esc(mod)}</td>
<td class="gvc-ref">${esc(version)}</td>
</tr>`;
  }).join('')}
</tbody></table>
${libraryEntries.length > SHOW ? `<div class="gvc-more">…and ${libraryEntries.length - SHOW} more</div>` : ''}
</div></div>` : '';

  // Bundles
  const bundlesHtml = bundleEntries.length
    ? `<div class="gvc-sec"><h3>Bundles (${bundleEntries.length})</h3><div class="gvc-card">
<table class="gvc-table"><thead><tr><th>Alias</th><th>Libraries</th></tr></thead><tbody>
${bundleEntries.map(([alias, libs]) => {
    const list = Array.isArray(libs) ? libs : [];
    return `<tr>
<td class="gvc-alias">${esc(alias)}</td>
<td><div class="gvc-pills" style="padding:0;flex-wrap:wrap">${list.map((l) => `<span class="gvc-pill">${esc(l)}</span>`).join('')}</div></td>
</tr>`;
  }).join('')}
</tbody></table>
</div></div>` : '';

  // Plugins
  const pluginsHtml = pluginEntries.length
    ? `<div class="gvc-sec"><h3>Plugins (${pluginEntries.length})</h3><div class="gvc-card">
<table class="gvc-table"><thead><tr><th>Alias</th><th>ID</th><th>Version</th></tr></thead><tbody>
${pluginEntries.map(([alias, val]) => {
    const id_ = typeof val === 'object' ? (val.id || '') : String(val);
    const ver = typeof val === 'object' ? resolveVersion(val.version || val['version.ref'] ? { ref: val['version.ref'] } : val.version, versions) : '';
    return `<tr>
<td class="gvc-alias">${esc(alias)}</td>
<td>${esc(id_)}</td>
<td class="gvc-ref">${esc(ver)}</td>
</tr>`;
  }).join('')}
</tbody></table>
</div></div>` : '';

  const subParts = [
    versionEntries.length ? `${versionEntries.length} version${versionEntries.length !== 1 ? 's' : ''}` : '',
    libraryEntries.length ? `${libraryEntries.length} librar${libraryEntries.length !== 1 ? 'ies' : 'y'}` : '',
    bundleEntries.length ? `${bundleEntries.length} bundle${bundleEntries.length !== 1 ? 's' : ''}` : '',
    pluginEntries.length ? `${pluginEntries.length} plugin${pluginEntries.length !== 1 ? 's' : ''}` : '',
  ].filter(Boolean).join(' · ');

  const host = document.createElement('div');
  host.className = 'gvc-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="gvc-title"><span class="badge-gvc">Gradle Catalog</span>libs.versions.toml</div>
<div class="gvc-sub">${esc(subParts)}</div>
${versionsHtml}
${librariesHtml}
${bundlesHtml}
${pluginsHtml}`;

  return { parentNode: host };
}
