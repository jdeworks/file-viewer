import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.nr-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.nr-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#008C99;color:#fff;vertical-align:middle;margin-right:8px;}
.nr-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.nr-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.nr-sec{margin:14px 0;}
.nr-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.nr-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin:6px 0;background:var(--bg,#fff);}
.nr-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px;}
.nr-kv-k{color:var(--fg-2,#888);min-width:160px;flex-shrink:0;}
.nr-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.nr-masked{color:var(--fg-2,#999);font-style:italic;}
.nr-env-name{font:13px/1.4 ui-monospace,monospace;font-weight:700;margin-bottom:6px;color:var(--fg,#24292f);}
.nr-on{display:inline-block;font-size:11px;padding:2px 7px;border-radius:5px;background:#dcfce7;border:1px solid #86efac;color:#166534;margin:2px 3px;}
.nr-off{display:inline-block;font-size:11px;padding:2px 7px;border-radius:5px;background:#f3f4f6;border:1px solid #d1d5db;color:#6b7280;margin:2px 3px;}
.nr-pills{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0;}
.nr-pill{display:inline-block;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
`;

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<div class="nr-kv"><span class="nr-kv-k">${esc(label)}</span><span class="nr-kv-v">${esc(value)}</span></div>`;
}

function masked(label) {
  return `<div class="nr-kv"><span class="nr-kv-k">${esc(label)}</span><span class="nr-kv-v nr-masked">••••••••</span></div>`;
}

function boolBadge(label, val) {
  if (val == null) return '';
  const on = val === true || val === 'true' || val === 'enabled' || val === 1;
  return `<span class="${on ? 'nr-on' : 'nr-off'}">${esc(label)}: ${on ? 'on' : 'off'}</span>`;
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || \'\') || [])[0] || {};
  } catch { cfg = {}; }

  const common = cfg.common || {};

  // Core settings from common
  const appName = common.app_name || '';
  const hasLicense = !!(common.license_key);
  const logLevel = common.log_level || '';
  const agentEnabled = common.agent_enabled;
  const highSecurity = common.high_security;

  // Browser monitoring
  const browser = common.browser_monitoring || {};
  const browserEnabled = browser.auto_instrument;

  // Distributed tracing
  const dt = common.distributed_tracing || {};
  const dtEnabled = dt.enabled;

  // Transaction tracing
  const tt = common.transaction_tracer || {};
  const ttEnabled = tt.enabled;
  const ttThreshold = tt.transaction_threshold;
  const ttRecordSql = tt.record_sql;

  // Error collector
  const ec = common.error_collector || {};
  const ecEnabled = ec.enabled;
  const ecIgnoredStatus = Array.isArray(ec.ignore_status_codes) ? ec.ignore_status_codes.join(', ') : (ec.ignore_status_codes || '');

  // Environments block
  const envKeys = Object.keys(cfg).filter((k) => k !== 'common');

  const coreHtml = `
<div class="nr-sec"><h3>Common Configuration</h3><div class="nr-card">
${appName ? kv('app_name', appName) : ''}
${hasLicense ? masked('license_key') : ''}
${kv('log_level', logLevel)}
<div style="margin-top:6px;">
${boolBadge('agent', agentEnabled)}
${boolBadge('high_security', highSecurity)}
${boolBadge('browser_monitoring', browserEnabled)}
${boolBadge('distributed_tracing', dtEnabled)}
${boolBadge('transaction_tracer', ttEnabled)}
${boolBadge('error_collector', ecEnabled)}
</div>
</div></div>`;

  const ttHtml = (ttThreshold || ttRecordSql) ? `
<div class="nr-sec"><h3>Transaction Tracing</h3><div class="nr-card">
${kv('threshold', ttThreshold)}
${kv('record_sql', ttRecordSql)}
</div></div>` : '';

  const ecHtml = ecIgnoredStatus ? `
<div class="nr-sec"><h3>Error Collector</h3><div class="nr-card">
${kv('ignored status codes', ecIgnoredStatus)}
</div></div>` : '';

  const envsHtml = envKeys.length ? `
<div class="nr-sec"><h3>Environments (${envKeys.length})</h3>
${envKeys.map((env) => {
    const e = cfg[env] || {};
    const overrides = Object.entries(e)
      .filter(([k]) => k !== 'app_name' && k !== 'license_key')
      .map(([k, v]) => `<div class="nr-kv"><span class="nr-kv-k">${esc(k)}</span><span class="nr-kv-v">${esc(String(v))}</span></div>`)
      .join('');
    const envAppName = e.app_name ? `<div class="nr-kv"><span class="nr-kv-k">app_name</span><span class="nr-kv-v">${esc(e.app_name)}</span></div>` : '';
    const envLicense = e.license_key ? masked('license_key') : '';
    return `<div class="nr-card"><div class="nr-env-name">${esc(env)}</div>${envAppName}${envLicense}${overrides}</div>`;
  }).join('')}
</div>` : '';

  const sub = [
    appName,
    envKeys.length ? `${envKeys.length} environment${envKeys.length !== 1 ? 's' : ''}` : '',
    logLevel ? `log: ${logLevel}` : '',
  ].filter(Boolean).join(' · ');

  const host = document.createElement('div');
  host.className = 'nr-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="nr-badge">New Relic</span>
  <span class="nr-title">Agent Configuration</span>
</div>
<div class="nr-sub">${esc(sub)}</div>
${coreHtml}${ttHtml}${ecHtml}${envsHtml}`;
  return { parentNode: host };
}
