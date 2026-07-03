// RDP file viewer — connection info card, command palette, settings table

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function parseRdp(text) {
  const entries = {};
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^([^:]+):([sib]):(.*)$/i);
    if (m) {
      const key = m[1].trim().toLowerCase();
      entries[key] = { type: m[2].toLowerCase(), raw: m[3] };
    }
  }
  return entries;
}

function getValue(entry) {
  if (!entry) return null;
  if (entry.type === 'i') return parseInt(entry.raw, 10);
  if (entry.type === 'b') return entry.raw || null;
  return entry.raw || null;
}

function formatValue(entry) {
  if (!entry) return '';
  if (entry.type === 'i') return String(parseInt(entry.raw, 10));
  if (entry.type === 'b') return entry.raw ? '0x' + entry.raw : '';
  return entry.raw;
}

// RDP files can carry a DPAPI-encrypted "password 51:b:..." blob (or, from non-standard
// generators, plaintext "password:s:"/gateway credential keys). Redact any key that looks
// like a credential rather than dumping it verbatim in the settings table — same pattern as
// the known/rdp-config plugin's isPasswordKey().
function isPasswordKey(key) {
  return /password|passwd|credential/i.test(key);
}

const SECTION_KEYS = {
  Connection: ['full address', 'username', 'domain', 'alternate full address', 'loadbalanceinfo'],
  Display: ['desktopwidth', 'desktopheight', 'session bpp', 'screen mode id', 'smart sizing', 'dynamic resolution', 'use multimon'],
  Authentication: ['authentication level', 'enablecredsspsupport', 'negotiate security layer'],
  Experience: ['connection type', 'networkautodetect', 'bandwidthautodetect', 'compression', 'videoplaybackmode', 'audiocapturemode', 'audiomode'],
  'Local Resources': ['redirectclipboard', 'redirectprinters', 'redirectcomports', 'redirectsmartcards', 'redirectdrives', 'drivestoredirect', 'devicestoredirect'],
};

const STYLES = `
.rdp-root {
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 13px;
  color: var(--text, #111);
  background: var(--bg, #fff);
  min-height: 200px;
  padding: 0;
}
.rdp-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border, #ddd);
  display: flex;
  align-items: center;
  gap: 10px;
}
.rdp-title {
  font-weight: 600;
  font-size: 14px;
  color: var(--text, #111);
}
.rdp-badge {
  font-size: 11px;
  color: #888;
  background: var(--border, #eee);
  border-radius: 10px;
  padding: 2px 8px;
}
.rdp-card {
  margin: 12px 16px;
  border: 1px solid var(--border, #ddd);
  border-radius: 6px;
  overflow: hidden;
}
.rdp-card-row {
  display: flex;
  padding: 6px 12px;
  border-bottom: 1px solid var(--border, #eee);
  font-size: 12px;
  gap: 12px;
}
.rdp-card-row:last-child {
  border-bottom: none;
}
.rdp-card-label {
  color: #888;
  min-width: 80px;
  flex-shrink: 0;
}
.rdp-card-value {
  font-family: monospace;
  color: var(--text, #111);
  word-break: break-all;
}
.rdp-section-title {
  padding: 10px 16px 4px;
  font-size: 11px;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  border-top: 1px solid var(--border, #ddd);
}
.rdp-section-title:first-child {
  border-top: none;
}
.rdp-commands-section {
  margin: 0 16px 8px;
}
.rdp-cmd-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 0;
  border-bottom: 1px solid var(--border, #eee);
}
.rdp-cmd-row:last-child {
  border-bottom: none;
}
.rdp-cmd-label {
  min-width: 120px;
  color: #888;
  font-size: 11px;
  flex-shrink: 0;
}
.rdp-cmd-btn {
  flex: 1;
  font-family: monospace;
  font-size: 11px;
  text-align: left;
  padding: 3px 8px;
  border-radius: 4px;
  border: 1px solid var(--border, #ddd);
  background: var(--bg, #fff);
  color: var(--text, #111);
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: filter 0.2s, background 0.12s, color 0.12s;
}
.rdp-cmd-btn:hover {
  background: var(--accent, #3b82f6);
  color: #fff;
  border-color: var(--accent, #3b82f6);
}
.rdp-table {
  width: 100%;
  border-collapse: collapse;
  margin: 0;
}
.rdp-table td {
  padding: 5px 16px;
  border-bottom: 1px solid var(--border, #eee);
  vertical-align: top;
  font-size: 12px;
}
.rdp-table td:first-child {
  color: #888;
  width: 180px;
  font-family: monospace;
  white-space: nowrap;
}
.rdp-table td:last-child {
  font-family: monospace;
  color: var(--text, #111);
  word-break: break-all;
}
.rdp-raw {
  padding: 16px;
  font-family: monospace;
  font-size: 12px;
  white-space: pre-wrap;
  color: var(--text, #111);
}
`;

