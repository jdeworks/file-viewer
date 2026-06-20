const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.scalafmt-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.scalafmt-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#DC322F;color:#fff;vertical-align:middle;margin-right:8px;}
.scalafmt-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.scalafmt-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.scalafmt-sec{margin:12px 0;}
.scalafmt-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.scalafmt-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;font-size:13px;}
.scalafmt-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:12px;}
.scalafmt-kv-key{color:var(--fg-2,#888);min-width:160px;flex-shrink:0;}
.scalafmt-kv-val{font-family:ui-monospace,monospace;}
.scalafmt-chips{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0;}
.scalafmt-chip{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;background:var(--bg-3,#e8f0fe);color:var(--fg,#24292f);font-family:ui-monospace,monospace;}
.scalafmt-chip.dialect{background:#fff3cd;color:#856404;}
.scalafmt-chip.align{background:#d4edda;color:#155724;}
.scalafmt-chip.rewrite{background:#f0e6ff;color:#5a2d82;}
`;

function parseScalafmt(text) {
  const get = (key) => {
    const m = new RegExp(`^\\s*${key}\\s*=\\s*(.+)`, 'm').exec(text);
    return m ? m[1].trim().replace(/^"|"$/g, '') : null;
  };

  const rewriteMatch = /rewrite\.rules\s*=\s*\[([^\]]*)\]/.exec(text);
  const rewriteRules = rewriteMatch
    ? rewriteMatch[1].split(',').map((r) => r.trim()).filter(Boolean).sort()
    : [];

  return {
    version: get('version'),
    style: get('style') || get('preset'),
    dialect: get('runner\\.dialect'),
    maxColumn: get('maxColumn'),
    alignPreset: get('align\\.preset'),
    indentMain: get('indent\\.main'),
    indentSignificant: get('indent\\.significant'),
    rewriteRules,
    docstringsStyle: get('docstrings\\.style'),
    newlinesTopLevel: get('newlines\\.topLevelStatementBlankLines'),
    newlinesCurly: get('newlines\\.beforeCurlyLambdaParams'),
  };
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'scalafmt-doc';
  const text = intake.text || '';
  const info = parseScalafmt(text);

  const kvs = [
    ['version', info.version],
    ['style / preset', info.style],
    ['maxColumn', info.maxColumn],
    ['indent.main', info.indentMain],
    ['indent.significant', info.indentSignificant],
    ['docstrings.style', info.docstringsStyle],
    ['newlines.topLevelStatementBlankLines', info.newlinesTopLevel],
    ['newlines.beforeCurlyLambdaParams', info.newlinesCurly],
  ].filter(([, v]) => v);

  const dialectHtml = info.dialect
    ? `<div class="scalafmt-sec"><h3>Scala Dialect</h3><div class="scalafmt-chips"><span class="scalafmt-chip dialect">${esc(info.dialect)}</span></div></div>`
    : '';

  const alignHtml = info.alignPreset
    ? `<div class="scalafmt-sec"><h3>Alignment</h3><div class="scalafmt-chips"><span class="scalafmt-chip align">align.preset = ${esc(info.alignPreset)}</span></div></div>`
    : '';

  const rewriteHtml = info.rewriteRules.length
    ? `<div class="scalafmt-sec"><h3>Rewrite Rules</h3><div class="scalafmt-chips">${info.rewriteRules.map((r) => `<span class="scalafmt-chip rewrite">${esc(r)}</span>`).join('')}</div></div>`
    : '';

  const settingsHtml = kvs.length
    ? `<div class="scalafmt-sec"><h3>Settings</h3><div class="scalafmt-card">${kvs.map(([k, v]) => `<div class="scalafmt-kv"><span class="scalafmt-kv-key">${esc(k)}</span><span class="scalafmt-kv-val">${esc(v)}</span></div>`).join('')}</div></div>`
    : '';

  host.innerHTML = `<style>${CSS}</style>
<div class="scalafmt-title"><span class="scalafmt-badge">Scalafmt</span>Scalafmt configuration</div>
<div class="scalafmt-sub">${esc(info.version ? `Scala formatter · v${info.version}` : 'Scala formatter config')}</div>
${dialectHtml}${alignHtml}${rewriteHtml}${settingsHtml}`;

  return { parentNode: host };
}
