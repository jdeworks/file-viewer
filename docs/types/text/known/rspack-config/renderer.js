const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.rsp-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-rsp{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#06b6d4;color:#fff;vertical-align:middle;margin-right:8px}
.rsp-title{font-size:18px;font-weight:700;margin:0 0 4px}
.rsp-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px}
.rsp-sec{margin:12px 0}
.rsp-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.rsp-pills{display:flex;flex-wrap:wrap;gap:6px}
.rsp-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.rsp-pill.loader{background:#ecfdf5;border-color:#a7f3d0;color:#065f46}
.rsp-pill.plugin{background:#f0f9ff;border-color:#bae6fd;color:#0c4a6e}
.rsp-meta{display:flex;flex-wrap:wrap;gap:10px;margin:8px 0}
.rsp-kv{display:flex;gap:6px;align-items:baseline;font-size:13px;padding:4px 10px;border-radius:6px;background:var(--bg-2,#f6f8fa)}
.rsp-kv span:first-child{color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;letter-spacing:.04em}
.rsp-kv span:last-child{font-family:ui-monospace,monospace;font-weight:600;color:#06b6d4}
.rsp-entry{padding:4px 8px;border-radius:6px;background:var(--bg-2,#f6f8fa);margin-bottom:4px;font:13px/1 ui-monospace,monospace;font-weight:600;color:#06b6d4}
`;

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const name = (intake.name || intake.filename || 'rspack.config.js').split('/').pop();

  // Extract mode
  let mode = null;
  const modeM = /\bmode\s*:\s*['"`](development|production|none)['"`]/.exec(text);
  if (modeM) mode = modeM[1];

  // Extract entry points
  const entries = [];
  const singleEntryM = /\bentry\s*:\s*['"`]([^'"`]+)['"`]/.exec(text);
  if (singleEntryM) entries.push(singleEntryM[1]);
  const entryObjM = /\bentry\s*:\s*\{([^}]+)\}/s.exec(text);
  if (!entries.length && entryObjM) {
    const keyRe = /['"`]?(\w+)['"`]?\s*:/g;
    let km;
    while ((km = keyRe.exec(entryObjM[1])) !== null) entries.push(km[1]);
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

  // Count module rules
  let rulesCount = 0;
  const rulesM = /\brules\s*:\s*\[([^\]]*(?:\[[^\]]*\][^\]]*)*)\]/s.exec(text);
  if (rulesM) {
    const testRe = /\btest\s*:/g;
    let tm;
    while ((tm = testRe.exec(rulesM[1])) !== null) rulesCount++;
  }

  // Detect loaders
  const loaders = new Set();
  const loaderRe = /['"`]([a-z-]+-loader)['"`]/g;
  let lm;
  while ((lm = loaderRe.exec(text)) !== null) loaders.add(lm[1]);

  // Detect plugins
  const plugins = new Set();
  const pluginRe = /new\s+([A-Z][A-Za-z]+(?:Plugin|Extract|Rspack[A-Za-z]+))\s*\(/g;
  let pm;
  while ((pm = pluginRe.exec(text)) !== null) plugins.add(pm[1]);

  const metaItems = [
    mode ? `<div class="rsp-kv"><span>Mode</span><span>${esc(mode)}</span></div>` : '',
    outputPath ? `<div class="rsp-kv"><span>Output</span><span>${esc(outputPath)}</span></div>` : '',
    outputFile ? `<div class="rsp-kv"><span>Filename</span><span>${esc(outputFile)}</span></div>` : '',
    target ? `<div class="rsp-kv"><span>Target</span><span>${esc(target)}</span></div>` : '',
    rulesCount ? `<div class="rsp-kv"><span>Rules</span><span>${rulesCount}</span></div>` : '',
  ].filter(Boolean).join('');

  const entriesHtml = entries.length
    ? `<div class="rsp-sec"><h3>Entry Points (${entries.length})</h3>${entries.map((e) => `<div class="rsp-entry">${esc(e)}</div>`).join('')}</div>`
    : '';

  const loadersHtml = loaders.size
    ? `<div class="rsp-sec"><h3>Loaders (${loaders.size})</h3><div class="rsp-pills">${[...loaders].map((l) => `<span class="rsp-pill loader">${esc(l)}</span>`).join('')}</div></div>`
    : '';

  const pluginsHtml = plugins.size
    ? `<div class="rsp-sec"><h3>Plugins (${plugins.size})</h3><div class="rsp-pills">${[...plugins].map((p) => `<span class="rsp-pill plugin">${esc(p)}</span>`).join('')}</div></div>`
    : '';

  const metaHtml = metaItems
    ? `<div class="rsp-sec"><h3>Settings</h3><div class="rsp-meta">${metaItems}</div></div>`
    : '';

  const sub = mode ? `${mode} mode · Rust-powered webpack-compatible bundler` : 'Rspack bundler configuration';

  const host = document.createElement('div');
  host.className = 'rsp-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="rsp-title"><span class="badge-rsp">Rspack</span>${esc(name)}</div>
<div class="rsp-sub">${esc(sub)}</div>
${metaHtml}${entriesHtml}${loadersHtml}${pluginsHtml}`;
  return { parentNode: host };
}
