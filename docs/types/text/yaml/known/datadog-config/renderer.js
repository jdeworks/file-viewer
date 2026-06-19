import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.dd-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-dd{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#632ca6;color:#fff;vertical-align:middle;margin-right:8px;}
.dd-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.dd-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.dd-sec{margin:14px 0;}
.dd-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.dd-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.dd-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:12px;}
.dd-kv-k{color:var(--fg-2,#888);min-width:150px;}
.dd-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.dd-pills{display:flex;flex-wrap:wrap;gap:6px;}
.dd-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.dd-status{display:inline-flex;align-items:center;gap:4px;font-size:12px;padding:2px 8px;border-radius:5px;margin:2px 3px;}
.dd-status.on{background:#dcfce7;border:1px solid #86efac;color:#166534;}
.dd-status.off{background:#f3f4f6;border:1px solid #d1d5db;color:#6b7280;}
.dd-note{font-size:12px;color:var(--fg-2,#888);font-style:italic;padding:6px 0;}
`;

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<div class="dd-kv"><span class="dd-kv-k">${esc(label)}</span><span class="dd-kv-v">${esc(value)}</span></div>`;
}

function statusBadge(label, value) {
  const on = value === true || value === 'true' || value === 'yes';
  const off = value === false || value === 'false' || value === 'no';
  if (!on && !off) return '';
  return `<span class="dd-status ${on ? 'on' : 'off'}">${esc(label)}: ${on ? 'enabled' : 'disabled'}</span>`;
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = jsyaml.load(intake.text || '') || {};
  } catch { cfg = {}; }

  // Core settings
  const apiKey = cfg.api_key;
  const hostname = cfg.hostname;
  const logLevel = cfg.log_level;
  const site = cfg.site;

  const apiNote = (!apiKey || apiKey === '' || String(apiKey).includes('YOUR') || String(apiKey).includes('ENC['))
    ? '<div class="dd-note">API key is not set in this file — typically injected via environment variable DD_API_KEY.</div>'
    : '';

  const coreHtml = `<div class="dd-sec"><h3>Agent Settings</h3><div class="dd-card">
${apiNote}
${kv('site', site)}
${hostname ? kv('hostname', hostname) : ''}
${logLevel ? kv('log_level', logLevel) : ''}
</div></div>`;

  // Tags
  const tags = Array.isArray(cfg.tags) ? cfg.tags : (cfg.tags ? [cfg.tags] : []);
  const tagsHtml = tags.length ? `
<div class="dd-sec"><h3>Tags (${tags.length})</h3>
<div class="dd-pills">${tags.slice(0, 16).map((t) => `<span class="dd-pill">${esc(t)}</span>`).join('')}${tags.length > 16 ? `<span style="font-size:11px;color:var(--fg-2,#888)">+${tags.length - 16} more</span>` : ''}</div>
</div>` : '';

  // Feature flags
  const logsEnabled = cfg.logs_enabled;
  const apmEnabled = cfg.apm_config?.enabled;
  const processEnabled = cfg.process_config?.enabled ?? cfg.process_agent_enabled;
  const npmEnabled = cfg.network_config?.enabled ?? cfg.network_monitoring_enabled;
  const csmEnabled = cfg.runtime_security_config?.enabled;

  const features = [
    { label: 'Log collection', value: logsEnabled },
    { label: 'APM', value: apmEnabled },
    { label: 'Process agent', value: processEnabled },
    { label: 'Network monitoring', value: npmEnabled },
    { label: 'Runtime security', value: csmEnabled },
  ].filter((f) => f.value != null);

  const featuresHtml = features.length ? `
<div class="dd-sec"><h3>Features</h3>
<div style="display:flex;flex-wrap:wrap;gap:4px;">${features.map((f) => statusBadge(f.label, f.value)).join('')}</div>
</div>` : '';

  // Log config details
  const logContainers = cfg.logs_config?.container_collect_all;
  const logHtml = (logsEnabled || logContainers != null) ? `
<div class="dd-sec"><h3>Log Collection</h3><div class="dd-card">
${statusBadge('Enabled', logsEnabled)}
${logContainers != null ? statusBadge('Container collect all', logContainers) : ''}
</div></div>` : '';

  // APM config
  const apmPort = cfg.apm_config?.receiver_port;
  const apmSampleRate = cfg.apm_config?.default_sample_rate;
  const apmHtml = (apmEnabled != null || apmPort || apmSampleRate) ? `
<div class="dd-sec"><h3>APM</h3><div class="dd-card">
${apmEnabled != null ? statusBadge('Enabled', apmEnabled) : ''}
${kv('receiver_port', apmPort)}
${kv('default_sample_rate', apmSampleRate)}
</div></div>` : '';

  const sub = [site ? `site: ${site}` : '', tags.length ? `${tags.length} tag${tags.length !== 1 ? 's' : ''}` : ''].filter(Boolean).join(' · ');

  const host = document.createElement('div');
  host.className = 'dd-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-dd">Datadog</span>
  <span class="dd-title">Agent Configuration</span>
</div>
<div class="dd-sub">${esc(sub)}</div>
${coreHtml}${featuresHtml}${tagsHtml}${logHtml}${apmHtml}`;
  return { parentNode: host };
}
