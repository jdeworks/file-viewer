import { parseIni } from '../../renderer.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.php-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.php-head{display:flex;align-items:center;gap:10px;margin-bottom:14px;}
.badge-php{display:inline-block;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;background:#8892BF;color:#fff;vertical-align:middle;}
.php-title{font-size:18px;font-weight:700;margin:0;}
.php-sub{font-size:12px;color:var(--fg-2,#888);margin:2px 0 0;}
.php-sec{margin-top:16px;}
.php-sec h3{font-size:12px;font-weight:600;color:var(--fg-2,#888);text-transform:uppercase;letter-spacing:.05em;margin:0 0 6px;}
.php-card{border:1px solid var(--border,#e8eaed);border-radius:6px;padding:8px 12px;}
.php-kv{display:flex;gap:10px;font-size:12px;padding:3px 0;border-bottom:1px solid var(--border,#eaecef);}
.php-kv:last-child{border-bottom:none;}
.php-kv-k{font-family:ui-monospace,monospace;font-weight:600;min-width:180px;flex-shrink:0;color:var(--fg,#24292f);}
.php-kv-v{font-family:ui-monospace,monospace;color:var(--fg-2,#888);}
.php-kv-v.warn{color:#c2410c;font-weight:600;}
.php-pill{display:inline-block;padding:2px 9px;border-radius:10px;font-size:12px;font-family:ui-monospace,monospace;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.php-pill.on{background:#dcfce7;border-color:#86efac;color:#166534;}
.php-pill.warn{background:#fff7ed;border-color:#fed7aa;color:#c2410c;}
.php-pill.off{background:#f1f5f9;border-color:#cbd5e1;color:#64748b;}
.php-pills{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;}
`;

function sectionMap(sections) {
  const m = {};
  for (const s of sections) {
    const key = (s.name || '').toLowerCase();
    const pairs = {};
    for (const p of s.pairs) pairs[p.key.toLowerCase()] = p.value;
    m[key] = pairs;
  }
  return m;
}

function kvRow(label, value, warnIf) {
  if (value == null || value === '') return '';
  const cls = warnIf && warnIf(value) ? ' warn' : '';
  return `<div class="php-kv"><span class="php-kv-k">${esc(label)}</span><span class="php-kv-v${cls}">${esc(value)}</span></div>`;
}

export function render(intake) {
  const sections = parseIni(intake.text || '');
  const cfg = sectionMap(sections);

  const php = cfg['php'] || cfg[''] || {};

  // Core PHP settings
  const memoryLimit = php['memory_limit'] || '';
  const maxExecTime = php['max_execution_time'] || '';
  const maxInputTime = php['max_input_time'] || '';
  const uploadMaxFilesize = php['upload_max_filesize'] || '';
  const postMaxSize = php['post_max_size'] || '';
  const maxFileUploads = php['max_file_uploads'] || '';
  const maxInputVars = php['max_input_vars'] || '';

  // Error reporting
  const errorReporting = php['error_reporting'] || '';
  const displayErrors = php['display_errors'] || '';
  const displayStartupErrors = php['display_startup_errors'] || '';
  const logErrors = php['log_errors'] || '';
  const errorLog = php['error_log'] || '';

  // Date / timezone
  const date = cfg['date'] || {};
  const timezone = date['date.timezone'] || php['date.timezone'] || '';

  // Session
  const session = cfg['session'] || {};
  const sessionSaveHandler = session['session.save_handler'] || php['session.save_handler'] || '';
  const sessionSavePath = session['session.save_path'] || php['session.save_path'] || '';
  const sessionGcMaxLifetime = session['session.gc_maxlifetime'] || php['session.gc_maxlifetime'] || '';
  const sessionCookieSecure = session['session.cookie_secure'] || php['session.cookie_secure'] || '';

  // OPcache
  const opcache = cfg['opcache'] || {};
  const opcacheEnable = opcache['opcache.enable'] || php['opcache.enable'] || '';
  const opcacheMemory = opcache['opcache.memory_consumption'] || php['opcache.memory_consumption'] || '';

  // Extensions
  const extensions = [];
  for (const s of sections) {
    for (const p of s.pairs) {
      if (p.key.toLowerCase().startsWith('extension') && p.value) {
        extensions.push(p.value);
      }
    }
  }

  // Summary
  const summaryParts = [];
  if (memoryLimit) summaryParts.push(`memory: ${memoryLimit}`);
  if (maxExecTime) summaryParts.push(`timeout: ${maxExecTime}s`);
  if (uploadMaxFilesize) summaryParts.push(`upload: ${uploadMaxFilesize}`);
  if (timezone) summaryParts.push(timezone);
  const subtitle = summaryParts.join(' · ') || 'PHP runtime configuration';

  const coreHtml = `<div class="php-sec"><h3>Core Settings</h3><div class="php-card">
${kvRow('memory_limit', memoryLimit)}
${kvRow('max_execution_time', maxExecTime)}
${kvRow('max_input_time', maxInputTime)}
${kvRow('upload_max_filesize', uploadMaxFilesize)}
${kvRow('post_max_size', postMaxSize)}
${maxFileUploads ? kvRow('max_file_uploads', maxFileUploads) : ''}
${maxInputVars ? kvRow('max_input_vars', maxInputVars) : ''}
</div></div>`;

  const displayErrorsWarn = displayErrors === 'On' || displayErrors === '1';
  const errHtml = (errorReporting || displayErrors || logErrors || errorLog) ? `<div class="php-sec"><h3>Error Reporting</h3><div class="php-card">
${kvRow('error_reporting', errorReporting)}
${displayErrors ? `<div class="php-kv"><span class="php-kv-k">display_errors</span><span class="php-kv-v"><span class="php-pill ${displayErrorsWarn ? 'warn' : 'off'}">${esc(displayErrors)}</span></span></div>` : ''}
${displayStartupErrors ? `<div class="php-kv"><span class="php-kv-k">display_startup_errors</span><span class="php-kv-v"><span class="php-pill ${displayStartupErrors === 'On' || displayStartupErrors === '1' ? 'warn' : 'off'}">${esc(displayStartupErrors)}</span></span></div>` : ''}
${kvRow('log_errors', logErrors)}
${kvRow('error_log', errorLog)}
</div></div>` : '';

  const dateHtml = timezone ? `<div class="php-sec"><h3>Date &amp; Time</h3><div class="php-card">
${kvRow('date.timezone', timezone)}
</div></div>` : '';

  const sessionHtml = (sessionSaveHandler || sessionSavePath || sessionGcMaxLifetime) ? `<div class="php-sec"><h3>Session</h3><div class="php-card">
${kvRow('session.save_handler', sessionSaveHandler)}
${kvRow('session.save_path', sessionSavePath)}
${kvRow('session.gc_maxlifetime', sessionGcMaxLifetime)}
${sessionCookieSecure ? `<div class="php-kv"><span class="php-kv-k">session.cookie_secure</span><span class="php-kv-v"><span class="php-pill ${sessionCookieSecure === 'On' || sessionCookieSecure === '1' ? 'on' : 'off'}">${esc(sessionCookieSecure)}</span></span></div>` : ''}
</div></div>` : '';

  const opcacheHtml = (opcacheEnable || opcacheMemory) ? `<div class="php-sec"><h3>OPcache</h3><div class="php-card">
${opcacheEnable ? `<div class="php-kv"><span class="php-kv-k">opcache.enable</span><span class="php-kv-v"><span class="php-pill ${opcacheEnable === '1' || opcacheEnable.toLowerCase() === 'on' ? 'on' : 'off'}">${esc(opcacheEnable)}</span></span></div>` : ''}
${kvRow('opcache.memory_consumption', opcacheMemory)}
</div></div>` : '';

  const extHtml = extensions.length ? `<div class="php-sec"><h3>Extensions (${extensions.length})</h3><div class="php-pills">
${extensions.map((e) => `<span class="php-pill">${esc(e.replace(/\.so$/, '').replace(/^php_/, ''))}</span>`).join('')}
</div></div>` : '';

  const host = document.createElement('div');
  host.className = 'php-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="php-head">
  <span class="badge-php">PHP Config</span>
  <div>
    <div class="php-title">php.ini</div>
    <div class="php-sub">${esc(subtitle)}</div>
  </div>
</div>
${coreHtml}${errHtml}${dateHtml}${sessionHtml}${opcacheHtml}${extHtml}`;

  return { parentNode: host };
}
