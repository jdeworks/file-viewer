const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.astro-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-astro{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#ff5d01;color:#fff;vertical-align:middle;margin-right:8px}
.astro-title{font-size:18px;font-weight:700;margin:0 0 4px}
.astro-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px}
.astro-sec{margin:12px 0}
.astro-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.astro-pills{display:flex;flex-wrap:wrap;gap:6px}
.astro-pill{display:inline-flex;align-items:center;font-size:12px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.astro-meta{display:flex;flex-wrap:wrap;gap:10px;margin:8px 0}
.astro-kv{display:flex;gap:6px;align-items:baseline;font-size:13px;padding:4px 10px;border-radius:6px;background:var(--bg-2,#f6f8fa)}
.astro-kv span:first-child{color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;letter-spacing:.04em}
.astro-kv span:last-child{font-family:ui-monospace,monospace;font-weight:600;color:#ff5d01}
`;

// Known Astro integrations (match import names / function call names)
const KNOWN_INTEGRATIONS = [
  'react', 'vue', 'svelte', 'solid', 'preact', 'lit', 'alpine',
  'tailwind', 'mdx', 'image', 'sitemap', 'partytown', 'compress',
  'netlify', 'vercel', 'cloudflare', 'node', 'deno',
  'storybook', 'sentry', 'astro-seo', 'i18n',
];

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const name = (intake.name || intake.filename || 'astro.config.mjs').split('/').pop();

  // Detect integrations
  const integrations = new Set();
  for (const ig of KNOWN_INTEGRATIONS) {
    if (new RegExp(`\\b${ig}\\s*\\(`, 'i').test(text)) integrations.add(ig);
  }
  // Also scan import statements
  const importRe = /from\s+['"]([^'"]+)['"]/g;
  let m;
  while ((m = importRe.exec(text)) !== null) {
    const pkg = m[1].replace(/^@astrojs\//, '');
    for (const ig of KNOWN_INTEGRATIONS) {
      if (pkg.toLowerCase().includes(ig)) integrations.add(ig);
    }
  }

  // Output mode: 'static' | 'server' | 'hybrid'
  let output = null;
  const outputM = /\boutput\s*:\s*['"`](static|server|hybrid)['"`]/.exec(text);
  if (outputM) output = outputM[1];

  // Adapter
  let adapter = null;
  const adapterM = /adapter\s*:\s*(\w+)\s*\(/.exec(text);
  if (adapterM) adapter = adapterM[1];
  if (!adapter) {
    const adapterImport = /from\s+['"]@astrojs\/(netlify|vercel|cloudflare|node|deno)['"]/i.exec(text);
    if (adapterImport) adapter = adapterImport[1];
  }

  // Site URL
  let site = null;
  const siteM = /\bsite\s*:\s*['"`]([^'"`]+)['"`]/.exec(text);
  if (siteM) site = siteM[1];

  // Base path
  let base = null;
  const baseM = /\bbase\s*:\s*['"`]([^'"`]+)['"`]/.exec(text);
  if (baseM && baseM[1] !== '/') base = baseM[1];

  // Server port
  let port = null;
  const portM = /server\s*:\s*\{[^}]*port\s*:\s*(\d+)/s.exec(text);
  if (portM) port = portM[1];

  const integList = [...integrations];

  const metaItems = [
    output ? `<div class="astro-kv"><span>Output</span><span>${esc(output)}</span></div>` : '',
    adapter ? `<div class="astro-kv"><span>Adapter</span><span>${esc(adapter)}</span></div>` : '',
    site ? `<div class="astro-kv"><span>Site</span><span>${esc(site)}</span></div>` : '',
    base ? `<div class="astro-kv"><span>Base</span><span>${esc(base)}</span></div>` : '',
    port ? `<div class="astro-kv"><span>Dev Port</span><span>${esc(port)}</span></div>` : '',
  ].filter(Boolean).join('');

  const integrationsHtml = integList.length
    ? `<div class="astro-sec"><h3>Integrations (${integList.length})</h3><div class="astro-pills">${integList.map((i) => `<span class="astro-pill">${esc(i)}</span>`).join('')}</div></div>`
    : '';

  const metaHtml = metaItems
    ? `<div class="astro-sec"><h3>Settings</h3><div class="astro-meta">${metaItems}</div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'astro-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="astro-title"><span class="badge-astro">Astro</span>${esc(name)}</div>
<div class="astro-sub">Astro framework configuration</div>
${integrationsHtml}${metaHtml}`;
  return { parentNode: host };
}
