const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.nuxt-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-nuxt{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#00c16a;color:#fff;vertical-align:middle;margin-right:8px}
.nuxt-title{font-size:18px;font-weight:700;margin:0 0 4px}
.nuxt-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px}
.nuxt-sec{margin:12px 0}
.nuxt-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.nuxt-pills{display:flex;flex-wrap:wrap;gap:6px}
.nuxt-pill{display:inline-flex;align-items:center;font-size:12px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.nuxt-meta{display:flex;flex-wrap:wrap;gap:10px;margin:8px 0}
.nuxt-kv{display:flex;gap:6px;align-items:baseline;font-size:13px;padding:4px 10px;border-radius:6px;background:var(--bg-2,#f6f8fa)}
.nuxt-kv span:first-child{color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;letter-spacing:.04em}
.nuxt-kv span:last-child{font-family:ui-monospace,monospace;font-weight:600;color:#00c16a}
.nuxt-badge-on{padding:1px 7px;border-radius:8px;background:#d1fae5;border:1px solid #6ee7b7;color:#065f46;font-size:11px;font-weight:700}
.nuxt-badge-off{padding:1px 7px;border-radius:8px;background:#f6f8fa;border:1px solid #e0e0e0;color:#888;font-size:11px}
`;

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const name = (intake.name || intake.filename || 'nuxt.config.ts').split('/').pop();

  // SSR mode: ssr: false → SPA
  let ssr = null;
  const ssrM = /\bssr\s*:\s*(true|false)/.exec(text);
  if (ssrM) ssr = ssrM[1];

  // Modules list
  const modules = [];
  const modulesBlock = /modules\s*:\s*\[([^\]]+)\]/s.exec(text);
  if (modulesBlock) {
    const modRe = /['"`]([^'"`]+)['"`]/g;
    let mm;
    while ((mm = modRe.exec(modulesBlock[1])) !== null) {
      // Strip @nuxtjs/ / nuxt- prefixes for display
      const label = mm[1].replace(/^@nuxtjs\//, '').replace(/^nuxt-/, '');
      modules.push(label);
    }
  }

  // Dev server port
  let devPort = null;
  const devPortM = /devServer\s*:\s*\{[^}]*port\s*:\s*(\d+)/s.exec(text);
  if (devPortM) devPort = devPortM[1];

  // Router mode
  let routerMode = null;
  const routerM = /router\s*:\s*\{[^}]*mode\s*:\s*['"`](history|hash|abstract)['"`]/s.exec(text);
  if (routerM) routerMode = routerM[1];

  // Tailwind / UI layer
  const hasTailwind = /tailwind/i.test(text);
  const hasContentWind = /content-wind|contentwind/i.test(text);

  // Plugins list (from plugins: [])
  const plugins = [];
  const pluginsBlock = /plugins\s*:\s*\[([^\]]+)\]/s.exec(text);
  if (pluginsBlock) {
    const pr = /['"`]([^'"`]+)['"`]/g;
    let pm;
    while ((pm = pr.exec(pluginsBlock[1])) !== null) plugins.push(pm[1].split('/').pop());
  }

  // App dir
  let srcDir = null;
  const srcM = /srcDir\s*:\s*['"`]([^'"`]+)['"`]/.exec(text);
  if (srcM) srcDir = srcM[1];

  const metaItems = [
    ssr !== null ? `<div class="nuxt-kv"><span>SSR</span><span><span class="${ssr === 'true' ? 'nuxt-badge-on' : 'nuxt-badge-off'}">${ssr === 'true' ? 'enabled' : 'disabled (SPA)'}</span></span></div>` : '',
    devPort ? `<div class="nuxt-kv"><span>Dev Port</span><span>${esc(devPort)}</span></div>` : '',
    routerMode ? `<div class="nuxt-kv"><span>Router</span><span>${esc(routerMode)}</span></div>` : '',
    srcDir ? `<div class="nuxt-kv"><span>Src Dir</span><span>${esc(srcDir)}</span></div>` : '',
  ].filter(Boolean).join('');

  const modulesHtml = modules.length
    ? `<div class="nuxt-sec"><h3>Modules (${modules.length})</h3><div class="nuxt-pills">${modules.map((m) => `<span class="nuxt-pill">${esc(m)}</span>`).join('')}</div></div>`
    : '';

  const pluginsHtml = plugins.length
    ? `<div class="nuxt-sec"><h3>Plugins (${plugins.length})</h3><div class="nuxt-pills">${plugins.map((p) => `<span class="nuxt-pill">${esc(p)}</span>`).join('')}</div></div>`
    : '';

  const metaHtml = metaItems
    ? `<div class="nuxt-sec"><h3>Settings</h3><div class="nuxt-meta">${metaItems}</div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'nuxt-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="nuxt-title"><span class="badge-nuxt">Nuxt</span>${esc(name)}</div>
<div class="nuxt-sub">Nuxt 3 framework configuration</div>
${modulesHtml}${metaHtml}${pluginsHtml}`;
  return { parentNode: host };
}
