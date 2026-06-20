const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.wtower-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.wtower-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0f766e;color:#fff;vertical-align:middle;margin-right:8px;}
.wtower-title{font-size:20px;font-weight:700;margin:0 0 2px;font-family:ui-monospace,monospace;display:inline;}
.wtower-sub{font-size:12px;color:var(--fg-2,#888);margin:4px 0 14px;}
.wtower-sec{margin:14px 0;}
.wtower-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.wtower-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.wtower-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px;flex-wrap:wrap;}
.wtower-kv-k{color:var(--fg-2,#888);min-width:220px;flex-shrink:0;font-size:12px;}
.wtower-kv-v{font-family:ui-monospace,monospace;word-break:break-all;font-size:12px;}
.wtower-masked{font-family:ui-monospace,monospace;color:var(--fg-2,#999);font-style:italic;font-size:12px;}
.wtower-chip{display:inline-flex;align-items:center;font-size:11px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:2px;}
.wtower-chip-green{background:#e8f5e9;border-color:#a5d6a7;color:#1b5e20;}
.wtower-chip-red{background:#ffebee;border-color:#ef9a9a;color:#b71c1c;}
.wtower-chip-blue{background:#e3f2fd;border-color:#90caf9;color:#0d47a1;}
.wtower-chip-teal{background:#e0f2f1;border-color:#80cbc4;color:#004d40;}
`;

function parseKV(text) {
  const result = {};
  for (const line of (text || '').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const t2 = t.startsWith('export ') ? t.slice(7) : t;
    const eq = t2.indexOf('=');
    if (eq === -1) continue;
    let val = t2.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    result[t2.slice(0, eq).trim()] = val;
  }
  return result;
}

function chip(label, cls) {
  if (label == null || label === '') return '';
  return `<span class="wtower-chip${cls ? ' wtower-chip-' + cls : ''}">${esc(label)}</span>`;
}

function boolChip(val, trueLabel, trueColor, falseLabel, falseColor) {
  const v = String(val ?? '').toLowerCase().trim();
  if (v === 'true' || v === '1' || v === 'yes') return chip(trueLabel || 'true', trueColor || 'green');
  if (v === 'false' || v === '0' || v === 'no') return chip(falseLabel || 'false', falseColor || 'red');
  return chip(val);
}

function kv(label, html) {
  if (!html) return '';
  return `<div class="wtower-kv"><span class="wtower-kv-k">${esc(label)}</span><span class="wtower-kv-v">${html}</span></div>`;
}

function kvText(label, value) {
  if (value == null || value === '') return '';
  return kv(label, esc(String(value)));
}

function kvMasked(label, exists) {
  if (!exists) return '';
  return `<div class="wtower-kv"><span class="wtower-kv-k">${esc(label)}</span><span class="wtower-masked">[configured]</span></div>`;
}

export function render(intake) {
  const kvals = parseKV(intake.text || '');

  // Schedule section
  const pollInterval = kvals['WATCHTOWER_POLL_INTERVAL'];
  const schedule = kvals['WATCHTOWER_SCHEDULE'];
  const runOnce = kvals['WATCHTOWER_RUN_ONCE'];
  const schedRows = [
    pollInterval != null ? kvText('WATCHTOWER_POLL_INTERVAL', pollInterval + ' seconds') : '',
    schedule != null ? kvText('WATCHTOWER_SCHEDULE', schedule) : '',
    runOnce != null ? kv('WATCHTOWER_RUN_ONCE', boolChip(runOnce, 'run once', 'blue', 'continuous', 'teal')) : '',
  ].filter(Boolean).join('');

  // Behavior section
  const behaviorRows = [
    kvals['WATCHTOWER_CLEANUP'] != null ? kv('WATCHTOWER_CLEANUP', boolChip(kvals['WATCHTOWER_CLEANUP'], 'cleanup old images', 'teal', 'keep old images', 'red')) : '',
    kvals['WATCHTOWER_INCLUDE_STOPPED'] != null ? kv('WATCHTOWER_INCLUDE_STOPPED', boolChip(kvals['WATCHTOWER_INCLUDE_STOPPED'], 'include stopped', 'blue')) : '',
    kvals['WATCHTOWER_REVIVE_STOPPED'] != null ? kv('WATCHTOWER_REVIVE_STOPPED', boolChip(kvals['WATCHTOWER_REVIVE_STOPPED'], 'revive stopped', 'blue')) : '',
    kvals['WATCHTOWER_REMOVE_VOLUMES'] != null ? kv('WATCHTOWER_REMOVE_VOLUMES', boolChip(kvals['WATCHTOWER_REMOVE_VOLUMES'], 'remove volumes', 'red')) : '',
    kvals['WATCHTOWER_INCLUDE_RESTARTING'] != null ? kv('WATCHTOWER_INCLUDE_RESTARTING', boolChip(kvals['WATCHTOWER_INCLUDE_RESTARTING'], 'include restarting', 'blue')) : '',
  ].filter(Boolean).join('');

  // Scope section
  const scopeRows = [
    kvals['WATCHTOWER_SCOPE'] != null ? kvText('WATCHTOWER_SCOPE', kvals['WATCHTOWER_SCOPE']) : '',
    kvals['WATCHTOWER_LABEL_ENABLE'] != null ? kv('WATCHTOWER_LABEL_ENABLE', boolChip(kvals['WATCHTOWER_LABEL_ENABLE'], 'label-enable mode', 'blue')) : '',
    kvals['WATCHTOWER_MONITOR_ONLY'] != null ? kv('WATCHTOWER_MONITOR_ONLY', boolChip(kvals['WATCHTOWER_MONITOR_ONLY'], 'monitor only', 'blue', 'update mode', 'teal')) : '',
  ].filter(Boolean).join('');

  // Rolling restart section
  const rollingRows = [
    kvals['WATCHTOWER_ROLLING_RESTART'] != null ? kv('WATCHTOWER_ROLLING_RESTART', boolChip(kvals['WATCHTOWER_ROLLING_RESTART'], 'rolling restart', 'blue')) : '',
    kvals['WATCHTOWER_TIMEOUT'] != null ? kvText('WATCHTOWER_TIMEOUT', kvals['WATCHTOWER_TIMEOUT']) : '',
  ].filter(Boolean).join('');

  // Registry section
  const registryRows = [
    kvals['REPO_USER'] != null ? kvText('REPO_USER', kvals['REPO_USER']) : '',
    kvals['REPO_PASS'] != null ? kvMasked('REPO_PASS', true) : '',
  ].filter(Boolean).join('');

  // Notifications section
  const notifTypes = kvals['WATCHTOWER_NOTIFICATIONS'];
  const notifUrl = kvals['WATCHTOWER_NOTIFICATION_URL'];
  const emailServer = kvals['WATCHTOWER_NOTIFICATION_EMAIL_SERVER'];
  const emailFrom = kvals['WATCHTOWER_NOTIFICATION_EMAIL_FROM'];
  const emailTo = kvals['WATCHTOWER_NOTIFICATION_EMAIL_TO'];
  const hasEmailPass = kvals['WATCHTOWER_NOTIFICATION_EMAIL_SERVER_PASSWORD'] != null;
  const hasSlackHook = kvals['WATCHTOWER_SLACK_HOOK_URL'] != null;
  const notifRows = [
    notifTypes != null ? kv('WATCHTOWER_NOTIFICATIONS', notifTypes.split(/[\s,]+/).filter(Boolean).map((t) => chip(t, 'blue')).join(' ')) : '',
    notifUrl != null ? kvMasked('WATCHTOWER_NOTIFICATION_URL', true) : '',
    emailServer != null ? kvText('WATCHTOWER_NOTIFICATION_EMAIL_SERVER', emailServer) : '',
    emailFrom != null ? kvText('WATCHTOWER_NOTIFICATION_EMAIL_FROM', emailFrom) : '',
    emailTo != null ? kvText('WATCHTOWER_NOTIFICATION_EMAIL_TO', emailTo) : '',
    hasEmailPass ? kvMasked('WATCHTOWER_NOTIFICATION_EMAIL_SERVER_PASSWORD', true) : '',
    hasSlackHook ? kvMasked('WATCHTOWER_SLACK_HOOK_URL', true) : '',
  ].filter(Boolean).join('');

  // HTTP API section
  const httpApiRows = [
    kvals['WATCHTOWER_HTTP_API_UPDATE'] != null ? kv('WATCHTOWER_HTTP_API_UPDATE', boolChip(kvals['WATCHTOWER_HTTP_API_UPDATE'], 'enabled', 'green', 'disabled', 'red')) : '',
    kvals['WATCHTOWER_HTTP_API_TOKEN'] != null ? kvMasked('WATCHTOWER_HTTP_API_TOKEN', true) : '',
    kvals['WATCHTOWER_HTTP_API_PERIODIC_POLLS'] != null ? kv('WATCHTOWER_HTTP_API_PERIODIC_POLLS', boolChip(kvals['WATCHTOWER_HTTP_API_PERIODIC_POLLS'], 'periodic polls', 'blue')) : '',
  ].filter(Boolean).join('');

  // Summary
  const subParts = [
    schedule ? `schedule: ${schedule}` : pollInterval ? `poll: ${pollInterval}s` : null,
    notifTypes ? `notify: ${notifTypes}` : null,
    kvals['WATCHTOWER_CLEANUP'] === 'true' ? 'cleanup enabled' : null,
  ].filter(Boolean).join(' · ');

  function section(title, rows) {
    if (!rows) return '';
    return `<div class="wtower-sec"><h3>${esc(title)}</h3><div class="wtower-card">${rows}</div></div>`;
  }

  const host = document.createElement('div');
  host.className = 'wtower-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="margin-bottom:4px;">
  <span class="wtower-badge">Watchtower</span>
  <span class="wtower-title">Watchtower Config</span>
</div>
<div class="wtower-sub">${esc(subParts || 'Automatic Docker container updater')}</div>
${section('Schedule', schedRows)}
${section('Behavior', behaviorRows)}
${section('Scope', scopeRows)}
${section('Rolling Restart', rollingRows)}
${section('Registry', registryRows)}
${section('Notifications', notifRows)}
${section('HTTP API', httpApiRows)}`;
  return { parentNode: host };
}
