const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.sk-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-svelte{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#ff3e00;color:#fff;vertical-align:middle;margin-right:8px}
.sk-title{font-size:18px;font-weight:700;margin:0 0 4px}
.sk-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px}
.sk-sec{margin:12px 0}
.sk-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.sk-pills{display:flex;flex-wrap:wrap;gap:6px}
.sk-pill{display:inline-flex;align-items:center;font-size:12px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.sk-meta{display:flex;flex-wrap:wrap;gap:10px;margin:8px 0}
.sk-kv{display:flex;gap:6px;align-items:baseline;font-size:13px;padding:4px 10px;border-radius:6px;background:var(--bg-2,#f6f8fa)}
.sk-kv span:first-child{color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;letter-spacing:.04em}
.sk-kv span:last-child{font-family:ui-monospace,monospace;font-weight:600;color:#ff3e00}
.sk-badge-on{padding:1px 7px;border-radius:8px;background:#d1fae5;border:1px solid #6ee7b7;color:#065f46;font-size:11px;font-weight:700}
.sk-badge-off{padding:1px 7px;border-radius:8px;background:#f6f8fa;border:1px solid #e0e0e0;color:#888;font-size:11px}
`;

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const name = (intake.name || intake.filename || 'svelte.config.js').split('/').pop();

  // Adapter detection from import or adapter() call
  let adapter = null;
  const adapterImport = /from\s+['"]@sveltejs\/adapter-([^'"]+)['"]/.exec(text);
  if (adapterImport) adapter = adapterImport[1];
  if (!adapter) {
    const adapterCall = /adapter\s*:\s*(\w+)\s*\(/.exec(text);
    if (adapterCall) adapter = adapterCall[1];
  }

  // Prerender default
  const prerenderDefault = /prerender\s*[=:]\s*\{[^}]*default\s*:\s*(true|false)/s.exec(text);
  let prerender = null;
  if (prerenderDefault) prerender = prerenderDefault[1];
  else if (/\bprerender\s*[=:]\s*true\b/.test(text)) prerender = 'true';
  else if (/\bprerender\s*[=:]\s*false\b/.test(text)) prerender = 'false';

  // CSP
  const hasCsp = /\bcsp\s*:/.test(text);

  // Alias map keys
  const aliases = [];
  const aliasRe = /['"`]([^'"`$]+)['"`]\s*:/g;
  const aliasBlock = /alias\s*:\s*\{([^}]+)\}/s.exec(text);
  if (aliasBlock) {
    let am;
    while ((am = aliasRe.exec(aliasBlock[1])) !== null) aliases.push(am[1]);
  }

  // outDir
  let outDir = null;
  const outM = /\boutDir\s*:\s*['"`]([^'"`]+)['"`]/.exec(text);
  if (outM) outDir = outM[1];

  const metaItems = [
    adapter ? `<div class="sk-kv"><span>Adapter</span><span>${esc(adapter)}</span></div>` : '',
    prerender !== null ? `<div class="sk-kv"><span>Prerender</span><span><span class="${prerender === 'true' ? 'sk-badge-on' : 'sk-badge-off'}">${prerender}</span></span></div>` : '',
    hasCsp ? `<div class="sk-kv"><span>CSP</span><span><span class="sk-badge-on">configured</span></span></div>` : '',
    outDir ? `<div class="sk-kv"><span>Out Dir</span><span>${esc(outDir)}</span></div>` : '',
  ].filter(Boolean).join('');

  const aliasHtml = aliases.length
    ? `<div class="sk-sec"><h3>Aliases (${aliases.length})</h3><div class="sk-pills">${aliases.map((a) => `<span class="sk-pill">${esc(a)}</span>`).join('')}</div></div>`
    : '';

  const metaHtml = metaItems
    ? `<div class="sk-sec"><h3>Settings</h3><div class="sk-meta">${metaItems}</div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'sk-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="sk-title"><span class="badge-svelte">SvelteKit</span>${esc(name)}</div>
<div class="sk-sub">SvelteKit framework configuration</div>
${metaHtml}${aliasHtml}`;
  return { parentNode: host };
}
