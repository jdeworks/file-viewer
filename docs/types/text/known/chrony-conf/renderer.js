const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.chronycfg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.chronycfg-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0066CC;color:#fff;vertical-align:middle;margin-right:8px;}
.chronycfg-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.chronycfg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 16px;}
.chronycfg-section{margin:0 0 6px;font-size:13px;font-weight:600;color:var(--fg-2,#888);text-transform:uppercase;letter-spacing:.04em;}
.chronycfg-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:12px;}
.chronycfg-src-list{list-style:none;margin:4px 0 0;padding:0;}
.chronycfg-src-list li{display:flex;align-items:baseline;gap:8px;padding:4px 0;border-bottom:1px solid var(--border,#e0e0e0);font-size:13px;}
.chronycfg-src-list li:last-child{border-bottom:none;}
.chronycfg-src-type{font-size:10px;font-weight:700;text-transform:uppercase;padding:1px 5px;border-radius:4px;background:#0066CC;color:#fff;flex-shrink:0;}
.chronycfg-src-type-pool{background:#1a7f37;}
.chronycfg-src-host{font-family:ui-monospace,monospace;font-weight:600;color:var(--fg,#24292f);}
.chronycfg-src-note{font-size:11px;color:var(--fg-2,#888);}
.chronycfg-src-opts{display:flex;flex-wrap:wrap;gap:3px;margin-left:auto;}
.chronycfg-opt-chip{display:inline-block;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:4px;padding:1px 5px;font-size:11px;font-family:ui-monospace,monospace;}
.chronycfg-table{width:100%;border-collapse:collapse;font-size:13px;}
.chronycfg-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.chronycfg-table td:first-child{color:var(--fg-2,#666);width:38%;font-family:ui-monospace,monospace;font-size:12px;white-space:nowrap;}
.chronycfg-table td:last-child{font-family:ui-monospace,monospace;font-size:12px;}
.chronycfg-table tr:last-child td{border-bottom:none;}
.chronycfg-mode-chip{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;margin-left:6px;vertical-align:middle;}
.chronycfg-mode-server{background:#1a7f37;color:#fff;}
.chronycfg-mode-client{background:#0066CC;color:#fff;}
.chronycfg-allow-list{list-style:none;margin:4px 0 0;padding:0;}
.chronycfg-allow-list li{font-family:ui-monospace,monospace;font-size:12px;padding:3px 0;border-bottom:1px solid var(--border,#e0e0e0);}
.chronycfg-allow-list li:last-child{border-bottom:none;}
.chronycfg-empty{color:var(--fg-2,#888);font-size:13px;}
`;

const KNOWN_NTP = {
  'pool.ntp.org': 'NTP Pool Project',
  '0.pool.ntp.org': 'NTP Pool Project',
  '1.pool.ntp.org': 'NTP Pool Project',
  '2.pool.ntp.org': 'NTP Pool Project',
  '3.pool.ntp.org': 'NTP Pool Project',
  '0.debian.pool.ntp.org': 'Debian NTP Pool',
  '1.debian.pool.ntp.org': 'Debian NTP Pool',
  '2.debian.pool.ntp.org': 'Debian NTP Pool',
  '3.debian.pool.ntp.org': 'Debian NTP Pool',
  '0.ubuntu.pool.ntp.org': 'Ubuntu NTP Pool',
  '1.ubuntu.pool.ntp.org': 'Ubuntu NTP Pool',
  '2.ubuntu.pool.ntp.org': 'Ubuntu NTP Pool',
  '3.ubuntu.pool.ntp.org': 'Ubuntu NTP Pool',
  'time.google.com': 'Google Public NTP',
  'time1.google.com': 'Google Public NTP',
  'time2.google.com': 'Google Public NTP',
  'time3.google.com': 'Google Public NTP',
  'time4.google.com': 'Google Public NTP',
  'time.cloudflare.com': 'Cloudflare NTP',
  'time.windows.com': 'Microsoft NTP',
  'time.apple.com': 'Apple NTP',
  'ntp.ubuntu.com': 'Ubuntu NTP',
};

function isKnownPool(host) {
  return host.includes('pool.ntp.org');
}

function parseChronyConf(text) {
  const sources = [];
  const settings = {};
  const allow = [];
  const deny = [];

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const parts = line.split(/\s+/);
    const directive = parts[0].toLowerCase();

    if (directive === 'server' || directive === 'pool' || directive === 'peer') {
      const host = parts[1] || '';
      const opts = parts.slice(2);
      sources.push({ type: directive, host, opts });
    } else if (directive === 'allow') {
      allow.push(parts.slice(1).join(' ') || 'all');
    } else if (directive === 'deny') {
      deny.push(parts.slice(1).join(' ') || 'all');
    } else if (['driftfile', 'makestep', 'rtcsync', 'keyfile', 'logdir', 'log', 'leapsectz', 'hwtimestamp', 'minsources'].includes(directive)) {
      settings[directive] = parts.slice(1).join(' ') || true;
    }
  }

  return { sources, settings, allow, deny };
}

export function render(intake) {
  const text = intake.text || '';
  const { sources, settings, allow, deny } = parseChronyConf(text);

  const serverMode = allow.length > 0;
  const poolCount = sources.filter(s => s.type === 'pool').length;
  const serverCount = sources.filter(s => s.type === 'server').length;

  // NTP sources section
  const sourcesHtml = sources.length ? `<div class="chronycfg-section">NTP Sources</div>
<div class="chronycfg-card">
<ul class="chronycfg-src-list">
${sources.map(s => {
    const known = KNOWN_NTP[s.host] || (isKnownPool(s.host) ? 'NTP Pool Project' : null);
    const typeClass = s.type === 'pool' ? 'chronycfg-src-type chronycfg-src-type-pool' : 'chronycfg-src-type';
    const optChips = s.opts.map(o => `<span class="chronycfg-opt-chip">${esc(o)}</span>`).join('');
    const noteHtml = known ? `<span class="chronycfg-src-note">${esc(known)}</span>` : '';
    return `<li><span class="${typeClass}">${esc(s.type)}</span><span class="chronycfg-src-host">${esc(s.host)}</span>${noteHtml}<span class="chronycfg-src-opts">${optChips}</span></li>`;
  }).join('')}
</ul>
</div>` : '';

  // Key settings section
  const settingKeys = Object.keys(settings);
  const settingsHtml = settingKeys.length ? `<div class="chronycfg-section">Settings</div>
<div class="chronycfg-card">
<table class="chronycfg-table"><tbody>
${settingKeys.map(k => {
    const v = settings[k];
    return `<tr><td>${esc(k)}</td><td>${v === true ? '(enabled)' : esc(v)}</td></tr>`;
  }).join('')}
</tbody></table>
</div>` : '';

  // Allow/deny (server mode)
  const allowDenyHtml = (allow.length || deny.length) ? `<div class="chronycfg-section">NTP Server Access</div>
<div class="chronycfg-card">
${allow.length ? `<div style="margin-bottom:6px;font-size:12px;font-weight:600;color:var(--fg-2,#888);">Allow</div>
<ul class="chronycfg-allow-list">${allow.map(a => `<li>${esc(a)}</li>`).join('')}</ul>` : ''}
${deny.length ? `<div style="margin-top:8px;margin-bottom:6px;font-size:12px;font-weight:600;color:var(--fg-2,#888);">Deny</div>
<ul class="chronycfg-allow-list">${deny.map(d => `<li>${esc(d)}</li>`).join('')}</ul>` : ''}
</div>` : '';

  const modeChipHtml = serverMode
    ? '<span class="chronycfg-mode-chip chronycfg-mode-server">NTP Server</span>'
    : '<span class="chronycfg-mode-chip chronycfg-mode-client">NTP Client</span>';

  const subParts = [];
  if (poolCount) subParts.push(`${poolCount} pool${poolCount !== 1 ? 's' : ''}`);
  if (serverCount) subParts.push(`${serverCount} server${serverCount !== 1 ? 's' : ''}`);
  if (settings.makestep) subParts.push('makestep');
  if (settings.rtcsync !== undefined) subParts.push('rtcsync');

  const host = document.createElement('div');
  host.className = 'chronycfg-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="chronycfg-title"><span class="chronycfg-badge">NTP</span>chrony.conf${modeChipHtml}</div>
<div class="chronycfg-sub">Chrony NTP configuration · ${subParts.join(' · ') || 'no sources configured'}</div>
${sourcesHtml}${settingsHtml}${allowDenyHtml}
${!sources.length && !settingKeys.length ? '<p class="chronycfg-empty">No directives found.</p>' : ''}`;

  return { parentNode: host };
}
