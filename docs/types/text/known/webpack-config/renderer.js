const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.wpcfg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-wp{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1c78c0;color:#fff;vertical-align:middle;margin-right:8px}
.wpcfg-title{font-size:18px;font-weight:700;margin:0 0 4px}
.wpcfg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px}
.wpcfg-sec{margin:12px 0}
.wpcfg-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.wpcfg-pills{display:flex;flex-wrap:wrap;gap:6px}
.wpcfg-pill{display:inline-flex;align-items:center;font-size:12px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.wpcfg-meta{display:flex;flex-wrap:wrap;gap:10px;margin:8px 0}
.wpcfg-kv{display:flex;gap:6px;align-items:baseline;font-size:13px;padding:4px 10px;border-radius:6px;background:var(--bg-2,#f6f8fa)}
.wpcfg-kv span:first-child{color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;letter-spacing:.04em}
.wpcfg-kv span:last-child{font-family:ui-monospace,monospace;font-weight:600;color:var(--accent,#1c78c0)}
.wpcfg-entry{display:flex;align-items:baseline;gap:8px;padding:4px 8px;border-radius:6px;background:var(--bg-2,#f6f8fa);margin-bottom:4px}
.wpcfg-entry code{font:13px/1 ui-monospace,monospace;font-weight:600;color:var(--accent,#1c78c0)}
`;

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const name = (intake.name || intake.filename || 'webpack.config.js').split('/').pop();

  // Extract mode
  let mode = null;
  const modeM = /\bmode\s*:\s*['"`](development|production|none)['"`]/.exec(text);
  if (modeM) mode = modeM[1];

  // Extract entry points (simple string or object keys)
  const entries = [];
  // Single entry string: entry: './src/index.js'
  const singleEntryM = /\bentry\s*:\s*['"`]([^'"`]+)['"`]/.exec(text);
  if (singleEntryM) entries.push(singleEntryM[1]);
  // Object entries: entry: { main: ..., vendor: ... }
  const entryBlockM = /\bentry\s*:\s*\{([^}]+)\}/s.exec(text);
  if (entryBlockM) {
    const keyRe = /^\s*['"`]?(\w+)['"`]?\s*:/gm;
    let km;
    while ((km = keyRe.exec(entryBlockM[1])) !== null) entries.push(km[1]);
  }

  // Extract output path and filename
  let outputPath = null;
  let outputFile = null;
  const outBlockM = /\boutput\s*:\s*\{([^}]+)\}/s.exec(text);
  if (outBlockM) {
    const pathM = /path\s*:[^,\n]*(dist|build|output|out|public)[^,\n]*/i.exec(outBlockM[1]);
    if (pathM) outputPath = pathM[1];
    const fnM = /filename\s*:\s*['"`]([^'"`]+)['"`]/.exec(outBlockM[1]);
    if (fnM) outputFile = fnM[1];
  }

  // Extract target
  let target = null;
  const targetM = /\btarget\s*:\s*['"`]([^'"`]+)['"`]/.exec(text);
  if (targetM) target = targetM[1];

  // Detect loaders from use: or loader: fields
  const loaders = new Set();
  const loaderRe = /(?:loader|use)\s*:\s*['"`]([^'"`]+(?:-loader)[^'"`]*)['"`]/g;
  let lm;
  while ((lm = loaderRe.exec(text)) !== null) loaders.add(lm[1]);
  // Also detect array use: ['babel-loader', ...]
  const useArrRe = /['"`]([a-z-]+-loader)['"`]/g;
  while ((lm = useArrRe.exec(text)) !== null) loaders.add(lm[1]);

  // Detect plugins: new PluginName(
  const plugins = new Set();
  const pluginRe = /new\s+([A-Z][A-Za-z]+(?:Plugin|Extract|Webpack[A-Za-z]+))\s*\(/g;
  let pm;
  while ((pm = pluginRe.exec(text)) !== null) plugins.add(pm[1]);

  const metaItems = [
    mode ? `<div class="wpcfg-kv"><span>Mode</span><span>${esc(mode)}</span></div>` : '',
    outputPath ? `<div class="wpcfg-kv"><span>Output</span><span>${esc(outputPath)}</span></div>` : '',
    outputFile ? `<div class="wpcfg-kv"><span>Filename</span><span>${esc(outputFile)}</span></div>` : '',
    target ? `<div class="wpcfg-kv"><span>Target</span><span>${esc(target)}</span></div>` : '',
  ].filter(Boolean).join('');

  const entriesHtml = entries.length
    ? `<div class="wpcfg-sec"><h3>Entry Points (${entries.length})</h3>${entries.map((e) => `<div class="wpcfg-entry"><code>${esc(e)}</code></div>`).join('')}</div>`
    : '';

  const loadersHtml = loaders.size
    ? `<div class="wpcfg-sec"><h3>Loaders (${loaders.size})</h3><div class="wpcfg-pills">${[...loaders].map((l) => `<span class="wpcfg-pill">${esc(l)}</span>`).join('')}</div></div>`
    : '';

  const pluginsHtml = plugins.size
    ? `<div class="wpcfg-sec"><h3>Plugins (${plugins.size})</h3><div class="wpcfg-pills">${[...plugins].map((p) => `<span class="wpcfg-pill">${esc(p)}</span>`).join('')}</div></div>`
    : '';

  const metaHtml = metaItems
    ? `<div class="wpcfg-sec"><h3>Settings</h3><div class="wpcfg-meta">${metaItems}</div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'wpcfg-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="wpcfg-title"><span class="badge-wp">Webpack</span>${esc(name)}</div>
<div class="wpcfg-sub">Webpack bundler configuration</div>
${metaHtml}${entriesHtml}${loadersHtml}${pluginsHtml}`;
  return { parentNode: host };
}
