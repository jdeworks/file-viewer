const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const OPTION_LABELS = {
  semi: 'Semicolons',
  singleQuote: 'Single quotes',
  jsxSingleQuote: 'JSX single quotes',
  tabWidth: 'Tab width',
  useTabs: 'Use tabs',
  printWidth: 'Print width',
  trailingComma: 'Trailing comma',
  bracketSpacing: 'Bracket spacing',
  bracketSameLine: 'Bracket same line',
  arrowParens: 'Arrow fn parens',
  proseWrap: 'Prose wrap',
  endOfLine: 'End of line',
  htmlWhitespaceSensitivity: 'HTML whitespace',
  embeddedLanguageFormatting: 'Embedded lang format',
  singleAttributePerLine: 'Single attr per line',
  quoteProps: 'Quote props',
  vueIndentScriptAndStyle: 'Vue indent script/style',
};

const CSS = `
.prettier-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.prettier-doc .badge-prettier{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#f7b93e;color:#1a1a1a;vertical-align:middle;margin-right:8px;}
.prettier-doc .prt-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.prettier-doc .prt-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.prettier-doc .prt-sec{margin:12px 0;}
.prettier-doc .prt-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.prettier-doc .prt-table{width:100%;border-collapse:collapse;font-size:13px;}
.prettier-doc .prt-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.prettier-doc .prt-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.prettier-doc .prt-key{font:12px/1.4 ui-monospace,monospace;color:var(--fg-2,#888);}
.prettier-doc .prt-val{font:12px/1.4 ui-monospace,monospace;font-weight:600;}
.prettier-doc .prt-val.on{color:#16a34a;}
.prettier-doc .prt-val.off{color:#dc2626;}
.prettier-doc .prt-override{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0;}
.prettier-doc .prt-override-chip{font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
`;

function fmtVal(key, val) {
  if (typeof val === 'boolean') {
    const cls = val ? 'on' : 'off';
    return `<span class="prt-val ${cls}">${val}</span>`;
  }
  return `<span class="prt-val">${esc(String(val))}</span>`;
}

export function render(intake) {
  let cfg;
  try { cfg = intake.parsed ?? JSON.parse(intake.text || '{}'); } catch {
    const host = document.createElement('div');
    host.className = 'prettier-doc';
    host.innerHTML = `<style>${CSS}</style><div class="prt-title"><span class="badge-prettier">Prettier</span>Invalid JSON</div>`;
    return { parentNode: host };
  }

  const knownKeys = Object.keys(OPTION_LABELS);
  const overrides = Array.isArray(cfg.overrides) ? cfg.overrides : [];
  const optionEntries = Object.entries(cfg).filter(([k]) => k !== 'overrides' && k !== '$schema');
  const unknownEntries = optionEntries.filter(([k]) => !knownKeys.includes(k));

  const rowsHtml = optionEntries.map(([k, v]) => {
    const label = OPTION_LABELS[k] || k;
    return `<tr><td><span class="prt-key">${esc(label)}</span></td><td>${fmtVal(k, v)}</td></tr>`;
  }).join('');

  const overridesHtml = overrides.length ? `<div class="prt-sec">
    <h3>Overrides (${overrides.length})</h3>
    <div class="prt-override">
      ${overrides.map((o) => {
        const files = Array.isArray(o.files) ? o.files.join(', ') : (o.files || '');
        const keys = o.options ? Object.keys(o.options).length : 0;
        return `<span class="prt-override-chip">${esc(files)} · ${keys} option${keys !== 1 ? 's' : ''}</span>`;
      }).join('')}
    </div>
  </div>` : '';

  const host = document.createElement('div');
  host.className = 'prettier-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="prt-title"><span class="badge-prettier">Prettier</span>Prettier config</div>
<div class="prt-sub">${optionEntries.length} option${optionEntries.length !== 1 ? 's' : ''}${overrides.length ? ` · ${overrides.length} override${overrides.length !== 1 ? 's' : ''}` : ''}${unknownEntries.length ? ` · ${unknownEntries.length} custom` : ''}</div>
${optionEntries.length ? `<div class="prt-sec"><h3>Options</h3><table class="prt-table"><thead><tr><th>Option</th><th>Value</th></tr></thead><tbody>${rowsHtml}</tbody></table></div>` : ''}
${overridesHtml}`;

  return { parentNode: host };
}
