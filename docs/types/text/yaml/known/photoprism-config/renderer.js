// PhotoPrism options.yml viewer
// Shows storage paths, account info, database, and content settings.
import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.pprism-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.pprism-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0d9488;color:#fff;vertical-align:middle;margin-right:8px;}
.pprism-title{font-size:18px;font-weight:700;margin:0 0 4px;display:inline;}
.pprism-sub{font-size:12px;color:var(--fg-2,#888);margin:4px 0 14px;}
.pprism-sec{margin:12px 0;}
.pprism-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.pprism-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;}
.pprism-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;}
.pprism-key{color:var(--fg-2,#888);font-size:12px;min-width:200px;flex-shrink:0;}
.pprism-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.pprism-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
.pprism-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;}
.pprism-chip-on{background:#d1fae5;border-color:#6ee7b7;color:#065f46;}
.pprism-chip-off{background:#fee2e2;border-color:#fca5a5;color:#991b1b;}
.pprism-chip-teal{background:#ccfbf1;border-color:#5eead4;color:#0f766e;}
`;

function chip(val, cls = '') {
  if (val == null || val === '') return '';
  return `<span class="pprism-chip${cls ? ' ' + cls : ''}">${esc(String(val))}</span>`;
}

function masked() {
  return '<span class="pprism-masked">[configured]</span>';
}

function row(label, html) {
  if (!html) return '';
  return `<div class="pprism-row"><span class="pprism-key">${esc(label)}</span><span class="pprism-val">${html}</span></div>`;
}

function boolChip(val) {
  if (val === true || val === 'true') return chip('enabled', 'pprism-chip-on');
  if (val === false || val === 'false') return chip('disabled', 'pprism-chip-off');
  return chip(String(val));
}

/** Extract driver name and masked host/db from a DSN string */
function parseDsn(dsn) {
  if (!dsn) return { driver: null, masked: null };
  // postgres://user:pass@host/db or mysql://user:pass@host/db
  const urlMatch = dsn.match(/^(\w+):\/\/([^:@]*):?([^@]*)@([^/]+)\/(.+)/);
  if (urlMatch) {
    const driver = urlMatch[1];
    const host = urlMatch[4];
    const db = urlMatch[5];
    return { driver, masked: `${driver}://[configured]@${host}/${db}` };
  }
  // sqlite or simple path
  if (dsn.startsWith('/') || dsn.endsWith('.db')) return { driver: 'sqlite', masked: dsn };
  return { driver: null, masked: dsn.replace(/:([^@/]*)@/, ':[configured]@') };
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch {
    cfg = intake.parsed || {};
  }

  const title = cfg.SiteTitle || cfg.SiteUrl || 'PhotoPrism Config';
  const { driver, masked: dsnMasked } = parseDsn(cfg.DatabaseDsn);

  // ── Account ──
  const accountRows = [
    cfg.AdminUser != null ? row('Admin User', chip(String(cfg.AdminUser), 'pprism-chip-teal')) : '',
    cfg.AdminEmail != null ? row('Admin Email', chip(String(cfg.AdminEmail))) : '',
    cfg.AdminPassword != null ? row('Admin Password', masked()) : '',
  ].filter(Boolean).join('');

  // ── Site ──
  const siteRows = [
    cfg.SiteUrl != null ? row('Site URL', chip(String(cfg.SiteUrl))) : '',
    cfg.SiteDescription != null ? row('Description', chip(String(cfg.SiteDescription))) : '',
    cfg.SiteAuthor != null ? row('Author', chip(String(cfg.SiteAuthor))) : '',
  ].filter(Boolean).join('');

  // ── Database ──
  const dbRows = [
    driver ? row('Driver', chip(driver, 'pprism-chip-teal')) : '',
    dsnMasked ? row('DSN', chip(dsnMasked.length > 90 ? dsnMasked.slice(0, 87) + '…' : dsnMasked)) : '',
  ].filter(Boolean).join('');

  // ── Storage ──
  const storageKeys = [
    ['StoragePath', 'Storage Path'],
    ['OriginalsPath', 'Originals Path'],
    ['ImportPath', 'Import Path'],
    ['BackupPath', 'Backup Path'],
    ['ThumbnailsPath', 'Thumbnails Path'],
  ];
  const storageRows = storageKeys
    .map(([k, label]) => cfg[k] != null ? row(label, chip(String(cfg[k]))) : '')
    .filter(Boolean).join('');

  // ── Performance ──
  const perfRows = [
    cfg.Workers != null ? row('Workers', chip(String(cfg.Workers), 'pprism-chip-teal')) : '',
    cfg.WakeupInterval != null ? row('Wakeup Interval', chip(String(cfg.WakeupInterval) + 's')) : '',
    cfg.ReadOnly != null ? row('Read Only', boolChip(cfg.ReadOnly)) : '',
  ].filter(Boolean).join('');

  // ── Content ──
  const contentRows = [
    cfg.DetectNSFW != null ? row('Detect NSFW', boolChip(cfg.DetectNSFW)) : '',
    cfg.UploadNSFW != null ? row('Upload NSFW', boolChip(cfg.UploadNSFW)) : '',
  ].filter(Boolean).join('');

  let body = '';
  if (accountRows) body += `<div class="pprism-sec"><h3>Account</h3><div class="pprism-card">${accountRows}</div></div>`;
  if (siteRows) body += `<div class="pprism-sec"><h3>Site</h3><div class="pprism-card">${siteRows}</div></div>`;
  if (dbRows) body += `<div class="pprism-sec"><h3>Database</h3><div class="pprism-card">${dbRows}</div></div>`;
  if (storageRows) body += `<div class="pprism-sec"><h3>Storage</h3><div class="pprism-card">${storageRows}</div></div>`;
  if (perfRows) body += `<div class="pprism-sec"><h3>Performance</h3><div class="pprism-card">${perfRows}</div></div>`;
  if (contentRows) body += `<div class="pprism-sec"><h3>Content</h3><div class="pprism-card">${contentRows}</div></div>`;

  const host = document.createElement('div');
  host.className = 'pprism-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="margin-bottom:4px;"><span class="pprism-badge">PhotoPrism</span><span class="pprism-title">${esc(title)}</span></div>
<div class="pprism-sub">PhotoPrism photo management configuration</div>
${body || '<div style="color:var(--fg-2,#888);font-size:13px;">No configuration found.</div>'}`;

  return { parentNode: host };
}
