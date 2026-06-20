import { parseIni } from '../../renderer.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.glances-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-glances{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#008563;color:#fff;vertical-align:middle;margin-right:8px;}
.glances-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.glances-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.glances-sec{margin:14px 0;}
.glances-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.glances-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.glances-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:12px;}
.glances-kv-k{color:var(--fg-2,#888);min-width:160px;font-family:ui-monospace,monospace;}
.glances-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.glances-pills{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;}
.glances-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.glances-pill-stat{background:#e6f7f3;border-color:#80cbb8;color:#005a43;}
.glances-threshold-row{display:flex;gap:6px;flex-wrap:wrap;margin:3px 0;}
.glances-thr{font-size:11px;padding:2px 8px;border-radius:5px;font-family:ui-monospace,monospace;}
.glances-thr-careful{background:#fef9c3;border:1px solid #fde047;color:#713f12;}
.glances-thr-warning{background:#fff7ed;border:1px solid #fed7aa;color:#c2410c;}
.glances-thr-critical{background:#fee2e2;border:1px solid #fca5a5;color:#991b1b;}
`;

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<div class="glances-kv"><span class="glances-kv-k">${esc(label)}</span><span class="glances-kv-v">${esc(value)}</span></div>`;
}

function sectionMap(sections) {
  const m = {};
  for (const s of sections) {
    const key = (s.name || '').toLowerCase();
    const pairs = {};
    for (const p of s.pairs) pairs[p.key.toLowerCase()] = p.value;
    m[key] = pairs;
  }
  return m;
}

const STAT_SECTIONS = ['cpu', 'mem', 'memswap', 'diskio', 'network', 'processlist', 'percpu', 'irq', 'folder', 'sensors', 'load', 'docker', 'ports', 'wifi', 'cloud', 'smart'];

export function render(intake) {
  const sections = parseIni(intake.text || '');
  const cfg = sectionMap(sections);

  // [global]
  const global_ = cfg['global'] || {};
  const historySize = global_['history_size'] || '';
  const globalRefresh = global_['refresh'] || '';
  const globalHtml = (historySize || globalRefresh) ? `
<div class="glances-sec"><h3>Global</h3><div class="glances-card">
${kv('history_size', historySize)}
${kv('refresh', globalRefresh ? `${globalRefresh}s` : '')}
</div></div>` : '';

  // [webserver]
  const ws = cfg['webserver'] || {};
  const wsHost = ws['host'] || '';
  const wsPort = ws['port'] || '';
  const wsOpenBrowser = ws['open_browser'] || '';
  const wsTimeBetweenSaving = ws['time_between_saving'] || '';
  const wsHtml = (wsHost || wsPort || wsOpenBrowser || wsTimeBetweenSaving) ? `
<div class="glances-sec"><h3>Webserver</h3><div class="glances-card">
${kv('host', wsHost)}
${kv('port', wsPort)}
${kv('open_browser', wsOpenBrowser)}
${kv('time_between_saving', wsTimeBetweenSaving ? `${wsTimeBetweenSaving}s` : '')}
</div></div>` : '';

  // Stat sections present
  const presentStats = STAT_SECTIONS.filter((s) => cfg[s] !== undefined);
  const statsHtml = presentStats.length ? `
<div class="glances-sec"><h3>Stats</h3>
<div class="glances-pills">${presentStats.map((s) => `<span class="glances-pill glances-pill-stat">${esc(s)}</span>`).join('')}</div>
</div>` : '';

  // [thresholds]
  const thr = cfg['thresholds'] || {};
  const thrKeys = Object.keys(thr);
  let thrHtml = '';
  if (thrKeys.length) {
    // Group by metric
    const metrics = new Set(thrKeys.map((k) => k.replace(/_careful$|_warning$|_critical$/, '')));
    const rows = [...metrics].map((m) => {
      const careful = thr[`${m}_careful`];
      const warning = thr[`${m}_warning`];
      const critical = thr[`${m}_critical`];
      const chips = [
        careful ? `<span class="glances-thr glances-thr-careful">${esc(m)} careful: ${esc(careful)}</span>` : '',
        warning ? `<span class="glances-thr glances-thr-warning">${esc(m)} warning: ${esc(warning)}</span>` : '',
        critical ? `<span class="glances-thr glances-thr-critical">${esc(m)} critical: ${esc(critical)}</span>` : '',
      ].filter(Boolean).join('');
      return chips ? `<div class="glances-threshold-row">${chips}</div>` : '';
    }).filter(Boolean).join('');
    thrHtml = rows ? `<div class="glances-sec"><h3>Thresholds</h3><div class="glances-card">${rows}</div></div>` : '';
  }

  // [outputs]
  const out = cfg['outputs'] || {};
  const csvFile = out['csv_file_name'] || '';
  const htmlPath = out['html_output_path'] || '';
  const outputsHtml = (csvFile || htmlPath) ? `
<div class="glances-sec"><h3>Outputs</h3><div class="glances-card">
${kv('csv_file_name', csvFile)}
${kv('html_output_path', htmlPath)}
</div></div>` : '';

  // Sub-summary
  const subParts = [];
  if (wsPort) subParts.push(`port ${wsPort}`);
  if (globalRefresh) subParts.push(`refresh: ${globalRefresh}s`);
  if (presentStats.length) subParts.push(`${presentStats.length} stat section${presentStats.length !== 1 ? 's' : ''}`);
  const sub = subParts.join(' · ');

  const host = document.createElement('div');
  host.className = 'glances-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-glances">Glances</span>
  <span class="glances-title">glances.conf</span>
</div>
<div class="glances-sub">${esc(sub)}</div>
${globalHtml}${wsHtml}${statsHtml}${thrHtml}${outputsHtml}`;
  return { parentNode: host };
}
