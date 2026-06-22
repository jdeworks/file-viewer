const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.elev-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-elev{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#c0392b;color:#fff;vertical-align:middle;margin-right:8px}
.elev-title{font-size:18px;font-weight:700;margin:0 0 4px}
.elev-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px}
.elev-grid{display:grid;grid-template-columns:max-content 1fr;gap:5px 16px;margin:10px 0}
.elev-key{color:var(--fg-2,#888);font-size:12px;align-self:center}
.elev-val{font:12px ui-monospace,monospace;color:#c0392b;word-break:break-all;align-self:center}
.elev-sec{margin:12px 0}
.elev-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.elev-pills{display:flex;flex-wrap:wrap;gap:6px}
.elev-pill{display:inline-flex;align-items:center;font-size:12px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
`;

export function render(intake) {
  const text = intake.text || '';
  const name = (intake.name || intake.filename || 'eleventy.config.js').split('/').pop();

  // Input/output dirs from return { dir: { input, output } }
  const inputM = /input\s*:\s*['"`]([^'"`]+)['"`]/.exec(text);
  const outputM = /output\s*:\s*['"`]([^'"`]+)['"`]/.exec(text);
  const inputDir = inputM ? inputM[1] : null;
  const outputDir = outputM ? outputM[1] : null;

  // Template formats from setTemplateFormats call
  let templateFormats = [];
  const tmplM = /setTemplateFormats\s*\(\s*\[([^\]]+)\]/.exec(text);
  if (tmplM) {
    templateFormats = tmplM[1].match(/['"`]([^'"`]+)['"`]/g)?.map((s) => s.replace(/['"`]/g, '')) || [];
  }

  // Plugin names from addPlugin calls
  const pluginNames = [];
  const pluginRe = /addPlugin\s*\(\s*([A-Za-z_$][A-Za-z0-9_$]*)/g;
  let m;
  while ((m = pluginRe.exec(text)) !== null) {
    pluginNames.push(m[1]);
  }

  // Passthrough copies from addPassthroughCopy calls
  const passthroughs = [];
  const ptRe = /addPassthroughCopy\s*\(\s*['"`]([^'"`]+)['"`]/g;
  while ((m = ptRe.exec(text)) !== null) {
    passthroughs.push(m[1]);
  }
  // Also object form: addPassthroughCopy({ 'src': 'dst' })
  const ptObjRe = /addPassthroughCopy\s*\(\s*\{[^}]*['"`]([^'"`]+)['"`]/g;
  while ((m = ptObjRe.exec(text)) !== null) {
    if (!passthroughs.includes(m[1])) passthroughs.push(m[1]);
  }

  const dirRows = [
    inputDir ? `<span class="elev-key">Input dir</span><span class="elev-val">${esc(inputDir)}</span>` : '',
    outputDir ? `<span class="elev-key">Output dir</span><span class="elev-val">${esc(outputDir)}</span>` : '',
  ].filter(Boolean);

  const dirHtml = dirRows.length
    ? `<div class="elev-sec"><h3>Directories</h3><div class="elev-grid">${dirRows.join('')}</div></div>`
    : '';

  const tmplHtml = templateFormats.length
    ? `<div class="elev-sec"><h3>Template formats (${templateFormats.length})</h3><div class="elev-pills">${templateFormats.map((f) => `<span class="elev-pill">${esc(f)}</span>`).join('')}</div></div>`
    : '';

  const pluginsHtml = pluginNames.length
    ? `<div class="elev-sec"><h3>Plugins (${pluginNames.length})</h3><div class="elev-pills">${pluginNames.map((p) => `<span class="elev-pill">${esc(p)}</span>`).join('')}</div></div>`
    : '';

  const ptHtml = passthroughs.length
    ? `<div class="elev-sec"><h3>Passthrough copies (${passthroughs.length})</h3><div class="elev-pills">${passthroughs.map((p) => `<span class="elev-pill">${esc(p)}</span>`).join('')}</div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'elev-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="elev-title"><span class="badge-elev">Eleventy</span>${esc(name)}</div>
<div class="elev-sub">Eleventy (11ty) static site generator configuration</div>
${dirHtml}${tmplHtml}${pluginsHtml}${ptHtml}`;
  return { parentNode: host };
}
