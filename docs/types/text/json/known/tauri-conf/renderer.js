import { describeCollectionCap } from '../../../../../core/collection-cap.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.tauri-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-tauri{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#24c8db;color:#fff;vertical-align:middle;margin-right:8px;}
.tauri-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.tauri-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.tauri-sec{margin:14px 0;}
.tauri-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.tauri-kv-table{width:100%;border-collapse:collapse;font-size:13px;}
.tauri-kv-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.tauri-kv-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);}
.tauri-mono{font:12px/1.4 ui-monospace,monospace;}
.tauri-chip{display:inline-block;font-size:11px;padding:2px 8px;border-radius:8px;background:#e0f7fa;border:1px solid #80deea;color:#006064;margin:2px 3px 2px 0;}
.tauri-chips{display:flex;flex-wrap:wrap;gap:2px;margin:2px 0;}
.tauri-win{padding:8px 12px;border-radius:6px;border:1px solid var(--border,#e0e0e0);background:var(--bg-2,#f6f8fa);margin:4px 0;}
.tauri-win-title{font-weight:600;font-size:13px;}
.tauri-win-meta{font-size:11px;color:var(--fg-2,#888);margin-top:2px;}
`;

export function render(intake) {
  let data = {};
  try { data = JSON.parse(intake.text || (intake.bytes ? new TextDecoder().decode(intake.bytes) : '{}')); } catch { data = {}; }

  // Tauri v1 structure: package.productName, package.version, tauri.*
  // Tauri v2 structure: productName, version, bundle.*, app.windows[]
  const productName = data.productName || (data.package && data.package.productName) || '';
  const version = data.version || (data.package && data.package.version) || '';
  const identifier = (data.bundle && data.bundle.identifier) || (data.tauri && data.tauri.bundle && data.tauri.bundle.identifier) || '';

  // Windows (v1: tauri.windows[], v2: app.windows[])
  const windows = Array.isArray(data.app && data.app.windows ? data.app.windows : null)
    ? data.app.windows
    : Array.isArray(data.tauri && data.tauri.windows ? data.tauri.windows : null)
      ? data.tauri.windows
      : [];

  // Targets (v1: tauri.bundle.targets, v2: bundle.targets)
  const targetsRaw = (data.bundle && data.bundle.targets) || (data.tauri && data.tauri.bundle && data.tauri.bundle.targets) || [];
  const targets = Array.isArray(targetsRaw) ? targetsRaw : typeof targetsRaw === 'string' ? [targetsRaw] : [];

  // Permissions (v2: app.security.permissions[])
  const allPermissions = Array.isArray(data.app && data.app.security && data.app.security.permissions ? data.app.security.permissions : null)
    ? data.app.security.permissions : [];
  const permissions = allPermissions
    .slice(0, 8);
  const permissionCap = describeCollectionCap(allPermissions, permissions);

  // Build config
  const distDir = (data.build && data.build.distDir) || (data.build && data.build.frontendDist) || '';
  const devUrl = (data.build && data.build.devUrl) || (data.build && data.build.devPath) || '';

  const metaRows = [
    productName ? `<tr><td class="tauri-mono">productName</td><td>${esc(productName)}</td></tr>` : '',
    version ? `<tr><td class="tauri-mono">version</td><td>${esc(version)}</td></tr>` : '',
    identifier ? `<tr><td class="tauri-mono">identifier</td><td class="tauri-mono">${esc(identifier)}</td></tr>` : '',
    distDir ? `<tr><td class="tauri-mono">distDir</td><td class="tauri-mono">${esc(distDir)}</td></tr>` : '',
    devUrl ? `<tr><td class="tauri-mono">devUrl</td><td class="tauri-mono">${esc(devUrl)}</td></tr>` : '',
  ].filter(Boolean).join('');

  const targetsHtml = targets.length
    ? `<div class="tauri-sec"><h3>Bundle Targets</h3><div class="tauri-chips">${targets.map((t) => `<span class="tauri-chip">${esc(t)}</span>`).join('')}</div></div>`
    : '';

  const shownWindows = windows
    .slice(0, 5);
  const windowCap = describeCollectionCap(windows, shownWindows);
  const windowsHtml = shownWindows.length
    ? `<div class="tauri-sec"><h3>Windows (${windowCap.label})</h3>${shownWindows.map((w) => {
        const title = w.title || w.label || '(window)';
        const meta = [w.width && w.height ? `${w.width}\xd7${w.height}` : '', w.url ? `url: ${w.url}` : ''].filter(Boolean).join(' \xb7 ');
        return `<div class="tauri-win"><div class="tauri-win-title">${esc(title)}</div>${meta ? `<div class="tauri-win-meta">${esc(meta)}</div>` : ''}</div>`;
      }).join('')}</div>`
    : '';

  const permsHtml = permissions.length
    ? `<div class="tauri-sec"><h3>Permissions (${permissionCap.label})</h3><div class="tauri-chips">${permissions.map((p) => `<span class="tauri-chip">${esc(typeof p === 'string' ? p : p.identifier || JSON.stringify(p))}</span>`).join('')}</div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'tauri-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="tauri-title"><span class="badge-tauri">Tauri</span>${esc(productName || 'tauri.conf.json')}</div>
<div class="tauri-sub">${esc(identifier) || 'Tauri desktop app config'}${version ? ` \xb7 v${esc(version)}` : ''}</div>
${metaRows ? `<div class="tauri-sec"><h3>Configuration</h3><table class="tauri-kv-table"><thead><tr><th>Key</th><th>Value</th></tr></thead><tbody>${metaRows}</tbody></table></div>` : ''}
${targetsHtml}${windowsHtml}${permsHtml}`;
  return { parentNode: host };
}
