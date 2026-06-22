// MCP Server Config viewer with env var redaction and reveal toggle

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const SECRET_PATTERN = /KEY|SECRET|TOKEN|PASSWORD|AUTH|CREDENTIAL|PRIVATE|API/i;

function isSecretKey(key) {
  return SECRET_PATTERN.test(key);
}

function parseMCPConfig(text) {
  const config = JSON.parse(text);
  const servers = config.mcpServers ?? {};

  return Object.entries(servers).map(([name, def]) => {
    const isStdio = !!(def.command);
    const isHttp = !!(def.url);

    return {
      name,
      transport: isStdio ? 'stdio' : isHttp ? 'http' : 'unknown',
      command: def.command ?? null,
      args: def.args ?? [],
      url: def.url ?? null,
      headers: def.headers ?? {},
      env: def.env ?? {},
      envCount: Object.keys(def.env ?? {}).length,
    };
  });
}

const STYLES = `
.mc-root {
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 13px;
  color: var(--text, #111);
  background: var(--bg, #fff);
  min-height: 200px;
  padding: 0;
}
.mc-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border, #ddd);
  display: flex;
  align-items: center;
  gap: 10px;
}
.mc-title {
  font-weight: 600;
  font-size: 14px;
  color: var(--text, #111);
}
.mc-count {
  font-size: 12px;
  color: #888;
  background: var(--border, #eee);
  border-radius: 10px;
  padding: 2px 8px;
}
.mc-body {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.mc-card {
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 6px;
  overflow: hidden;
}
.mc-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg, #fff);
  border-bottom: 1px solid var(--border, #e2e8f0);
}
.mc-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 3px;
  text-transform: lowercase;
  letter-spacing: 0.02em;
}
.mc-badge-stdio {
  background: #dbeafe;
  color: #1d4ed8;
}
.mc-badge-http,
.mc-badge-sse {
  background: #dcfce7;
  color: #15803d;
}
.mc-badge-unknown {
  background: #f1f5f9;
  color: #64748b;
}
.mc-server-name {
  font-family: monospace;
  font-size: 13px;
  font-weight: 600;
  color: var(--text, #111);
}
.mc-table {
  width: 100%;
  border-collapse: collapse;
}
.mc-table td {
  padding: 5px 12px;
  border-bottom: 1px solid var(--border, #f1f5f9);
  vertical-align: top;
  font-size: 12px;
}
.mc-table tr:last-child td {
  border-bottom: none;
}
.mc-table td:first-child {
  color: #888;
  width: 80px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding-top: 7px;
  white-space: nowrap;
}
.mc-command-cell {
  font-family: monospace;
  color: var(--text, #111);
  word-break: break-all;
}
.mc-url-cell {
  font-family: monospace;
  color: var(--text, #111);
  word-break: break-all;
}
.mc-url-local {
  color: #888;
  font-size: 11px;
  margin-left: 6px;
}
.mc-env-table {
  width: 100%;
  border-collapse: collapse;
}
.mc-env-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 0;
  flex-wrap: wrap;
}
.mc-env-key {
  font-family: monospace;
  font-size: 12px;
  color: #555;
  min-width: 160px;
  flex-shrink: 0;
}
.mc-env-value {
  font-family: monospace;
  font-size: 12px;
  color: var(--text, #111);
  flex: 1;
}
.mc-env-redacted {
  color: #bbb;
  letter-spacing: 0.1em;
  user-select: none;
}
.mc-reveal-btn {
  padding: 2px 8px;
  border-radius: 3px;
  border: 1px solid var(--border, #ddd);
  background: var(--bg, #fff);
  color: #888;
  font-size: 11px;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.12s, color 0.12s;
  white-space: nowrap;
}
.mc-reveal-btn:hover {
  background: var(--border, #f1f5f9);
  color: var(--text, #111);
}
.mc-env-empty {
  font-size: 12px;
  color: #aaa;
  font-style: italic;
  padding: 3px 0;
}
.mc-headers-section {
  padding: 4px 0 0;
}
.mc-section-label {
  font-size: 11px;
  color: #aaa;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding-bottom: 3px;
}
.mc-empty-state {
  padding: 24px 16px;
  color: #888;
  font-style: italic;
  text-align: center;
}
`;

function buildEnvRows(envObj) {
  const frag = document.createDocumentFragment();
  const entries = Object.entries(envObj);

  if (entries.length === 0) {
    const emptyEl = document.createElement('div');
    emptyEl.className = 'mc-env-empty';
    emptyEl.textContent = 'No environment variables';
    frag.appendChild(emptyEl);
    return frag;
  }

  for (const [key, value] of entries) {
    const secret = isSecretKey(key);
    const row = document.createElement('div');
    row.className = 'mc-env-row';

    const keyEl = document.createElement('span');
    keyEl.className = 'mc-env-key';
    keyEl.textContent = key;

    const valueEl = document.createElement('span');
    valueEl.className = 'mc-env-value';

    if (secret) {
      valueEl.classList.add('mc-env-redacted');
      valueEl.textContent = '████████████████';

      const btn = document.createElement('button');
      btn.className = 'mc-reveal-btn';
      btn.textContent = '👁 reveal';
      btn.setAttribute('aria-label', `Reveal value for ${key}`);

      let revealed = false;
      btn.addEventListener('click', () => {
        revealed = !revealed;
        if (revealed) {
          valueEl.textContent = value;
          valueEl.classList.remove('mc-env-redacted');
          btn.textContent = '🔒 hide';
        } else {
          valueEl.textContent = '████████████████';
          valueEl.classList.add('mc-env-redacted');
          btn.textContent = '👁 reveal';
        }
      });

      row.appendChild(keyEl);
      row.appendChild(valueEl);
      row.appendChild(btn);
    } else {
      valueEl.textContent = value;
      row.appendChild(keyEl);
      row.appendChild(valueEl);
    }

    frag.appendChild(row);
  }

  return frag;
}

