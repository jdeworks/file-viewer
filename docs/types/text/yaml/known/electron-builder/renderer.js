import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.eb-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-eb{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#2563eb;color:#fff;vertical-align:middle;margin-right:8px;}
.eb-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.eb-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.eb-sec{margin:14px 0;}
.eb-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.eb-kv-table{width:100%;border-collapse:collapse;font-size:13px;}
.eb-kv-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.eb-kv-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.eb-mono{font:12px/1.4 ui-monospace,monospace;}
.eb-chip{display:inline-block;font-size:11px;padding:2px 8px;border-radius:8px;background:#eff6ff;border:1px solid #93c5fd;color:#1d4ed8;margin:2px 3px 2px 0;}
.eb-chips{display:flex;flex-wrap:wrap;gap:2px;}
.eb-platform{margin:4px 0;padding:8px 12px;border-radius:6px;border:1px solid var(--border,#e0e0e0);background:var(--bg-2,#f6f8fa);}
.eb-plat-name{font-weight:600;font-size:12px;margin-bottom:3px;}
`;

function targetChips(targets) {
  if (!targets) return '';
  const arr = Array.isArray(targets) ? targets : [targets];
  return arr.map((t) => `<span class="eb-chip">${esc(typeof t === 'string' ? t : t.target || JSON.stringify(t))}</span>`).join('');
}

export async function render(intake) {
  let cfg = {};
  const text = intake.text || (intake.bytes ? new TextDecoder().decode(intake.bytes) : '');
  const name = (intake.name || intake.filename || 'electron-builder.yml').split('/').pop();

  if (name.endsWith('.json')) {
    try { cfg = JSON.parse(text); } catch { cfg = {}; }
  } else {
    try {
      const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
      cfg = (jsyaml.loadAll(text) || [])[0] || {};
    } catch {
      cfg = intake.parsed || {};
    }
  }

  const appId = cfg.appId || '';
  const productName = cfg.productName || '';
  const outputDir = cfg.directories && cfg.directories.output ? cfg.directories.output : cfg.output || '';
  const files = Array.isArray(cfg.files) ? cfg.files : typeof cfg.files === 'string' ? [cfg.files] : [];

  const platforms = [
    { key: 'linux', label: 'Linux' },
    { key: 'win', label: 'Windows' },
    { key: 'mac', label: 'macOS' },
    { key: 'nsis', label: 'NSIS' },
    { key: 'deb', label: 'Deb' },
    { key: 'appImage', label: 'AppImage' },
    { key: 'dmg', label: 'DMG' },
    { key: 'mas', label: 'MAS' },
  ].filter((p) => cfg[p.key]);

  const publish = Array.isArray(cfg.publish) ? cfg.publish : cfg.publish ? [cfg.publish] : [];

  const metaRows = [
    appId ? `<tr><td class="eb-mono">appId</td><td class="eb-mono">${esc(appId)}</td></tr>` : '',
    productName ? `<tr><td class="eb-mono">productName</td><td>${esc(productName)}</td></tr>` : '',
    outputDir ? `<tr><td class="eb-mono">output dir</td><td class="eb-mono">${esc(outputDir)}</td></tr>` : '',
  ].filter(Boolean).join('');

  const filesHtml = files.length
    ? `<div class="eb-sec"><h3>Files (${files.length})</h3><div class="eb-chips">${files.slice(0, 10).map((f) => `<span class="eb-chip">${esc(typeof f === 'string' ? f : f.from || JSON.stringify(f))}</span>`).join('')}${files.length > 10 ? `<span style="font-size:12px;color:var(--fg-2,#888)">…+${files.length - 10}</span>` : ''}</div></div>`
    : '';

  const platformsHtml = platforms.length
    ? `<div class="eb-sec"><h3>Platform Targets</h3>${platforms.map((p) => {
        const plat = cfg[p.key];
        const chips = targetChips(plat.target || plat.targets);
        const icon = plat.icon ? `<span class="eb-mono" style="font-size:11px;color:var(--fg-2,#888)">icon: ${esc(plat.icon)}</span>` : '';
        return `<div class="eb-platform"><div class="eb-plat-name">${esc(p.label)}</div>${chips}${icon}</div>`;
      }).join('')}</div>`
    : '';

  const publishHtml = publish.length
    ? `<div class="eb-sec"><h3>Publish (${publish.length})</h3><div class="eb-chips">${publish.map((p) => `<span class="eb-chip">${esc(typeof p === 'string' ? p : p.provider || JSON.stringify(p))}</span>`).join('')}</div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'eb-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="eb-title"><span class="badge-eb">Electron Builder</span>${esc(productName || name)}</div>
<div class="eb-sub">${esc(appId) || 'Electron app packaging config'}${outputDir ? ` \xb7 output: ${esc(outputDir)}` : ''}</div>
${metaRows ? `<div class="eb-sec"><h3>Configuration</h3><table class="eb-kv-table"><thead><tr><th>Key</th><th>Value</th></tr></thead><tbody>${metaRows}</tbody></table></div>` : ''}
${filesHtml}${platformsHtml}${publishHtml}`;
  return { parentNode: host };
}
