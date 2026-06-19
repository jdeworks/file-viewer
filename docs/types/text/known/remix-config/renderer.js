const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.rmx-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-remix{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#121212;color:#fff;vertical-align:middle;margin-right:8px;border:1px solid #444}
.rmx-title{font-size:18px;font-weight:700;margin:0 0 4px}
.rmx-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px}
.rmx-sec{margin:12px 0}
.rmx-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.rmx-pills{display:flex;flex-wrap:wrap;gap:6px}
.rmx-pill{display:inline-flex;align-items:center;font-size:12px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.rmx-meta{display:flex;flex-wrap:wrap;gap:10px;margin:8px 0}
.rmx-kv{display:flex;gap:6px;align-items:baseline;font-size:13px;padding:4px 10px;border-radius:6px;background:var(--bg-2,#f6f8fa)}
.rmx-kv span:first-child{color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;letter-spacing:.04em}
.rmx-kv span:last-child{font-family:ui-monospace,monospace;font-weight:600}
`;

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const name = (intake.name || intake.filename || 'remix.config.js').split('/').pop();

  // App directory
  let appDirectory = null;
  const appDirM = /appDirectory\s*:\s*['"`]([^'"`]+)['"`]/.exec(text);
  if (appDirM) appDirectory = appDirM[1];

  // Routes directory (legacy)
  let routesDir = null;
  const routesDirM = /(?:routes|routesDirectory)\s*:\s*['"`]([^'"`]+)['"`]/.exec(text);
  if (routesDirM) routesDir = routesDirM[1];

  // Server build path
  let serverBuildPath = null;
  const sbpM = /serverBuildPath\s*:\s*['"`]([^'"`]+)['"`]/.exec(text);
  if (sbpM) serverBuildPath = sbpM[1];

  // Server mode
  let serverMode = null;
  const smM = /serverMode\s*:\s*['"`]([^'"`]+)['"`]/.exec(text);
  if (smM) serverMode = smM[1];

  // Dev server port
  let devPort = null;
  const devPortM = /(?:devServerPort|port)\s*:\s*(\d+)/.exec(text);
  if (devPortM) devPort = devPortM[1];

  // Future flags (v2_* keys or future: {})
  const futureFlags = [];
  const futureBlock = /future\s*:\s*\{([^}]+)\}/s.exec(text);
  if (futureBlock) {
    const ffRe = /\b(v2_\w+|unstable_\w+)\s*:\s*true/g;
    let fm;
    while ((fm = ffRe.exec(futureBlock[1])) !== null) futureFlags.push(fm[1]);
  }
  // Also catch top-level v2_ keys
  const topFfRe = /\b(v2_\w+)\s*:\s*true/g;
  let tfm;
  while ((tfm = topFfRe.exec(text)) !== null) {
    if (!futureFlags.includes(tfm[1])) futureFlags.push(tfm[1]);
  }

  // Tailwind / PostCSS
  const hasTailwind = /tailwind\s*:\s*true/.test(text);
  const hasPostcss = /postcss\s*:\s*true/.test(text);

  // Ignored route files
  const ignoredRouteFiles = [];
  const ignBlock = /ignoredRouteFiles\s*:\s*\[([^\]]+)\]/s.exec(text);
  if (ignBlock) {
    const ir = /['"`]([^'"`]+)['"`]/g;
    let im;
    while ((im = ir.exec(ignBlock[1])) !== null) ignoredRouteFiles.push(im[1]);
  }

  const metaItems = [
    appDirectory ? `<div class="rmx-kv"><span>App Dir</span><span>${esc(appDirectory)}</span></div>` : '',
    routesDir ? `<div class="rmx-kv"><span>Routes Dir</span><span>${esc(routesDir)}</span></div>` : '',
    serverBuildPath ? `<div class="rmx-kv"><span>Server Build</span><span>${esc(serverBuildPath)}</span></div>` : '',
    serverMode ? `<div class="rmx-kv"><span>Server Mode</span><span>${esc(serverMode)}</span></div>` : '',
    devPort ? `<div class="rmx-kv"><span>Dev Port</span><span>${esc(devPort)}</span></div>` : '',
    hasTailwind ? `<div class="rmx-kv"><span>Tailwind</span><span>enabled</span></div>` : '',
    hasPostcss ? `<div class="rmx-kv"><span>PostCSS</span><span>enabled</span></div>` : '',
  ].filter(Boolean).join('');

  const futureFlagsHtml = futureFlags.length
    ? `<div class="rmx-sec"><h3>Future Flags (${futureFlags.length})</h3><div class="rmx-pills">${futureFlags.map((f) => `<span class="rmx-pill">${esc(f)}</span>`).join('')}</div></div>`
    : '';

  const ignoredHtml = ignoredRouteFiles.length
    ? `<div class="rmx-sec"><h3>Ignored Route Files</h3><div class="rmx-pills">${ignoredRouteFiles.map((f) => `<span class="rmx-pill">${esc(f)}</span>`).join('')}</div></div>`
    : '';

  const metaHtml = metaItems
    ? `<div class="rmx-sec"><h3>Settings</h3><div class="rmx-meta">${metaItems}</div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'rmx-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="rmx-title"><span class="badge-remix">Remix</span>${esc(name)}</div>
<div class="rmx-sub">Remix framework configuration</div>
${metaHtml}${futureFlagsHtml}${ignoredHtml}`;
  return { parentNode: host };
}
