import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.diun-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.diun-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#2563eb;color:#fff;vertical-align:middle;margin-right:8px;}
.diun-title{font-size:18px;font-weight:700;margin:0 0 4px;display:inline;}
.diun-sub{font-size:12px;color:var(--fg-2,#888);margin:4px 0 14px;}
.diun-sec{margin:12px 0;}
.diun-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.diun-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;}
.diun-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;flex-wrap:wrap;}
.diun-key{color:var(--fg-2,#888);font-size:12px;min-width:200px;flex-shrink:0;}
.diun-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.diun-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;background:var(--bg-2,#f6f8fa);color:var(--fg,#24292f);}
.diun-chip-blue{background:#eff6ff;border-color:#93c5fd;color:#1d4ed8;}
.diun-chip-green{background:#f0fdf4;border-color:#86efac;color:#166534;}
.diun-chip-on{background:#dcfce7;border-color:#4ade80;color:#166534;}
.diun-chip-off{background:#fef2f2;border-color:#fca5a5;color:#991b1b;}
.diun-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
`;

function masked() {
  return '<span class="diun-masked">[configured]</span>';
}

function chip(val, cls = '') {
  if (val == null || val === '') return '';
  return `<span class="diun-chip${cls ? ' diun-chip-' + cls : ''}">${esc(String(val))}</span>`;
}

function boolChip(val, trueLabel, falseLabel) {
  if (val == null) return '';
  return val
    ? `<span class="diun-chip diun-chip-on">${esc(trueLabel)}</span>`
    : `<span class="diun-chip diun-chip-off">${esc(falseLabel)}</span>`;
}

function row(label, html) {
  if (!html) return '';
  return `<div class="diun-row"><span class="diun-key">${esc(label)}</span><span class="diun-val">${html}</span></div>`;
}

function renderWatch(watch) {
  if (!watch || typeof watch !== 'object') return '';
  const rows = [
    watch.workers != null ? row('Workers', chip(watch.workers, 'blue')) : '',
    watch.schedule ? row('Schedule', chip(watch.schedule, 'blue')) : '',
    watch.firstCheckNotif != null ? row('First check notify', boolChip(watch.firstCheckNotif, 'enabled', 'disabled')) : '',
  ].filter(Boolean).join('');
  if (!rows) return '';
  return `<div class="diun-sec"><h3>Watch</h3><div class="diun-card">${rows}</div></div>`;
}

const PROVIDER_KEYS = ['docker', 'swarm', 'kubernetes', 'nomad', 'file', 'registries'];

function renderProviders(providers) {
  if (!providers || typeof providers !== 'object') return '';
  const enabled = PROVIDER_KEYS.filter((k) => providers[k] != null);
  if (!enabled.length) return '';

  let html = `<div class="diun-sec"><h3>Providers</h3>`;
  html += `<div class="diun-card"><div class="diun-row">${enabled.map((k) => chip(k, 'blue')).join('')}</div>`;

  const docker = providers.docker;
  if (docker && typeof docker === 'object') {
    const dRows = [
      docker.watchStopped != null ? row('Watch stopped containers', boolChip(docker.watchStopped, 'yes', 'no')) : '',
      docker.watchByDefault != null ? row('Watch by default', boolChip(docker.watchByDefault, 'yes', 'no')) : '',
    ].filter(Boolean).join('');
    if (dRows) html += `<div style="margin-top:8px;border-top:1px solid var(--border,#e0e0e0);padding-top:8px;">${dRows}</div>`;
  }

  html += `</div></div>`;
  return html;
}

const NOTIF_LABELS = {
  slack: 'Slack', mail: 'Mail', telegram: 'Telegram', discord: 'Discord',
  gotify: 'Gotify', ntfy: 'ntfy', webhook: 'Webhook', teams: 'Teams',
  rocketchat: 'Rocket.Chat', matrix: 'Matrix', pushover: 'Pushover', pushbullet: 'Pushbullet',
};

function renderNotifChannel(name, cfg) {
  if (!cfg || typeof cfg !== 'object') return '';
  const rows = [];

  if (name === 'slack') {
    if (cfg.webhookURL != null) rows.push(row('webhookURL', masked()));
  } else if (name === 'discord') {
    if (cfg.webhookURL != null) rows.push(row('webhookURL', masked()));
  } else if (name === 'telegram') {
    if (cfg.token != null) rows.push(row('token', masked()));
    if (cfg.chatIDs) {
      const ids = Array.isArray(cfg.chatIDs) ? cfg.chatIDs : [cfg.chatIDs];
      rows.push(row('chatIDs', ids.map((id) => chip(id)).join('')));
    }
  } else if (name === 'gotify') {
    if (cfg.endpoint) rows.push(row('endpoint', chip(cfg.endpoint)));
    if (cfg.token != null) rows.push(row('token', masked()));
  } else if (name === 'ntfy') {
    if (cfg.endpoint) rows.push(row('endpoint', chip(cfg.endpoint)));
    if (cfg.topic) rows.push(row('topic', chip(cfg.topic)));
    if (cfg.password != null) rows.push(row('password', masked()));
  } else if (name === 'mail') {
    if (cfg.host) rows.push(row('host', chip(cfg.host)));
    if (cfg.port) rows.push(row('port', chip(cfg.port, 'blue')));
    if (cfg.username) rows.push(row('username', chip(cfg.username)));
    if (cfg.password != null) rows.push(row('password', masked()));
    if (cfg.from) rows.push(row('from', chip(cfg.from)));
    if (cfg.to) {
      const tos = Array.isArray(cfg.to) ? cfg.to : [cfg.to];
      rows.push(row('to', tos.map((a) => chip(a)).join('')));
    }
  } else if (name === 'webhook') {
    if (cfg.endpoint) rows.push(row('endpoint', chip(cfg.endpoint)));
    if (cfg.token != null) rows.push(row('token', masked()));
  } else if (name === 'teams') {
    if (cfg.webhookURL != null) rows.push(row('webhookURL', masked()));
  }

  if (!rows.length) return '';
  return `<div style="margin-top:8px;border-top:1px solid var(--border,#e0e0e0);padding-top:8px;font-size:12px;color:var(--fg-2,#888);font-weight:600;text-transform:uppercase;letter-spacing:.03em;">${esc(NOTIF_LABELS[name] || name)}</div>${rows.join('')}`;
}

function renderNotif(notif) {
  if (!notif || typeof notif !== 'object') return '';
  const channels = Object.keys(notif).filter((k) => notif[k] != null);
  if (!channels.length) return '';

  const channelChips = channels.map((k) => chip(NOTIF_LABELS[k] || k, 'green')).join('');
  let html = `<div class="diun-sec"><h3>Notifications</h3><div class="diun-card">`;
  html += `<div class="diun-row">${channelChips}</div>`;
  const details = channels.map((k) => renderNotifChannel(k, notif[k])).filter(Boolean).join('');
  if (details) html += details;
  html += `</div></div>`;
  return html;
}

function renderRegopts(regopts) {
  if (!Array.isArray(regopts) || !regopts.length) return '';
  const rows = regopts.map((opt) => {
    if (!opt || typeof opt !== 'object') return '';
    const r = [];
    if (opt.name) r.push(row('server', chip(opt.name)));
    if (opt.username) r.push(row('username', chip(opt.username)));
    if (opt.password != null) r.push(row('password', masked()));
    return r.join('');
  }).filter(Boolean);
  if (!rows.length) return '';
  return `<div class="diun-sec"><h3>Registry Credentials (regopts)</h3>${rows.map((r) => `<div class="diun-card">${r}</div>`).join('')}</div>`;
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  const watch = cfg.watch || {};
  const providers = cfg.providers || {};
  const notif = cfg.notif || {};
  const regopts = cfg.regopts || [];

  const subParts = [];
  if (watch.schedule) subParts.push(`schedule: ${watch.schedule}`);
  const providerList = Object.keys(providers).filter((k) => providers[k] != null);
  if (providerList.length) subParts.push(`providers: ${providerList.join(', ')}`);
  const notifList = Object.keys(notif).filter((k) => notif[k] != null);
  if (notifList.length) subParts.push(`notif: ${notifList.join(', ')}`);

  const host = document.createElement('div');
  host.className = 'diun-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="margin-bottom:4px;">
  <span class="diun-badge">Diun</span>
  <span class="diun-title">Diun Config</span>
</div>
<div class="diun-sub">Docker Image Update Notifier${subParts.length ? ' — ' + esc(subParts.join(' · ')) : ''}</div>
${renderWatch(watch)}${renderProviders(providers)}${renderNotif(notif)}${renderRegopts(regopts)}`;

  return { parentNode: host };
}