function addCmdRow(container, label, cmd) {
  const row = document.createElement('div');
  row.className = 'rdp-cmd-row';

  const labelEl = document.createElement('span');
  labelEl.className = 'rdp-cmd-label';
  labelEl.textContent = label;

  const btn = document.createElement('button');
  btn.className = 'rdp-cmd-btn';
  btn.textContent = cmd;
  btn.style.filter = 'blur(4px)';

  btn.addEventListener('mouseenter', () => btn.style.filter = '');
  btn.addEventListener('mouseleave', () => {
    // Only re-blur if not in "copied" state
    if (btn.textContent === cmd) btn.style.filter = 'blur(4px)';
  });
  btn.addEventListener('click', async () => {
    btn.style.filter = '';
    try {
      await navigator.clipboard.writeText(cmd);
    } catch { /* ignore */ }
    const orig = btn.textContent;
    btn.textContent = '✓ copied';
    setTimeout(() => { btn.textContent = orig; }, 2000);
  });

  row.appendChild(labelEl);
  row.appendChild(btn);
  container.appendChild(row);
}

export async function render(intake) {
  const text = intake.text ?? '';

  const root = document.createElement('div');
  root.className = 'rdp-root';

  const styleEl = document.createElement('style');
  styleEl.textContent = STYLES;
  root.appendChild(styleEl);

  let entries;
  try {
    entries = parseRdp(text);
  } catch {
    entries = null;
  }

  if (!entries || Object.keys(entries).length === 0) {
    // Raw text fallback
    const raw = document.createElement('pre');
    raw.className = 'rdp-raw';
    raw.textContent = text;
    root.appendChild(raw);
    return { parentNode: root, revoke() {} };
  }

  // Header
  const header = document.createElement('div');
  header.className = 'rdp-header';
  const fullAddr = entries['full address']?.raw ?? '';
  header.innerHTML = `<span class="rdp-title">RDP Connection</span>`
    + (fullAddr ? `<span class="rdp-badge">${esc(fullAddr)}</span>` : '');
  root.appendChild(header);

  // Parse connection details
  const rawAddr = entries['full address']?.raw ?? '';
  const lastColon = rawAddr.lastIndexOf(':');
  let host = rawAddr;
  let port = 3389;
  if (lastColon > 0) {
    const portStr = rawAddr.slice(lastColon + 1);
    const parsed = parseInt(portStr, 10);
    if (!isNaN(parsed)) { port = parsed; host = rawAddr.slice(0, lastColon); }
  }
  const username = entries['username']?.raw ?? '';
  const domain = entries['domain']?.raw ?? '';

  // Connection info card
  if (host) {
    const cardTitle = document.createElement('div');
    cardTitle.className = 'rdp-section-title';
    cardTitle.style.borderTop = 'none';
    cardTitle.textContent = 'Connection';
    root.appendChild(cardTitle);

    const card = document.createElement('div');
    card.className = 'rdp-card';
    card.style.margin = '4px 16px 8px';

    const rows = [
      ['Host', host],
      ['Port', String(port)],
      ...(username ? [['Username', username]] : []),
      ...(domain ? [['Domain', domain]] : []),
    ];
    for (const [label, value] of rows) {
      const rowEl = document.createElement('div');
      rowEl.className = 'rdp-card-row';
      rowEl.innerHTML = `<span class="rdp-card-label">${esc(label)}</span><span class="rdp-card-value">${esc(value)}</span>`;
      card.appendChild(rowEl);
    }
    root.appendChild(card);
  }

  // Command palette
  const cmdTitle = document.createElement('div');
  cmdTitle.className = 'rdp-section-title';
  cmdTitle.textContent = 'Commands';
  root.appendChild(cmdTitle);

  const cmdsEl = document.createElement('div');
  cmdsEl.className = 'rdp-commands-section';

  const hostPort = host + (port !== 3389 ? ':' + port : '');

  // mstsc without username
  addCmdRow(cmdsEl, 'mstsc (Windows)', `mstsc /v:${hostPort}`);

  // mstsc with username if present
  if (username) {
    addCmdRow(cmdsEl, 'mstsc (Windows, user)', `mstsc /v:${hostPort} /u:${username}`);
  }

  // xfreerdp (Linux/macOS)
  const xfreeParts = [`xfreerdp /v:${host}`, `/port:${port}`];
  if (username) xfreeParts.push(`/u:${username}`);
  if (domain) xfreeParts.push(`/d:${domain}`);
  addCmdRow(cmdsEl, 'xfreerdp (Linux/macOS)', xfreeParts.join(' '));

  root.appendChild(cmdsEl);

  // Settings table — grouped by section
  const settingsTitle = document.createElement('div');
  settingsTitle.className = 'rdp-section-title';
  settingsTitle.textContent = 'Settings';
  root.appendChild(settingsTitle);

  const allSectionKeys = new Set(Object.values(SECTION_KEYS).flat());
  const advancedKeys = Object.keys(entries).filter((k) => !allSectionKeys.has(k));

  const allGroups = { ...SECTION_KEYS, Advanced: advancedKeys };

  for (const [sectionName, keys] of Object.entries(allGroups)) {
    const present = (Array.isArray(keys) ? keys : [])
      .filter((k) => entries[k] !== undefined);
    if (present.length === 0) continue;

    const secTitle = document.createElement('div');
    secTitle.className = 'rdp-section-title';
    secTitle.textContent = sectionName;
    root.appendChild(secTitle);

    const table = document.createElement('table');
    table.className = 'rdp-table';
    const tbody = document.createElement('tbody');

    for (const key of present) {
      const entry = entries[key];
      const redact = isPasswordKey(key);
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(key)}</td><td>${redact ? '<em>[configured — redacted]</em>' : esc(formatValue(entry))}</td>`;
      tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    root.appendChild(table);
  }

  return { parentNode: root, revoke() {} };
}
