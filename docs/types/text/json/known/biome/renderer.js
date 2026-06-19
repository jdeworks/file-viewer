const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.bmo-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-bmo{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#60a5fa;color:#1e3a5f;vertical-align:middle;margin-right:8px;}
.bmo-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.bmo-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.bmo-sec{margin:12px 0;}
.bmo-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.bmo-pills{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0;}
.bmo-pill{display:inline-flex;align-items:center;gap:4px;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.bmo-on{background:#dcfce7;border-color:#86efac;color:#166534;}
.bmo-off{background:#fee2e2;border-color:#fca5a5;color:#991b1b;}
.bmo-mono{font:12px/1.4 ui-monospace,monospace;}
`;

export function render(intake) {
  let cfg;
  try { cfg = JSON.parse(intake.text || '{}'); } catch { return { parentNode: Object.assign(document.createElement('div'), { textContent: 'Invalid Biome JSON.' }) }; }

  const formatter = cfg.formatter || {};
  const linter = cfg.linter || {};
  const organizeImports = cfg.organizeImports || {};
  const vcs = cfg.vcs || {};
  const files = cfg.files || {};

  const fmtEnabled = formatter.enabled !== false;
  const fmtIndent = formatter.indentStyle || 'tab';
  const fmtIndentWidth = formatter.indentWidth ?? 2;
  const fmtLineWidth = formatter.lineWidth ?? 80;

  const lintEnabled = linter.enabled !== false;
  const lintRules = linter.rules || {};
  const ruleCount = Object.keys(lintRules).filter((k) => k !== 'recommended' && k !== 'all').length;
  const recommended = lintRules.recommended === true || lintRules.recommended === undefined;

  const importEnabled = organizeImports.enabled !== false;
  const vcsEnabled = vcs.enabled === true;
  const vcsClient = vcs.clientKind || null;

  const ignores = Array.isArray(files.ignore) ? files.ignore : [];
  const includes = Array.isArray(files.include) ? files.include : [];

  const host = document.createElement('div');
  host.className = 'bmo-doc';

  const fmtHtml = `<div class="bmo-sec"><h3>Formatter</h3><div class="bmo-pills">
    <span class="bmo-pill ${fmtEnabled ? 'bmo-on' : 'bmo-off'}">${fmtEnabled ? 'enabled' : 'disabled'}</span>
    ${fmtEnabled ? `<span class="bmo-pill"><span class="bmo-mono">indent: ${esc(fmtIndent)} ${esc(fmtIndentWidth)}</span></span>` : ''}
    ${fmtEnabled ? `<span class="bmo-pill"><span class="bmo-mono">line width: ${esc(fmtLineWidth)}</span></span>` : ''}
  </div></div>`;

  const lintHtml = `<div class="bmo-sec"><h3>Linter</h3><div class="bmo-pills">
    <span class="bmo-pill ${lintEnabled ? 'bmo-on' : 'bmo-off'}">${lintEnabled ? 'enabled' : 'disabled'}</span>
    ${recommended ? '<span class="bmo-pill bmo-on">recommended rules</span>' : ''}
    ${ruleCount ? `<span class="bmo-pill">${ruleCount} rule group${ruleCount !== 1 ? 's' : ''} configured</span>` : ''}
  </div></div>`;

  const importsHtml = `<div class="bmo-sec"><h3>Organize imports</h3><div class="bmo-pills">
    <span class="bmo-pill ${importEnabled ? 'bmo-on' : 'bmo-off'}">${importEnabled ? 'enabled' : 'disabled'}</span>
  </div></div>`;

  const vcsHtml = vcsEnabled
    ? `<div class="bmo-sec"><h3>VCS integration</h3><div class="bmo-pills">
        <span class="bmo-pill bmo-on">enabled</span>
        ${vcsClient ? `<span class="bmo-pill">${esc(vcsClient)}</span>` : ''}
      </div></div>`
    : '';

  const filesHtml = (ignores.length || includes.length)
    ? `<div class="bmo-sec"><h3>Files</h3><div class="bmo-pills">
        ${includes.slice(0, 4).map((f) => `<span class="bmo-pill bmo-mono">${esc(f)}</span>`).join('')}
        ${ignores.slice(0, 4).map((f) => `<span class="bmo-pill bmo-mono" style="opacity:.7">ignore: ${esc(f)}</span>`).join('')}
      </div></div>`
    : '';

  host.innerHTML = `<style>${CSS}</style>
<div class="bmo-title"><span class="badge-bmo">Biome</span>biome.json</div>
<div class="bmo-sub">${[fmtEnabled && 'format', lintEnabled && 'lint', importEnabled && 'imports'].filter(Boolean).join(' · ')}</div>
${fmtHtml}
${lintHtml}
${importsHtml}
${vcsHtml}
${filesHtml}`;

  return { parentNode: host };
}
