const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.rlcfg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-rollup{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#ef3335;color:#fff;vertical-align:middle;margin-right:8px}
.rlcfg-title{font-size:18px;font-weight:700;margin:0 0 4px}
.rlcfg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px}
.rlcfg-sec{margin:12px 0}
.rlcfg-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.rlcfg-pills{display:flex;flex-wrap:wrap;gap:6px}
.rlcfg-pill{display:inline-flex;align-items:center;font-size:12px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.rlcfg-meta{display:flex;flex-wrap:wrap;gap:10px;margin:8px 0}
.rlcfg-kv{display:flex;gap:6px;align-items:baseline;font-size:13px;padding:4px 10px;border-radius:6px;background:var(--bg-2,#f6f8fa)}
.rlcfg-kv span:first-child{color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;letter-spacing:.04em}
.rlcfg-kv span:last-child{font-family:ui-monospace,monospace;font-weight:600;color:var(--accent,#ef3335)}
`;

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const name = (intake.name || intake.filename || 'rollup.config.js').split('/').pop();

  // Extract input
  const inputs = [];
  const singleInputM = /\binput\s*:\s*['"`]([^'"`]+)['"`]/.exec(text);
  if (singleInputM) inputs.push(singleInputM[1]);
  const arrInputM = /\binput\s*:\s*\[([^\]]+)\]/s.exec(text);
  if (arrInputM) {
    const strRe = /['"`]([^'"`]+)['"`]/g;
    let sm;
    while ((sm = strRe.exec(arrInputM[1])) !== null) inputs.push(sm[1]);
  }
  const objInputM = /\binput\s*:\s*\{([^}]+)\}/s.exec(text);
  if (objInputM && !singleInputM) {
    const valRe = /:\s*['"`]([^'"`]+)['"`]/g;
    let vm;
    while ((vm = valRe.exec(objInputM[1])) !== null) inputs.push(vm[1]);
  }

  // Extract output format
  let format = null;
  const formatM = /\bformat\s*:\s*['"`](es|esm|cjs|umd|iife|amd|system)['"`]/i.exec(text);
  if (formatM) format = formatM[1];

  // Extract output file or dir
  let outFile = null;
  let outDir = null;
  const outFileM = /\boutput[^{]*\{[^}]*file\s*:\s*['"`]([^'"`]+)['"`]/s.exec(text);
  if (outFileM) outFile = outFileM[1];
  const outDirM = /\boutput[^{]*\{[^}]*dir\s*:\s*['"`]([^'"`]+)['"`]/s.exec(text);
  if (outDirM) outDir = outDirM[1];

  // Detect plugins
  const plugins = new Set();
  // import declarations: import xxx from 'rollup-plugin-xxx'
  const importRe = /from\s+['"](@rollup\/plugin-[a-z-]+|rollup-plugin-[a-z-]+)['"](?:\s+|.*?as\s+(\w+))?/g;
  let im;
  while ((im = importRe.exec(text)) !== null) {
    const pkg = im[1];
    // Shorten: rollup-plugin-foo -> foo, @rollup/plugin-foo -> foo
    const short = pkg.replace('@rollup/plugin-', '').replace('rollup-plugin-', '');
    plugins.add(short);
  }
  // Also look for function calls that look like plugin invocations: pluginName(
  const callRe = /\b(resolve|commonjs|babel|typescript|terser|json|node|replace|alias|inject|strip|wasm|image|css|postcss|svelte|vue|react)\s*\(/g;
  let cm;
  while ((cm = callRe.exec(text)) !== null) plugins.add(cm[1]);

  const metaItems = [
    format ? `<div class="rlcfg-kv"><span>Format</span><span>${esc(format)}</span></div>` : '',
    outFile ? `<div class="rlcfg-kv"><span>Output file</span><span>${esc(outFile)}</span></div>` : '',
    outDir ? `<div class="rlcfg-kv"><span>Output dir</span><span>${esc(outDir)}</span></div>` : '',
  ].filter(Boolean).join('');

  const inputsHtml = inputs.length
    ? `<div class="rlcfg-sec"><h3>Input (${inputs.length})</h3><div class="rlcfg-pills">${inputs.map((i) => `<span class="rlcfg-pill">${esc(i)}</span>`).join('')}</div></div>`
    : '';

  const pluginsHtml = plugins.size
    ? `<div class="rlcfg-sec"><h3>Plugins (${plugins.size})</h3><div class="rlcfg-pills">${[...plugins].map((p) => `<span class="rlcfg-pill">${esc(p)}</span>`).join('')}</div></div>`
    : '';

  const metaHtml = metaItems
    ? `<div class="rlcfg-sec"><h3>Output</h3><div class="rlcfg-meta">${metaItems}</div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'rlcfg-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="rlcfg-title"><span class="badge-rollup">Rollup</span>${esc(name)}</div>
<div class="rlcfg-sub">Rollup module bundler configuration</div>
${inputsHtml}${metaHtml}${pluginsHtml}`;
  return { parentNode: host };
}
