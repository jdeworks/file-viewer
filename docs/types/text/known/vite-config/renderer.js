const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.vcfg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-vite{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#646cff;color:#fff;vertical-align:middle;margin-right:8px}
.vcfg-title{font-size:18px;font-weight:700;margin:0 0 4px}
.vcfg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px}
.vcfg-sec{margin:12px 0}
.vcfg-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.vcfg-pills{display:flex;flex-wrap:wrap;gap:6px}
.vcfg-pill{display:inline-flex;align-items:center;font-size:12px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.vcfg-meta{display:flex;flex-wrap:wrap;gap:10px;margin:8px 0}
.vcfg-kv{display:flex;gap:6px;align-items:baseline;font-size:13px;padding:4px 10px;border-radius:6px;background:var(--bg-2,#f6f8fa)}
.vcfg-kv span:first-child{color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;letter-spacing:.04em}
.vcfg-kv span:last-child{font-family:ui-monospace,monospace;font-weight:600;color:var(--accent,#646cff)}
`;

const KNOWN_PLUGINS = [
  'react', 'vue', 'svelte', 'solid', 'qwik', 'preact', 'lit', 'angular',
  'deno', 'vitesse', 'unocss', 'windicss', 'tailwind', 'icons', 'pages',
  'layouts', 'components', 'inspect', 'checker', 'sentry', 'pwa',
  'legacy', 'imagemin', 'compress', 'visualizer',
];

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const name = (intake.name || intake.filename || 'vite.config.js').split('/').pop();

  // Detect plugins by looking for function calls like react(), vue(), etc.
  const pluginMatches = new Set();
  for (const p of KNOWN_PLUGINS) {
    if (new RegExp(`\\b${p}\\s*\\(`, 'i').test(text)) pluginMatches.add(p);
  }
  // Also look for import statements referencing known plugin packages
  const importRe = /from\s+['"]([^'"]+)['"]/g;
  let m;
  while ((m = importRe.exec(text)) !== null) {
    const pkg = m[1];
    for (const p of KNOWN_PLUGINS) {
      if (pkg.toLowerCase().includes(p)) pluginMatches.add(p);
    }
  }

  // Extract build target
  let target = null;
  const targetM = /build\s*:\s*\{[^}]*target\s*:\s*['"`]([^'"`]+)['"`]/s.exec(text);
  if (targetM) target = targetM[1];

  // Extract server port
  let port = null;
  const portM = /server\s*:\s*\{[^}]*port\s*:\s*(\d+)/s.exec(text);
  if (portM) port = portM[1];

  // Extract base URL
  let base = null;
  const baseM = /\bbase\s*:\s*['"`]([^'"`]+)['"`]/.exec(text);
  if (baseM && baseM[1] !== '/') base = baseM[1];

  // Extract outDir
  let outDir = null;
  const outM = /outDir\s*:\s*['"`]([^'"`]+)['"`]/.exec(text);
  if (outM) outDir = outM[1];

  const plugins = [...pluginMatches];

  const metaItems = [
    target ? `<div class="vcfg-kv"><span>Target</span><span>${esc(target)}</span></div>` : '',
    port ? `<div class="vcfg-kv"><span>Dev Port</span><span>${esc(port)}</span></div>` : '',
    base ? `<div class="vcfg-kv"><span>Base URL</span><span>${esc(base)}</span></div>` : '',
    outDir ? `<div class="vcfg-kv"><span>Out Dir</span><span>${esc(outDir)}</span></div>` : '',
  ].filter(Boolean).join('');

  const pluginsHtml = plugins.length
    ? `<div class="vcfg-sec"><h3>Plugins (${plugins.length})</h3><div class="vcfg-pills">${plugins.map((p) => `<span class="vcfg-pill">${esc(p)}</span>`).join('')}</div></div>`
    : '';

  const metaHtml = metaItems
    ? `<div class="vcfg-sec"><h3>Settings</h3><div class="vcfg-meta">${metaItems}</div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'vcfg-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="vcfg-title"><span class="badge-vite">Vite</span>${esc(name)}</div>
<div class="vcfg-sub">Vite build configuration</div>
${pluginsHtml}${metaHtml}`;
  return { parentNode: host };
}
