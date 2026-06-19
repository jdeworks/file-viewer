const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.nyc-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-nyc{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#c8a000;color:#fff;vertical-align:middle;margin-right:8px;}
.nyc-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.nyc-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.nyc-sec{margin:14px 0;}
.nyc-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.nyc-thresholds{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;}
.nyc-thresh{padding:10px 14px;border-radius:8px;border:1px solid var(--border,#e0e0e0);text-align:center;}
.nyc-thresh-val{font-size:22px;font-weight:700;color:#c8a000;}
.nyc-thresh-label{font-size:11px;color:var(--fg-2,#888);margin-top:2px;}
.nyc-pills{display:flex;flex-wrap:wrap;gap:6px;}
.nyc-pill{font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.nyc-reporter-pill{background:#fff3cd;border-color:#ffc107;color:#664d03;}
`;

const THRESHOLD_KEYS = ['branches', 'lines', 'functions', 'statements'];

export function render(intake) {
  let cfg = {};
  try { cfg = JSON.parse(intake.text || '{}'); } catch { cfg = {}; }

  const reporters = [].concat(cfg.reporter || cfg.reporters || []).filter(Boolean);
  const include = [].concat(cfg.include || []).filter(Boolean);
  const exclude = [].concat(cfg.exclude || []).filter(Boolean);
  const checkCoverage = !!cfg['check-coverage'] || cfg.checkCoverage;
  const all = !!cfg.all;
  const sourceMap = cfg.sourceMap !== false;
  const instrument = cfg.instrument !== false;

  const thresholds = THRESHOLD_KEYS.filter((k) => cfg[k] != null);
  const threshHtml = thresholds.map((k) => `
    <div class="nyc-thresh">
      <div class="nyc-thresh-val">${esc(cfg[k])}%</div>
      <div class="nyc-thresh-label">${esc(k)}</div>
    </div>`).join('');

  const reporterHtml = reporters.length
    ? reporters.map((r) => `<span class="nyc-pill nyc-reporter-pill">${esc(r)}</span>`).join('')
    : '<span style="color:var(--fg-2,#888);font-size:12px">default (text)</span>';

  const includeHtml = include.slice(0, 8).map((p) => `<span class="nyc-pill" style="background:#e8f5e9;border-color:#a5d6a7;color:#1b5e20">${esc(p)}</span>`).join('');
  const excludeHtml = exclude.slice(0, 8).map((p) => `<span class="nyc-pill" style="background:#fef2f2;border-color:#fca5a5;color:#7f1d1d">!${esc(p)}</span>`).join('');

  const flags = [
    checkCoverage ? 'check-coverage: on' : '',
    all ? 'all: true' : '',
    !sourceMap ? 'sourceMap: off' : '',
    !instrument ? 'instrument: off' : '',
  ].filter(Boolean);

  const flagsHtml = flags.length
    ? `<div class="nyc-sec"><h3>Flags</h3><div class="nyc-pills">${flags.map((f) => `<span class="nyc-pill">${esc(f)}</span>`).join('')}</div></div>`
    : '';

  const sub = [
    thresholds.length ? `${thresholds.length} threshold${thresholds.length !== 1 ? 's' : ''}` : '',
    reporters.length ? `${reporters.length} reporter${reporters.length !== 1 ? 's' : ''}` : '',
    checkCoverage ? 'check-coverage on' : '',
  ].filter(Boolean).join(' · ');

  const host = document.createElement('div');
  host.className = 'nyc-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="nyc-title"><span class="badge-nyc">NYC</span>.nycrc.json</div>
<div class="nyc-sub">${esc(sub) || 'Istanbul code coverage configuration'}</div>
${thresholds.length ? `<div class="nyc-sec"><h3>Coverage thresholds</h3><div class="nyc-thresholds">${threshHtml}</div></div>` : ''}
<div class="nyc-sec"><h3>Reporters</h3><div class="nyc-pills">${reporterHtml}</div></div>
${(include.length || exclude.length) ? `<div class="nyc-sec"><h3>Include / Exclude</h3><div class="nyc-pills">${includeHtml}${excludeHtml}</div></div>` : ''}
${flagsHtml}`;
  return { parentNode: host };
}
