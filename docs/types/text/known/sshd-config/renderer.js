import { ensureKnownUiStyle, issueList, sourcePreview, wireSourceLinks } from '../../../../core/known-ui.js';

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
.sshdcfg-section{margin:0 0 6px;font-size:13px;font-weight:600;color:var(--fg-2,#888);text-transform:uppercase;letter-spacing:.04em;}
.sshdcfg-table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px;}
.sshdcfg-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;letter-spacing:.04em;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.sshdcfg-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
.sshdcfg-table td:first-child{color:var(--fg-2,#888);width:45%;white-space:nowrap;}
.sshdcfg-link{border:0;background:transparent;color:inherit;font:inherit;padding:0;text-align:left;cursor:pointer;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px;}
.sshdcfg-link:hover{color:var(--accent,#2563eb);}
.sshdcfg-help{font-size:11px;color:var(--fg-2,#888);font-family:system-ui,sans-serif;margin-top:3px;}
.sshdcfg-source-key{color:#8250df;font-weight:600;}
.sshdcfg-source-comment{color:#6e7781;font-style:italic;}
`;

function parseSshdConfig(text) {
  const settings = {};
  const entries = [];
  for (const [idx, raw] of text.split(/\r?\n/).entries()) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^(\S+)\s+(.*)/);
    if (!m) continue;
    const [, key, value] = m;
    const keyLower = key.toLowerCase();
    const entry = { key, keyLower, value: value.trim(), line: idx + 1 };
    entries.push(entry);
    // First occurrence wins (like sshd itself)
    if (!(keyLower in settings)) settings[keyLower] = entry;
  }
  return { settings, entries };
}

function entry(settings, key) {
  return settings[key.toLowerCase()] || null;
}

function val(settings, key, fallback = null) {
  return entry(settings, key)?.value ?? fallback;
}

function allEntries(entries, key) {
  const lower = key.toLowerCase();
  return entries.filter((item) => item.keyLower === lower);
}

const DIRECTIVE_HELP = {
  port: 'TCP port where sshd listens. Non-default ports reduce noise but are not a security boundary.',
  listenaddress: 'Local address sshd binds to. 0.0.0.0 and :: expose the daemon on every interface.',
  permitrootlogin: 'Controls direct root login. "yes" is high risk; "prohibit-password" still allows key-based root login.',
  passwordauthentication: 'Enables password logins. Key-only setups commonly set this to no.',
  pubkeyauthentication: 'Enables public-key authentication.',
  maxauthtries: 'Maximum authentication attempts per connection before sshd disconnects.',
  permitemptypasswords: 'Allows accounts with empty passwords to log in when password auth is enabled.',
  challengeresponseauthentication: 'Legacy challenge-response authentication switch.',
  kbdinteractiveauthentication: 'Keyboard-interactive authentication, often PAM-backed.',
  x11forwarding: 'Allows X11 GUI forwarding over SSH; disable unless explicitly needed.',
  usepam: 'Enables PAM account/session processing.',
  allowusers: 'Only listed users may log in.',
  allowgroups: 'Only users in listed groups may log in.',
  denyusers: 'Listed users may not log in.',
  denygroups: 'Users in listed groups may not log in.',
  subsystem: 'Registers an SSH subsystem such as SFTP.',
};

function helpFor(key) {
  return DIRECTIVE_HELP[String(key || '').toLowerCase()] || 'Open this directive in the source configuration.';
}

function lineButton(label, line, key = label) {
  const title = `${helpFor(key)} Open line ${line || 1} in source.`;
  return `<button class="sshdcfg-link" type="button" data-source-line="${line || 1}" title="${esc(title)}">${esc(label)}</button>`;
}

function valueLine(settings, label, key, fallback) {
  const item = entry(settings, key);
  const value = item?.value ?? fallback;
  return { label, key: key.toLowerCase(), value, line: item?.line || 1 };
}

function boolYes(value) {
  return String(value || '').toLowerCase() === 'yes';
}

function collectIssues({ settings, entries }) {
  const issues = [];
  const add = (severity, label, key, message, fallbackLine = 1) => {
    issues.push({
      severity,
      label,
      line: entry(settings, key)?.line || fallbackLine,
      message,
    });
  };
  if (boolYes(val(settings, 'PermitRootLogin'))) {
    add('danger', 'root login', 'PermitRootLogin', 'PermitRootLogin is yes; direct root login is allowed.');
  }
  if (boolYes(val(settings, 'PasswordAuthentication', 'yes'))) {
    add('warning', 'password auth', 'PasswordAuthentication', 'PasswordAuthentication is yes; password-based logins are enabled.');
  }
  if (boolYes(val(settings, 'PermitEmptyPasswords'))) {
    add('danger', 'empty passwords', 'PermitEmptyPasswords', 'PermitEmptyPasswords is yes; empty account passwords may authenticate.');
  }
  const listen = allEntries(entries, 'ListenAddress');
  for (const item of listen) {
    if (/^(0\.0\.0\.0|::|\*)$/.test(item.value)) {
      issues.push({
        severity: 'info',
        label: 'public bind',
        line: item.line,
        message: `ListenAddress ${item.value} binds sshd on ${item.value === '::' ? 'all IPv6 interfaces' : 'all interfaces'}. Confirm firewall and network exposure.`,
      });
    }
  }
  const maxAuth = Number(val(settings, 'MaxAuthTries') || '');
  if (Number.isFinite(maxAuth) && maxAuth > 6) {
    add('warning', 'auth attempts', 'MaxAuthTries', `MaxAuthTries is ${maxAuth}; lower values reduce online guessing room.`);
  }
  if (boolYes(val(settings, 'X11Forwarding'))) {
    add('warning', 'x11 forwarding', 'X11Forwarding', 'X11Forwarding is enabled; disable it unless GUI forwarding is required.');
  }
  if (boolYes(val(settings, 'ChallengeResponseAuthentication')) || boolYes(val(settings, 'KbdInteractiveAuthentication'))) {
    const key = boolYes(val(settings, 'ChallengeResponseAuthentication')) ? 'ChallengeResponseAuthentication' : 'KbdInteractiveAuthentication';
    add('warning', 'interactive auth', key, `${key} is enabled; confirm this is intended with PAM and password policy.`);
  }
  if (!entry(settings, 'AllowUsers') && !entry(settings, 'AllowGroups')) {
    issues.push({
      severity: 'info',
      label: 'access scope',
      line: entry(settings, 'PermitRootLogin')?.line || 1,
      message: 'No AllowUsers or AllowGroups directive was found; access is controlled by system accounts and PAM policy.',
    });
  }
  return issues;
}

function highlightSshdLine(line) {
  const escaped = esc(line);
  if (/^\s*#/.test(line)) return `<span class="sshdcfg-source-comment">${escaped}</span>`;
  return escaped.replace(/^(\s*\S+)/, '<span class="sshdcfg-source-key">$1</span>');
}

export function render(intake) {
  const { settings, entries } = parseSshdConfig(intake.text || '');

  const listenEntries = allEntries(entries, 'ListenAddress');
  const listenAddress = listenEntries.length ? listenEntries.map((item) => item.value).join(', ') : '0.0.0.0';
  const allowUsers = val(settings, 'AllowUsers');
  const allowGroups = val(settings, 'AllowGroups');
  const denyUsers = val(settings, 'DenyUsers');
  const denyGroups = val(settings, 'DenyGroups');
  const subsystem = val(settings, 'Subsystem');

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
    valueLine(settings, 'Port', 'Port', '22'),
    { label: 'Listen Address', key: 'listenaddress', value: listenAddress, line: listenEntries[0]?.line || 1 },
    valueLine(settings, 'PermitRootLogin', 'PermitRootLogin', 'prohibit-password'),
    valueLine(settings, 'PasswordAuthentication', 'PasswordAuthentication', 'yes'),
    valueLine(settings, 'PubkeyAuthentication', 'PubkeyAuthentication', 'yes'),
    ...(entry(settings, 'MaxAuthTries') ? [valueLine(settings, 'MaxAuthTries', 'MaxAuthTries')] : []),
  ];

  const tilesHtml = tiles.map((t) =>
    `<div class="sshdcfg-tile${tileCls(t.key, t.value)}">
  <div class="sshdcfg-tile-label">${lineButton(t.label, t.line, t.key)}</div>
  <div class="sshdcfg-tile-val">${esc(t.value)}</div>
  <div class="sshdcfg-help">${esc(helpFor(t.key))}</div>
</div>`).join('');

  // Access control section
  const accessRows = [
    allowUsers ? valueLine(settings, 'AllowUsers', 'AllowUsers') : null,
    allowGroups ? valueLine(settings, 'AllowGroups', 'AllowGroups') : null,
    denyUsers ? valueLine(settings, 'DenyUsers', 'DenyUsers') : null,
    denyGroups ? valueLine(settings, 'DenyGroups', 'DenyGroups') : null,
  ].filter(Boolean);

  const accessSection = accessRows.length ? `
<div class="sshdcfg-section">Access Control</div>
<table class="sshdcfg-table">
  <thead><tr><th>Directive</th><th>Value</th></tr></thead>
  <tbody>${accessRows.map((row) => `<tr><td>${lineButton(row.label, row.line, row.key)}</td><td title="${esc(helpFor(row.key))}">${esc(row.value)}</td></tr>`).join('')}</tbody>
</table>` : '';

  // All other settings
  const shownKeys = new Set(['port', 'listenaddress', 'permitrootlogin', 'passwordauthentication',
    'pubkeyauthentication', 'maxauthtries', 'allowusers', 'allowgroups', 'denyusers', 'denygroups', 'subsystem']);
  const remaining = entries.filter((item) => !shownKeys.has(item.keyLower));
  const remainingSection = remaining.length ? `
<div class="sshdcfg-section">Other settings (${remaining.length})</div>
<table class="sshdcfg-table">
  <thead><tr><th>Directive</th><th>Value</th></tr></thead>
  <tbody>${remaining.map(({ key, keyLower, value, line }) => `<tr><td>${lineButton(key, line, keyLower)}</td><td title="${esc(helpFor(keyLower))}">${esc(value)}</td></tr>`).join('')}</tbody>
</table>` : '';

  const subsystemSection = subsystem ? `
<div class="sshdcfg-section">Subsystem</div>
<div style="font-family:ui-monospace,monospace;font-size:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:8px 12px;margin-bottom:16px;">${lineButton('Subsystem', entry(settings, 'Subsystem')?.line || 1, 'subsystem')} ${esc(subsystem)}</div>` : '';

  const totalSettings = Object.keys(settings).length;
  const issues = collectIssues({ settings, entries });

  const host = document.createElement('div');
  ensureKnownUiStyle(document);
  host.className = 'sshdcfg-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="sshdcfg-title"><span class="sshdcfg-badge">sshd_config</span>sshd_config</div>
<div class="sshdcfg-sub">SSH daemon configuration · ${totalSettings} directive${totalSettings !== 1 ? 's' : ''}</div>
<div class="sshdcfg-grid">${tilesHtml}</div>
${accessSection}${subsystemSection}${remainingSection}`;
  const review = issueList(issues, { title: 'SSHD Review' });
  if (review) host.insertBefore(review, host.querySelector('.sshdcfg-grid'));
  host.appendChild(sourcePreview(intake.text || '', { title: 'Source', collapsed: true, idPrefix: 'sshd-line', highlighter: highlightSshdLine }));
  wireSourceLinks(host, { idPrefix: 'sshd-line' });
  return { parentNode: host };
}
