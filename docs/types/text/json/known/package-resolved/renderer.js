const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.pkgr-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-swift{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#f05138;color:#fff;vertical-align:middle;margin-right:8px}
.pkgr-title{font-size:18px;font-weight:700;margin:0 0 4px}
.pkgr-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px}
.pkgr-sec{margin:12px 0}
.pkgr-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.pkgr-list{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:4px}
.pkgr-item{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:baseline;padding:5px 10px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0)}
.pkgr-name{font:13px/1 ui-monospace,monospace;font-weight:600;color:var(--accent,#0969da)}
.pkgr-url{font-size:11px;color:var(--fg-2,#888);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;grid-column:1;margin-top:1px}
.pkgr-ver{font:12px ui-monospace,monospace;color:var(--fg-2,#888);white-space:nowrap;grid-row:1}
.pkgr-stats{display:flex;gap:10px;margin:0 0 12px;flex-wrap:wrap}
.pkgr-stat{display:flex;flex-direction:column;align-items:center;padding:8px 16px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);min-width:70px}
.pkgr-stat-n{font-size:22px;font-weight:700}
.pkgr-stat-l{font-size:11px;color:var(--fg-2,#888);text-transform:uppercase;letter-spacing:.04em}
`;

export function render(intake) {
  let data = {};
  try { data = JSON.parse(new TextDecoder().decode(intake.bytes)); } catch { data = {}; }

  const fileVersion = data.version ?? '?';

  // v1: { object: { pins: [...] } }
  // v2: { pins: [...], version: 2 }
  let pins = [];
  if (Array.isArray(data.pins)) {
    pins = data.pins;
  } else if (data.object && Array.isArray(data.object.pins)) {
    pins = data.object.pins;
  }

  // Normalize pins across v1 and v2 formats
  const normalizedPins = pins.map((pin) => {
    // v2 format
    if (pin.identity) {
      const state = pin.state || {};
      return {
        name: pin.identity,
        url: pin.location || '',
        version: state.version || state.branch || state.revision?.slice(0, 8) || '?',
      };
    }
    // v1 format: { package: { name, repositoryURL, state: { version, branch } } }
    const pkg = pin.package || pin;
    const state = pkg.state || {};
    return {
      name: pkg.name || pin.name || '?',
      url: pkg.repositoryURL || pin.location || '',
      version: state.version || state.branch || (state.revision || '').slice(0, 8) || '?',
    };
  });

  const host = document.createElement('div');
  host.className = 'pkgr-doc';

  let html = `<style>${CSS}</style>
<div class="pkgr-title"><span class="badge-swift">Swift</span>Package.resolved</div>
<div class="pkgr-sub">Swift Package Manager lock file · format version ${esc(fileVersion)}</div>`;

  html += `<div class="pkgr-stats"><div class="pkgr-stat"><span class="pkgr-stat-n">${normalizedPins.length}</span><span class="pkgr-stat-l">Pinned</span></div></div>`;

  if (normalizedPins.length) {
    html += `<div class="pkgr-sec"><h3>Pinned Packages</h3><ul class="pkgr-list">`;
    for (const p of normalizedPins) {
      html += `<li class="pkgr-item">
        <span class="pkgr-name">${esc(p.name)}</span>
        <span class="pkgr-ver">${esc(p.version)}</span>
        ${p.url ? `<span class="pkgr-url">${esc(p.url)}</span>` : ''}
      </li>`;
    }
    html += `</ul></div>`;
  }

  host.innerHTML = html;
  return { parentNode: host };
}
