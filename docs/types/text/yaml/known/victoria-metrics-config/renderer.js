import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.vmcfg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-vm{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#4A148C;color:#fff;vertical-align:middle;margin-right:8px;}
.vmcfg-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.vmcfg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.vmcfg-sec{margin:14px 0;}
.vmcfg-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.vmcfg-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin:6px 0;background:var(--bg,#fff);}
.vmcfg-card-name{font:13px/1.4 ui-monospace,monospace;font-weight:700;margin-bottom:4px;}
.vmcfg-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:12px;}
.vmcfg-kv-k{color:var(--fg-2,#888);min-width:130px;}
.vmcfg-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.vmcfg-pills{display:flex;flex-wrap:wrap;gap:6px;}
.vmcfg-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.vmcfg-pill.warn{background:#f3e5f5;border-color:#ce93d8;color:#4A148C;}
.vmcfg-tag{display:inline-block;font-size:11px;padding:2px 7px;border-radius:5px;background:#f3e5f5;border:1px solid #ce93d8;color:#4A148C;margin-left:4px;}
`;

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<div class="vmcfg-kv"><span class="vmcfg-kv-k">${esc(label)}</span><span class="vmcfg-kv-v">${esc(value)}</span></div>`;
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = {}; }

  // Global settings
  const global = cfg.global || {};
  const scrapeInterval = global.scrape_interval || '';
  const evalInterval = global.evaluation_interval || '';
  const externalLabels = global.external_labels ? Object.entries(global.external_labels) : [];

  const globalHtml = (scrapeInterval || evalInterval || externalLabels.length) ? `
<div class="vmcfg-sec"><h3>Global</h3><div class="vmcfg-card">
${kv('scrape_interval', scrapeInterval)}
${kv('evaluation_interval', evalInterval)}
${externalLabels.length ? `<div class="vmcfg-kv"><span class="vmcfg-kv-k">external_labels</span><span class="vmcfg-pills">${externalLabels.slice(0, 8).map(([k, v]) => `<span class="vmcfg-pill">${esc(k)}=${esc(v)}</span>`).join('')}</span></div>` : ''}
</div></div>` : '';

  // Scrape configs
  const scrapeConfigs = Array.isArray(cfg.scrape_configs) ? cfg.scrape_configs : [];
  const scrapeHtml = scrapeConfigs.length ? `
<div class="vmcfg-sec"><h3>Scrape Jobs (${scrapeConfigs.length})</h3>
${scrapeConfigs.slice(0, 10).map((job) => {
    const staticConfigs = Array.isArray(job.static_configs) ? job.static_configs : [];
    const targetCount = staticConfigs.reduce((sum, sc) => sum + (Array.isArray(sc.targets) ? sc.targets.length : 0), 0);
    const interval = job.scrape_interval || '';
    const firstTargets = staticConfigs.length && Array.isArray(staticConfigs[0]?.targets) ? staticConfigs[0].targets : [];
    return `<div class="vmcfg-card">
<div class="vmcfg-card-name">${esc(job.job_name || '(unnamed)')}</div>
${interval ? kv('scrape_interval', interval) : ''}
${targetCount ? kv('targets', String(targetCount)) : ''}
${firstTargets.length ? `<div class="vmcfg-kv"><span class="vmcfg-kv-k">targets</span><span class="vmcfg-pills">${firstTargets.slice(0, 4).map((t) => `<span class="vmcfg-pill">${esc(t)}</span>`).join('')}${firstTargets.length > 4 ? `<span style="font-size:11px;color:var(--fg-2,#888)">+${firstTargets.length - 4} more</span>` : ''}</span></div>` : ''}
</div>`;
  }).join('')}
${scrapeConfigs.length > 10 ? `<div style="font-size:12px;color:var(--fg-2,#888);padding:4px 0">…and ${scrapeConfigs.length - 10} more jobs</div>` : ''}
</div>` : '';

  // Remote write
  const remoteWrite = Array.isArray(cfg.remote_write) ? cfg.remote_write : [];
  const remoteHtml = remoteWrite.length ? `
<div class="vmcfg-sec"><h3>Remote Write (${remoteWrite.length})</h3>
<div class="vmcfg-pills">
${remoteWrite.map((rw) => `<span class="vmcfg-pill warn">${esc(rw.url || String(rw))}</span>`).join('')}
</div></div>` : '';

  // Rule groups (vmalert style)
  const groups = Array.isArray(cfg.groups) ? cfg.groups : [];
  const ruleGroupsHtml = groups.length ? (() => {
    const alertNames = groups.flatMap((g) => Array.isArray(g.rules) ? g.rules.map((r) => r.alert).filter(Boolean) : []);
    return `
<div class="vmcfg-sec"><h3>Alert Rule Groups (${groups.length})</h3>
${groups.slice(0, 5).map((g) => {
      const rules = Array.isArray(g.rules) ? g.rules : [];
      return `<div class="vmcfg-card">
<div class="vmcfg-card-name">${esc(g.name || '(unnamed)')}</div>
${kv('interval', g.interval || '')}
${rules.length ? `<div class="vmcfg-kv"><span class="vmcfg-kv-k">alerts (${rules.length})</span><span class="vmcfg-pills">${rules.slice(0, 4).map((r) => `<span class="vmcfg-pill">${esc(r.alert || r.record || '?')}</span>`).join('')}${rules.length > 4 ? `<span style="font-size:11px;color:var(--fg-2,#888)">+${rules.length - 4} more</span>` : ''}</span></div>` : ''}
</div>`;
    }).join('')}
${groups.length > 5 ? `<div style="font-size:12px;color:var(--fg-2,#888);padding:4px 0">…and ${groups.length - 5} more groups</div>` : ''}
</div>`;
  })() : '';

  // Rule files
  const ruleFiles = Array.isArray(cfg.rule_files) ? cfg.rule_files : [];
  const ruleFilesHtml = ruleFiles.length ? `
<div class="vmcfg-sec"><h3>Rule Files (${ruleFiles.length})</h3>
<div class="vmcfg-pills">${ruleFiles.map((f) => `<span class="vmcfg-pill">${esc(f)}</span>`).join('')}</div>
</div>` : '';

  const sub = [scrapeConfigs.length ? `${scrapeConfigs.length} scrape job${scrapeConfigs.length !== 1 ? 's' : ''}` : '', scrapeInterval].filter(Boolean).join(' · ');

  const host = document.createElement('div');
  host.className = 'vmcfg-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-vm">VictoriaMetrics</span>
  <span class="vmcfg-title">Configuration</span>
  ${scrapeConfigs.length ? `<span class="vmcfg-tag">${scrapeConfigs.length} scrape job${scrapeConfigs.length !== 1 ? 's' : ''}</span>` : ''}
  ${groups.length ? `<span class="vmcfg-tag">${groups.length} rule group${groups.length !== 1 ? 's' : ''}</span>` : ''}
</div>
<div class="vmcfg-sub">${esc(sub)}</div>
${globalHtml}${scrapeHtml}${remoteHtml}${ruleGroupsHtml}${ruleFilesHtml}`;
  return { parentNode: host };
}
