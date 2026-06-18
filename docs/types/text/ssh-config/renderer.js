// SSH Config viewer with command palette
// Interactive parentNode renderer — clipboard, hover-reveal, tab switching
import { firstValue, parseSSHConfig } from './parse.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function buildCommands(block) {
  const s = block.settings;
  const alias = firstUsablePattern(block);
  const hostname = firstValue(s, 'HostName') || alias;
  const userValue = firstValue(s, 'User');
  const portValue = firstValue(s, 'Port');
  const jumpValue = firstValue(s, 'ProxyJump');
  const user = userValue ? `${userValue}@` : '';
  const port = portValue ? ['-p', portValue] : [];
  const portSftp = portValue ? ['-P', portValue] : [];
  const identity = (s.identityfile || []).flatMap((value) => ['-i', value]);
  const jump = jumpValue ? ['-J', jumpValue] : [];
  const forwardAgent = firstValue(s, 'ForwardAgent').toLowerCase() === 'yes' ? ['-A'] : [];

  const sshFlags = [...port, ...identity, ...jump, ...forwardAgent].join(' ');
  const sftpFlags = [...portSftp, ...identity].join(' ');
  const scpFlags = [...portSftp, ...identity].join(' ');
  const sshTarget = `${user}${hostname}`;

  return {
    'SSH (alias)': `ssh ${alias}`,
    'SSH (full)': `ssh${sshFlags ? ' ' + sshFlags : ''} ${sshTarget}`,
    'SFTP': `sftp${sftpFlags ? ' ' + sftpFlags : ''} ${sshTarget}`,
    'SCP': `scp${scpFlags ? ' ' + scpFlags : ''} <source> ${sshTarget}:<dest>`,
    'VS Code Remote': `code --remote ssh-remote+${alias} /path/to/workspace`,
    'rsync': `rsync -avz -e "ssh${sshFlags ? ' ' + sshFlags : ''}" <source> ${sshTarget}:<dest>`,
  };
}

function firstUsablePattern(block) {
  return block.patterns.find((pattern) => pattern !== '*') || block.patterns[0] || 'host';
}

function blockLabel(block) {
  return block.patterns.join(' ');
}

function displayDirective(key) {
  const known = {
    hostname: 'HostName',
    identityfile: 'IdentityFile',
    proxyjump: 'ProxyJump',
    proxycommand: 'ProxyCommand',
    forwardagent: 'ForwardAgent',
    serveraliveinterval: 'ServerAliveInterval',
    serveralivecountmax: 'ServerAliveCountMax',
    addkeystoagent: 'AddKeysToAgent',
    stricthostkeychecking: 'StrictHostKeyChecking',
    localforward: 'LocalForward',
    remoteforward: 'RemoteForward',
    dynamicforward: 'DynamicForward',
  };
  return known[key] || key.replace(/\b\w/g, (c) => c.toUpperCase());
}

