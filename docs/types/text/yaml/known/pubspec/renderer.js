import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.pubspec-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.pubspec-badges{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;}
.pubspec-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;letter-spacing:.04em;color:#fff;}
.pubspec-badge-dart{background:#0175C2;}
.pubspec-badge-flutter{background:#54C5F8;color:#000;}
.pubspec-name{font-size:20px;font-weight:700;margin:4px 0;}
.pubspec-version{font-size:14px;font-weight:400;color:var(--fg-2,#888);margin-left:8px;}
.pubspec-desc{color:var(--fg-2,#888);margin:4px 0 12px;}
.pubspec-chips{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;}
.pubspec-chip{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:4px;padding:2px 8px;font:12px ui-monospace,monospace;}
.pubspec-publish{font-size:12px;color:var(--fg-2,#888);margin-bottom:12px;}
.pubspec-sec{margin:12px 0;}
.pubspec-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 4px;}
.pubspec-deps{list-style:none;margin:0;padding:0;}
.pubspec-dep{display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:3px 0;border-bottom:1px solid var(--border,#e0e0e0);}
.pubspec-dep-name{color:var(--accent,#0175C2);font:12px ui-monospace,monospace;}
.pubspec-dep-ver{color:var(--fg-2,#888);font:12px ui-monospace,monospace;}
.pubspec-dep-git{font-size:11px;color:var(--fg-2,#888);font-style:italic;}
.pubspec-pills{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;}
.pubspec-pill{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:12px;padding:2px 9px;font:12px ui-monospace,monospace;}
`;

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  const name = cfg.name || '(unnamed)';
  const desc = cfg.description || '';
  const version = cfg.version || '';
  const publishTo = cfg.publish_to;
  const isFlutter = !!(cfg.flutter || (cfg.dependencies && cfg.dependencies.flutter));
  const env = cfg.environment || {};
  const sdkConstraint = env.sdk || null;
  const flutterConstraint = env.flutter || null;

  // Dependencies
  const deps = cfg.dependencies && typeof cfg.dependencies === 'object'
    ? Object.entries(cfg.dependencies) : [];
  const devDeps = cfg.dev_dependencies && typeof cfg.dev_dependencies === 'object'
    ? Object.entries(cfg.dev_dependencies) : [];

  // Flutter section
  const flutterSection = cfg.flutter && typeof cfg.flutter === 'object' ? cfg.flutter : null;
  const assets = flutterSection && Array.isArray(flutterSection.assets) ? flutterSection.assets : [];
  const fonts = flutterSection && Array.isArray(flutterSection.fonts) ? flutterSection.fonts : [];

  function renderDep([depName, val]) {
    if (val && typeof val === 'object' && val.git) {
      const url = val.git.url || val.git || '';
      const ref = val.git.ref || val.git.tag || '';
      return `<li class="pubspec-dep">
        <span class="pubspec-dep-name">${esc(depName)}</span>
        <span class="pubspec-dep-git">git: ${esc(url)}${ref ? ' @ ' + esc(ref) : ''}</span>
      </li>`;
    }
    if (val && typeof val === 'object' && val.sdk) {
      return `<li class="pubspec-dep">
        <span class="pubspec-dep-name">${esc(depName)}</span>
        <span class="pubspec-dep-ver">sdk: ${esc(val.sdk)}</span>
      </li>`;
    }
    if (val && typeof val === 'object' && val.path) {
      return `<li class="pubspec-dep">
        <span class="pubspec-dep-name">${esc(depName)}</span>
        <span class="pubspec-dep-ver">path: ${esc(val.path)}</span>
      </li>`;
    }
    const verStr = val == null ? 'any' : String(val);
    return `<li class="pubspec-dep">
      <span class="pubspec-dep-name">${esc(depName)}</span>
      <span class="pubspec-dep-ver">${esc(verStr)}</span>
    </li>`;
  }

  const badgesHtml = `<div class="pubspec-badges">
    <span class="pubspec-badge pubspec-badge-dart">Dart</span>
    ${isFlutter ? '<span class="pubspec-badge pubspec-badge-flutter">Flutter</span>' : ''}
  </div>`;

  const chipsHtml = (sdkConstraint || flutterConstraint) ? `<div class="pubspec-chips">
    ${sdkConstraint ? `<span class="pubspec-chip">Dart SDK: ${esc(sdkConstraint)}</span>` : ''}
    ${flutterConstraint ? `<span class="pubspec-chip">Flutter SDK: ${esc(flutterConstraint)}</span>` : ''}
  </div>` : '';

  const publishHtml = publishTo
    ? `<div class="pubspec-publish">publish_to: <code>${esc(publishTo)}</code></div>` : '';

  const shown20 = deps.slice(0, 20);
  const depsHtml = shown20.length
    ? `<div class="pubspec-sec"><h3>Dependencies (${deps.length})</h3><ul class="pubspec-deps">${shown20.map(renderDep).join('')}</ul>${deps.length > 20 ? `<p style="font-size:12px;color:var(--fg-2,#888);margin:4px 0 0">… and ${deps.length - 20} more</p>` : ''}</div>`
    : '';

  const shown10dev = devDeps.slice(0, 10);
  const devDepsHtml = shown10dev.length
    ? `<div class="pubspec-sec"><h3>Dev Dependencies (${devDeps.length})</h3><ul class="pubspec-deps">${shown10dev.map(renderDep).join('')}</ul>${devDeps.length > 10 ? `<p style="font-size:12px;color:var(--fg-2,#888);margin:4px 0 0">… and ${devDeps.length - 10} more</p>` : ''}</div>`
    : '';

  const shown10assets = assets.slice(0, 10);
  const assetsHtml = shown10assets.length
    ? `<div class="pubspec-sec"><h3>Assets (${assets.length})</h3><div class="pubspec-pills">${shown10assets.map((a) => `<span class="pubspec-pill">${esc(String(a))}</span>`).join('')}${assets.length > 10 ? `<span class="pubspec-pill">+${assets.length - 10} more</span>` : ''}</div></div>`
    : '';

  const fontsHtml = fonts.length
    ? `<div class="pubspec-sec"><h3>Fonts (${fonts.length})</h3><div class="pubspec-pills">${fonts.slice(0, 10).map((f) => `<span class="pubspec-pill">${esc(f.family || JSON.stringify(f))}</span>`).join('')}</div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'pubspec-doc';
  host.innerHTML = `<style>${CSS}</style>
${badgesHtml}
<div class="pubspec-name">${esc(name)}${version ? `<span class="pubspec-version">${esc(version)}</span>` : ''}</div>
${desc ? `<div class="pubspec-desc">${esc(desc)}</div>` : ''}
${chipsHtml}
${publishHtml}
${depsHtml}
${devDepsHtml}
${flutterSection ? assetsHtml + fontsHtml : ''}`;

  return { parentNode: host };
}
