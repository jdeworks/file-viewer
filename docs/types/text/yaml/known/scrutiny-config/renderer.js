import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const SENSITIVE = /secret|password|token|key|api|private/i;

/** Extract scheme label from a notification URL, e.g. "discord://..." → "Discord" */
function schemeLabel(url) {
  if (!url) return null;
  const m = String(url).match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
  if (!m) return null;
  const s = m[1].toLowerCase();
  // Capitalize known services
  const KNOWN = { discord: 'Discord', slack: 'Slack', smtp: 'SMTP', ntfy: 'Ntfy', telegram: 'Telegram', gotify: 'Gotify', pushover: 'Pushover', matrix: 'Matrix', mattermost: 'Mattermost', teams: 'Teams', webhook: 'Webhook', pagerduty: 'PagerDuty', opsgenie: 'OpsGenie', victorops: 'VictorOps', rocketchat: 'Rocket.Chat' };
  return KNOWN[s] || (s.charAt(0).toUpperCase() + s.slice(1));
}

const CSS = `
.scrutiny-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.scrutiny-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#e63946;color:#fff;vertical-align:middle;margin-right:8px;}
.scrutiny-title{font-size:18px;font-weight:700;margin:0 0 4px;display:inline;}
.scrutiny-sub{font-size:12px;color:var(--fg-2,#888);margin:4px 0 14px;}
.scrutiny-sec{margin:14px 0;}
.scrutiny-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.scrutiny-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.scrutiny-row{display:flex;align-items:baseline;gap:8px;margin:2px 0;font-size:13px;}
.scrutiny-key{color:var(--fg-2,#888);font-size:12px;min-width:180px;flex-shrink:0;}
.scrutiny-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.scrutiny-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
.scrutiny-chip{display:inline-block;font-size:11px;padding:2px 9px;border-radius:10px;border:1px solid var(--border,#e0e0e0);background:var(--bg-2,#f6f8fa);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;}
.scrutiny-chip-info{background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8;}
.scrutiny-chip-warn{background:#fef9c3;border-color:#fde047;color:#713f12;}
.scrutiny-chip-err{background:#fee2e2;border-color:#fca5a5;color:#991b1b;}
.scrutiny-chip-notify{background:#f0fdf4;border-color:#86efac;color:#166534;}
.scrutiny-chips{display:flex;flex-wrap:wrap;gap:5px;margin-top:4px;}
`;

function row(label, html) {
  if (html == null || html === '') return '';
  return `<div class="scrutiny-row"><span class="scrutiny-key">${esc(label)}</span><span class="scrutiny-val">${html}</span></div>`;
}

function chip(v, cls) {
  if (v == null || v === '') return '';
  return `<span class="scrutiny-chip${cls ? ' ' + cls : ''}">${esc(String(v))}</span>`;
}

function section(title, rows) {
  const inner = rows.filter(Boolean).join('');
  if (!inner) return '';
  return `<div class="scrutiny-sec"><h3>${title}</h3><div class="scrutiny-card">${inner}</div></div>`;
}

function getDeep(obj, ...keys) {
  let cur = obj;
  for (const k of keys) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[k];
  }
  return cur;
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  const web = cfg.web || {};
  const listen = web.listen || {};
  const database = web.database || {};
  const src = (web.src || {}).frontend || {};
  const notify = cfg.notify || {};
  const log = cfg.log || {};

  // ── Web ──
  const webRows = [
    listen.port != null ? row('Listen Port', chip(listen.port, 'scrutiny-chip-info')) : '',
    listen.host != null ? row('Listen Host', chip(listen.host)) : '',
    listen.basepath != null && listen.basepath !== '' ? row('Base Path', chip(listen.basepath)) : '',
    database.location ? row('Database', chip(database.location)) : '',
    src.path ? row('Frontend Path', chip(src.path)) : '',
  ];

  // ── Notifications ──
  const urls = Array.isArray(notify.urls) ? notify.urls.slice(0, 6) : [];
  const notifyChips = urls
    .map((u) => schemeLabel(u))
    .filter(Boolean)
    .map((label) => `<span class="scrutiny-chip scrutiny-chip-notify">${esc(label)}</span>`);
  const notifyHtml = notifyChips.length
    ? `<div class="scrutiny-chips">${notifyChips.join('')}</div>`
    : '';
  const moreUrls = Array.isArray(notify.urls) && notify.urls.length > 6
    ? `<div style="font-size:11px;color:var(--fg-2,#888);margin-top:4px;">+${notify.urls.length - 6} more</div>` : '';

  // ── Log ──
  const level = log.level || '';
  const levelCls = /error|fatal/i.test(level) ? 'scrutiny-chip-err' : /warn/i.test(level) ? 'scrutiny-chip-warn' : 'scrutiny-chip-info';
  const logRows = [
    level ? row('Log Level', chip(level, levelCls)) : '',
    log.file != null && log.file !== '' ? row('Log File', chip(log.file)) : '',
  ];

  let body = '';
  body += section('Web', webRows);

  if (notifyHtml || moreUrls) {
    body += `<div class="scrutiny-sec"><h3>Notifications</h3><div class="scrutiny-card">${notifyHtml}${moreUrls}</div></div>`;
  }

  body += section('Logging', logRows);

  if (cfg.version != null) {
    body += `<div class="scrutiny-sec"><h3>Version</h3><div class="scrutiny-card"><div class="scrutiny-row"><span class="scrutiny-key">Config Version</span><span class="scrutiny-val">${chip(cfg.version)}</span></div></div></div>`;
  }

  const host = document.createElement('div');
  host.className = 'scrutiny-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="margin-bottom:4px;"><span class="scrutiny-badge">Scrutiny</span><span class="scrutiny-title">Scrutiny Config</span></div>
<div class="scrutiny-sub">Hard drive S.M.A.R.T. health monitoring dashboard</div>
${body || '<div style="color:var(--fg-2,#888);font-size:13px;">No configuration found.</div>'}`;
  return { parentNode: host };
}
