const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.cap-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-cap{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#119eda;color:#fff;vertical-align:middle;margin-right:8px;}
.cap-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.cap-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.cap-sec{margin:14px 0;}
.cap-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.cap-kv-table{width:100%;border-collapse:collapse;font-size:13px;}
.cap-kv-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.cap-kv-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);}
.cap-mono{font:12px/1.4 ui-monospace,monospace;}
.cap-plugins{display:grid;gap:6px;}
.cap-plugin{padding:8px 12px;border-radius:6px;border:1px solid var(--border,#e0e0e0);background:var(--bg-2,#f6f8fa);}
.cap-plugin-name{font-weight:600;font-size:12px;}
.cap-plugin-kv{font-size:11px;color:var(--fg-2,#888);margin-top:2px;}
.cap-pill{display:inline-block;font-size:11px;padding:2px 8px;border-radius:10px;background:#e3f2fd;border:1px solid #90caf9;color:#0d47a1;margin:2px;}
`;

export function render(intake) {
  let cfg = {};
  try { cfg = JSON.parse(intake.text || '{}'); } catch { cfg = {}; }

  const appId = cfg.appId || '';
  const appName = cfg.appName || '';
  const webDir = cfg.webDir || '';
  const server = cfg.server || {};
  const plugins = cfg.plugins ? Object.entries(cfg.plugins) : [];

  const coreRows = [
    appId ? `<tr><td><span class="cap-mono">appId</span></td><td><span class="cap-mono">${esc(appId)}</span></td></tr>` : '',
    appName ? `<tr><td><span class="cap-mono">appName</span></td><td><span class="cap-mono">${esc(appName)}</span></td></tr>` : '',
    webDir ? `<tr><td><span class="cap-mono">webDir</span></td><td><span class="cap-mono">${esc(webDir)}</span></td></tr>` : '',
    server.url ? `<tr><td><span class="cap-mono">server.url</span></td><td><span class="cap-mono">${esc(server.url)}</span></td></tr>` : '',
    server.hostname ? `<tr><td><span class="cap-mono">server.hostname</span></td><td><span class="cap-mono">${esc(server.hostname)}</span></td></tr>` : '',
  ].filter(Boolean).join('');

  const platformKeys = ['ios', 'android'];
  const platformRows = platformKeys.filter((p) => cfg[p]).map((p) => {
    const pc = cfg[p];
    const kv = Object.entries(pc).slice(0, 3).map(([k, v]) => `${esc(k)}: ${esc(JSON.stringify(v))}`).join(', ');
    return `<tr><td><span class="cap-mono">${p}</span></td><td style="font-size:12px">${esc(kv)}</td></tr>`;
  }).join('');

  const pluginsHtml = plugins.slice(0, 6).map(([name, conf]) => {
    const pairs = Object.entries(conf || {}).slice(0, 3).map(([k, v]) => `<span class="cap-pill">${esc(k)}: ${esc(String(v))}</span>`).join('');
    return `<div class="cap-plugin"><div class="cap-plugin-name">${esc(name)}</div>${pairs ? `<div class="cap-plugin-kv">${pairs}</div>` : ''}</div>`;
  }).join('');

  const morePlugins = plugins.length > 6 ? `<div style="font-size:12px;color:var(--fg-2,#888);margin-top:4px">…and ${plugins.length - 6} more</div>` : '';

  const host = document.createElement('div');
  host.className = 'cap-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="cap-title"><span class="badge-cap">Capacitor</span>${esc(appName || 'capacitor.config.json')}</div>
<div class="cap-sub">${esc(appId) || 'Capacitor mobile app config'}${webDir ? ` · webDir: ${esc(webDir)}` : ''}</div>
${coreRows ? `<div class="cap-sec"><h3>Configuration</h3><table class="cap-kv-table"><thead><tr><th>Key</th><th>Value</th></tr></thead><tbody>${coreRows}${platformRows}</tbody></table></div>` : ''}
${plugins.length ? `<div class="cap-sec"><h3>Plugins (${plugins.length})</h3><div class="cap-plugins">${pluginsHtml}${morePlugins}</div></div>` : ''}`;
  return { parentNode: host };
}
