const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.exp-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-exp{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#000;color:#fff;vertical-align:middle;margin-right:8px;}
.exp-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.exp-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.exp-sec{margin:12px 0;}
.exp-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.exp-grid{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;margin:8px 0;}
.exp-key{font-size:12px;color:var(--fg-2,#888);}
.exp-val{font:12px ui-monospace,monospace;color:var(--accent,#0969da);}
.exp-pill{display:inline-block;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:4px;padding:2px 8px;font:12px ui-monospace,monospace;margin:2px;}
`;

export function render(intake) {
  let cfg = {};
  try { cfg = JSON.parse(intake.text || '{}'); } catch { cfg = {}; }
  const expo = cfg.expo || {};

  const name = expo.name || '';
  const slug = expo.slug || '';
  const version = expo.version || '';
  const sdkVersion = expo.sdkVersion || '';
  const platforms = Array.isArray(expo.platforms) ? expo.platforms : [];
  const orientation = expo.orientation || '';
  const iosBundleId = expo.ios?.bundleIdentifier || '';
  const androidPackage = expo.android?.package || '';

  const host = document.createElement('div');
  host.className = 'exp-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="exp-title"><span class="badge-exp">Expo</span>${esc(name || 'app.json')}</div>
<div class="exp-sub">${slug ? `@${esc(slug)}` : 'Expo React Native app config'}</div>
<div class="exp-sec"><div class="exp-grid">
${version ? `<span class="exp-key">Version</span><span class="exp-val">${esc(version)}</span>` : ''}
${sdkVersion ? `<span class="exp-key">SDK version</span><span class="exp-val">${esc(sdkVersion)}</span>` : ''}
${orientation ? `<span class="exp-key">Orientation</span><span class="exp-val">${esc(orientation)}</span>` : ''}
${iosBundleId ? `<span class="exp-key">iOS bundle</span><span class="exp-val">${esc(iosBundleId)}</span>` : ''}
${androidPackage ? `<span class="exp-key">Android pkg</span><span class="exp-val">${esc(androidPackage)}</span>` : ''}
</div></div>
${platforms.length ? `<div class="exp-sec"><h3>Platforms</h3><div>${platforms.map((p) => `<span class="exp-pill">${esc(p)}</span>`).join('')}</div></div>` : ''}`;
  return { parentNode: host };
}
