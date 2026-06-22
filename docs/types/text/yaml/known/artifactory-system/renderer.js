import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.art-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-art{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#40be46;color:#fff;vertical-align:middle;margin-right:8px;}
.art-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.art-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.art-sec{margin:14px 0;}
.art-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.art-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.art-row{display:flex;gap:8px;font-size:13px;padding:3px 0;align-items:baseline;}
.art-key{color:var(--fg-2,#888);min-width:180px;flex-shrink:0;font-size:12px;font-family:ui-monospace,monospace;}
.art-val{font-family:ui-monospace,monospace;word-break:break-all;}
.art-masked{font-family:ui-monospace,monospace;color:var(--fg-2,#888);letter-spacing:2px;}
.art-tag{display:inline-block;font-size:11px;padding:2px 7px;border-radius:5px;background:#f0fdf4;border:1px solid #86efac;color:#166534;margin-left:4px;}
`;

function row(label, value) {
  if (value == null || value === '') return '';
  return `<div class="art-row"><span class="art-key">${esc(label)}</span><span class="art-val">${esc(value)}</span></div>`;
}

function masked(label) {
  return `<div class="art-row"><span class="art-key">${esc(label)}</span><span class="art-masked">••••••••</span></div>`;
}

function getDeep(obj, ...path) {
  let cur = obj;
  for (const key of path) {
    if (!cur || typeof cur !== 'object') return undefined;
    cur = cur[key];
  }
  return cur;
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = jsyaml.load(intake.text || '') || {};
  } catch { cfg = {}; }

  const configVersion = cfg.configVersion != null ? String(cfg.configVersion) : '';

  // Shared database
  const db = getDeep(cfg, 'shared', 'database') || {};
  const dbType = db.type || db.driver || '';
  const dbUrl = db.url || db.connectionString || '';
  const dbHasPassword = !!(db.password);

  // Security
  const security = getDeep(cfg, 'shared', 'security') || {};
  const masterKeyFile = security.masterKeyFile || security.masterkey || '';

  // Service ports (router, artifactory, access)
  const router = cfg.router || {};
  const routerPort = router.port != null ? String(router.port) : (getDeep(router, 'serviceId', 'port') != null ? String(getDeep(router, 'serviceId', 'port')) : '');

  const artifactory = cfg.artifactory || {};
  const artPort = getDeep(artifactory, 'tomcat', 'connector', 'port') != null
    ? String(getDeep(artifactory, 'tomcat', 'connector', 'port'))
    : (artifactory.port != null ? String(artifactory.port) : '');

  const access = cfg.access || {};
  const accessPort = getDeep(access, 'http', 'port') != null
    ? String(getDeep(access, 'http', 'port'))
    : (access.port != null ? String(access.port) : '');

  // Masking url with password
  let dbUrlDisplay = dbUrl;
  if (dbUrl && dbUrl.includes('@')) {
    // mask password in jdbc/connection URLs like postgresql://user:pass@host/db
    dbUrlDisplay = dbUrl.replace(/:([^:@/]+)@/, ':••••••••@');
  }

  const dbRows = [
    row('type', dbType),
    dbUrlDisplay ? row('url', dbUrlDisplay) : '',
    dbHasPassword ? masked('password') : '',
  ].filter(Boolean).join('');
  const dbHtml = dbRows ? `<div class="art-sec"><h3>Database</h3><div class="art-card">${dbRows}</div></div>` : '';

  const secRows = [
    masterKeyFile ? row('masterKeyFile', masterKeyFile) : '',
  ].filter(Boolean).join('');
  const secHtml = secRows ? `<div class="art-sec"><h3>Security</h3><div class="art-card">${secRows}</div></div>` : '';

  const portsRows = [
    routerPort ? row('router.port', routerPort) : '',
    artPort ? row('artifactory.port', artPort) : '',
    accessPort ? row('access.port', accessPort) : '',
  ].filter(Boolean).join('');
  const portsHtml = portsRows ? `<div class="art-sec"><h3>Service Ports</h3><div class="art-card">${portsRows}</div></div>` : '';

  const subParts = [
    configVersion ? `configVersion: ${configVersion}` : '',
    dbType ? `db: ${dbType}` : '',
    routerPort ? `router: :${routerPort}` : '',
    artPort ? `artifactory: :${artPort}` : '',
  ].filter(Boolean);

  const host = document.createElement('div');
  host.className = 'art-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-art">Artifactory</span>
  <span class="art-title">System Configuration</span>
  ${configVersion ? `<span class="art-tag">v${esc(configVersion)}</span>` : ''}
</div>
<div class="art-sub">${esc(subParts.join(' · '))}</div>
${dbHtml}${secHtml}${portsHtml}`;
  return { parentNode: host };
}
