const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.wails-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-wails{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#00b4d8;color:#fff;vertical-align:middle;margin-right:8px;}
.wails-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.wails-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.wails-sec{margin:14px 0;}
.wails-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.wails-kv-table{width:100%;border-collapse:collapse;font-size:13px;}
.wails-kv-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.wails-kv-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);}
.wails-mono{font:12px/1.4 ui-monospace,monospace;}
.wails-chip{display:inline-block;font-size:11px;padding:2px 8px;border-radius:8px;background:#e0f7fa;border:1px solid #80deea;color:#006064;margin:2px 3px 2px 0;}
`;

export function render(intake) {
  let data = {};
  try { data = JSON.parse(intake.text || (intake.bytes ? new TextDecoder().decode(intake.bytes) : '{}')); } catch { data = {}; }

  const name = data.name || '';
  const wailsVersion = data.wailsVersion || '';
  const outputType = data.outputType || '';
  const frontendDir = (data.frontend && data.frontend.dir) || data.frontendDir || '';
  const frontendInstall = (data.frontend && data.frontend.install) || '';
  const frontendBuild = (data.frontend && data.frontend.build) || '';
  const frontendDev = (data.frontend && data.frontend.dev) || '';
  const authorName = (data.author && data.author.name) || '';
  const authorEmail = (data.author && data.author.email) || '';
  const info = data.info || {};

  const metaRows = [
    name ? `<tr><td class="wails-mono">name</td><td>${esc(name)}</td></tr>` : '',
    wailsVersion ? `<tr><td class="wails-mono">wailsVersion</td><td class="wails-mono">${esc(wailsVersion)}</td></tr>` : '',
    outputType ? `<tr><td class="wails-mono">outputType</td><td><span class="wails-chip">${esc(outputType)}</span></td></tr>` : '',
    frontendDir ? `<tr><td class="wails-mono">frontend.dir</td><td class="wails-mono">${esc(frontendDir)}</td></tr>` : '',
    frontendInstall ? `<tr><td class="wails-mono">frontend.install</td><td class="wails-mono">${esc(frontendInstall)}</td></tr>` : '',
    frontendBuild ? `<tr><td class="wails-mono">frontend.build</td><td class="wails-mono">${esc(frontendBuild)}</td></tr>` : '',
    frontendDev ? `<tr><td class="wails-mono">frontend.dev</td><td class="wails-mono">${esc(frontendDev)}</td></tr>` : '',
    authorName ? `<tr><td class="wails-mono">author</td><td>${esc(authorName)}${authorEmail ? ` &lt;${esc(authorEmail)}&gt;` : ''}</td></tr>` : '',
    info.productName ? `<tr><td class="wails-mono">productName</td><td>${esc(info.productName)}</td></tr>` : '',
    info.productVersion ? `<tr><td class="wails-mono">productVersion</td><td class="wails-mono">${esc(info.productVersion)}</td></tr>` : '',
  ].filter(Boolean).join('');

  const host = document.createElement('div');
  host.className = 'wails-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="wails-title"><span class="badge-wails">Wails</span>${esc(name || 'wails.json')}</div>
<div class="wails-sub">Go + web desktop app config${wailsVersion ? ` \xb7 Wails ${esc(wailsVersion)}` : ''}${outputType ? ` \xb7 ${esc(outputType)}` : ''}</div>
${metaRows ? `<div class="wails-sec"><h3>Configuration</h3><table class="wails-kv-table"><thead><tr><th>Key</th><th>Value</th></tr></thead><tbody>${metaRows}</tbody></table></div>` : ''}`;
  return { parentNode: host };
}
