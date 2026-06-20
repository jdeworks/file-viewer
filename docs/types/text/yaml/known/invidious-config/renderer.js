import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.invidious-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.invidious-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#c0392b;color:#fff;vertical-align:middle;margin-right:8px}
.invidious-title{font-size:18px;font-weight:700;margin:0 0 4px;display:inline}
.invidious-sub{font-size:12px;color:var(--fg-2,#888);margin:4px 0 14px}
.invidious-sec{margin:12px 0}
.invidious-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.invidious-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px}
.invidious-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;flex-wrap:wrap}
.invidious-key{color:var(--fg-2,#888);font-size:12px;min-width:180px;flex-shrink:0}
.invidious-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all}
.invidious-masked{font-family:ui-monospace,monospace;color:var(--fg-2,#999);font-size:12px;letter-spacing:2px}
.invidious-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;background:var(--bg-2,#f6f8fa);color:var(--fg,#24292f)}
.inv-chip-green{background:#dcfce7;border-color:#86efac;color:#166534}
.inv-chip-red{background:#fef2f2;border-color:#fca5a5;color:#991b1b}
.inv-chip-blue{background:#eff6ff;border-color:#93c5fd;color:#1e40af}
.inv-chip-gray{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg-2,#888)}
.inv-chip-yellow{background:#fefce8;border-color:#fde047;color:#854d0e}
`;

function chip(val, cls) {
  if (val == null || val === '') return '';
  return `<span class="invidious-chip${cls ? ' inv-chip-' + cls : ''}">${esc(String(val))}</span>`;
}

function row(label, html) {
  if (!html && html !== 0) return '';
  return `<div class="invidious-row"><span class="invidious-key">${esc(label)}</span><span class="invidious-val">${html}</span></div>`;
}

function maskedRow(label) {
  return `<div class="invidious-row"><span class="invidious-key">${esc(label)}</span><span class="invidious-masked">[configured]</span></div>`;
}

function boolChip(v, trueLabel, falseLabel) {
  if (v == null) return '';
  return v
    ? chip(trueLabel || 'enabled', 'green')
    : chip(falseLabel || 'disabled', 'gray');
}

function isSensitiveKey(k) {
  return /secret|password|token|key|api|private|hmac/i.test(String(k));
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  const db = (typeof cfg.db === 'object' && cfg.db !== null) ? cfg.db : {};
  const feedMenu = Array.isArray(cfg.feed_menu) ? cfg.feed_menu : [];
  const admins = Array.isArray(cfg.admins) ? cfg.admins : (cfg.admins ? [cfg.admins] : []);

  // Sub-title parts
  const subParts = [
    cfg.domain ? cfg.domain : null,
    cfg.port != null ? `:${cfg.port}` : null,
    cfg.https_only ? 'HTTPS only' : null,
    db.dbname ? `db: ${db.dbname}` : null,
  ].filter(Boolean).join(' · ');

  // Server section
  const serverRows = [
    cfg.port != null ? row('port', chip(String(cfg.port), 'blue')) : '',
    cfg.host != null ? row('host', chip(String(cfg.host))) : '',
    cfg.https_only != null ? row('https_only', boolChip(cfg.https_only, 'enabled', 'disabled')) : '',
    cfg.domain != null ? row('domain', chip(String(cfg.domain))) : '',
    cfg.external_port != null ? row('external_port', chip(String(cfg.external_port), 'blue')) : '',
  ].filter(Boolean).join('');

  // Database section
  const dbRows = [
    db.dbname != null ? row('dbname', chip(String(db.dbname))) : '',
    db.user != null ? row('user', chip(String(db.user))) : '',
    db.host != null ? row('host', chip(String(db.host))) : '',
    db.port != null ? row('port', chip(String(db.port), 'blue')) : '',
    db.password != null ? maskedRow('password') : '',
  ].filter(Boolean).join('');

  // Security section (hmac_key and any other top-level sensitive keys)
  const securityRows = [
    cfg.hmac_key != null ? maskedRow('hmac_key') : '',
  ].filter(Boolean).join('');

  // Performance section
  const perfRows = [
    cfg.channel_threads != null ? row('channel_threads', chip(String(cfg.channel_threads), 'blue')) : '',
    cfg.feed_threads != null ? row('feed_threads', chip(String(cfg.feed_threads), 'blue')) : '',
    cfg.pool_size != null ? row('pool_size', chip(String(cfg.pool_size), 'blue')) : '',
  ].filter(Boolean).join('');

  // Features section
  const adminsHtml = admins.length ? admins.map(a => chip(String(a), 'yellow')).join(' ') : '';
  const featRows = [
    cfg.registration_enabled != null ? row('registration_enabled', boolChip(cfg.registration_enabled, 'enabled', 'disabled')) : '',
    cfg.login_enabled != null ? row('login_enabled', boolChip(cfg.login_enabled, 'enabled', 'disabled')) : '',
    cfg.captcha_enabled != null ? row('captcha_enabled', boolChip(cfg.captcha_enabled, 'enabled', 'disabled')) : '',
    adminsHtml ? row('admins', adminsHtml) : '',
  ].filter(Boolean).join('');

  // Default preferences section
  const feedMenuHtml = feedMenu.length ? feedMenu.map(f => chip(String(f))).join(' ') : '';
  const prefRows = [
    cfg.default_home != null ? row('default_home', chip(String(cfg.default_home))) : '',
    feedMenuHtml ? row('feed_menu', feedMenuHtml) : '',
    cfg.dark_mode != null ? row('dark_mode', boolChip(cfg.dark_mode, 'enabled', 'disabled')) : '',
    cfg.locale != null ? row('locale', chip(String(cfg.locale))) : '',
  ].filter(Boolean).join('');

  // Cache/statistics section
  const cacheRows = [
    cfg.cache_annotations != null ? row('cache_annotations', boolChip(cfg.cache_annotations, 'enabled', 'disabled')) : '',
    cfg.statistics_enabled != null ? row('statistics_enabled', boolChip(cfg.statistics_enabled, 'enabled', 'disabled')) : '',
  ].filter(Boolean).join('');

  function sec(title, rows) {
    if (!rows) return '';
    return `<div class="invidious-sec"><h3>${title}</h3><div class="invidious-card">${rows}</div></div>`;
  }

  const body = [
    sec('Server', serverRows),
    sec('Database', dbRows),
    sec('Security', securityRows),
    sec('Performance', perfRows),
    sec('Features', featRows),
    sec('Default Preferences', prefRows),
    sec('Cache & Statistics', cacheRows),
  ].filter(Boolean).join('');

  const hostEl = document.createElement('div');
  hostEl.className = 'invidious-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  hostEl.appendChild(style);

  const header = document.createElement('div');
  header.innerHTML = `
    <div style="margin-bottom:4px">
      <span class="invidious-badge">Invidious</span>
      <span class="invidious-title">${cfg.domain ? esc(String(cfg.domain)) : 'Invidious Config'}</span>
    </div>
    <div class="invidious-sub">${esc(subParts || 'Self-hosted YouTube frontend')}</div>
  `;
  hostEl.appendChild(header);

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body || '<p style="color:var(--fg-2,#888);font-size:13px;">No Invidious configuration keys found.</p>';
  hostEl.appendChild(bodyDiv);

  return { parentNode: hostEl };
}
