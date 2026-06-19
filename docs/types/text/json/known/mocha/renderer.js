const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.moc-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-moc{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#8d6748;color:#fff;vertical-align:middle;margin-right:8px;}
.moc-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.moc-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.moc-sec{margin:12px 0;}
.moc-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.moc-pills{display:flex;flex-wrap:wrap;gap:6px;}
.moc-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.moc-pill.on{background:#dcfce7;border-color:#86efac;color:#166534;}
.moc-pill.off{background:#fee2e2;border-color:#fca5a5;color:#991b1b;}
.moc-mono{font:12px/1.4 ui-monospace,monospace;}
`;

export function render(intake) {
  let cfg = {};
  try { cfg = JSON.parse(intake.text || '{}'); } catch { cfg = {}; }

  const spec = cfg.spec || '';
  const reporter = cfg.reporter || 'spec';
  const timeout = cfg.timeout ?? null;
  const parallel = cfg.parallel ?? false;
  const recursive = cfg.recursive ?? false;
  const require = Array.isArray(cfg.require) ? cfg.require : (cfg.require ? [cfg.require] : []);
  const ignore = Array.isArray(cfg.ignore) ? cfg.ignore : (cfg.ignore ? [cfg.ignore] : []);

  const specHtml = spec
    ? `<div class="moc-sec"><h3>Spec pattern</h3><div class="moc-pills"><span class="moc-pill moc-mono">${esc(spec)}</span></div></div>`
    : '';

  const reqHtml = require.length
    ? `<div class="moc-sec"><h3>Require (${require.length})</h3><div class="moc-pills">${require.slice(0, 6).map((r) => `<span class="moc-pill moc-mono">${esc(r)}</span>`).join('')}</div></div>`
    : '';

  const optHtml = `<div class="moc-sec"><h3>Options</h3><div class="moc-pills">
    <span class="moc-pill moc-mono">reporter: ${esc(reporter)}</span>
    ${timeout != null ? `<span class="moc-pill moc-mono">timeout: ${esc(timeout)}ms</span>` : ''}
    <span class="moc-pill ${parallel ? 'on' : 'off'}">parallel: ${parallel ? 'yes' : 'no'}</span>
    ${recursive ? `<span class="moc-pill on">recursive</span>` : ''}
  </div></div>`;

  const ignoreHtml = ignore.length
    ? `<div class="moc-sec"><h3>Ignore</h3><div class="moc-pills">${ignore.slice(0, 4).map((i) => `<span class="moc-pill off moc-mono">${esc(i)}</span>`).join('')}</div></div>`
    : '';

  const sub = [
    spec ? spec : '',
    reporter !== 'spec' ? `reporter: ${reporter}` : '',
    parallel ? 'parallel' : '',
  ].filter(Boolean).join(' · ');

  const host = document.createElement('div');
  host.className = 'moc-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="moc-title"><span class="badge-moc">Mocha</span>.mocharc.json</div>
<div class="moc-sub">${esc(sub) || 'Mocha test runner configuration'}</div>
${specHtml}${reqHtml}${optHtml}${ignoreHtml}`;
  return { parentNode: host };
}
