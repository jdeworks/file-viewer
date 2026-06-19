const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.nxcfg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-nextjs{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#000;color:#fff;vertical-align:middle;margin-right:8px}
.nxcfg-title{font-size:18px;font-weight:700;margin:0 0 4px}
.nxcfg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px}
.nxcfg-sec{margin:12px 0}
.nxcfg-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.nxcfg-pills{display:flex;flex-wrap:wrap;gap:6px}
.nxcfg-pill{display:inline-flex;align-items:center;font-size:12px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.nxcfg-meta{display:flex;flex-wrap:wrap;gap:10px;margin:8px 0}
.nxcfg-kv{display:flex;gap:6px;align-items:baseline;font-size:13px;padding:4px 10px;border-radius:6px;background:var(--bg-2,#f6f8fa)}
.nxcfg-kv span:first-child{color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;letter-spacing:.04em}
.nxcfg-kv span:last-child{font-family:ui-monospace,monospace;font-weight:600}
.nxcfg-badge-on{padding:1px 7px;border-radius:8px;background:#d1fae5;border:1px solid #6ee7b7;color:#065f46;font-size:11px;font-weight:700}
.nxcfg-badge-off{padding:1px 7px;border-radius:8px;background:#f6f8fa;border:1px solid #e0e0e0;color:#888;font-size:11px}
`;

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const name = (intake.name || intake.filename || 'next.config.js').split('/').pop();

  // Detect App Router vs Pages Router
  const hasAppDir = /appDir\s*:\s*true/.test(text) || /experimental\s*:\s*\{[^}]*appDir\s*:\s*true/s.test(text);
  // Pages router is default (no appDir)

  // Output mode
  let output = null;
  const outputM = /\boutput\s*:\s*['"`](standalone|export)['"`]/.exec(text);
  if (outputM) output = outputM[1];

  // Image domains
  const imageDomains = [];
  const domainsM = /domains\s*:\s*\[([^\]]+)\]/s.exec(text);
  if (domainsM) {
    const strRe = /['"`]([^'"`]+)['"`]/g;
    let dm;
    while ((dm = strRe.exec(domainsM[1])) !== null) imageDomains.push(dm[1]);
  }
  // remotePatterns
  const remotePatternsM = text.match(/remotePatterns\s*:\s*\[/);
  const remotePatternCount = remotePatternsM ? (text.match(/hostname\s*:/g) || []).length : 0;

  // Count headers, rewrites, redirects (async functions returning arrays)
  const headersCount = (text.match(/\bheaders\s*\(\s*\)/g) || []).length;
  const rewritesCount = (text.match(/\brewrites\s*\(\s*\)/g) || []).length;
  const redirectsCount = (text.match(/\bredirects\s*\(\s*\)/g) || []).length;

  // i18n
  const hasI18n = /\bi18n\s*:/.test(text);
  let i18nLocales = [];
  const localesM = /locales\s*:\s*\[([^\]]+)\]/s.exec(text);
  if (localesM) {
    const lr = /['"`]([^'"`]+)['"`]/g;
    let lm;
    while ((lm = lr.exec(localesM[1])) !== null) i18nLocales.push(lm[1]);
  }

  // Transpile packages
  const transpilePackages = [];
  const tpM = /transpilePackages\s*:\s*\[([^\]]+)\]/s.exec(text);
  if (tpM) {
    const tr = /['"`]([^'"`]+)['"`]/g;
    let tm;
    while ((tm = tr.exec(tpM[1])) !== null) transpilePackages.push(tm[1]);
  }

  // Strict mode
  const reactStrictMode = /reactStrictMode\s*:\s*true/.test(text);

  // Router badge
  const routerHtml = `<div class="nxcfg-kv"><span>Router</span><span>${hasAppDir ? '<span class="nxcfg-badge-on">App Router</span>' : '<span class="nxcfg-badge-off">Pages Router</span>'}</span></div>`;

  const metaItems = [
    routerHtml,
    output ? `<div class="nxcfg-kv"><span>Output</span><span>${esc(output)}</span></div>` : '',
    reactStrictMode ? `<div class="nxcfg-kv"><span>Strict Mode</span><span><span class="nxcfg-badge-on">on</span></span></div>` : '',
  ].filter(Boolean).join('');

  const imageHtml = (imageDomains.length || remotePatternCount)
    ? `<div class="nxcfg-sec"><h3>Image Domains</h3><div class="nxcfg-pills">${[...imageDomains.map((d) => `<span class="nxcfg-pill">${esc(d)}</span>`), remotePatternCount ? `<span class="nxcfg-pill">${remotePatternCount} remote pattern${remotePatternCount !== 1 ? 's' : ''}</span>` : ''].filter(Boolean).join('')}</div></div>`
    : '';

  const routingHtml = (headersCount || rewritesCount || redirectsCount)
    ? `<div class="nxcfg-sec"><h3>Routing</h3><div class="nxcfg-meta">${[
        headersCount ? `<div class="nxcfg-kv"><span>Headers</span><span>${headersCount} fn</span></div>` : '',
        rewritesCount ? `<div class="nxcfg-kv"><span>Rewrites</span><span>${rewritesCount} fn</span></div>` : '',
        redirectsCount ? `<div class="nxcfg-kv"><span>Redirects</span><span>${redirectsCount} fn</span></div>` : '',
      ].filter(Boolean).join('')}</div></div>`
    : '';

  const i18nHtml = hasI18n
    ? `<div class="nxcfg-sec"><h3>Internationalization</h3><div class="nxcfg-pills">${i18nLocales.length ? i18nLocales.map((l) => `<span class="nxcfg-pill">${esc(l)}</span>`).join('') : '<span class="nxcfg-pill">configured</span>'}</div></div>`
    : '';

  const transpileHtml = transpilePackages.length
    ? `<div class="nxcfg-sec"><h3>Transpile Packages (${transpilePackages.length})</h3><div class="nxcfg-pills">${transpilePackages.map((p) => `<span class="nxcfg-pill">${esc(p)}</span>`).join('')}</div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'nxcfg-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="nxcfg-title"><span class="badge-nextjs">Next.js</span>${esc(name)}</div>
<div class="nxcfg-sub">Next.js framework configuration</div>
<div class="nxcfg-sec"><h3>Settings</h3><div class="nxcfg-meta">${metaItems}</div></div>
${imageHtml}${routingHtml}${i18nHtml}${transpileHtml}`;
  return { parentNode: host };
}
