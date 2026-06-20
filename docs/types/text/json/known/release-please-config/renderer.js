const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.relpls-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-relpls{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1a73e8;color:#fff;vertical-align:middle;margin-right:8px;}
.relpls-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.relpls-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.relpls-sec{margin:14px 0;}
.relpls-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.relpls-pills{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0;}
.relpls-pill{display:inline-flex;align-items:center;font-size:12px;padding:2px 8px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.relpls-pill.on{background:#e8f0fe;border-color:#aecbfa;color:#1a4c8b;}
.relpls-pill.off{background:#fef2f2;border-color:#fecaca;color:#991b1b;}
.relpls-pill.type{background:#f0fdf4;border-color:#bbf7d0;color:#166534;}
.relpls-pill.hidden{background:var(--bg-2,#f6f8fa);color:var(--fg-2,#888);text-decoration:line-through;}
.relpls-table{width:100%;border-collapse:collapse;font-size:13px;margin-top:4px;}
.relpls-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.relpls-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:middle;}
.relpls-mono{font:12px/1.4 ui-monospace,monospace;}
`;

export function render(intake) {
  let cfg;
  try {
    cfg = intake.parsed || JSON.parse(intake.text || '{}');
  } catch {
    return { parentNode: Object.assign(document.createElement('div'), { textContent: 'Invalid release-please-config.json.' }) };
  }

  const releaseType = cfg['release-type'] || '';
  const bumpMinor = cfg['bump-minor-pre-major'];
  const bumpPatch = cfg['bump-patch-for-minor-pre-major'];
  const draft = cfg['draft'];
  const prerelease = cfg['prerelease'];
  const changelogSections = Array.isArray(cfg['changelog-sections']) ? cfg['changelog-sections'] : [];
  const packages = cfg['packages'] && typeof cfg['packages'] === 'object' ? cfg['packages'] : null;

  const host = document.createElement('div');
  host.className = 'relpls-doc';

  // Bool chip helper
  const boolChip = (label, val) => {
    if (val === undefined || val === null) return '';
    const cls = val ? 'on' : 'off';
    const symbol = val ? '✓' : '✗';
    return `<span class="relpls-pill ${cls}">${symbol} ${esc(label)}</span>`;
  };

  // Settings card
  const settingPills = [
    releaseType ? `<span class="relpls-pill type">${esc(releaseType)}</span>` : '',
    boolChip('bump-minor-pre-major', bumpMinor),
    boolChip('bump-patch-for-minor-pre-major', bumpPatch),
    boolChip('draft', draft),
    boolChip('prerelease', prerelease),
  ].filter(Boolean).join('');

  const settingsHtml = settingPills
    ? `<div class="relpls-sec"><h3>Settings</h3><div class="relpls-pills">${settingPills}</div></div>`
    : '';

  // Packages table
  let packagesHtml = '';
  if (packages) {
    const pkgEntries = Object.entries(packages);
    if (pkgEntries.length) {
      const rows = pkgEntries.map(([path, pkg]) => {
        const rt = pkg['release-type'] || releaseType || '';
        const component = pkg['component'] || '';
        const changelogPath = pkg['changelog-path'] || '';
        return `<tr>
  <td class="relpls-mono">${esc(path)}</td>
  <td>${rt ? `<span class="relpls-pill type">${esc(rt)}</span>` : ''}</td>
  <td>${esc(component)}</td>
  <td class="relpls-mono" style="font-size:11px;color:var(--fg-2,#888)">${esc(changelogPath)}</td>
</tr>`;
      }).join('');
      packagesHtml = `<div class="relpls-sec"><h3>Packages (${pkgEntries.length})</h3>
<table class="relpls-table">
  <thead><tr><th>Path</th><th>Release type</th><th>Component</th><th>Changelog</th></tr></thead>
  <tbody>${rows}</tbody>
</table></div>`;
    }
  }

  // Changelog sections table
  let changelogHtml = '';
  if (changelogSections.length) {
    const rows = changelogSections.map((s) => {
      const hidden = s.hidden === true;
      return `<tr>
  <td class="relpls-mono">${esc(s.type || '')}</td>
  <td>${esc(s.section || '')}</td>
  <td>${hidden ? '<span class="relpls-pill hidden">hidden</span>' : '<span class="relpls-pill on">shown</span>'}</td>
</tr>`;
    }).join('');
    changelogHtml = `<div class="relpls-sec"><h3>Changelog sections (${changelogSections.length})</h3>
<table class="relpls-table">
  <thead><tr><th>Type</th><th>Section</th><th>Visibility</th></tr></thead>
  <tbody>${rows}</tbody>
</table></div>`;
  }

  const pkgCount = packages ? Object.keys(packages).length : 0;
  const subtitle = [
    releaseType ? `release-type: ${releaseType}` : '',
    pkgCount ? `${pkgCount} package${pkgCount !== 1 ? 's' : ''}` : '',
    changelogSections.length ? `${changelogSections.length} changelog section${changelogSections.length !== 1 ? 's' : ''}` : '',
  ].filter(Boolean).join(' · ');

  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-relpls">Release Please</span>
  <span class="relpls-title">release-please-config.json</span>
  ${releaseType ? `<span class="relpls-pill type" style="margin:0">${esc(releaseType)}</span>` : ''}
</div>
<div class="relpls-sub">${subtitle || 'Automated changelog and release management'}</div>
${settingsHtml}
${packagesHtml}
${changelogHtml}`;

  return { parentNode: host };
}
