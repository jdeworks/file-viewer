const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.eas-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-eas{display:inline-block;background:#4630EB;color:#fff;padding:2px 9px;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:.04em;margin-bottom:10px;}
.eas-title{font-size:18px;font-weight:700;margin:0 0 12px;}
.eas-sec{margin:12px 0;}
.eas-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.eas-profiles{display:flex;flex-direction:column;gap:8px;}
.eas-profile{border:1px solid var(--border,#d1d9e0);border-radius:6px;padding:10px 14px;}
.eas-profile-name{font-weight:700;font-size:13px;margin:0 0 6px;}
.eas-grid{display:grid;grid-template-columns:max-content 1fr;gap:3px 16px;}
.eas-k{font-size:12px;color:var(--fg-2,#888);}
.eas-v{font:12px ui-monospace,monospace;}
.eas-platform{display:flex;gap:8px;margin-top:6px;flex-wrap:wrap;}
.eas-plat-block{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#d1d9e0);border-radius:4px;padding:4px 10px;}
.eas-plat-label{font-size:11px;font-weight:700;text-transform:uppercase;color:var(--fg-2,#888);margin-bottom:3px;}
.eas-kv2{display:grid;grid-template-columns:max-content 1fr;gap:2px 10px;}
.eas-k2{font-size:11px;color:var(--fg-2,#888);}
.eas-v2{font:11px ui-monospace,monospace;}
`;

function renderPlatformBlock(label, platCfg) {
  if (!platCfg || typeof platCfg !== 'object') return '';
  const rows = [];
  const interesting = ['buildType', 'distribution', 'channel', 'releaseChannel', 'simulator', 'image', 'resourceClass', 'autoIncrement', 'buildConfiguration', 'gradleCommand'];
  for (const key of interesting) {
    if (platCfg[key] != null) {
      const val = typeof platCfg[key] === 'object' ? JSON.stringify(platCfg[key]) : String(platCfg[key]);
      rows.push(`<span class="eas-k2">${esc(key)}</span><span class="eas-v2">${esc(val)}</span>`);
    }
  }
  if (!rows.length) return '';
  return `<div class="eas-plat-block">
<div class="eas-plat-label">${esc(label)}</div>
<div class="eas-kv2">${rows.join('')}</div>
</div>`;
}

function renderProfile(name, profile) {
  const topKeys = ['distribution', 'channel', 'releaseChannel', 'autoIncrement', 'image', 'resourceClass'];
  const topRows = [];
  for (const key of topKeys) {
    if (profile[key] != null) {
      const val = typeof profile[key] === 'object' ? JSON.stringify(profile[key]) : String(profile[key]);
      topRows.push(`<span class="eas-k">${esc(key)}</span><span class="eas-v">${esc(val)}</span>`);
    }
  }
  const iosBlock = renderPlatformBlock('iOS', profile.ios);
  const androidBlock = renderPlatformBlock('Android', profile.android);

  return `<div class="eas-profile">
<div class="eas-profile-name">${esc(name)}</div>
${topRows.length ? `<div class="eas-grid">${topRows.join('')}</div>` : ''}
${(iosBlock || androidBlock) ? `<div class="eas-platform">${iosBlock}${androidBlock}</div>` : ''}
</div>`;
}

export function render(intake) {
  let cfg = {};
  try { cfg = JSON.parse(intake.text || '{}'); } catch { cfg = {}; }

  const cliVersion = cfg.cli?.version || '';
  const buildProfiles = cfg.build || {};
  const submitProfiles = cfg.submit || {};
  const buildProfileNames = Object.keys(buildProfiles);
  const submitProfileNames = Object.keys(submitProfiles);

  const host = document.createElement('div');
  host.className = 'eas-doc';

  let html = `<style>${CSS}</style>
<span class="badge-eas">EAS</span>
<div class="eas-title">eas.json</div>
${cliVersion ? `<div style="font:12px ui-monospace,monospace;color:var(--fg-2);margin-bottom:10px">cli.version: ${esc(cliVersion)}</div>` : ''}`;

  if (buildProfileNames.length) {
    html += `<div class="eas-sec"><h3>Build profiles (${buildProfileNames.length})</h3><div class="eas-profiles">`;
    html += buildProfileNames.map((n) => renderProfile(n, buildProfiles[n] || {})).join('');
    html += '</div></div>';
  }

  if (submitProfileNames.length) {
    html += `<div class="eas-sec"><h3>Submit profiles (${submitProfileNames.length})</h3><div class="eas-profiles">`;
    html += submitProfileNames.map((n) => renderProfile(n, submitProfiles[n] || {})).join('');
    html += '</div></div>';
  }

  if (!buildProfileNames.length && !submitProfileNames.length) {
    html += `<p style="color:var(--fg-2);font-style:italic;font-size:12px">No build or submit profiles configured.</p>`;
  }

  host.innerHTML = html;
  return { parentNode: host };
}
