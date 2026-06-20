const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.nagios-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.nagios-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#E67E22;color:#fff;vertical-align:middle;margin-right:8px;}
.nagios-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.nagios-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.nagios-sec{margin:14px 0;}
.nagios-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.nagios-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.nagios-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px;}
.nagios-kv-k{color:var(--fg-2,#888);min-width:220px;flex-shrink:0;font:12px/1.6 ui-monospace,monospace;}
.nagios-kv-v{font:12px/1.6 ui-monospace,monospace;word-break:break-all;}
.nagios-chips{display:flex;flex-wrap:wrap;gap:6px;padding:2px 0;}
.nagios-chip{display:inline-block;padding:2px 9px;border-radius:8px;font-size:11px;font-weight:500;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.nagios-flag-on{display:inline-block;padding:1px 8px;border-radius:8px;font-size:11px;font-weight:600;background:#d4edda;color:#155724;border:1px solid #c3e6cb;}
.nagios-flag-off{display:inline-block;padding:1px 8px;border-radius:8px;font-size:11px;font-weight:600;background:#f8d7da;color:#721c24;border:1px solid #f5c6cb;}
`;

function parseKV(text) {
  const result = {};
  for (const line of (text || '').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const k = t.slice(0, eq);
    const v = t.slice(eq + 1);
    if (result[k] !== undefined) {
      if (!Array.isArray(result[k])) result[k] = [result[k]];
      result[k].push(v);
    } else {
      result[k] = v;
    }
  }
  return result;
}

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<div class="nagios-kv"><span class="nagios-kv-k">${esc(label)}</span><span class="nagios-kv-v">${esc(value)}</span></div>`;
}

function boolFlag(label, value) {
  if (value == null || value === '') return '';
  const on = value.trim() === '1';
  const cls = on ? 'nagios-flag-on' : 'nagios-flag-off';
  return `<div class="nagios-kv"><span class="nagios-kv-k">${esc(label)}</span><span class="${cls}">${on ? 'enabled' : 'disabled'}</span></div>`;
}

export function render(intake) {
  const cfg = parseKV(intake.text || '');

  const get = (k) => {
    const v = cfg[k];
    if (v == null) return null;
    return Array.isArray(v) ? v[0] : v;
  };
  const getAll = (k) => {
    const v = cfg[k];
    if (v == null) return [];
    return Array.isArray(v) ? v : [v];
  };

  // Paths section
  const logFile = get('log_file');
  const statusFile = get('status_file');
  const objectCacheFile = get('object_cache_file');
  const checkResultPath = get('check_result_path');
  const resourceFile = get('resource_file');
  const commandFile = get('command_file');

  const pathsHtml = (logFile || statusFile || objectCacheFile || checkResultPath || resourceFile) ? `
<div class="nagios-sec"><h3>Paths</h3><div class="nagios-card">
${kv('log_file', logFile)}
${kv('status_file', statusFile)}
${kv('object_cache_file', objectCacheFile)}
${kv('check_result_path', checkResultPath)}
${kv('resource_file', resourceFile)}
</div></div>` : '';

  // Configuration files/dirs
  const cfgFiles = getAll('cfg_file');
  const cfgDirs = getAll('cfg_dir');

  let cfgFilesHtml = '';
  if (cfgFiles.length > 0) {
    const chips = cfgFiles.map((f) => `<span class="nagios-chip">${esc(f)}</span>`).join('');
    cfgFilesHtml = `<div class="nagios-kv" style="flex-direction:column;align-items:flex-start;gap:4px;"><span class="nagios-kv-k">cfg_file (${cfgFiles.length})</span><div class="nagios-chips">${chips}</div></div>`;
  }
  let cfgDirsHtml = '';
  if (cfgDirs.length > 0) {
    const chips = cfgDirs.map((d) => `<span class="nagios-chip">${esc(d)}</span>`).join('');
    cfgDirsHtml = `<div class="nagios-kv" style="flex-direction:column;align-items:flex-start;gap:4px;"><span class="nagios-kv-k">cfg_dir (${cfgDirs.length})</span><div class="nagios-chips">${chips}</div></div>`;
  }
  const configFilesHtml = (cfgFiles.length || cfgDirs.length) ? `
<div class="nagios-sec"><h3>Configuration Files</h3><div class="nagios-card">
${cfgFilesHtml}${cfgDirsHtml}
</div></div>` : '';

  // Checks section
  const maxConcurrent = get('max_concurrent_checks');
  const serviceTimeout = get('service_check_timeout');
  const hostTimeout = get('host_check_timeout');
  const notifyTimeout = get('notification_timeout');
  const intervalLength = get('interval_length');

  const checksHtml = (maxConcurrent || serviceTimeout || hostTimeout || notifyTimeout || intervalLength) ? `
<div class="nagios-sec"><h3>Checks &amp; Timers</h3><div class="nagios-card">
${kv('max_concurrent_checks', maxConcurrent)}
${kv('service_check_timeout', serviceTimeout)}
${kv('host_check_timeout', hostTimeout)}
${kv('notification_timeout', notifyTimeout)}
${kv('interval_length', intervalLength)}
</div></div>` : '';

  // Notifications & commands
  const enableNotif = get('enable_notifications');
  const checkExternal = get('check_external_commands');
  const eventBroker = get('event_broker_options');
  const daemonDumps = get('daemon_dumps_core');

  const notifHtml = (enableNotif != null || checkExternal != null || commandFile || eventBroker || daemonDumps != null) ? `
<div class="nagios-sec"><h3>Notifications &amp; Commands</h3><div class="nagios-card">
${enableNotif != null ? boolFlag('enable_notifications', enableNotif) : ''}
${checkExternal != null ? boolFlag('check_external_commands', checkExternal) : ''}
${kv('command_file', commandFile)}
${kv('event_broker_options', eventBroker)}
${daemonDumps != null ? boolFlag('daemon_dumps_core', daemonDumps) : ''}
</div></div>` : '';

  const subParts = [];
  if (logFile) subParts.push(`log: ${logFile}`);
  if (cfgFiles.length) subParts.push(`${cfgFiles.length} cfg_file(s)`);
  if (maxConcurrent) subParts.push(`max_concurrent: ${maxConcurrent}`);
  const sub = subParts.join(' · ') || 'Nagios monitoring server configuration';

  const host = document.createElement('div');
  host.className = 'nagios-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="nagios-badge">Nagios</span>
  <span class="nagios-title">Nagios Monitoring</span>
</div>
<div class="nagios-sub">${esc(sub)}</div>
${pathsHtml}${configFilesHtml}${checksHtml}${notifHtml}`;

  return { parentNode: host };
}
