const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.jnld-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.jnld-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#3b82f6;color:#fff;vertical-align:middle;margin-right:8px;}
.jnld-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.jnld-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 16px;}
.jnld-section{margin:16px 0;}
.jnld-section h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.jnld-table{width:100%;border-collapse:collapse;font-size:13px;}
.jnld-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:5px 10px;border-bottom:2px solid var(--border,#e0e0e0);}
.jnld-table td{padding:6px 10px;border-bottom:1px solid var(--border,#eaecf0);vertical-align:top;}
.jnld-table td:first-child{font-family:ui-monospace,monospace;font-size:12px;white-space:nowrap;}
.jnld-table td:nth-child(2){font-family:ui-monospace,monospace;font-size:12px;}
.jnld-table tr:last-child td{border-bottom:none;}
.jnld-pill{display:inline-block;padding:1px 7px;border-radius:8px;font-size:11px;font-weight:600;background:var(--bg-2,#e8f0fe);color:#1e40af;margin:2px 3px 2px 0;}
.jnld-pill.amber{background:#fef3c7;color:#92400e;}
.jnld-pill.green{background:#d1fae5;color:#065f46;}
.jnld-pill.red{background:#fee2e2;color:#991b1b;}
.jnld-storage-box{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:10px 14px;margin-bottom:12px;}
.jnld-storage-name{font-size:15px;font-weight:700;font-family:ui-monospace,monospace;}
.jnld-storage-desc{font-size:12px;color:var(--fg-2,#555);margin-top:3px;}
`;

const STORAGE_DESCRIPTIONS = {
  volatile: 'Logs stored only in /run/log/journal (RAM-backed; lost on reboot).',
  persistent: 'Logs persisted to /var/log/journal (survives reboot).',
  auto: 'Persistent if /var/log/journal exists, otherwise volatile (default).',
  none: 'All log messages are discarded. No storage.',
};

function parseJournald(text) {
  const lines = (text || '').split(/\r?\n/);
  const settings = {};
  let inJournal = false;
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('#') || t.startsWith(';')) continue;
    if (/^\[.*\]$/.test(t)) { inJournal = t === '[Journal]'; continue; }
    if (!inJournal) continue;
    const m = t.match(/^(\w+)\s*=\s*(.*)$/);
    if (m) settings[m[1]] = m[2].trim();
  }
  return settings;
}

const SIZE_KEYS = [
  ['SystemMaxUse', 'Max disk use (system)'],
  ['SystemKeepFree', 'Keep free (system)'],
  ['SystemMaxFileSize', 'Max file size (system)'],
  ['SystemMaxFiles', 'Max files (system)'],
  ['RuntimeMaxUse', 'Max disk use (runtime)'],
  ['RuntimeKeepFree', 'Keep free (runtime)'],
  ['RuntimeMaxFileSize', 'Max file size (runtime)'],
  ['RuntimeMaxFiles', 'Max files (runtime)'],
];

const FORWARD_KEYS = [
  ['ForwardToSyslog', 'Forward to syslog'],
  ['ForwardToKMsg', 'Forward to kmsg'],
  ['ForwardToConsole', 'Forward to console'],
  ['ForwardToWall', 'Forward to wall'],
];

export function render(intake) {
  const s = parseJournald(intake.text || '');

  const host = document.createElement('div');
  host.className = 'jnld-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const title = document.createElement('div');
  title.className = 'jnld-title';
  title.innerHTML = '<span class="jnld-badge">journald.conf</span>systemd Journal Configuration';
  host.appendChild(title);

  const settingCount = Object.keys(s).length;
  const sub = document.createElement('div');
  sub.className = 'jnld-sub';
  sub.textContent = settingCount ? `${settingCount} directive${settingCount !== 1 ? 's' : ''} configured` : 'No directives set (all defaults)';
  host.appendChild(sub);

  // Storage section
  const storageVal = s['Storage'] || '(default: auto)';
  const storageKey = (s['Storage'] || 'auto').toLowerCase();
  const storageDesc = STORAGE_DESCRIPTIONS[storageKey] || `Storage mode: ${storageVal}`;

  const storageSection = document.createElement('div');
  storageSection.className = 'jnld-section';
  const stH3 = document.createElement('h3');
  stH3.textContent = 'Storage';
  storageSection.appendChild(stH3);
  const storageBox = document.createElement('div');
  storageBox.className = 'jnld-storage-box';
  storageBox.innerHTML = `<div class="jnld-storage-name">${esc(storageVal)}</div><div class="jnld-storage-desc">${esc(storageDesc)}</div>`;
  storageSection.appendChild(storageBox);
  host.appendChild(storageSection);

  // Size limits table
  const sizeRows = SIZE_KEYS.filter(([k]) => s[k]);
  if (sizeRows.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'jnld-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Size Limits';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'jnld-table';
    table.innerHTML = '<thead><tr><th>Directive</th><th>Value</th><th>Description</th></tr></thead>';
    const tbody = document.createElement('tbody');
    for (const [key, desc] of sizeRows) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(key)}</td><td>${esc(s[key])}</td><td>${esc(desc)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Other key directives
  const otherKeys = [
    ['Compress', 'Compress journal entries'],
    ['Seal', 'Forward Secure Sealing'],
    ['RateLimitIntervalSec', 'Rate limit interval'],
    ['RateLimitBurst', 'Rate limit burst count'],
    ['MaxRetentionSec', 'Maximum retention period'],
    ['MaxFileSec', 'Rotate files after duration'],
    ['MaxLevelStore', 'Max log level to store'],
    ['MaxLevelSyslog', 'Max level forwarded to syslog'],
    ['LineMax', 'Max log line length'],
  ];
  const otherRows = otherKeys.filter(([k]) => s[k]);
  if (otherRows.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'jnld-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Other Settings';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'jnld-table';
    table.innerHTML = '<thead><tr><th>Directive</th><th>Value</th><th>Description</th></tr></thead>';
    const tbody = document.createElement('tbody');
    for (const [key, desc] of otherRows) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(key)}</td><td>${esc(s[key])}</td><td>${esc(desc)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Forwarding
  const fwdRows = FORWARD_KEYS.filter(([k]) => s[k]);
  if (fwdRows.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'jnld-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Log Forwarding';
    sec.appendChild(h3);
    const wrap = document.createElement('div');
    for (const [key, label] of fwdRows) {
      const val = s[key].toLowerCase();
      const cls = val === 'yes' ? 'green' : val === 'no' ? 'red' : '';
      wrap.innerHTML += `<span class="jnld-pill ${cls}">${esc(label)}: ${esc(s[key])}</span>`;
    }
    sec.appendChild(wrap);
    host.appendChild(sec);
  }

  return { parentNode: host };
}
