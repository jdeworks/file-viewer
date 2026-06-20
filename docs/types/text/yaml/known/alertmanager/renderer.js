import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.am-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-am{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#e6522c;color:#fff;vertical-align:middle;margin-right:8px;}
.am-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.am-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.am-sec{margin:14px 0;}
.am-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.am-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin:6px 0;background:var(--bg,#fff);}
.am-card-name{font:13px/1.4 ui-monospace,monospace;font-weight:700;margin-bottom:4px;}
.am-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:12px;}
.am-kv-k{color:var(--fg-2,#888);min-width:130px;}
.am-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.am-pills{display:flex;flex-wrap:wrap;gap:6px;}
.am-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.am-type{display:inline-block;font-size:11px;padding:1px 6px;border-radius:4px;background:#eff6ff;border:1px solid #bfdbfe;color:#1d4ed8;margin-left:6px;vertical-align:middle;}
`;

const RECEIVER_TYPES = ['slack_configs', 'pagerduty_configs', 'email_configs', 'webhook_configs', 'victorops_configs', 'opsgenie_configs', 'wechat_configs', 'sns_configs', 'telegram_configs', 'msteams_configs'];
const RECEIVER_LABELS = { slack_configs: 'Slack', pagerduty_configs: 'PagerDuty', email_configs: 'Email', webhook_configs: 'Webhook', victorops_configs: 'VictorOps', opsgenie_configs: 'OpsGenie', wechat_configs: 'WeChat', sns_configs: 'SNS', telegram_configs: 'Telegram', msteams_configs: 'MS Teams' };

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<div class="am-kv"><span class="am-kv-k">${esc(label)}</span><span class="am-kv-v">${esc(value)}</span></div>`;
}

function receiverTypes(recv) {
  const types = RECEIVER_TYPES.filter((t) => Array.isArray(recv[t]) && recv[t].length > 0);
  return types.map((t) => `<span class="am-type">${esc(RECEIVER_LABELS[t] || t)}</span>`).join('');
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || \'\') || [])[0] || {};
  } catch { cfg = {}; }

  // Route
  const route = cfg.route || {};
  const routeHtml = Object.keys(route).length ? `
<div class="am-sec"><h3>Root Route</h3><div class="am-card">
${kv('receiver', route.receiver)}
${kv('group_by', Array.isArray(route.group_by) ? route.group_by.join(', ') : route.group_by)}
${kv('group_wait', route.group_wait)}
${kv('group_interval', route.group_interval)}
${kv('repeat_interval', route.repeat_interval)}
${Array.isArray(route.routes) ? `<div class="am-kv"><span class="am-kv-k">sub-routes</span><span class="am-kv-v">${route.routes.length}</span></div>` : ''}
</div></div>` : '';

  // Receivers
  const receivers = Array.isArray(cfg.receivers) ? cfg.receivers : [];
  const receiversHtml = receivers.length ? `
<div class="am-sec"><h3>Receivers (${receivers.length})</h3>
${receivers.map((r) => `<div class="am-card">
<div class="am-card-name">${esc(r.name || '(unnamed)')}${receiverTypes(r)}</div>
</div>`).join('')}
</div>` : '';

  // Inhibit rules
  const inhibitRules = Array.isArray(cfg.inhibit_rules) ? cfg.inhibit_rules : [];
  const inhibitHtml = inhibitRules.length ? `
<div class="am-sec"><h3>Inhibit Rules (${inhibitRules.length})</h3>
<div class="am-pills">${inhibitRules.map((_, i) => `<span class="am-pill">Rule ${i + 1}</span>`).join('')}</div>
</div>` : '';

  // Mute time intervals
  const muteIntervals = Array.isArray(cfg.mute_time_intervals) ? cfg.mute_time_intervals : (Array.isArray(cfg.time_intervals) ? cfg.time_intervals : []);
  const muteHtml = muteIntervals.length ? `
<div class="am-sec"><h3>Mute Time Intervals (${muteIntervals.length})</h3>
<div class="am-pills">${muteIntervals.map((m) => `<span class="am-pill">${esc(m.name || '(unnamed)')}</span>`).join('')}</div>
</div>` : '';

  // Templates
  const templates = Array.isArray(cfg.templates) ? cfg.templates : [];
  const tmplHtml = templates.length ? `
<div class="am-sec"><h3>Templates</h3>
<div class="am-pills">${templates.map((t) => `<span class="am-pill">${esc(t)}</span>`).join('')}</div>
</div>` : '';

  const sub = [
    receivers.length ? `${receivers.length} receiver${receivers.length !== 1 ? 's' : ''}` : '',
    inhibitRules.length ? `${inhibitRules.length} inhibit rule${inhibitRules.length !== 1 ? 's' : ''}` : '',
  ].filter(Boolean).join(' · ');

  const host = document.createElement('div');
  host.className = 'am-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-am">Alertmanager</span>
  <span class="am-title">Configuration</span>
</div>
<div class="am-sub">${esc(sub)}</div>
${routeHtml}${receiversHtml}${inhibitHtml}${muteHtml}${tmplHtml}`;
  return { parentNode: host };
}