function buildServerCard(server) {
  const card = document.createElement('div');
  card.className = 'mc-card';

  // Card header: badge + name
  const header = document.createElement('div');
  header.className = 'mc-card-header';

  const badge = document.createElement('span');
  badge.className = `mc-badge mc-badge-${server.transport}`;
  badge.textContent = server.transport;

  const nameEl = document.createElement('span');
  nameEl.className = 'mc-server-name';
  nameEl.textContent = server.name;

  header.appendChild(badge);
  header.appendChild(nameEl);
  card.appendChild(header);

  // Details table
  const table = document.createElement('table');
  table.className = 'mc-table';
  const tbody = document.createElement('tbody');

  // Command row (stdio servers)
  if (server.command) {
    const fullCmd = [server.command, ...server.args].join(' ');
    const tr = document.createElement('tr');
    const labelTd = document.createElement('td');
    labelTd.textContent = 'Command';
    const valueTd = document.createElement('td');
    valueTd.className = 'mc-command-cell';
    const codeEl = document.createElement('code');
    codeEl.textContent = fullCmd;
    valueTd.appendChild(codeEl);
    tr.appendChild(labelTd);
    tr.appendChild(valueTd);
    tbody.appendChild(tr);
  }

  // URL row (http servers)
  if (server.url) {
    const tr = document.createElement('tr');
    const labelTd = document.createElement('td');
    labelTd.textContent = 'URL';
    const valueTd = document.createElement('td');
    valueTd.className = 'mc-url-cell';
    valueTd.textContent = server.url;
    const isLocal = server.url.includes('localhost') || server.url.includes('127.0.0.1');
    if (isLocal) {
      const note = document.createElement('span');
      note.className = 'mc-url-local';
      note.textContent = '(local)';
      valueTd.appendChild(note);
    }
    tr.appendChild(labelTd);
    tr.appendChild(valueTd);
    tbody.appendChild(tr);
  }

  // Headers row (http servers)
  const headerEntries = Object.entries(server.headers);
  if (headerEntries.length > 0) {
    const tr = document.createElement('tr');
    const labelTd = document.createElement('td');
    labelTd.textContent = 'Headers';
    const valueTd = document.createElement('td');

    const fakeEnv = Object.fromEntries(headerEntries);
    valueTd.appendChild(buildEnvRows(fakeEnv));

    tr.appendChild(labelTd);
    tr.appendChild(valueTd);
    tbody.appendChild(tr);
  }

  // Env row
  const tr = document.createElement('tr');
  const envLabelTd = document.createElement('td');
  envLabelTd.textContent = 'Env';
  const envValueTd = document.createElement('td');
  envValueTd.appendChild(buildEnvRows(server.env));
  tr.appendChild(envLabelTd);
  tr.appendChild(envValueTd);
  tbody.appendChild(tr);

  table.appendChild(tbody);
  card.appendChild(table);

  return card;
}

export async function render(intake) {
  const text = intake.text ?? '';

  const root = document.createElement('div');
  root.className = 'mc-root';

  const styleEl = document.createElement('style');
  styleEl.textContent = STYLES;
  root.appendChild(styleEl);

  let servers = [];
  let parseError = null;

  try {
    servers = parseMCPConfig(text);
  } catch (e) {
    parseError = e.message ?? 'Invalid JSON';
  }

  // Header
  const header = document.createElement('div');
  header.className = 'mc-header';

  const title = document.createElement('span');
  title.className = 'mc-title';
  title.textContent = 'MCP Servers';

  header.appendChild(title);

  if (!parseError) {
    const count = document.createElement('span');
    count.className = 'mc-count';
    count.textContent = `${servers.length} server${servers.length !== 1 ? 's' : ''} configured`;
    header.appendChild(count);
  }

  root.appendChild(header);

  if (parseError) {
    const errEl = document.createElement('div');
    errEl.className = 'mc-empty-state';
    errEl.textContent = `Could not parse config: ${parseError}`;
    root.appendChild(errEl);
    return { parentNode: root, revoke() {} };
  }

  if (servers.length === 0) {
    const emptyEl = document.createElement('div');
    emptyEl.className = 'mc-empty-state';
    emptyEl.textContent = 'No MCP servers defined.';
    root.appendChild(emptyEl);
    return { parentNode: root, revoke() {} };
  }

  const body = document.createElement('div');
  body.className = 'mc-body';

  for (const server of servers) {
    body.appendChild(buildServerCard(server));
  }

  root.appendChild(body);

  return { parentNode: root, revoke() {} };
}
