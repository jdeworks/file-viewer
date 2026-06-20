const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.dnfcfg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.dnfcfg-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#003087;color:#fff;vertical-align:middle;margin-right:8px;}
.dnfcfg-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.dnfcfg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.dnfcfg-sec{margin:12px 0;}
.dnfcfg-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.dnfcfg-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;font-size:13px;}
.dnfcfg-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;flex-wrap:wrap;}
.dnfcfg-key{color:var(--fg-2,#888);font-size:12px;min-width:220px;flex-shrink:0;}
.dnfcfg-val{font-family:ui-monospace,monospace;font-size:12px;}
.dnfcfg-chip{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;}
.dnfcfg-chip-green{background:#e8f5e9;border-color:#4caf50;color:#1b5e20;}
.dnfcfg-chip-orange{background:#fff3e0;border-color:#ff9800;color:#e65100;}
.dnfcfg-chip-blue{background:#e3f2fd;border-color:#2196f3;color:#0d47a1;}
.dnfcfg-chip-gray{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg-2,#888);}
`;

/** Parse a simple INI-style config into sections of key=value pairs */
function parseDnfConf(text) {
  const sections = {};
  let current = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const secMatch = line.match(/^\[([^\]]+)\]$/);
    if (secMatch) {
      current = secMatch[1].trim();
      if (!sections[current]) sections[current] = {};
      continue;
    }
    if (!current) continue;
    const kv = line.match(/^([^=]+?)\s*=\s*(.*)$/);
    if (kv) {
      const key = kv[1].trim();
      const val = kv[2].trim();
      if (!(key in sections[current])) sections[current][key] = val;
    }
  }
  return sections;
}

function chip(label, cls = '') {
  return `<span class="dnfcfg-chip${cls ? ' dnfcfg-chip-' + cls : ''}">${esc(label)}</span>`;
}

function row(label, html) {
  if (!html) return '';
  return `<div class="dnfcfg-row"><span class="dnfcfg-key">${esc(label)}</span><span class="dnfcfg-val">${html}</span></div>`;
}

function boolChip(val, trueLabel, trueClass, falseLabel, falseClass) {
  if (val == null) return '';
  const v = String(val).toLowerCase();
  if (v === '1' || v === 'true') return chip(trueLabel || val, trueClass || 'green');
  if (v === '0' || v === 'false') return chip(falseLabel || val, falseClass || 'orange');
  return chip(val);
}

export function render(intake) {
  const filename = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
  const isYum = filename === 'yum.conf';
  const title = isYum ? 'YUM Config' : 'DNF Config';

  const text = intake.text || '';
  const sections = parseDnfConf(text);
  const main = sections['main'] || {};

  const host = document.createElement('div');
  host.className = 'dnfcfg-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const header = document.createElement('div');
  header.innerHTML = `
    <div style="margin-bottom:4px;">
      <span class="dnfcfg-badge">DNF</span>
      <span class="dnfcfg-title">${esc(title)}</span>
    </div>
    <p class="dnfcfg-sub">${isYum ? 'YUM' : 'DNF'} package manager configuration — ${Object.keys(main).length} settings in [main]</p>
  `;
  host.appendChild(header);

  let body = '';

  // [main] Security / General card
  const gpgcheck = main['gpgcheck'];
  const installonlyLimit = main['installonly_limit'];
  const cleanReqs = main['clean_requirements_on_remove'];
  const skipIfUnavail = main['skip_if_unavailable'];
  const best = main['best'];
  const countme = main['countme'];
  const obsoletes = main['obsoletes'];

  const mainRows = [
    gpgcheck != null ? row('gpgcheck',
      gpgcheck === '1' ? chip('GPG enabled', 'green') : chip('GPG disabled', 'orange')) : '',
    installonlyLimit ? row('installonly_limit', chip(installonlyLimit + ' kernels kept', 'blue')) : '',
    cleanReqs != null ? row('clean_requirements_on_remove', boolChip(cleanReqs, 'True', 'green', 'False', 'gray')) : '',
    skipIfUnavail != null ? row('skip_if_unavailable', boolChip(skipIfUnavail, 'True', 'orange', 'False', 'green')) : '',
    best != null ? row('best', boolChip(best, 'True', 'green', 'False', 'orange')) : '',
    countme != null ? row('countme',
      (String(countme).toLowerCase() === 'false' || countme === '0')
        ? chip('False — opt-out of telemetry', 'green')
        : chip('True', 'orange')) : '',
    obsoletes != null ? row('obsoletes', boolChip(obsoletes, '1', 'green', '0', 'gray')) : '',
  ].filter(Boolean).join('');

  if (mainRows) {
    body += `<div class="dnfcfg-sec"><h3>[main] Settings</h3><div class="dnfcfg-card">${mainRows}</div></div>`;
  }

  // Cache card
  const cachedir = main['cachedir'];
  const keepcache = main['keepcache'];
  const metadataTimerSync = main['metadata_timer_sync'];
  const metadataExpire = main['metadata_expire'];

  const cacheRows = [
    cachedir ? row('cachedir', `<span class="dnfcfg-val">${esc(cachedir)}</span>`) : '',
    keepcache != null ? row('keepcache',
      (keepcache === '1' || keepcache.toLowerCase() === 'true')
        ? chip('1 — keeps downloaded packages', 'green')
        : chip('0 — clears cache on exit', 'gray')) : '',
    metadataTimerSync ? row('metadata_timer_sync', chip(metadataTimerSync + 's', 'blue')) : '',
    metadataExpire ? row('metadata_expire', chip(metadataExpire + 's', 'blue')) : '',
  ].filter(Boolean).join('');

  if (cacheRows) {
    body += `<div class="dnfcfg-sec"><h3>Cache</h3><div class="dnfcfg-card">${cacheRows}</div></div>`;
  }

  // Performance card
  const fastestmirror = main['fastestmirror'];
  const maxParallel = main['max_parallel_downloads'];
  const minrate = main['minrate'];
  const timeout = main['timeout'];
  const retries = main['retries'];
  const deltarpm = main['deltarpm'];
  const deltarpmPct = main['deltarpm_percentage'];

  const perfRows = [
    fastestmirror != null ? row('fastestmirror', boolChip(fastestmirror, 'True', 'green', 'False', 'gray')) : '',
    maxParallel ? row('max_parallel_downloads', chip(maxParallel + ' parallel', 'blue')) : '',
    minrate ? row('minrate', chip(minrate + ' B/s minimum', 'gray')) : '',
    timeout ? row('timeout', chip(timeout + 's', 'gray')) : '',
    retries ? row('retries', chip(retries, 'gray')) : '',
    deltarpm != null ? row('deltarpm', boolChip(deltarpm, 'True', 'green', 'False', 'gray')) : '',
    deltarpmPct ? row('deltarpm_percentage', chip(deltarpmPct + '%', 'blue')) : '',
  ].filter(Boolean).join('');

  if (perfRows) {
    body += `<div class="dnfcfg-sec"><h3>Performance</h3><div class="dnfcfg-card">${perfRows}</div></div>`;
  }

  // Proxy card
  const proxy = main['proxy'];
  const proxyUser = main['proxy_username'];
  const proxyPass = main['proxy_password'];

  if (proxy || proxyUser || proxyPass) {
    let proxyRows = '';
    if (proxy) {
      // Mask credentials embedded in URL (http://user:pass@host)
      const maskedProxy = proxy.replace(/(https?:\/\/)[^:@/]+:[^@/]+@/, '$1[credentials]@');
      proxyRows += row('proxy', `<span class="dnfcfg-val">${esc(maskedProxy)}</span>`);
    }
    if (proxyUser) proxyRows += row('proxy_username', chip('[configured]', 'gray'));
    if (proxyPass) proxyRows += row('proxy_password', chip('[configured]', 'gray'));
    body += `<div class="dnfcfg-sec"><h3>Proxy</h3><div class="dnfcfg-card">${proxyRows}</div></div>`;
  }

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  host.appendChild(bodyDiv);

  return { parentNode: host };
}
