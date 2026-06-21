const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.dj-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.dj-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0C4B33;color:#fff;vertical-align:middle;margin-right:8px}
.dj-title{font-size:18px;font-weight:700;margin:0 0 4px}
.dj-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.dj-sec{margin:14px 0}
.dj-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px}
.dj-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff)}
.dj-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:12px}
.dj-kv-k{color:var(--fg-2,#888);min-width:190px;font-family:ui-monospace,monospace;flex-shrink:0}
.dj-kv-v{font-family:ui-monospace,monospace;word-break:break-all}
.dj-masked{font-family:ui-monospace,monospace;color:var(--fg-2,#999);letter-spacing:2px}
.dj-warn{display:flex;align-items:center;gap:8px;background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:8px 12px;margin:0 0 12px;font-size:12px;color:#7f1d1d}
.dj-pill{display:inline-flex;align-items:center;font-size:12px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:2px 3px 2px 0}
.dj-app-list{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}
`;

/** Extract a Python list literal from the first occurrence of `name = [...]`. */
function extractPyList(text, name) {
  const re = new RegExp(`${name}\\s*=\\s*\\[([\\s\\S]*?)\\]`);
  const m = text.match(re);
  if (!m) return [];
  return m[1]
    .split(',')
    .map((s) => s.trim().replace(/^['"]|['"]$/g, '').trim())
    .filter(Boolean);
}

/** Extract a string or bool value for a simple top-level assignment. */
function extractPyVal(text, name) {
  const re = new RegExp(`^${name}\\s*=\\s*(.+)$`, 'm');
  const m = text.match(re);
  if (!m) return null;
  return m[1].trim().replace(/^['"]|['"]$|#.*$/g, '').trim();
}

/** Extract nested dict value: name: { key: value } or name = { key: value }. */
function extractDictKey(text, name, key) {
  // Match both Python dict key (colon) and assignment (equals): 'default': { or 'default' = {
  const re = new RegExp(`${name}\\s*[=:]\\s*\\{([\\s\\S]*?)\\}`, 'g');
  let m;
  while ((m = re.exec(text)) !== null) {
    const block = m[1];
    const keyRe = new RegExp(`['"]?${key}['"]?\\s*:\\s*(['"]?)([^,'"\\n}]+)\\1`);
    const km = block.match(keyRe);
    if (km) return km[2].trim();
  }
  return null;
}

/** Check if SECRET_KEY looks hardcoded (not env-var). */
function isHardcodedSecret(val) {
  if (!val) return false;
  // If it references os.environ or config() it's not hardcoded
  return !/os\.environ|env\(|config\(|getenv/.test(val) && val.length > 4;
}

export function render(intake) {
  const text = intake.text || '';
  const filename = (intake.name || intake.filename || '').split('/').pop() || 'settings.py';

  // --- Parse values ---
  const debug = extractPyVal(text, 'DEBUG');
  const secretKeyRaw = extractPyVal(text, 'SECRET_KEY');
  const allowedHosts = extractPyList(text, 'ALLOWED_HOSTS');
  const installedApps = extractPyList(text, 'INSTALLED_APPS');
  const middleware = extractPyList(text, 'MIDDLEWARE');

  // Django version hint from INSTALLED_APPS content
  const hasDrf = installedApps.some((a) => /rest_framework/.test(a));
  const hasCelery = text.includes('CELERY_') || text.includes('celery');
  const hasChannels = installedApps.some((a) => /channels/.test(a));

  // DB: look for default alias in DATABASES dict
  const dbEngine = extractDictKey(text, "'default'", 'ENGINE') || extractDictKey(text, '"default"', 'ENGINE');
  const dbName = extractDictKey(text, "'default'", 'NAME') || extractDictKey(text, '"default"', 'NAME');

  const debugIsTrue = debug === 'True';
  const secretHardcoded = isHardcodedSecret(secretKeyRaw);

  // --- Build HTML ---
  const warnings = [];
  if (debugIsTrue) warnings.push('DEBUG = True — never enable DEBUG in production');
  if (secretHardcoded) warnings.push('SECRET_KEY appears to be hardcoded — use environment variables');

  const warningsHtml = warnings.map((w) => `<div class="dj-warn"><span>&#9888;</span>${esc(w)}</div>`).join('');

  // Installed apps section
  const appsHtml = installedApps.length
    ? `<div class="dj-sec"><h3>INSTALLED_APPS (${installedApps.length})</h3>
       <div class="dj-card"><div class="dj-app-list">${
         installedApps.map((a) => `<span class="dj-pill">${esc(a)}</span>`).join('')
       }</div></div></div>`
    : '';

  // Database section
  const dbHtml = (dbEngine || dbName)
    ? `<div class="dj-sec"><h3>Database</h3><div class="dj-card">
       ${dbEngine ? `<div class="dj-kv"><span class="dj-kv-k">ENGINE</span><span class="dj-kv-v">${esc(dbEngine)}</span></div>` : ''}
       ${dbName ? `<div class="dj-kv"><span class="dj-kv-k">NAME</span><span class="dj-kv-v">${esc(dbName)}</span></div>` : ''}
       <div class="dj-kv"><span class="dj-kv-k">PASSWORD</span><span class="dj-masked">••••••••</span></div>
       </div></div>`
    : '';

  // General settings section
  const settingsRows = [];
  settingsRows.push(`<div class="dj-kv"><span class="dj-kv-k">DEBUG</span><span class="dj-kv-v" style="${debugIsTrue ? 'color:#dc2626;font-weight:700' : ''}">${esc(debug || 'False')}</span></div>`);
  if (allowedHosts.length) {
    settingsRows.push(`<div class="dj-kv"><span class="dj-kv-k">ALLOWED_HOSTS</span><span class="dj-kv-v">${esc(allowedHosts.join(', ') || '*')}</span></div>`);
  }
  settingsRows.push(`<div class="dj-kv"><span class="dj-kv-k">SECRET_KEY</span><span class="dj-masked">••••••••</span>${secretHardcoded ? ' <span style="color:#dc2626;font-size:11px;margin-left:6px">⚠ hardcoded</span>' : ''}</div>`);
  if (middleware.length) {
    settingsRows.push(`<div class="dj-kv"><span class="dj-kv-k">MIDDLEWARE count</span><span class="dj-kv-v">${middleware.length}</span></div>`);
  }

  const hints = [];
  if (hasDrf) hints.push('Django REST Framework');
  if (hasCelery) hints.push('Celery');
  if (hasChannels) hints.push('Channels');

  const host = document.createElement('div');
  host.className = 'dj-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px">
  <span class="dj-badge">Django Settings</span>
  <span class="dj-title">${esc(filename)}</span>
</div>
<div class="dj-sub">${hints.length ? esc(hints.join(' · ')) : 'Django project settings'}</div>
${warningsHtml}
<div class="dj-sec"><h3>General</h3><div class="dj-card">${settingsRows.join('')}</div></div>
${appsHtml}
${dbHtml}`;

  return { parentNode: host };
}
