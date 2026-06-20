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
.scalafmt-kv-key{color:var(--fg-2,#888);min-width:130px;flex-shrink:0;}
.scalafmt-kv-val{font-family:ui-monospace,monospace;}
`;

function parseScalafmt(text) {
  const get = (key) => {
    const m = new RegExp(`^${key}\\s*=\\s*(.+)`, 'm').exec(text);
    return m ? m[1].trim().replace(/^"|"$/g, '') : null;
  };
  return {
    version: get('version'),
    dialect: get('runner\\.dialect'),
    maxColumn: get('maxColumn'),
    indent: get('indent\\.main'),
    align: get('align\\.preset'),
    rewriteRules: (() => { const m = /rewrite\.rules\s*=\s*\[([^\]]*)\]/.exec(text); return m ? m[1].trim() : null; })(),
  };
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'scalafmt-doc';
  const text = intake.text || '';
  const info = parseScalafmt(text);

  const kvs = [
    ['version', info.version],
    ['runner.dialect', info.dialect],
    ['maxColumn', info.maxColumn],
    ['indent.main', info.indent],
    ['align.preset', info.align],
    ['rewrite.rules', info.rewriteRules],
  ].filter(([, v]) => v);

  const detailsHtml = kvs.length ? `<div class="scalafmt-sec"><h3>Settings</h3><div class="scalafmt-card">${kvs.map(([k, v]) => `<div class="scalafmt-kv"><span class="scalafmt-kv-key">${esc(k)}</span><span class="scalafmt-kv-val">${esc(v)}</span></div>`).join('')}</div></div>` : '';

  host.innerHTML = `<style>${CSS}</style>
<div class="scalafmt-title"><span class="scalafmt-badge">Scalafmt</span>Scalafmt configuration</div>
<div class="scalafmt-sub">${esc(info.version ? `v${info.version}` : 'Scala formatter config')}</div>
${detailsHtml}`;

  return { parentNode: host };
}