const STYLES = `
.sc-root {
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 13px;
  color: var(--fg, #111);
  background: var(--bg, #fff);
  min-height: 200px;
  padding: 0;
}
.sc-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border, #ddd);
  display: flex;
  align-items: center;
  gap: 10px;
}
.sc-title {
  font-weight: 600;
  font-size: 14px;
  color: var(--fg, #111);
}
.sc-count {
  font-size: 12px;
  color: var(--fg-2, #666);
  background: var(--bg-3, #eee);
  border-radius: 10px;
  padding: 2px 8px;
}
.sc-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border, #ddd);
}
.sc-tab {
  padding: 4px 12px;
  border-radius: 4px;
  border: 1px solid var(--border, #ddd);
  background: var(--bg, #fff);
  color: var(--fg, #111);
  cursor: pointer;
  font-size: 12px;
  font-family: monospace;
  transition: background 0.12s;
}
.sc-tab:hover {
  background: var(--bg-3, #eee);
}
.sc-tab.active {
  background: var(--accent, #3b82f6);
  color: #fff;
  border-color: var(--accent, #3b82f6);
}
.sc-panel {
  display: none;
}
.sc-panel.active {
  display: block;
}
.sc-settings-table {
  width: 100%;
  border-collapse: collapse;
  margin: 0;
}
.sc-settings-table td {
  padding: 5px 16px;
  border-bottom: 1px solid var(--border, #eee);
  vertical-align: top;
  font-size: 12px;
}
.sc-settings-table td:first-child {
  color: var(--fg-2, #666);
  width: 160px;
  font-family: monospace;
  white-space: nowrap;
}
.sc-settings-table td:last-child {
  font-family: monospace;
  color: var(--fg, #111);
  word-break: break-all;
}
.sc-host-label {
  padding: 10px 16px 4px;
  font-weight: 600;
  font-size: 13px;
  color: var(--fg, #111);
  letter-spacing: 0.02em;
}
.sc-host-label span {
  font-family: monospace;
  font-size: 15px;
}
.sc-commands-section {
  border-top: 1px solid var(--border, #ddd);
  margin-top: 8px;
}
.sc-commands-title {
  padding: 8px 16px 4px;
  font-size: 11px;
  font-weight: 600;
  color: var(--fg-2, #666);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.sc-cmd-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 16px;
  border-bottom: 1px solid var(--border, #eee);
  cursor: pointer;
  transition: background 0.1s;
}
.sc-cmd-row:hover {
  background: var(--bg-2, #f5f5f5);
}
.sc-cmd-label {
  min-width: 110px;
  color: var(--fg-2, #666);
  font-size: 11px;
  flex-shrink: 0;
}
.sc-cmd-text {
  flex: 1;
  font-family: monospace;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  filter: blur(3px);
  transition: filter 0.2s;
  user-select: none;
}
.sc-cmd-text.revealed {
  filter: none;
  user-select: text;
}
.sc-copy-btn {
  padding: 3px 10px;
  border-radius: 4px;
  border: 1px solid var(--border, #ddd);
  background: var(--bg, #fff);
  color: var(--fg, #111);
  font-size: 11px;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.12s, color 0.12s;
  white-space: nowrap;
}
.sc-copy-btn:hover {
  background: var(--accent, #3b82f6);
  color: #fff;
  border-color: var(--accent, #3b82f6);
}
.sc-copy-btn.copied {
  background: #22c55e;
  color: #fff;
  border-color: #22c55e;
}
.sc-global-note {
  padding: 6px 16px 10px;
  font-size: 12px;
  color: var(--fg-2, #666);
  font-style: italic;
}
.sc-hostname-link {
  color: var(--accent, #3b82f6);
  text-decoration: none;
  margin-left: 6px;
  font-size: 11px;
}
.sc-hostname-link:hover {
  text-decoration: underline;
}
`;

