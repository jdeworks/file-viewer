import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.prom-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-prom{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#e6522c;color:#fff;vertical-align:middle;margin-right:8px;}
.prom-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.prom-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.prom-sec{margin:14px 0;}
.prom-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.prom-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin:6px 0;background:var(--bg,#fff);}
.prom-card-name{font:13px/1.4 ui-monospace,monospace;font-weight:700;margin-bottom:4px;}
.prom-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:12px;}
.prom-kv-k{color:var(--fg-2,#888);min-width:130px;}
.prom-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.prom-pills{display:flex;flex-wrap:wrap;gap:6px;}
.prom-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.prom-pill.warn{background:#fff7ed;border-color:#fed7aa;color:#c2410c;}
.prom-tag{display:inline-block;font-size:11px;padding:2px 7px;border-radius:5px;background:#fff7ed;border:1px solid #fed7aa;color:#c2410c;margin-left:4px;}
`;

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<div class="prom-kv"><span class="prom-kv-k">${esc(label)}</span><span class="prom-kv-v">${esc(value)}</span></div>`;
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || \'\') || [])[0] || {};
  } catch { cfg = {}; }

  // Global settings
  const global = cfg.global || {};
  const scrapeInterval = global.scrape_interval || '';
  const evalInterval = global.evaluation_interval || '';
  const externalLabels = global.external_labels ? Object.entries(global.external_labels) : [];

  const globalHtml = (scrapeInterval || evalInterval || externalLabels.length) ? `
<div class="prom-sec"><h3>Global</h3><div class="prom-card">
${kv('scrape_interval', scrapeInterval)}
${kv('evaluation_interval', evalInterval)}
${externalLabels.length ? `<div class="prom-kv"><span class="prom-kv-k">external_labels</span><span class="prom-pills">${externalLabels.slice(0, 8).map(([k, v]) => `<span class="prom-pill">${esc(k)}=${esc(v)}</span>`).join('')}</span></div>` : ''}
</div></div>` : '';

  // Scrape configs
  const scrapeConfigs = Array.isArray(cfg.scrape_configs) ? cfg.scrape_configs : [];
  const scrapeHtml = scrapeConfigs.length ? `
<div class="prom-sec"><h3>Scrape Jobs (${scrapeConfigs.length})</h3>
${scrapeConfigs.slice(0, 10).map((job) => {
    const staticConfigs = Array.isArray(job.static_configs) ? job.static_configs : [];
    const targetCount = staticConfigs.reduce((sum, sc) => sum + (Array.isArray(sc.targets) ? sc.targets.length : 0), 0);
    const interval = job.scrape_interval || '';
    return `<div class="prom-card">
<div class="prom-card-name">${esc(job.job_name || '(unnamed)')}</div>
${interval ? kv('scrape_interval', interval) : ''}
${targetCount ? kv('targets', String(targetCount)) : ''}
${staticConfigs.length && staticConfigs[0]?.targets ? `<div class="prom-kv"><span class="prom-kv-k">targets</span><span class="prom-pills">${staticConfigs[0].targets.slice(0, 4).map((t) => `<span class="prom-pill">${esc(t)}</span>`).join('')}${staticConfigs[0].targets.length > 4 ? `<span style="font-size:11px;color:var(--fg-2,#888)">+${staticConfigs[0].targets.length - 4} more</span>` : ''}</span></div>` : ''}
</div>`;
  }).join('')}
${scrapeConfigs.length > 10 ? `<div style="font-size:12px;color:var(--fg-2,#888);padding:4px 0">…and ${scrapeConfigs.length - 10} more jobs</div>` : ''}
</div>` : '';

  // Rule files
  const ruleFiles = Array.isArray(cfg.rule_files) ? cfg.rule_files : [];
  const ruleHtml = ruleFiles.length ? `
<div class="prom-sec"><h3>Rule Files (${ruleFiles.length})</h3>
<div class="prom-pills">${ruleFiles.map((f) => `<span class="prom-pill">${esc(f)}</span>`).join('')}</div>
</div>` : '';

  // Alertmanager URLs
  const alerting = cfg.alerting || {};
  const alertmanagers = Array.isArray(alerting.alertmanagers) ? alerting.alertmanagers : [];
  const amUrls = [];
  for (const am of alertmanagers) {
    const staticConfigs = Array.isArray(am.static_configs) ? am.static_configs : [];
    for (const sc of staticConfigs) {
      if (Array.isArray(sc.targets)) amUrls.push(...sc.targets);
    }
  }
  const amHtml = amUrls.length ? `
<div class="prom-sec"><h3>Alertmanager</h3>
<div class="prom-pills">${amUrls.map((u) => `<span class="prom-pill warn">${esc(u)}</span>`).join('')}</div>
</div>` : '';

  // Remote write/read
  const remoteWrite = Array.isArray(cfg.remote_write) ? cfg.remote_write : [];
  const remoteRead = Array.isArray(cfg.remote_read) ? cfg.remote_read : [];
  const remoteHtml = (remoteWrite.length || remoteRead.length) ? `
<div class="prom-sec"><h3>Remote Storage</h3>
<div class="prom-pills">
${remoteWrite.map((rw) => `<span class="prom-pill">write → ${esc(rw.url || rw)}</span>`).join('')}
${remoteRead.map((rr) => `<span class="prom-pill">read ← ${esc(rr.url || rr)}</span>`).join('')}
</div></div>` : '';

  const sub = [scrapeConfigs.length ? `${scrapeConfigs.length} scrape job${scrapeConfigs.length !== 1 ? 's' : ''}` : '', scrapeInterval].filter(Boolean).join(' · ');

  const host = document.createElement('div');
  host.className = 'prom-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-prom">Prometheus</span>
  <span class="prom-title">Configuration</span>
  ${scrapeConfigs.length ? `<span class="prom-tag">${scrapeConfigs.length} job${scrapeConfigs.length !== 1 ? 's' : ''}</span>` : ''}
</div>
<div class="prom-sub">${esc(sub)}</div>
${globalHtml}${scrapeHtml}${ruleHtml}${amHtml}${remoteHtml}`;
  return { parentNode: host };
}
