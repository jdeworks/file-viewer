const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.giteacfg-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.giteacfg-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#178600;color:#fff;vertical-align:middle;margin-right:8px;}
.giteacfg-title{font-size:20px;font-weight:700;margin:0 0 4px;}
.giteacfg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.giteacfg-chips{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 14px;}
.giteacfg-chip{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;padding:2px 8px;border-radius:10px;letter-spacing:.02em;}
.giteacfg-chip-prod{background:#d4edda;color:#155724;border:1px solid #c3e6cb;}
.giteacfg-chip-dev{background:#fff3cd;color:#856404;border:1px solid #ffc107;}
.giteacfg-chip-https{background:#cce5ff;color:#004085;border:1px solid #b8daff;}
.giteacfg-chip-warn{background:#f8d7da;color:#721c24;border:1px solid #f5c6cb;}
.giteacfg-chip-ok{background:#d4edda;color:#155724;border:1px solid #c3e6cb;}
.giteacfg-chip-db-pg{background:#336791;color:#fff;}
.giteacfg-chip-db-mysql{background:#e48e00;color:#fff;}
.giteacfg-chip-db-sqlite{background:#178600;color:#fff;}
.giteacfg-chip-db-mssql{background:#cc2020;color:#fff;}
.giteacfg-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:10px;margin-bottom:12px;}
.giteacfg-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:12px 16px;}
.giteacfg-card-hd{font-weight:700;font-size:13px;margin-bottom:8px;display:flex;align-items:center;gap:6px;}
.giteacfg-card-icon{font-size:15px;}
.giteacfg-table{width:100%;border-collapse:collapse;font-size:12px;}
.giteacfg-table td{padding:3px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.giteacfg-table td:first-child{font-family:ui-monospace,monospace;color:var(--fg-2,#888);width:45%;white-space:nowrap;padding-right:8px;}
.giteacfg-table td:last-child{font-family:ui-monospace,monospace;word-break:break-word;}
.giteacfg-table tr:last-child td{border-bottom:none;}
.giteacfg-redacted{color:#856404;background:#fff3cd;border:1px solid #ffc107;border-radius:3px;padding:0 4px;font-family:system-ui,sans-serif;font-size:11px;font-style:italic;}
.giteacfg-features{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;}
.giteacfg-feat{font-size:11px;font-weight:600;padding:2px 7px;border-radius:8px;border:1px solid;}
.giteacfg-feat-on{background:#d4edda;color:#155724;border-color:#c3e6cb;}
.giteacfg-feat-off{background:#f8f9fa;color:#6c757d;border-color:#dee2e6;}
.giteacfg-feat-warn{background:#f8d7da;color:#721c24;border-color:#f5c6cb;}
.giteacfg-url{color:#0969da;font-family:ui-monospace,monospace;font-size:12px;}
`;

// Fields that must always be redacted
const REDACT_KEYS = new Set(['passwd', 'password', 'secret_key', 'internal_token', 'jwt_secret', 'lfs_jwt_secret', 'oauth2_jwt_secret']);

function parseAppIni(text) {
  const result = { _top: {}, sections: {} };
  let cur = null;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith(';') || line.startsWith('#')) continue;
    const secMatch = line.match(/^\[([^\]]+)\]/);
    if (secMatch) {
      cur = secMatch[1].toLowerCase();
      if (!result.sections[cur]) result.sections[cur] = {};
      continue;
    }
    const kvMatch = line.match(/^([^=]+?)\s*=\s*(.*)/);
    if (kvMatch) {
      const k = kvMatch[1].trim();
      const v = kvMatch[2].trim();
      const kLow = k.toLowerCase();
      const val = REDACT_KEYS.has(kLow) ? null : v; // null = redacted
      if (cur === null) {
        result._top[k] = val;
      } else {
        result.sections[cur][k] = val;
      }
    }
  }
  return result;
}

function get(obj, ...keys) {
  for (const k of keys) {
    const found = Object.keys(obj).find((ok) => ok.toLowerCase() === k.toLowerCase());
    if (found !== undefined && obj[found] !== undefined) return obj[found];
  }
  return undefined;
}

function tableRows(entries) {
  return entries
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => {
      const display = v === null
        ? `<span class="giteacfg-redacted">[configured]</span>`
        : esc(v);
      return `<tr><td>${esc(k)}</td><td>${display}</td></tr>`;
    })
    .join('');
}

export function render(intake) {
  const parsed = parseAppIni(intake.text || '');
  const top = parsed._top;
  const sec = parsed.sections;

  const server = sec['server'] || {};
  const repo = sec['repository'] || {};
  const db = sec['database'] || {};
  const mailer = sec['mailer'] || sec['email'] || {};
  const service = sec['service'] || {};
  const security = sec['security'] || {};
  const cache = sec['cache'] || {};
  const session = sec['session'] || {};
  const log = sec['log'] || {};
  const oauth2 = sec['oauth2'] || {};
  const actions = sec['actions'] || {};

  // App meta
  const appName = get(top, 'APP_NAME') || 'Gitea';
  const runMode = (get(top, 'RUN_MODE') || '').toLowerCase();
  const runUser = get(top, 'RUN_USER') || '';

  // Server info
  const rootUrl = get(server, 'ROOT_URL') || '';
  const httpPort = get(server, 'HTTP_PORT') || '';
  const protocol = (get(server, 'PROTOCOL') || 'http').toLowerCase();
  const sshPort = get(server, 'SSH_PORT') || '';
  const disableSsh = (get(server, 'DISABLE_SSH') || '').toLowerCase() === 'true';
  const lfsEnabled = (get(server, 'LFS_START_SERVER') || '').toLowerCase() === 'true';

  // Database info
  const dbType = (get(db, 'DB_TYPE') || '').toLowerCase();
  const dbHost = get(db, 'HOST') || '';
  const dbName = get(db, 'NAME') || '';

  // Service flags
  const disableReg = (get(service, 'DISABLE_REGISTRATION') || '').toLowerCase() === 'true';
  const requireSignin = (get(service, 'REQUIRE_SIGNIN_VIEW') || '').toLowerCase() === 'true';
  const captchaEnabled = (get(service, 'ENABLE_CAPTCHA') || '').toLowerCase() === 'true';
  const privateEmail = (get(service, 'DEFAULT_KEEP_EMAIL_PRIVATE') || '').toLowerCase() === 'true';

  // Security
  const installLocked = (get(security, 'INSTALL_LOCK') || '').toLowerCase() === 'true';

  // Mailer
  const mailerEnabled = (get(mailer, 'ENABLED') || '').toLowerCase() === 'true';

  // Actions
  const actionsEnabled = (get(actions, 'ENABLED') || '').toLowerCase() === 'true';

  // Mode chip
  const modeChip = runMode === 'prod'
    ? `<span class="giteacfg-chip giteacfg-chip-prod">prod</span>`
    : runMode === 'dev'
    ? `<span class="giteacfg-chip giteacfg-chip-dev">dev</span>`
    : '';

  const httpsChip = protocol === 'https'
    ? `<span class="giteacfg-chip giteacfg-chip-https">HTTPS</span>`
    : '';

  const installChip = installLocked
    ? `<span class="giteacfg-chip giteacfg-chip-ok">install locked</span>`
    : `<span class="giteacfg-chip giteacfg-chip-warn">install not locked</span>`;

  // DB type chip
  const dbChipClass = dbType === 'postgres' ? 'giteacfg-chip-db-pg'
    : dbType === 'mysql' ? 'giteacfg-chip-db-mysql'
    : dbType === 'sqlite3' ? 'giteacfg-chip-db-sqlite'
    : dbType === 'mssql' ? 'giteacfg-chip-db-mssql'
    : '';
  const dbChip = dbType ? `<span class="giteacfg-chip ${dbChipClass}">${esc(dbType)}</span>` : '';

  // Server card
  const serverEntries = [
    ['ROOT_URL', rootUrl || undefined],
    ['HTTP_PORT', httpPort || undefined],
    ['PROTOCOL', protocol || undefined],
    ['SSH_PORT', (!disableSsh && sshPort) ? sshPort : undefined],
    ['DISABLE_SSH', disableSsh ? 'true' : undefined],
    ['LFS_START_SERVER', lfsEnabled ? 'true' : undefined],
  ];
  const serverRows = tableRows(serverEntries.filter(([, v]) => v !== undefined));

  // DB card
  const dbEntries = [
    ['DB_TYPE', dbType || undefined],
    ['HOST', dbHost || undefined],
    ['NAME', dbName || undefined],
    ['PASSWD', null], // always redacted
  ];
  // only show PASSWD if there was actually a db section
  const dbRows = Object.keys(db).length
    ? tableRows([
        ['DB_TYPE', dbType || undefined],
        ['HOST', dbHost || undefined],
        ['NAME', dbName || undefined],
        ['PASSWD', null],
      ].filter(([, v]) => v !== undefined || v === null))
    : '';

  // Repo card
  const repoRoot = get(repo, 'ROOT');
  const defaultBranch = get(repo, 'DEFAULT_BRANCH');
  const pushCreate = (get(repo, 'ENABLE_PUSH_CREATE_USER') || '').toLowerCase();
  const repoEntries = [
    ['ROOT', repoRoot],
    ['DEFAULT_BRANCH', defaultBranch],
    ['ENABLE_PUSH_CREATE_USER', pushCreate || undefined],
  ].filter(([, v]) => v);
  const repoRows = tableRows(repoEntries);

  // Cache card
  const cacheAdapter = get(cache, 'ADAPTER');
  const cacheHost = get(cache, 'HOST');
  const cacheEntries = [
    ['ADAPTER', cacheAdapter],
    ['HOST', cacheHost],
  ].filter(([, v]) => v);
  const cacheRows = tableRows(cacheEntries);

  // Session card
  const sessionProvider = get(session, 'PROVIDER');
  const sessionConfig = get(session, 'PROVIDER_CONFIG');
  // Redact if session config contains credentials (@ = likely has user:pass@host)
  const sessionConfigDisplay = sessionConfig && sessionConfig.includes('@')
    ? null
    : sessionConfig;
  const sessionEntries = [
    ['PROVIDER', sessionProvider],
    ['PROVIDER_CONFIG', sessionConfigDisplay !== undefined ? sessionConfigDisplay : null],
  ].filter(([, v]) => v !== undefined);
  const sessionRows = tableRows(sessionEntries);

  // Log card
  const logPath = get(log, 'ROOT_PATH');
  const logMode = get(log, 'MODE');
  const logLevel = get(log, 'LEVEL');
  const logEntries = [
    ['ROOT_PATH', logPath],
    ['MODE', logMode],
    ['LEVEL', logLevel],
  ].filter(([, v]) => v);
  const logRows = tableRows(logEntries);

  // Mailer card
  const mailerFrom = get(mailer, 'FROM');
  const mailerSmtpAddr = get(mailer, 'SMTP_ADDR') || get(mailer, 'HOST');
  const mailerSmtpPort = get(mailer, 'SMTP_PORT');
  const mailerTls = get(mailer, 'IS_TLS_ENABLED');
  const mailerEntries = [
    ['ENABLED', mailerEnabled ? 'true' : 'false'],
    ['SMTP', mailerSmtpAddr ? (mailerSmtpPort ? `${mailerSmtpAddr}:${mailerSmtpPort}` : mailerSmtpAddr) : undefined],
    ['FROM', mailerFrom],
    ['IS_TLS_ENABLED', mailerTls],
    ['PASSWD', null], // always redact
  ].filter(([, v]) => v !== undefined);
  const mailerRows = tableRows(mailerEntries);

  // Features summary
  const featHtml = [
    disableReg
      ? `<span class="giteacfg-feat giteacfg-feat-off">registration disabled</span>`
      : `<span class="giteacfg-feat giteacfg-feat-on">registration open</span>`,
    lfsEnabled
      ? `<span class="giteacfg-feat giteacfg-feat-on">LFS enabled</span>`
      : `<span class="giteacfg-feat giteacfg-feat-off">LFS disabled</span>`,
    captchaEnabled
      ? `<span class="giteacfg-feat giteacfg-feat-on">captcha on</span>`
      : `<span class="giteacfg-feat giteacfg-feat-off">captcha off</span>`,
    mailerEnabled
      ? `<span class="giteacfg-feat giteacfg-feat-on">mail enabled</span>`
      : `<span class="giteacfg-feat giteacfg-feat-off">mail disabled</span>`,
    actionsEnabled
      ? `<span class="giteacfg-feat giteacfg-feat-on">actions enabled</span>`
      : `<span class="giteacfg-feat giteacfg-feat-off">actions disabled</span>`,
    requireSignin
      ? `<span class="giteacfg-feat giteacfg-feat-on">require sign-in</span>`
      : '',
    privateEmail
      ? `<span class="giteacfg-feat giteacfg-feat-on">private email</span>`
      : '',
  ].filter(Boolean).join('');

  function card(icon, title, rows, extra = '') {
    if (!rows && !extra) return '';
    return `<div class="giteacfg-card">
  <div class="giteacfg-card-hd"><span class="giteacfg-card-icon">${icon}</span>${esc(title)}</div>
  ${rows ? `<table class="giteacfg-table"><tbody>${rows}</tbody></table>` : ''}
  ${extra}
</div>`;
  }

  const urlDisplay = rootUrl
    ? `<a class="giteacfg-url" href="${esc(rootUrl)}" target="_blank" rel="noopener">${esc(rootUrl)}</a>`
    : '';

  const host = document.createElement('div');
  host.className = 'giteacfg-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="giteacfg-title"><span class="giteacfg-badge">Gitea</span>${esc(appName)}</div>
${runUser ? `<div class="giteacfg-sub">Running as: <code>${esc(runUser)}</code></div>` : '<div class="giteacfg-sub">Gitea/Forgejo configuration</div>'}
<div class="giteacfg-chips">
  ${modeChip}${httpsChip}${dbChip}${installChip}
</div>
${urlDisplay ? `<div style="margin-bottom:14px;">${urlDisplay}</div>` : ''}
<div class="giteacfg-grid">
  ${serverRows ? card('🌐', 'Server', serverRows) : ''}
  ${dbRows ? card('🗄️', 'Database', dbRows) : ''}
  ${repoRows ? card('📁', 'Repository', repoRows) : ''}
  ${mailerRows ? card('✉️', 'Mailer', mailerRows) : ''}
  ${cacheRows ? card('⚡', 'Cache', cacheRows) : ''}
  ${sessionRows ? card('🔑', 'Session', sessionRows) : ''}
  ${logRows ? card('📋', 'Log', logRows) : ''}
</div>
${featHtml ? `<div style="margin-bottom:10px;font-size:12px;font-weight:600;color:var(--fg-2,#888);text-transform:uppercase;letter-spacing:.05em;">Features</div><div class="giteacfg-features">${featHtml}</div>` : ''}
${!Object.keys(parsed.sections).length ? '<p style="color:var(--fg-2,#888);font-size:13px;">No configuration sections found.</p>' : ''}`;

  return { parentNode: host };
}
