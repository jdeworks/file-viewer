import jsYaml from '../../../../../vendor/js-yaml/js-yaml.min.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.sp-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.sp-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#6DB33F;color:#fff;vertical-align:middle;margin-right:8px}
.sp-title{font-size:18px;font-weight:700;margin:0 0 4px}
.sp-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.sp-sec{margin:14px 0}
.sp-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px}
.sp-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff)}
.sp-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:12px}
.sp-kv-k{color:var(--fg-2,#888);min-width:200px;font-family:ui-monospace,monospace;flex-shrink:0}
.sp-kv-v{font-family:ui-monospace,monospace;word-break:break-all}
.sp-masked{font-family:ui-monospace,monospace;color:var(--fg-2,#999);letter-spacing:2px}
.sp-tag{display:inline-block;padding:1px 7px;border-radius:8px;font-size:11px;background:#dcfce7;border:1px solid #86efac;color:#166534;font-family:ui-monospace,monospace;margin:2px 3px 2px 0}
.sp-log-table{width:100%;border-collapse:collapse;font-size:12px}
.sp-log-table td{padding:4px 8px;border-bottom:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.sp-log-table td:first-child{color:var(--fg-2,#666);width:60%}
`;

const SENSITIVE = /password|secret|credential|token|private.?key/i;

function flatten(obj, prefix = '') {
  const out = {};
  if (obj == null || typeof obj !== 'object' || Array.isArray(obj)) {
    if (prefix) out[prefix] = obj;
    return out;
  }
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? prefix + '.' + k : k;
    if (v != null && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flatten(v, key));
    } else {
      out[key] = v;
    }
  }
  return out;
}

/** Mask password portion of a JDBC URL: password=xxx → password=•••• */
function maskJdbcPassword(url) {
  if (!url) return url;
  return String(url).replace(/(?<=password=)[^&;?\s]+/gi, '••••');
}

export async function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes || new Uint8Array());
  const filename = (intake.name || intake.filename || '').split('/').pop() || 'application.yml';

  let parsed = {};
  try { parsed = (jsYaml.loadAll(text) || [])[0] || {}; } catch { parsed = {}; }

  const flat = flatten(parsed);

  // Core fields
  const appName = flat['spring.application.name'];
  const serverPort = flat['server.port'];
  const profilesActive = flat['spring.profiles.active'];
  const profilesDefault = flat['spring.config.activate.on-profile'];
  const dsUrl = flat['spring.datasource.url'];
  const dsUsername = flat['spring.datasource.username'];
  const redisHost = flat['spring.redis.host'] || flat['spring.data.redis.host'];
  const redisPort = flat['spring.redis.port'] || flat['spring.data.redis.port'];
  const jwtSecret = flat['spring.security.oauth2.resourceserver.jwt.issuer-uri']
    || flat['jwt.secret']
    || flat['app.jwt.secret'];

  // Logging levels
  const loggingLevels = Object.entries(flat)
    .filter(([k]) => k.startsWith('logging.level.'))
    .map(([k, v]) => ({ logger: k.replace('logging.level.', ''), level: String(v) }));

  // Build sections
  const generalRows = [];
  if (appName) generalRows.push(['Application name', String(appName), false]);
  if (serverPort) generalRows.push(['Server port', String(serverPort), false]);
  if (profilesActive) generalRows.push(['Active profiles', Array.isArray(profilesActive) ? profilesActive.join(', ') : String(profilesActive), false]);
  if (profilesDefault) generalRows.push(['Profile (on-profile)', Array.isArray(profilesDefault) ? profilesDefault.join(', ') : String(profilesDefault), false]);

  const generalHtml = generalRows.length
    ? `<div class="sp-sec"><h3>General</h3><div class="sp-card">${
        generalRows.map(([l, v]) => `<div class="sp-kv"><span class="sp-kv-k">${esc(l)}</span><span class="sp-kv-v">${esc(v)}</span></div>`).join('')
      }</div></div>`
    : '';

  const dsHtml = (dsUrl || dsUsername)
    ? `<div class="sp-sec"><h3>Datasource</h3><div class="sp-card">
       ${dsUrl ? `<div class="sp-kv"><span class="sp-kv-k">url</span><span class="sp-kv-v">${esc(maskJdbcPassword(String(dsUrl)))}</span></div>` : ''}
       ${dsUsername ? `<div class="sp-kv"><span class="sp-kv-k">username</span><span class="sp-kv-v">${esc(String(dsUsername))}</span></div>` : ''}
       <div class="sp-kv"><span class="sp-kv-k">password</span><span class="sp-masked">••••••••</span></div>
       </div></div>`
    : '';

  const redisHtml = (redisHost)
    ? `<div class="sp-sec"><h3>Redis</h3><div class="sp-card">
       <div class="sp-kv"><span class="sp-kv-k">host</span><span class="sp-kv-v">${esc(String(redisHost))}</span></div>
       ${redisPort ? `<div class="sp-kv"><span class="sp-kv-k">port</span><span class="sp-kv-v">${esc(String(redisPort))}</span></div>` : ''}
       </div></div>`
    : '';

  // Mask all sensitive keys in flat dump
  const sensitiveRows = Object.entries(flat)
    .filter(([k]) => SENSITIVE.test(k))
    .filter(([k]) => !k.startsWith('logging.level.'));

  const securityHtml = (sensitiveRows.length || jwtSecret)
    ? `<div class="sp-sec"><h3>Security / Secrets</h3><div class="sp-card">
       ${sensitiveRows.map(([k]) => `<div class="sp-kv"><span class="sp-kv-k">${esc(k)}</span><span class="sp-masked">••••••••</span></div>`).join('')}
       </div></div>`
    : '';

  const loggingHtml = loggingLevels.length
    ? `<div class="sp-sec"><h3>Logging levels (${loggingLevels.length})</h3><div class="sp-card">
       <table class="sp-log-table"><tbody>${
         loggingLevels.map((e) => `<tr><td>${esc(e.logger)}</td><td>${esc(e.level)}</td></tr>`).join('')
       }</tbody></table></div></div>`
    : '';

  const profileLabel = profilesActive
    ? (Array.isArray(profilesActive) ? profilesActive.join(', ') : String(profilesActive))
    : (profilesDefault ? String(profilesDefault) : '');

  const host = document.createElement('div');
  host.className = 'sp-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px">
  <span class="sp-badge">Spring Boot</span>
  <span class="sp-title">${esc(filename)}</span>
</div>
<div class="sp-sub">${appName ? esc(String(appName)) : ''}${serverPort ? ' · port ' + esc(String(serverPort)) : ''}${profileLabel ? ' · profile: ' + esc(profileLabel) : ''}</div>
${generalHtml}${dsHtml}${redisHtml}${securityHtml}${loggingHtml}`;

  return { parentNode: host };
}
