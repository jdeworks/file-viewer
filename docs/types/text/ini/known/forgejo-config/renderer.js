import { parseIni } from '../../renderer.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.forgejo-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.forgejo-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#609926;color:#fff;vertical-align:middle;margin-right:8px;}
.forgejo-title{font-size:18px;font-weight:700;margin:0 0 4px;display:inline;}
.forgejo-sub{font-size:12px;color:var(--fg-2,#888);margin:4px 0 14px;}
.forgejo-sec{margin:14px 0;}
.forgejo-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.forgejo-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.forgejo-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:12px;}
.forgejo-kv-k{color:var(--fg-2,#888);min-width:170px;font-family:ui-monospace,monospace;flex-shrink:0;}
.forgejo-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.forgejo-masked{color:var(--fg-2,#888);font-style:italic;}
.forgejo-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;background:var(--bg-2,#f6f8fa);}
.forgejo-chip-pg{background:#dbeafe;border-color:#93c5fd;color:#1e40af;}
.forgejo-chip-mysql{background:#fff7ed;border-color:#fed7aa;color:#c2410c;}
.forgejo-chip-sqlite{background:#dcfce7;border-color:#86efac;color:#166534;}
`;

function masked() {
  return '<span class="forgejo-masked">[configured]</span>';
}

function kv(label, html) {
  if (!html) return '';
  return `<div class="forgejo-kv"><span class="forgejo-kv-k">${esc(label)}</span><span class="forgejo-kv-v">${html}</span></div>`;
}

function kvText(label, value, isSecret = false) {
  if (value == null || value === '') return '';
  const html = isSecret ? masked() : `${esc(value)}`;
  return kv(label, html);
}

function sectionMap(sections) {
  const m = {};
  for (const s of sections) {
    const key = (s.name || '').toLowerCase();
    const pairs = {};
    for (const p of s.pairs) pairs[p.key.toUpperCase()] = p.value;
    m[key] = pairs;
  }
  return m;
}

function dbChipClass(t) {
  if (!t) return '';
  const lc = t.toLowerCase();
  if (lc === 'postgres' || lc === 'postgresql') return 'forgejo-chip-pg';
  if (lc === 'mysql') return 'forgejo-chip-mysql';
  if (lc === 'sqlite3' || lc === 'sqlite') return 'forgejo-chip-sqlite';
  return '';
}

export function render(intake) {
  const sections = parseIni(intake.text || '');
  const cfg = sectionMap(sections);

  // Top-level APP_NAME (no section)
  const root = cfg[''] || {};
  const appName = root['APP_NAME'] || '';

  // [server]
  const server = cfg['server'] || {};
  const rootUrl = server['ROOT_URL'] || '';
  const httpAddr = server['HTTP_ADDR'] || '';
  const httpPort = server['HTTP_PORT'] || '';
  const domain = server['DOMAIN'] || '';
  const sshDomain = server['SSH_DOMAIN'] || '';
  const sshPort = server['SSH_PORT'] || '';
  const serverRows = [
    kvText('ROOT_URL', rootUrl),
    kvText('HTTP_ADDR', httpAddr),
    kvText('HTTP_PORT', httpPort),
    kvText('DOMAIN', domain),
    sshDomain ? kvText('SSH_DOMAIN', sshDomain) : '',
    sshPort ? kvText('SSH_PORT', sshPort) : '',
  ].filter(Boolean).join('');
  const serverHtml = serverRows ? `<div class="forgejo-sec"><h3>Server</h3><div class="forgejo-card">${serverRows}</div></div>` : '';

  // [database]
  const db = cfg['database'] || {};
  const dbType = db['DB_TYPE'] || '';
  const dbHost = db['HOST'] || '';
  const dbName = db['NAME'] || '';
  const dbUser = db['USER'] || '';
  const dbPasswd = db['PASSWD'] || '';
  const dbChipHtml = dbType ? `<span class="forgejo-chip ${dbChipClass(dbType)}">${esc(dbType)}</span>` : '';
  const dbRows = [
    dbType ? kv('DB_TYPE', dbChipHtml) : '',
    kvText('HOST', dbHost),
    kvText('NAME', dbName),
    kvText('USER', dbUser),
    dbPasswd ? kvText('PASSWD', dbPasswd, true) : '',
  ].filter(Boolean).join('');
  const dbHtml = dbRows ? `<div class="forgejo-sec"><h3>Database</h3><div class="forgejo-card">${dbRows}</div></div>` : '';

  // [security]
  const sec = cfg['security'] || {};
  const secretKey = sec['SECRET_KEY'] || '';
  const internalToken = sec['INTERNAL_TOKEN'] || '';
  const secRows = [
    secretKey ? kvText('SECRET_KEY', secretKey, true) : '',
    internalToken ? kvText('INTERNAL_TOKEN', internalToken, true) : '',
  ].filter(Boolean).join('');
  const secHtml = secRows ? `<div class="forgejo-sec"><h3>Security</h3><div class="forgejo-card">${secRows}</div></div>` : '';

  // [repository]
  const repo = cfg['repository'] || {};
  const repoRoot = repo['ROOT'] || '';
  const defaultBranch = repo['DEFAULT_BRANCH'] || '';
  const repoRows = [
    kvText('ROOT', repoRoot),
    kvText('DEFAULT_BRANCH', defaultBranch),
  ].filter(Boolean).join('');
  const repoHtml = repoRows ? `<div class="forgejo-sec"><h3>Repository</h3><div class="forgejo-card">${repoRows}</div></div>` : '';

  // [admin] — optional
  const admin = cfg['admin'] || {};
  const adminUser = admin['DEFAULT_EMAIL_NOTIFICATIONS'] || '';
  // also look for admin-like pairs in [service]
  const svc = cfg['service'] || {};
  const disableReg = svc['DISABLE_REGISTRATION'] || '';
  const requireSignin = svc['REQUIRE_SIGNIN_VIEW'] || '';
  const svcRows = [
    disableReg ? kvText('DISABLE_REGISTRATION', disableReg) : '',
    requireSignin ? kvText('REQUIRE_SIGNIN_VIEW', requireSignin) : '',
  ].filter(Boolean).join('');
  const svcHtml = svcRows ? `<div class="forgejo-sec"><h3>Service</h3><div class="forgejo-card">${svcRows}</div></div>` : '';

  // Sub-summary
  const subParts = [];
  if (rootUrl) subParts.push(rootUrl);
  else if (domain) subParts.push(domain);
  if (httpPort) subParts.push(`port ${httpPort}`);
  if (dbType) subParts.push(`db: ${dbType}`);
  const sub = subParts.join(' · ');

  const isEmpty = !serverHtml && !dbHtml && !secHtml && !repoHtml && !svcHtml;
  const emptyHtml = isEmpty ? '<p style="color:var(--fg-2,#888);font-size:13px;">No Forgejo configuration directives found.</p>' : '';

  const host = document.createElement('div');
  host.className = 'forgejo-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="margin-bottom:4px;">
  <span class="forgejo-badge">Forgejo</span>
  <span class="forgejo-title">${esc(appName || 'forgejo.ini')}</span>
</div>
<div class="forgejo-sub">${esc(sub)}</div>
${serverHtml}${dbHtml}${secHtml}${repoHtml}${svcHtml}${emptyHtml}`;

  return { parentNode: host };
}
