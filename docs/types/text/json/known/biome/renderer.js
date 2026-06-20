const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.biome-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-biome{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#60a5fa;color:#1e3a5f;vertical-align:middle;margin-right:8px;}
.biome-doc-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.biome-doc-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.biome-doc-sec{margin:12px 0;}
.biome-doc-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.biome-doc-pills{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0;}
.biome-doc-pill{display:inline-flex;align-items:center;gap:4px;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.biome-doc-on{background:#dcfce7;border-color:#86efac;color:#166534;}
.biome-doc-off{background:#fee2e2;border-color:#fca5a5;color:#991b1b;}
.biome-doc-mono{font:12px/1.4 ui-monospace,monospace;}
`;

export function render(intake) {
  let cfg;
  try { cfg = intake.parsed ?? JSON.parse(intake.text || '{}'); } catch { return { parentNode: Object.assign(document.createElement('div'), { textContent: 'Invalid Biome JSON.' }) }; }

  const formatter = cfg.formatter || {};
  const linter = cfg.linter || {};
  const organizeImports = cfg.organizeImports || {};
  const vcs = cfg.vcs || {};
  const files = cfg.files || {};
  const js = cfg.javascript?.formatter || {};

  const fmtEnabled = formatter.enabled !== false;
  const fmtIndent = formatter.indentStyle || 'tab';
  const fmtIndentWidth = formatter.indentWidth ?? 2;
  const fmtLineWidth = formatter.lineWidth ?? 80;
  const fmtLineEnding = formatter.lineEnding || null;

  const lintEnabled = linter.enabled !== false;
  const lintRules = linter.rules || {};
  const recommended = lintRules.recommended === true || lintRules.recommended === undefined;
  // Count errors and warnings from nested rule objects
  let errCount = 0; let warnCount = 0;
  for (const [k, v] of Object.entries(lintRules)) {
    if (k === 'recommended' || k === 'all') continue;
    if (typeof v === 'object' && v !== null) {
      for (const sev of Object.values(v)) {
        if (sev === 'error') errCount++;
        else if (sev === 'warn') warnCount++;
      }
    }
  }

  const importEnabled = organizeImports.enabled !== false;
  const vcsEnabled = vcs.enabled === true;
  const vcsClient = vcs.clientKind || null;
  const vcsUseIgnore = vcs.useIgnoreFile;

  const ignores = Array.isArray(files.ignore) ? files.ignore : [];
  const includes = Array.isArray(files.include) ? files.include : [];

  const host = document.createElement('div');
  host.className = 'biome-doc';

  const fmtHtml = fmtEnabled
    ? `<div class="biome-doc-sec"><h3>Formatter</h3><div class="biome-doc-pills">
    <span class="biome-doc-pill biome-doc-on">enabled</span>
    <span class="biome-doc-pill"><span class="biome-doc-mono">indent: ${esc(fmtIndent)} ${esc(fmtIndentWidth)}</span></span>
    <span class="biome-doc-pill"><span class="biome-doc-mono">lineWidth: ${esc(fmtLineWidth)}</span></span>
    ${fmtLineEnding ? `<span class="biome-doc-pill"><span class="biome-doc-mono">${esc(fmtLineEnding)}</span></span>` : ''}
  </div></div>`
    : `<div class="biome-doc-sec"><h3>Formatter</h3><div class="biome-doc-pills"><span class="biome-doc-pill biome-doc-off">disabled</span></div></div>`;

  const lintHtml = `<div class="biome-doc-sec"><h3>Linter</h3><div class="biome-doc-pills">
    <span class="biome-doc-pill ${lintEnabled ? 'biome-doc-on' : 'biome-doc-off'}">${lintEnabled ? 'enabled' : 'disabled'}</span>
    ${recommended ? '<span class="biome-doc-pill biome-doc-on">recommended</span>' : '<span class="biome-doc-pill biome-doc-off">no recommended</span>'}
    ${errCount ? `<span class="biome-doc-pill" style="background:#fee2e2;border-color:#fca5a5;color:#991b1b">${errCount} error${errCount !== 1 ? 's' : ''}</span>` : ''}
    ${warnCount ? `<span class="biome-doc-pill" style="background:#fff7ed;border-color:#fdba74;color:#9a3412">${warnCount} warning${warnCount !== 1 ? 's' : ''}</span>` : ''}
  </div></div>`;

  const jsHtml = js.quoteStyle || js.trailingCommas || js.semicolons
    ? `<div class="biome-doc-sec"><h3>JS Settings</h3><div class="biome-doc-pills">
    ${js.quoteStyle ? `<span class="biome-doc-pill"><span class="biome-doc-mono">quoteStyle: ${esc(js.quoteStyle)}</span></span>` : ''}
    ${js.trailingCommas ? `<span class="biome-doc-pill"><span class="biome-doc-mono">trailingCommas: ${esc(js.trailingCommas)}</span></span>` : ''}
    ${js.semicolons ? `<span class="biome-doc-pill"><span class="biome-doc-mono">semicolons: ${esc(js.semicolons)}</span></span>` : ''}
  </div></div>`
    : '';

  const vcsHtml = vcsEnabled
    ? `<div class="biome-doc-sec"><h3>VCS</h3><div class="biome-doc-pills">
        <span class="biome-doc-pill biome-doc-on">enabled</span>
        ${vcsClient ? `<span class="biome-doc-pill">${esc(vcsClient)}</span>` : ''}
        ${vcsUseIgnore ? '<span class="biome-doc-pill">useIgnoreFile</span>' : ''}
      </div></div>`
    : '';

  const filesHtml = (ignores.length || includes.length)
    ? `<div class="biome-doc-sec"><h3>Ignore patterns</h3><div class="biome-doc-pills">
        ${ignores.slice(0, 6).map((f) => `<span class="biome-doc-pill biome-doc-mono">${esc(f)}</span>`).join('')}
      </div></div>`
    : '';

  host.innerHTML = `<style>${CSS}</style>
<div class="biome-doc-title"><span class="badge-biome">Biome</span>biome.json</div>
<div class="biome-doc-sub">Biome JS toolchain</div>
${fmtHtml}
${lintHtml}
${jsHtml}
${vcsHtml}
${filesHtml}`;

  return { parentNode: host };
}
