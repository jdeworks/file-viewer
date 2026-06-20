const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.sshdcfg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.sshdcfg-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#6e7781;color:#fff;vertical-align:middle;margin-right:8px;}
.sshdcfg-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.sshdcfg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 16px;}
.sshdcfg-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;margin-bottom:16px;}
.sshdcfg-tile{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;}
.sshdcfg-tile-label{font-size:11px;color:var(--fg-2,#888);text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px;}
.sshdcfg-tile-val{font-family:ui-monospace,monospace;font-size:14px;font-weight:700;}
.sshdcfg-warn{border-color:#ffc107;background:#fffbf0;}
.sshdcfg-warn .sshdcfg-tile-val{color:#856404;}
.sshdcfg-danger{border-color:#dc3545;background:#fff5f5;}
.sshdcfg-danger .sshdcfg-tile-val{color:#c82333;}
.sshdcfg-good{border-color:#28a745;background:#f0fff4;}
.sshdcfg-good .sshdcfg-tile-val{color:#155724;}
.sshdcfg-alert{border-radius:6px;padding:8px 12px;font-size:12px;margin-bottom:10px;display:flex;align-items:flex-start;gap:8px;}
.sshdcfg-alert-danger{background:#fff5f5;border:1px solid #dc3545;color:#c82333;}
.sshdcfg-alert-warn{background:#fffbf0;border:1px solid #ffc107;color:#856404;}
.sshdcfg-section{margin:0 0 6px;font-size:13px;font-weight:600;color:var(--fg-2,#888);text-transform:uppercase;letter-spacing:.04em;}
.sshdcfg-table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px;}
.sshdcfg-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;letter-spacing:.04em;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.sshdcfg-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
.sshdcfg-table td:first-child{color:var(--fg-2,#888);width:45%;white-space:nowrap;}
`;

const SECURITY_KEYS = new Set([
  'permitrootlogin', 'passwordauthentication', 'pubkeyauthentication',
  'port', 'listenaddress', 'allowusers', 'allowgroups', 'denyusers', 'denygroups',
  'maxauthtries', 'subsystem', 'permitemptypasswords', 'x11forwarding',
  'usepam', 'challengeresponseauthentication', 'kbdinteractiveauthentication',
]);

function parseSshdConfig(text) {
  const settings = {};
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^(\S+)\s+(.*)/);
    if (!m) continue;
    const [, key, value] = m;
    const keyLower = key.toLowerCase();
    // First occurrence wins (like sshd itself)
    if (!(keyLower in settings)) {
      settings[keyLower] = { key, value: value.trim() };
    }
  }
  return settings;
}

function val(settings, key) {
  return settings[key.toLowerCase()]?.value ?? null;
}

export function render(intake) {
  const settings = parseSshdConfig(intake.text || '');

  const port = val(settings, 'Port') || '22';
  const listenAddress = val(settings, 'ListenAddress') || '0.0.0.0';
  const permitRoot = val(settings, 'PermitRootLogin') || 'prohibit-password';
  const passwordAuth = val(settings, 'PasswordAuthentication') || 'yes';
  const pubkeyAuth = val(settings, 'PubkeyAuthentication') || 'yes';
  const maxAuthTries = val(settings, 'MaxAuthTries') || null;
  const allowUsers = val(settings, 'AllowUsers');
  const allowGroups = val(settings, 'AllowGroups');
  const denyUsers = val(settings, 'DenyUsers');
  const denyGroups = val(settings, 'DenyGroups');
  const subsystem = val(settings, 'Subsystem');

  // Risk alerts
  const alerts = [];
  const rootDanger = permitRoot.toLowerCase() === 'yes';
  const passwdDanger = passwordAuth.toLowerCase() === 'yes';
  if (rootDanger) alerts.push({ level: 'danger', msg: 'PermitRootLogin yes — direct root login is allowed. Consider setting to <code>prohibit-password</code> or <code>no</code>.' });
  if (passwdDanger) alerts.push({ level: 'warn', msg: 'PasswordAuthentication yes — password-based logins are enabled. Consider disabling in favour of key-based auth.' });

  const alertHtml = alerts.map((a) =>
    `<div class="sshdcfg-alert sshdcfg-alert-${a.level}"><span>&#9888;</span><span>${a.msg}</span></div>`
  ).join('');

  function tileCls(key, value) {
    const v = value.toLowerCase();
    if (key === 'permitrootlogin' && v === 'yes') return ' sshdcfg-danger';
    if (key === 'permitrootlogin' && v !== 'yes') return ' sshdcfg-good';
    if (key === 'passwordauthentication' && v === 'yes') return ' sshdcfg-warn';
    if (key === 'passwordauthentication' && v === 'no') return ' sshdcfg-good';
    if (key === 'pubkeyauthentication' && v === 'yes') return ' sshdcfg-good';
    return '';
  }

  const tiles = [
    { label: 'Port', key: 'port', value: port },
    { label: 'Listen Address', key: 'listenaddress', value: listenAddress },
    { label: 'PermitRootLogin', key: 'permitrootlogin', value: permitRoot },
    { label: 'PasswordAuthentication', key: 'passwordauthentication', value: passwordAuth },
    { label: 'PubkeyAuthentication', key: 'pubkeyauthentication', value: pubkeyAuth },
    ...(maxAuthTries ? [{ label: 'MaxAuthTries', key: 'maxauthtries', value: maxAuthTries }] : []),
  ];

  const tilesHtml = tiles.map((t) =>
    `<div class="sshdcfg-tile${tileCls(t.key, t.value)}">
  <div class="sshdcfg-tile-label">${esc(t.label)}</div>
  <div class="sshdcfg-tile-val">${esc(t.value)}</div>
</div>`).join('');

  // Access control section
  const accessRows = [
    allowUsers ? ['AllowUsers', allowUsers] : null,
    allowGroups ? ['AllowGroups', allowGroups] : null,
    denyUsers ? ['DenyUsers', denyUsers] : null,
    denyGroups ? ['DenyGroups', denyGroups] : null,
  ].filter(Boolean);

  const accessSection = accessRows.length ? `
<div class="sshdcfg-section">Access Control</div>
<table class="sshdcfg-table">
  <thead><tr><th>Directive</th><th>Value</th></tr></thead>
  <tbody>${accessRows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</tbody>
</table>` : '';

  // All other settings
  const shownKeys = new Set(['port', 'listenaddress', 'permitrootlogin', 'passwordauthentication',
    'pubkeyauthentication', 'maxauthtries', 'allowusers', 'allowgroups', 'denyusers', 'denygroups', 'subsystem']);
  const remaining = Object.entries(settings).filter(([k]) => !shownKeys.has(k));
  const remainingSection = remaining.length ? `
<div class="sshdcfg-section">Other settings (${remaining.length})</div>
<table class="sshdcfg-table">
  <thead><tr><th>Directive</th><th>Value</th></tr></thead>
  <tbody>${remaining.map(([, { key, value }]) => `<tr><td>${esc(key)}</td><td>${esc(value)}</td></tr>`).join('')}</tbody>
</table>` : '';

  const subsystemSection = subsystem ? `
<div class="sshdcfg-section">Subsystem</div>
<div style="font-family:ui-monospace,monospace;font-size:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:8px 12px;margin-bottom:16px;">${esc(subsystem)}</div>` : '';

  const totalSettings = Object.keys(settings).length;

  const host = document.createElement('div');
  host.className = 'sshdcfg-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="sshdcfg-title"><span class="sshdcfg-badge">sshd_config</span>sshd_config</div>
<div class="sshdcfg-sub">SSH daemon configuration · ${totalSettings} directive${totalSettings !== 1 ? 's' : ''}</div>
${alertHtml}
<div class="sshdcfg-grid">${tilesHtml}</div>
${accessSection}${subsystemSection}${remainingSection}`;
  return { parentNode: host };
}
