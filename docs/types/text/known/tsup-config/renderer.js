const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.tsp-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-tsp{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#2563eb;color:#fff;vertical-align:middle;margin-right:8px}
.tsp-title{font-size:18px;font-weight:700;margin:0 0 4px}
.tsp-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px}
.tsp-sec{margin:12px 0}
.tsp-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.tsp-pills{display:flex;flex-wrap:wrap;gap:6px}
.tsp-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.tsp-pill.fmt{background:#eff6ff;border-color:#bfdbfe;color:#1e40af}
.tsp-meta{display:flex;flex-wrap:wrap;gap:10px;margin:8px 0}
.tsp-kv{display:flex;gap:6px;align-items:baseline;font-size:13px;padding:4px 10px;border-radius:6px;background:var(--bg-2,#f6f8fa)}
.tsp-kv span:first-child{color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;letter-spacing:.04em}
.tsp-kv span:last-child{font-family:ui-monospace,monospace;font-weight:600;color:#2563eb}
.tsp-entry{padding:4px 8px;border-radius:6px;background:var(--bg-2,#f6f8fa);margin-bottom:4px;font:13px/1 ui-monospace,monospace;font-weight:600;color:#2563eb}
.tsp-bool{display:inline-block;padding:1px 7px;border-radius:8px;font-size:11px;font-weight:700}
.tsp-bool.on{background:#dcfce7;color:#166534}
.tsp-bool.off{background:#fee2e2;color:#991b1b}
`;

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const name = (intake.name || intake.filename || 'tsup.config.ts').split('/').pop();

  // Extract entry points — entry: ['src/index.ts'] or entry: { ... }
  const entries = [];
  const entryArrM = /\bentry\s*:\s*\[([^\]]+)\]/s.exec(text);
  if (entryArrM) {
    const strRe = /['"`]([^'"`]+)['"`]/g;
    let sm;
    while ((sm = strRe.exec(entryArrM[1])) !== null) entries.push(sm[1]);
  }
  const entryObjM = /\bentry\s*:\s*\{([^}]+)\}/s.exec(text);
  if (!entries.length && entryObjM) {
    const keyRe = /['"`]?(\w+)['"`]?\s*:/g;
    let km;
    while ((km = keyRe.exec(entryObjM[1])) !== null) entries.push(km[1]);
  }
  // Single string entry
  if (!entries.length) {
    const singleM = /\bentry\s*:\s*['"`]([^'"`]+)['"`]/.exec(text);
    if (singleM) entries.push(singleM[1]);
  }

  // Extract output formats: format: ['cjs', 'esm']
  const formats = [];
  const fmtM = /\bformat\s*:\s*\[([^\]]+)\]/s.exec(text);
  if (fmtM) {
    const fRe = /['"`](cjs|esm|iife|umd)['"`]/g;
    let fm;
    while ((fm = fRe.exec(fmtM[1])) !== null) formats.push(fm[1]);
  }
  // format: 'esm' single
  if (!formats.length) {
    const singleFmtM = /\bformat\s*:\s*['"`](cjs|esm|iife|umd)['"`]/.exec(text);
    if (singleFmtM) formats.push(singleFmtM[1]);
  }

  // Extract dts
  let dts = null;
  const dtsM = /\bdts\s*:\s*(true|false)/.exec(text);
  if (dtsM) dts = dtsM[1] === 'true';

  // Extract target
  let target = null;
  const targetM = /\btarget\s*:\s*['"`]([^'"`]+)['"`]/.exec(text);
  if (targetM) target = targetM[1];

  // Extract outDir
  let outDir = null;
  const outM = /\boutDir\s*:\s*['"`]([^'"`]+)['"`]/.exec(text);
  if (outM) outDir = outM[1];

  // Extract splitting
  let splitting = null;
  const splittingM = /\bsplitting\s*:\s*(true|false)/.exec(text);
  if (splittingM) splitting = splittingM[1] === 'true';

  // Extract sourcemap
  let sourcemap = null;
  const smM = /\bsourcemap\s*:\s*(true|false|'inline'|"inline")/.exec(text);
  if (smM) sourcemap = smM[1].replace(/['"]/g, '');

  // Extract minify
  let minify = null;
  const minM = /\bminify\s*:\s*(true|false)/.exec(text);
  if (minM) minify = minM[1] === 'true';

  const metaItems = [
    target ? `<div class="tsp-kv"><span>Target</span><span>${esc(target)}</span></div>` : '',
    outDir ? `<div class="tsp-kv"><span>Out Dir</span><span>${esc(outDir)}</span></div>` : '',
    dts !== null ? `<div class="tsp-kv"><span>DTS</span><span><span class="tsp-bool ${dts ? 'on' : 'off'}">${dts ? 'yes' : 'no'}</span></span></div>` : '',
    splitting !== null ? `<div class="tsp-kv"><span>Splitting</span><span><span class="tsp-bool ${splitting ? 'on' : 'off'}">${splitting ? 'yes' : 'no'}</span></span></div>` : '',
    sourcemap !== null ? `<div class="tsp-kv"><span>Sourcemap</span><span>${esc(sourcemap)}</span></div>` : '',
    minify !== null ? `<div class="tsp-kv"><span>Minify</span><span><span class="tsp-bool ${minify ? 'on' : 'off'}">${minify ? 'yes' : 'no'}</span></span></div>` : '',
  ].filter(Boolean).join('');

  const entriesHtml = entries.length
    ? `<div class="tsp-sec"><h3>Entry Points (${entries.length})</h3>${entries.map((e) => `<div class="tsp-entry">${esc(e)}</div>`).join('')}</div>`
    : '';

  const formatsHtml = formats.length
    ? `<div class="tsp-sec"><h3>Output Formats</h3><div class="tsp-pills">${formats.map((f) => `<span class="tsp-pill fmt">${esc(f)}</span>`).join('')}</div></div>`
    : '';

  const metaHtml = metaItems
    ? `<div class="tsp-sec"><h3>Options</h3><div class="tsp-meta">${metaItems}</div></div>`
    : '';

  const sub = [
    formats.length ? formats.join(' + ') : null,
    dts ? 'TypeScript declarations' : null,
  ].filter(Boolean).join(' · ') || 'tsup bundler configuration';

  const host = document.createElement('div');
  host.className = 'tsp-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="tsp-title"><span class="badge-tsp">tsup</span>${esc(name)}</div>
<div class="tsp-sub">${esc(sub)}</div>
${entriesHtml}${formatsHtml}${metaHtml}`;
  return { parentNode: host };
}
