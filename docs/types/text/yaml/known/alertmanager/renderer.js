import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.alertmgr-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-alertmgr{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#e6522c;color:#fff;vertical-align:middle;margin-right:8px;}
.alertmgr-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.alertmgr-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.alertmgr-sec{margin:14px 0;}
.alertmgr-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.alertmgr-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin:6px 0;background:var(--bg,#fff);}
.alertmgr-card-name{font:13px/1.4 ui-monospace,monospace;font-weight:700;margin-bottom:4px;}
.alertmgr-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:12px;}
.alertmgr-kv-k{color:var(--fg-2,#888);min-width:130px;}
.alertmgr-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.alertmgr-pills{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;}
.alertmgr-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.alertmgr-type{display:inline-block;font-size:11px;padding:1px 6px;border-radius:4px;background:#eff6ff;border:1px solid #bfdbfe;color:#1d4ed8;margin-left:6px;vertical-align:middle;}
.alertmgr-masked{color:var(--fg-2,#888);font-style:italic;}
.alertmgr-table{width:100%;border-collapse:collapse;font-size:12px;margin-top:6px;}
.alertmgr-table th{text-align:left;padding:4px 8px;border-bottom:1px solid var(--border,#e0e0e0);color:var(--fg-2,#888);font-weight:600;}
.alertmgr-table td{padding:4px 8px;border-bottom:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
`;

const RECEIVER_TYPES = ['slack_configs', 'pagerduty_configs', 'email_configs', 'webhook_configs', 'victorops_configs', 'opsgenie_configs', 'wechat_configs', 'sns_configs', 'telegram_configs', 'msteams_configs'];
const RECEIVER_LABELS = { slack_configs: 'Slack', pagerduty_configs: 'PagerDuty', email_configs: 'Email', webhook_configs: 'Webhook', victorops_configs: 'VictorOps', opsgenie_configs: 'OpsGenie', wechat_configs: 'WeChat', sns_configs: 'SNS', telegram_configs: 'Telegram', msteams_configs: 'MS Teams' };
const GLOBAL_SECRETS = new Set(['smtp_auth_password', 'slack_api_url', 'api_url', 'pagerduty_url', 'victorops_api_url', 'opsgenie_api_url', 'http_config']);

function masked() {
  return `<span class="alertmgr-masked">[configured]</span>`;
}

function kv(label, value, isSecret = false) {
  if (value == null || value === '') return '';
  const display = isSecret ? masked() : `<span class="alertmgr-kv-v">${esc(String(value))}</span>`;
  return `<div class="alertmgr-kv"><span class="alertmgr-kv-k">${esc(label)}</span>${display}</div>`;
}

function receiverTypes(recv) {
  const types = RECEIVER_TYPES.filter((t) => Array.isArray(recv[t]) && recv[t].length > 0);
  return types.map((t) => `<span class="alertmgr-type">${esc(RECEIVER_LABELS[t] || t)}</span>`).join('');
}

function matchConditionStr(match) {
  if (!match || typeof match !== 'object') return '';
  return Object.entries(match).map(([k, v]) => `${k}=${v}`).join(', ');
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = {}; }

  // Global card
  const global_ = cfg.global || {};
  const globalEntries = Object.entries(global_);
  const globalHtml = globalEntries.length ? `
<div class="alertmgr-sec"><h3>Global</h3><div class="alertmgr-card">
${globalEntries.map(([k, v]) => kv(k, String(v ?? ''), GLOBAL_SECRETS.has(k))).join('')}
</div></div>` : '';

  // Route tree card
  const route = cfg.route || {};
  const groupBy = Array.isArray(route.group_by) ? route.group_by : (route.group_by ? [String(route.group_by)] : []);
  const subRoutes = Array.isArray(route.routes) ? route.routes : [];
  const subRoutesHtml = subRoutes.length ? `
<table class="alertmgr-table">
<thead><tr><th>Match</th><th>Receiver</th></tr></thead>
<tbody>
${subRoutes.map((r) => {
  const matchStr = matchConditionStr(r.match) || matchConditionStr(r.match_re) || '(default)';
  return `<tr><td>${esc(matchStr)}</td><td>${esc(r.receiver || '')}</td></tr>`;
}).join('')}
</tbody>
</table>` : '';

  const routeHtml = Object.keys(route).length ? `
<div class="alertmgr-sec"><h3>Route Tree</h3><div class="alertmgr-card">
${kv('receiver', route.receiver)}
${groupBy.length ? `<div class="alertmgr-kv"><span class="alertmgr-kv-k">group_by</span><span class="alertmgr-pills">${groupBy.map((g) => `<span class="alertmgr-pill">${esc(g)}</span>`).join('')}</span></div>` : ''}
${kv('group_wait', route.group_wait)}
${kv('group_interval', route.group_interval)}
${kv('repeat_interval', route.repeat_interval)}
${subRoutesHtml}
</div></div>` : '';

  // Receivers table
  const receivers = Array.isArray(cfg.receivers) ? cfg.receivers : [];
  const receiversHtml = receivers.length ? `
<div class="alertmgr-sec"><h3>Receivers (${receivers.length})</h3>
${receivers.map((r) => `<div class="alertmgr-card">
<div class="alertmgr-card-name">${esc(r.name || '(unnamed)')}${receiverTypes(r)}</div>
</div>`).join('')}
</div>` : '';

  // Inhibit rules
  const inhibitRules = Array.isArray(cfg.inhibit_rules) ? cfg.inhibit_rules : [];
  const inhibitHtml = inhibitRules.length ? `
<div class="alertmgr-sec"><h3>Inhibit Rules</h3>
<div class="alertmgr-pills"><span class="alertmgr-pill">${inhibitRules.length} rule${inhibitRules.length !== 1 ? 's' : ''}</span></div>
</div>` : '';

  // Mute time intervals
  const muteIntervals = Array.isArray(cfg.mute_time_intervals) ? cfg.mute_time_intervals : (Array.isArray(cfg.time_intervals) ? cfg.time_intervals : []);
  const muteHtml = muteIntervals.length ? `
<div class="alertmgr-sec"><h3>Mute Time Intervals (${muteIntervals.length})</h3>
<div class="alertmgr-pills">${muteIntervals.map((m) => `<span class="alertmgr-pill">${esc(m.name || '(unnamed)')}</span>`).join('')}</div>
</div>` : '';

  // Templates
  const templates = Array.isArray(cfg.templates) ? cfg.templates : [];
  const tmplHtml = templates.length ? `
<div class="alertmgr-sec"><h3>Templates</h3>
<div class="alertmgr-pills">${templates.map((t) => `<span class="alertmgr-pill">${esc(t)}</span>`).join('')}</div>
</div>` : '';

  const resolveTimeout = global_.resolve_timeout || '';
  const sub = [
    receivers.length ? `${receivers.length} receiver${receivers.length !== 1 ? 's' : ''}` : '',
    inhibitRules.length ? `${inhibitRules.length} inhibit rule${inhibitRules.length !== 1 ? 's' : ''}` : '',
  ].filter(Boolean).join(' · ');

  const host = document.createElement('div');
  host.className = 'alertmgr-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-alertmgr">Alertmanager</span>
  <span class="alertmgr-title">alertmanager.yml</span>
  ${resolveTimeout ? `<span style="font-size:12px;color:var(--fg-2,#888);">resolve: ${esc(String(resolveTimeout))}</span>` : ''}
</div>
<div class="alertmgr-sub">${esc(sub)}</div>
${globalHtml}${routeHtml}${receiversHtml}${inhibitHtml}${muteHtml}${tmplHtml}`;
  return { parentNode: host };
}
