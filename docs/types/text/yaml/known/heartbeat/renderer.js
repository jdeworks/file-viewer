import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
import { expandDotted } from '../dotted-keys.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.heartbeat-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.hb-badge{display:inline-block;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;background:#8B5CF6;color:#fff;vertical-align:middle;margin-right:8px;letter-spacing:.01em;}
.hb-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.hb-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.hb-sec{margin:14px 0;}
.hb-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.hb-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin:6px 0;background:var(--bg,#fff);}
.hb-mon-name{font:13px/1.4 ui-monospace,monospace;font-weight:700;margin-bottom:4px;}
.hb-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px;}
.hb-kv-k{color:var(--fg-2,#888);min-width:140px;flex-shrink:0;}
.hb-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.hb-masked{color:var(--fg-2,#999);font-style:italic;}
.hb-urls{font-size:12px;font-family:ui-monospace,monospace;color:var(--fg-2,#666);margin:3px 0 0 0;padding-left:8px;border-left:2px solid var(--border,#e0e0e0);}
.hb-output-chip{display:inline-block;font-size:12px;padding:3px 10px;border-radius:12px;background:#eff6ff;border:1px solid #bfdbfe;color:#1d4ed8;margin-right:6px;font-weight:600;}
.hb-tls-tag{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:#f0fdf4;border:1px solid #86efac;color:#166534;font-weight:600;}
`;

const MONITOR_TYPE_STYLES = {
  http: { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8' },
  tcp:  { bg: '#f0fdf4', border: '#86efac', color: '#166534' },
  icmp: { bg: '#fff7ed', border: '#fed7aa', color: '#c2410c' },
};

function monitorTypeChip(type) {
  const s = MONITOR_TYPE_STYLES[type] || { bg: '#f3f4f6', border: '#d1d5db', color: '#374151' };
  return `<span style="display:inline-block;font-size:11px;font-weight:700;padding:2px 9px;border-radius:10px;background:${s.bg};border:1px solid ${s.border};color:${s.color};vertical-align:middle;">${esc(type.toUpperCase())}</span>`;
}

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<div class="hb-kv"><span class="hb-kv-k">${esc(label)}</span><span class="hb-kv-v">${esc(value)}</span></div>`;
}

function masked(label) {
  return `<div class="hb-kv"><span class="hb-kv-k">${esc(label)}</span><span class="hb-kv-v hb-masked">[configured]</span></div>`;
}

function renderMonitor(m, idx) {
  const type = m.type || 'http';
  const id = m.id || m.name || `Monitor ${idx + 1}`;

  // URLs / hosts — http uses urls, tcp uses hosts
  const urls = Array.isArray(m.urls) ? m.urls
    : (m.urls ? [m.urls] : []);
  const hosts = Array.isArray(m.hosts) ? m.hosts
    : (m.hosts ? [m.hosts] : []);
  const targets = type === 'tcp' || type === 'icmp' ? hosts : urls;
  const displayTargets = targets.slice(0, 4);
  const targetsHtml = displayTargets.length
    ? `<div class="hb-urls">${displayTargets.map((u) => esc(u)).join('<br>')}${targets.length > 4 ? `<br><span style="color:var(--fg-2,#999)">+${targets.length - 4} more</span>` : ''}</div>`
    : '';

  const schedule = m.schedule;
  const scheduleStr = typeof schedule === 'object' ? (schedule.interval || JSON.stringify(schedule)) : schedule;

  // HTTP-specific details
  const checkReq = m.check?.request;
  const checkRes = m.check?.response;
  const method = checkReq?.method || (type === 'http' ? 'GET' : '');
  const statusCodes = Array.isArray(checkRes?.status) ? checkRes.status
    : (checkRes?.status ? [checkRes.status] : []);
  const hasBody = !!(checkReq?.body);

  // TLS
  const tls = m.ssl || m.tls;
  const tlsTag = tls ? ' <span class="hb-tls-tag">TLS</span>' : '';

  const timeout = m.timeout || '';

  return `<div class="hb-card">
<div class="hb-mon-name">${esc(id)} ${monitorTypeChip(type)}${tlsTag}</div>
${targetsHtml}
${scheduleStr ? kv('schedule', scheduleStr) : ''}
${timeout ? kv('timeout', String(timeout)) : ''}
${method ? kv('check.request.method', method) : ''}
${hasBody ? kv('check.request.body', '[configured]') : ''}
${statusCodes.length ? kv('check.response.status', statusCodes.join(', ')) : ''}
</div>`;
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }
  cfg = expandDotted(cfg);

  const filename = (intake.name || intake.filename || 'heartbeat.yml').split('/').pop();

  // Monitors — support both nested heartbeat.monitors and flat monitors
  const monitors = Array.isArray(cfg.heartbeat?.monitors) ? cfg.heartbeat.monitors
    : (Array.isArray(cfg.monitors) ? cfg.monitors : []);

  const monitorsHtml = monitors.length ? `
<div class="hb-sec"><h3>Monitors (${monitors.length})</h3>
${monitors.map((m, i) => renderMonitor(m, i)).join('')}
</div>` : '';

  // Scheduler
  const scheduler = cfg.heartbeat?.scheduler || cfg.scheduler;
  const schedulerHtml = scheduler ? `
<div class="hb-sec"><h3>Scheduler</h3><div class="hb-card">
${kv('limit', scheduler.limit != null ? String(scheduler.limit) : '')}
${kv('location', scheduler.location)}
</div></div>` : '';

  // Output
  const output = cfg.output || {};
  const outputType = Object.keys(output)[0] || '';
  const outputCfg = output[outputType] || {};

  let outputHtml = '';
  if (outputType) {
    const hosts = Array.isArray(outputCfg.hosts) ? outputCfg.hosts : (outputCfg.hosts ? [outputCfg.hosts] : []);
    const displayHosts = hosts.slice(0, 4);
    const hostsText = displayHosts.map((h) => esc(h)).join(', ') + (hosts.length > 4 ? `, +${hosts.length - 4} more` : '');
    const hasPassword = !!(outputCfg.password);
    const hasApiKey = !!(outputCfg.api_key);
    const hasSslKey = !!(outputCfg.ssl?.key || outputCfg.ssl?.certificate_key);
    outputHtml = `
<div class="hb-sec"><h3>Output</h3><div class="hb-card">
<div style="margin-bottom:6px;"><span class="hb-output-chip">${esc(outputType)}</span></div>
${hosts.length ? `<div class="hb-kv"><span class="hb-kv-k">hosts</span><span class="hb-kv-v">${hostsText}</span></div>` : ''}
${outputCfg.username ? kv('username', outputCfg.username) : ''}
${hasPassword ? masked('password') : ''}
${hasApiKey ? masked('api_key') : ''}
${outputCfg.index ? kv('index', outputCfg.index) : ''}
${hasSslKey ? masked('ssl.key') : ''}
</div></div>`;
  }

  // Logging
  const logging = cfg.logging || {};
  const logLevel = logging.level || '';
  const loggingHtml = logLevel ? `
<div class="hb-sec"><h3>Logging</h3><div class="hb-card">
${kv('level', logLevel)}
</div></div>` : '';

  // Summary counts by type
  const typeCounts = {};
  for (const m of monitors) {
    const t = m.type || 'http';
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  }
  const typesSummary = Object.entries(typeCounts).map(([t, n]) => `${n} ${t}`).join(', ');

  const subParts = [
    monitors.length ? `${monitors.length} monitor${monitors.length !== 1 ? 's' : ''}${typesSummary ? ` (${typesSummary})` : ''}` : '',
    outputType ? `→ ${outputType}` : '',
  ].filter(Boolean).join(' · ');

  const host = document.createElement('div');
  host.className = 'heartbeat-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="hb-badge">Elastic Heartbeat</span>
  <span class="hb-title">${esc(filename)}</span>
</div>
<div class="hb-sub">${esc(subParts)}</div>
${monitorsHtml}${schedulerHtml}${outputHtml}${loggingHtml}`;
  return { parentNode: host };
}
