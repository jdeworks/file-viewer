const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.vcpkg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-vcpkg{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1a4a7a;color:#fff;vertical-align:middle;margin-right:8px}
.vcpkg-title{font-size:18px;font-weight:700;margin:0 0 4px}
.vcpkg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px}
.vcpkg-meta{font-size:13px;color:var(--fg-2,#888);margin:2px 0}
.vcpkg-sec{margin:12px 0}
.vcpkg-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.vcpkg-list{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:4px}
.vcpkg-item{display:flex;align-items:baseline;gap:8px;padding:4px 8px;border-radius:6px;background:var(--bg-2,#f6f8fa);flex-wrap:wrap}
.vcpkg-name{font:13px/1 ui-monospace,monospace;font-weight:600;color:var(--accent,#0969da)}
.vcpkg-ver{font:11px ui-monospace,monospace;padding:1px 6px;border-radius:8px;background:#dbeafe;border:1px solid #93c5fd;color:#1e40af}
.vcpkg-feat{font:11px ui-monospace,monospace;padding:1px 5px;border-radius:8px;background:#fef3c7;border:1px solid #fcd34d;color:#92400e}
.vcpkg-pills{display:flex;flex-wrap:wrap;gap:6px}
.vcpkg-pill{display:inline-flex;align-items:center;font-size:12px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.vcpkg-desc{font-size:12px;color:var(--fg-2,#888)}
`;

export function render(intake) {
  let cfg = {};
  try { cfg = JSON.parse(intake.text || '{}'); } catch { /* malformed JSON */ }

  const name = cfg.name || null;
  const version = cfg.version || cfg['version-semver'] || cfg['version-string'] || cfg['version-date'] || null;
  const description = Array.isArray(cfg.description) ? cfg.description.join(' ') : (cfg.description || null);
  const dependencies = Array.isArray(cfg.dependencies) ? cfg.dependencies : [];
  const features = cfg.features && typeof cfg.features === 'object' ? cfg.features : null;
  const defaultFeatures = Array.isArray(cfg['default-features']) ? cfg['default-features'] : [];
  const overrides = Array.isArray(cfg.overrides) ? cfg.overrides : [];
  const supports = cfg.supports || null;

  // Normalize a dependency entry to { name, version, features, platform }
  const normDep = (d) => {
    if (typeof d === 'string') return { name: d, version: null, features: [], platform: null };
    return {
      name: d.name || '?',
      version: d['version>'] ? `>=${d['version>']}` : (d['version>='] ? `>=${d['version>=']}` : null),
      features: Array.isArray(d.features) ? d.features : [],
      platform: d.platform || null,
    };
  };

  const host = document.createElement('div');
  host.className = 'vcpkg-doc';

  let html = `<style>${CSS}</style>`;
  html += `<div class="vcpkg-title"><span class="badge-vcpkg">vcpkg</span>${esc(name || 'vcpkg.json')}</div>`;
  html += `<div class="vcpkg-sub">vcpkg C++ package manifest</div>`;
  if (version) html += `<div class="vcpkg-meta">Version: <strong>${esc(version)}</strong></div>`;
  if (description) html += `<div class="vcpkg-meta">${esc(description)}</div>`;

  if (supports) {
    html += `<div class="vcpkg-meta" style="margin-top:4px">Supports: <code style="font-size:12px">${esc(supports)}</code></div>`;
  }

  if (defaultFeatures.length) {
    html += `<div class="vcpkg-sec"><h3>Default Features</h3><div class="vcpkg-pills">${defaultFeatures.map((f) => `<span class="vcpkg-pill">${esc(f)}</span>`).join('')}</div></div>`;
  }

  if (dependencies.length) {
    const deps = dependencies.map(normDep);
    html += `<div class="vcpkg-sec"><h3>Dependencies (${deps.length})</h3><ul class="vcpkg-list">`;
    for (const d of deps) {
      html += `<li class="vcpkg-item"><span class="vcpkg-name">${esc(d.name)}</span>`;
      if (d.version) html += `<span class="vcpkg-ver">${esc(d.version)}</span>`;
      if (d.features.length) d.features.forEach((f) => { html += `<span class="vcpkg-feat">${esc(f)}</span>`; });
      if (d.platform) html += `<span class="vcpkg-desc">(${esc(d.platform)})</span>`;
      html += '</li>';
    }
    html += '</ul></div>';
  }

  if (features) {
    const featKeys = Object.keys(features);
    if (featKeys.length) {
      html += `<div class="vcpkg-sec"><h3>Features (${featKeys.length})</h3><ul class="vcpkg-list">`;
      for (const key of featKeys) {
        const f = features[key];
        const desc = typeof f === 'object' ? (Array.isArray(f.description) ? f.description.join(' ') : (f.description || '')) : '';
        const fdeps = typeof f === 'object' && Array.isArray(f.dependencies) ? f.dependencies.map(normDep) : [];
        html += `<li class="vcpkg-item"><span class="vcpkg-name">${esc(key)}</span>`;
        if (desc) html += `<span class="vcpkg-desc">${esc(desc)}</span>`;
        if (fdeps.length) html += `<span class="vcpkg-desc">(deps: ${fdeps.map((d) => esc(d.name)).join(', ')})</span>`;
        html += '</li>';
      }
      html += '</ul></div>';
    }
  }

  if (overrides.length) {
    html += `<div class="vcpkg-sec"><h3>Overrides (${overrides.length})</h3><ul class="vcpkg-list">`;
    for (const o of overrides) {
      const oname = typeof o === 'string' ? o : (o.name || '?');
      const over = typeof o === 'object' ? (o.version || o['version-semver'] || null) : null;
      html += `<li class="vcpkg-item"><span class="vcpkg-name">${esc(oname)}</span>`;
      if (over) html += `<span class="vcpkg-ver">${esc(over)}</span>`;
      html += '</li>';
    }
    html += '</ul></div>';
  }

  host.innerHTML = html;
  return { parentNode: host };
}
