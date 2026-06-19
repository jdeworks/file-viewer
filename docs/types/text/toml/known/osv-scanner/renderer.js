import { parseTOML } from '../../toml.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.osv-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.osv-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1d4ed8;color:#fff;vertical-align:middle;margin-right:8px;}
.osv-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.osv-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.osv-sec{margin:12px 0;}
.osv-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.osv-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin:0 0 10px;}
.osv-vuln-id{font:12px/1.4 ui-monospace,monospace;font-weight:700;color:var(--fg,#24292f);}
.osv-reason{font-size:12px;color:var(--fg-2,#888);margin:2px 0;}
.osv-until{font-size:11px;font-family:ui-monospace,monospace;color:var(--fg-2,#888);}
.osv-kv{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;font-size:13px;margin:6px 0;}
.osv-k{font:12px/1.6 ui-monospace,monospace;color:var(--fg-2,#888);}
.osv-v{font:12px/1.6 ui-monospace,monospace;font-weight:600;}
.osv-more{font-size:12px;color:var(--fg-2,#888);padding:4px 0;}
`;

export function render(intake) {
  let cfg = {};
  try { cfg = parseTOML(intake.text || '') || {}; } catch { cfg = {}; }

  const ignoreVulns = Array.isArray(cfg.IgnoreVulns) ? cfg.IgnoreVulns : [];
  const goVersionOverride = cfg.GoVersionOverride || null;
  const maven = cfg.Maven || cfg.maven || null;
  const scanMode = cfg.ScanMode || cfg['scan-mode'] || null;
  const offlineMode = cfg.OfflineMode !== undefined ? cfg.OfflineMode : (cfg['offline-mode'] !== undefined ? cfg['offline-mode'] : null);

  const DISPLAY_MAX = 25;
  const displayVulns = ignoreVulns.slice(0, DISPLAY_MAX);

  const vulnsHtml = displayVulns.map((v) => {
    const id = v.id || v.ID || '(no id)';
    const reason = v.reason || v.Reason || '';
    const ignoreUntil = v.ignoreUntil || v.IgnoreUntil || '';

    return `<div class="osv-card">
  <div class="osv-vuln-id">${esc(id)}</div>
  ${reason ? `<div class="osv-reason">${esc(reason)}</div>` : ''}
  ${ignoreUntil ? `<div class="osv-until">Ignore until: ${esc(String(ignoreUntil))}</div>` : ''}
</div>`;
  }).join('');

  const moreHtml = ignoreVulns.length > DISPLAY_MAX
    ? `<div class="osv-more">…and ${ignoreVulns.length - DISPLAY_MAX} more ignored vuln${ignoreVulns.length - DISPLAY_MAX !== 1 ? 's' : ''}</div>`
    : '';

  const ignoreHtml = ignoreVulns.length
    ? `<div class="osv-sec"><h3>Ignored vulnerabilities (${ignoreVulns.length})</h3>${vulnsHtml}${moreHtml}</div>`
    : '';

  // Maven settings
  const mavenRows = [];
  if (maven) {
    const repos = Array.isArray(maven.registries) ? maven.registries : (Array.isArray(maven.Registries) ? maven.Registries : []);
    if (repos.length) mavenRows.push(`<span class="osv-k">registries</span><span class="osv-v">${repos.length}</span>`);
    const offline = maven.offline !== undefined ? maven.offline : maven.Offline;
    if (offline !== undefined) mavenRows.push(`<span class="osv-k">offline</span><span class="osv-v">${esc(String(offline))}</span>`);
  }

  const mavenHtml = mavenRows.length
    ? `<div class="osv-sec"><h3>Maven settings</h3><div class="osv-card"><div class="osv-kv">${mavenRows.join('')}</div></div></div>`
    : '';

  // General settings
  const settingsRows = [
    goVersionOverride && `<span class="osv-k">GoVersionOverride</span><span class="osv-v">${esc(goVersionOverride)}</span>`,
    scanMode && `<span class="osv-k">ScanMode</span><span class="osv-v">${esc(scanMode)}</span>`,
    offlineMode !== null && offlineMode !== undefined && `<span class="osv-k">OfflineMode</span><span class="osv-v">${esc(String(offlineMode))}</span>`,
  ].filter(Boolean);

  const settingsHtml = settingsRows.length
    ? `<div class="osv-sec"><h3>Settings</h3><div class="osv-card"><div class="osv-kv">${settingsRows.join('')}</div></div></div>`
    : '';

  const subParts = [
    ignoreVulns.length ? `${ignoreVulns.length} ignored vuln${ignoreVulns.length !== 1 ? 's' : ''}` : 'No ignored vulns',
    goVersionOverride ? `Go ${goVersionOverride}` : '',
    scanMode ? `mode: ${scanMode}` : '',
  ].filter(Boolean);

  const host = document.createElement('div');
  host.className = 'osv-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="osv-title"><span class="osv-badge">OSV-Scanner</span>OSV-Scanner config</div>
<div class="osv-sub">${esc(subParts.join(' · ') || 'OSV-Scanner vulnerability scanner configuration')}</div>
${ignoreHtml}${settingsHtml}${mavenHtml}`;

  return { parentNode: host };
}
