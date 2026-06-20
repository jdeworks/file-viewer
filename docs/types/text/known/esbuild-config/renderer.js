const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.esb-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-esbuild{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#FFCF00;color:#1a1a1a;vertical-align:middle;margin-right:8px}
.esb-title{font-size:18px;font-weight:700;margin:0 0 4px}
.esb-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px}
.esb-sec{margin:12px 0}
.esb-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.esb-pills{display:flex;flex-wrap:wrap;gap:6px}
.esb-pill{display:inline-flex;align-items:center;font-size:12px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.esb-meta{display:flex;flex-wrap:wrap;gap:10px;margin:8px 0}
.esb-kv{display:flex;gap:6px;align-items:baseline;font-size:13px;padding:4px 10px;border-radius:6px;background:var(--bg-2,#f6f8fa)}
.esb-kv span:first-child{color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;letter-spacing:.04em}
.esb-kv span:last-child{font-family:ui-monospace,monospace;font-weight:600;color:var(--accent,#FFCF00);text-shadow:0 0 0 #1a1a1a;filter:brightness(0.7)}
`;

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const name = (intake.name || intake.filename || 'esbuild.config.mjs').split('/').pop();

  // Extract entry points: entryPoints: ['...', '...'] or entryPoints: '...'
  const entryPoints = [];
  const epArrM = /entryPoints\s*:\s*\[([^\]]+)\]/s.exec(text);
  if (epArrM) {
    const strRe = /['"`]([^'"`]+)['"`]/g;
    let sm;
    while ((sm = strRe.exec(epArrM[1])) !== null) entryPoints.push(sm[1]);
  } else {
    const epSingleM = /entryPoints\s*:\s*['"`]([^'"`]+)['"`]/.exec(text);
    if (epSingleM) entryPoints.push(epSingleM[1]);
  }
  // Also handle object form: entryPoints: { key: 'value' }
  if (entryPoints.length === 0) {
    const epObjM = /entryPoints\s*:\s*\{([^}]+)\}/s.exec(text);
    if (epObjM) {
      const valRe = /:\s*['"`]([^'"`]+)['"`]/g;
      let vm;
      while ((vm = valRe.exec(epObjM[1])) !== null) entryPoints.push(vm[1]);
    }
  }

  // Extract outfile / outdir
  let outfile = null;
  let outdir = null;
  const outfileM = /\boutfile\s*:\s*['"`]([^'"`]+)['"`]/.exec(text);
  if (outfileM) outfile = outfileM[1];
  const outdirM = /\boutdir\s*:\s*['"`]([^'"`]+)['"`]/.exec(text);
  if (outdirM) outdir = outdirM[1];

  // Bundle mode
  const bundled = /\bbundle\s*:\s*true\b/.test(text);

  // Target: target: 'es2020' or target: ['node18', 'es2020']
  let target = null;
  const targetArrM = /\btarget\s*:\s*\[([^\]]+)\]/s.exec(text);
  if (targetArrM) {
    const vals = [];
    const strRe = /['"`]([^'"`]+)['"`]/g;
    let sm;
    while ((sm = strRe.exec(targetArrM[1])) !== null) vals.push(sm[1]);
    if (vals.length) target = vals.join(', ');
  } else {
    const targetSingleM = /\btarget\s*:\s*['"`]([^'"`]+)['"`]/.exec(text);
    if (targetSingleM) target = targetSingleM[1];
  }

  // Format: format: 'esm' | 'cjs' | 'iife'
  let format = null;
  const formatM = /\bformat\s*:\s*['"`](esm|cjs|iife)['"`]/i.exec(text);
  if (formatM) format = formatM[1];

  // Minify
  const minify = /\bminify\s*:\s*true\b/.test(text) ||
    /\bminifyWhitespace\s*:\s*true\b/.test(text) ||
    /\bminifyIdentifiers\s*:\s*true\b/.test(text) ||
    /\bminifySyntax\s*:\s*true\b/.test(text);

  // Platform
  let platform = null;
  const platformM = /\bplatform\s*:\s*['"`]([^'"`]+)['"`]/.exec(text);
  if (platformM) platform = platformM[1];

  // External packages
  const external = [];
  const extArrM = /\bexternal\s*:\s*\[([^\]]+)\]/s.exec(text);
  if (extArrM) {
    const strRe = /['"`]([^'"`]+)['"`]/g;
    let sm;
    while ((sm = strRe.exec(extArrM[1])) !== null) external.push(sm[1]);
  }

  // Plugins: extract names from plugins: [ pluginName(), ... ]
  const plugins = [];
  const pluginsBlockM = /\bplugins\s*:\s*\[([^\]]*)\]/s.exec(text);
  if (pluginsBlockM) {
    const callRe = /\b([a-zA-Z][a-zA-Z0-9_$]*)\s*\(/g;
    let cm;
    while ((cm = callRe.exec(pluginsBlockM[1])) !== null) {
      plugins.push(cm[1]);
    }
  }
  // Also extract from import names for plugins
  const importRe = /import\s+\{?\s*([a-zA-Z][a-zA-Z0-9_$]*)\s*\}?\s+from\s+['"]([^'"]*plugin[^'"]*)['"]/gi;
  let im;
  while ((im = importRe.exec(text)) !== null) {
    const importedName = im[1];
    if (!plugins.includes(importedName)) plugins.push(importedName);
  }

  // Build sections
  const metaItems = [
    bundled ? `<div class="esb-kv"><span>Bundle</span><span>true</span></div>` : '',
    format ? `<div class="esb-kv"><span>Format</span><span>${esc(format)}</span></div>` : '',
    target ? `<div class="esb-kv"><span>Target</span><span>${esc(target)}</span></div>` : '',
    platform ? `<div class="esb-kv"><span>Platform</span><span>${esc(platform)}</span></div>` : '',
    outfile ? `<div class="esb-kv"><span>Outfile</span><span>${esc(outfile)}</span></div>` : '',
    outdir ? `<div class="esb-kv"><span>Outdir</span><span>${esc(outdir)}</span></div>` : '',
    minify ? `<div class="esb-kv"><span>Minify</span><span>enabled</span></div>` : '',
  ].filter(Boolean).join('');

  const entryHtml = entryPoints.length
    ? `<div class="esb-sec"><h3>Entry Points (${entryPoints.length})</h3><div class="esb-pills">${entryPoints.map((e) => `<span class="esb-pill">${esc(e)}</span>`).join('')}</div></div>`
    : '';

  const pluginsHtml = plugins.length
    ? `<div class="esb-sec"><h3>Plugins (${plugins.length})</h3><div class="esb-pills">${plugins.map((p) => `<span class="esb-pill">${esc(p)}</span>`).join('')}</div></div>`
    : '';

  const externalHtml = external.length
    ? `<div class="esb-sec"><h3>External (${external.length})</h3><div class="esb-pills">${external.map((e) => `<span class="esb-pill">${esc(e)}</span>`).join('')}</div></div>`
    : '';

  const metaHtml = metaItems
    ? `<div class="esb-sec"><h3>Build Options</h3><div class="esb-meta">${metaItems}</div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'esb-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="esb-title"><span class="badge-esbuild">esbuild</span>${esc(name)}</div>
<div class="esb-sub">esbuild JavaScript bundler configuration</div>
${entryHtml}${metaHtml}${externalHtml}${pluginsHtml}`;
  return { parentNode: host };
}