export async function render(intake) {
  const text = intake.text ?? '';
  const { blocks } = parseSSHConfig(text);

  const nonWildcard = blocks.filter((b) => !b.patterns.includes('*'));
  const wildcardBlock = blocks.find((b) => b.patterns.includes('*'));
  const allBlocks = [...nonWildcard, ...(wildcardBlock ? [wildcardBlock] : [])];

  // Build root element
  const root = document.createElement('div');
  root.className = 'sc-root';

  // Inject styles
  const styleEl = document.createElement('style');
  styleEl.textContent = STYLES;
  root.appendChild(styleEl);

  // Header
  const header = document.createElement('div');
  header.className = 'sc-header';
  header.innerHTML = `<span class="sc-title">SSH Config</span><span class="sc-count">${nonWildcard.length} host${nonWildcard.length !== 1 ? 's' : ''} defined</span>`;
  root.appendChild(header);

  if (allBlocks.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'padding:20px 16px;color:#888;font-style:italic;';
    empty.textContent = 'No host blocks found.';
    root.appendChild(empty);
    return { parentNode: root, revoke() {} };
  }

  // Tabs
  const tabsEl = document.createElement('div');
  tabsEl.className = 'sc-tabs';

  // Panels container
  const panelsEl = document.createElement('div');

  const panels = [];
  const tabs = [];

  allBlocks.forEach((block, i) => {
    const isWild = block.patterns.includes('*');
    const label = blockLabel(block);

    // Tab
    const tab = document.createElement('button');
    tab.className = 'sc-tab' + (i === 0 ? ' active' : '');
    tab.textContent = isWild ? 'Host *' : label;
    tab.dataset.index = String(i);
    tabsEl.appendChild(tab);
    tabs.push(tab);

    // Panel
    const panel = document.createElement('div');
    panel.className = 'sc-panel' + (i === 0 ? ' active' : '');

    // Host label
    const labelDiv = document.createElement('div');
    labelDiv.className = 'sc-host-label';
    if (isWild) {
      labelDiv.innerHTML = `HOST: <span>*</span> <em style="font-weight:400;font-size:11px;color:#888">(Global defaults)</em>`;
    } else {
      labelDiv.innerHTML = `HOST: <span>${esc(label)}</span>`;
    }
    panel.appendChild(labelDiv);

    // Settings table
    const entries = Object.entries(block.settings);
    if (entries.length > 0) {
      const table = document.createElement('table');
      table.className = 'sc-settings-table';
      const tbody = document.createElement('tbody');
      for (const [k, values] of entries) {
        const tr = document.createElement('tr');
        let valHtml = values.map(esc).join('<br>');

        // If HostName looks like a URL, add an "Open in tab →" link
        if (k === 'hostname' && values.length === 1 && (values[0].startsWith('http://') || values[0].startsWith('https://'))) {
          valHtml += ` <a class="sc-hostname-link" href="${esc(values[0])}" target="_blank" rel="noopener">Open in tab →</a>`;
        }
        tr.innerHTML = `<td>${esc(displayDirective(k))}</td><td>${valHtml}</td>`;
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      panel.appendChild(table);
    }

    // Commands section (skip for wildcard hosts)
    if (!isWild) {
      const cmdsSection = document.createElement('div');
      cmdsSection.className = 'sc-commands-section';

      const cmdsTitle = document.createElement('div');
      cmdsTitle.className = 'sc-commands-title';
      cmdsTitle.textContent = 'Commands';
      cmdsSection.appendChild(cmdsTitle);

      const commands = buildCommands(block);

      for (const [label, cmd] of Object.entries(commands)) {
        const row = document.createElement('div');
        row.className = 'sc-cmd-row';

        const labelEl = document.createElement('span');
        labelEl.className = 'sc-cmd-label';
        labelEl.textContent = label;

        const textEl = document.createElement('span');
        textEl.className = 'sc-cmd-text';
        textEl.textContent = cmd;

        const copyBtn = document.createElement('button');
        copyBtn.className = 'sc-copy-btn';
        copyBtn.textContent = '⧉ copy';

        row.appendChild(labelEl);
        row.appendChild(textEl);
        row.appendChild(copyBtn);
        cmdsSection.appendChild(row);

        // Hover-reveal: 200ms delay
        let revealTimer = null;
        row.addEventListener('mouseenter', () => {
          revealTimer = setTimeout(() => textEl.classList.add('revealed'), 200);
        });
        row.addEventListener('mouseleave', () => {
          clearTimeout(revealTimer);
          // Don't un-reveal on leave — keep it visible once shown
        });

        // Click-to-reveal immediately
        row.addEventListener('click', (e) => {
          if (e.target === copyBtn) return;
          textEl.classList.add('revealed');
        });

        // Copy button
        copyBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          navigator.clipboard.writeText(cmd).then(() => {
            copyBtn.textContent = '✓ copied';
            copyBtn.classList.add('copied');
            setTimeout(() => {
              copyBtn.textContent = '⧉ copy';
              copyBtn.classList.remove('copied');
            }, 1500);
          }).catch(() => {
            // Fallback: reveal the text so user can copy manually
            textEl.classList.add('revealed');
          });
        });
      }

      panel.appendChild(cmdsSection);
    } else {
      const note = document.createElement('div');
      note.className = 'sc-global-note';
      note.textContent = 'These settings apply to all connections as global defaults.';
      panel.appendChild(note);
    }

    panelsEl.appendChild(panel);
    panels.push(panel);
  });

  root.appendChild(tabsEl);
  root.appendChild(panelsEl);

  // Tab switching
  tabsEl.addEventListener('click', (e) => {
    const tab = e.target.closest('.sc-tab');
    if (!tab) return;
    const idx = parseInt(tab.dataset.index, 10);
    tabs.forEach((t, i) => t.classList.toggle('active', i === idx));
    panels.forEach((p, i) => p.classList.toggle('active', i === idx));
  });

  return { parentNode: root, revoke() {} };
}
