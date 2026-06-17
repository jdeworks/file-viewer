// Kubernetes kubeconfig viewer

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/**
 * Parse a kubeconfig file using targeted line-by-line approach.
 * Handles standard kubeconfig structure robustly without a YAML lib.
 */
function parseKubeconfig(text) {
  // Extract current-context
  const ccMatch = text.match(/^current-context:\s*(.+)$/m);
  const currentContext = ccMatch ? ccMatch[1].trim() : null;

  // Parse a top-level array section (clusters, contexts, users)
  function parseSection(sectionName) {
    const sectionRe = new RegExp(`^${sectionName}:\\s*$`, 'm');
    const match = sectionRe.exec(text);
    if (!match) return [];

    const afterSection = text.slice(match.index + match[0].length);
    const lines = afterSection.split('\n');
    const items = [];
    let current = null;

    for (const line of lines) {
      if (!line.trim()) continue;
      const indent = line.match(/^(\s*)/)[1].length;

      // End of section: zero-indent non-list line = new top-level key
      if (indent === 0 && line.trim() && !line.trim().startsWith('-')) break;

      if (line.trim().startsWith('- ') || line.trim() === '-') {
        if (current) items.push(current);
        current = {};
        // Handle `- name: foo` or `- key: val` on same line
        const inlineKey = line.match(/^-\s+(\S+):\s*(.*)$/);
        if (inlineKey) current[inlineKey[1]] = inlineKey[2].trim();
      } else if (current !== null) {
        const kv = line.match(/^\s+(\S+):\s*(.*)$/);
        if (kv) {
          const key = kv[1];
          const val = kv[2].trim();
          // Store all keys (nested keys get flattened — fine for our use)
          current[key] = val;
        }
      }
    }
    if (current) items.push(current);
    return items;
  }

  const clusters = parseSection('clusters');
  const contexts = parseSection('contexts');
  const users = parseSection('users');

  // Extract server URL for each cluster: look in the clusters section
  // The structure is: - cluster:\n    server: <url>\n  name: <name>
  // Use targeted extraction from the raw clusters section text
  function extractClusterServers() {
    const sectionMatch = text.match(/^clusters:\s*$([\s\S]*?)^(?:contexts:|users:|current-context:|preferences:|$)/m);
    if (!sectionMatch) return {};

    const sectionText = sectionMatch[1];
    const serverMap = {};

    // Split on list item boundaries (lines starting with "- ")
    const blocks = sectionText.split(/(?=^\s*-\s)/m).filter(Boolean);
    for (const block of blocks) {
      const nameMatch = block.match(/^\s+name:\s*(.+)$/m) || block.match(/^-\s+name:\s*(.+)$/m);
      const serverMatch = block.match(/^\s+server:\s*(\S+)$/m);
      const insecureMatch = block.match(/^\s+insecure-skip-tls-verify:\s*(\S+)$/m);
      if (nameMatch) {
        const name = nameMatch[1].trim();
        serverMap[name] = {
          server: serverMatch ? serverMatch[1].trim() : null,
          insecure: insecureMatch ? insecureMatch[1].trim() === 'true' : false,
        };
      }
    }
    return serverMap;
  }

  // Extract context details: cluster, user, namespace
  function extractContextDetails() {
    const sectionMatch = text.match(/^contexts:\s*$([\s\S]*?)^(?:clusters:|users:|current-context:|preferences:|$)/m);
    if (!sectionMatch) return {};

    const sectionText = sectionMatch[1];
    const detailMap = {};

    const blocks = sectionText.split(/(?=^\s*-\s)/m).filter(Boolean);
    for (const block of blocks) {
      const nameMatch = block.match(/^\s+name:\s*(.+)$/m) || block.match(/^-\s+name:\s*(.+)$/m);
      const clusterMatch = block.match(/^\s+cluster:\s*(.+)$/m);
      const userMatch = block.match(/^\s+user:\s*(.+)$/m);
      const nsMatch = block.match(/^\s+namespace:\s*(.+)$/m);
      if (nameMatch) {
        const name = nameMatch[1].trim();
        detailMap[name] = {
          cluster: clusterMatch ? clusterMatch[1].trim() : null,
          user: userMatch ? userMatch[1].trim() : null,
          namespace: nsMatch ? nsMatch[1].trim() : null,
        };
      }
    }
    return detailMap;
  }

  // Detect auth method for a user block
  function extractUserAuthMethods() {
    const sectionMatch = text.match(/^users:\s*$([\s\S]*?)(?=^(?:clusters:|contexts:|current-context:|preferences:)|$)/m);
    if (!sectionMatch) return {};

    const sectionText = sectionMatch[1];
    const authMap = {};

    const blocks = sectionText.split(/(?=^\s*-\s)/m).filter(Boolean);
    for (const block of blocks) {
      const nameMatch = block.match(/^-\s+name:\s*(.+)$/m);
      if (nameMatch) {
        const name = nameMatch[1].trim();
        let method = 'Unknown';
        if (block.includes('client-certificate-data:') || block.includes('client-certificate:')) {
          method = 'Client certificate';
        } else if (block.includes('token:')) {
          method = 'Bearer token';
        } else if (block.includes('exec:')) {
          // Try to extract the exec command
          const cmdMatch = block.match(/^\s+command:\s*(\S+)$/m);
          method = cmdMatch ? `Exec plugin (${cmdMatch[1].trim()})` : 'Exec plugin';
        } else if (block.includes('auth-provider:')) {
          method = 'Auth provider';
        } else if (block.includes('username:')) {
          method = 'Username/password';
        }
        authMap[name] = method;
      }
    }
    return authMap;
  }

  const clusterServers = extractClusterServers();
  const contextDetails = extractContextDetails();
  const userAuthMethods = extractUserAuthMethods();

  return {
    currentContext,
    clusters: clusters.map((c) => ({
      name: c.name,
      server: (clusterServers[c.name] && clusterServers[c.name].server) || null,
      insecure: (clusterServers[c.name] && clusterServers[c.name].insecure) || false,
    })),
    contexts: contexts.map((c) => {
      const det = contextDetails[c.name] || {};
      return {
        name: c.name,
        cluster: det.cluster || c.cluster || null,
        user: det.user || c.user || null,
        namespace: det.namespace || c.namespace || null,
      };
    }),
    users: users.map((u) => ({
      name: u.name,
      authMethod: userAuthMethods[u.name] || 'Unknown',
    })),
  };
}

const STYLES = `
.kc-root {
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 13px;
  color: var(--text, #111);
  background: var(--bg, #fff);
  min-height: 200px;
  padding: 0;
}
.kc-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border, #ddd);
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.kc-title {
  font-weight: 600;
  font-size: 14px;
  color: var(--text, #111);
  display: flex;
  align-items: center;
  gap: 8px;
}
.kc-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
  background: #326ce5;
  color: #fff;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}
.kc-count {
  font-size: 12px;
  color: #888;
  background: var(--border, #eee);
  border-radius: 10px;
  padding: 2px 8px;
}
.kc-body {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.kc-current-ctx {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.kc-current-ctx-label {
  font-size: 11px;
  font-weight: 700;
  color: #3b82f6;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  white-space: nowrap;
  flex-shrink: 0;
}
.kc-current-ctx-value {
  font-family: monospace;
  font-size: 14px;
  font-weight: 600;
  color: #1d4ed8;
  word-break: break-all;
}
.kc-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.kc-section-title {
  font-size: 11px;
  font-weight: 700;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.kc-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 6px;
  overflow: hidden;
  font-size: 12px;
}
.kc-table th {
  text-align: left;
  padding: 6px 12px;
  background: var(--bg, #f8fafc);
  border-bottom: 1px solid var(--border, #e2e8f0);
  color: #888;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
}
.kc-table td {
  padding: 7px 12px;
  border-bottom: 1px solid var(--border, #f1f5f9);
  vertical-align: middle;
  font-family: monospace;
  color: var(--text, #111);
  word-break: break-all;
}
.kc-table tr:last-child td {
  border-bottom: none;
}
.kc-table tr.kc-active-row td {
  background: #eff6ff;
  color: #1d4ed8;
}
.kc-star {
  color: #f59e0b;
  margin-right: 4px;
}
.kc-server-link {
  color: #3b82f6;
  text-decoration: none;
  font-family: monospace;
}
.kc-server-link:hover {
  text-decoration: underline;
}
.kc-insecure {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  color: #dc2626;
  background: #fee2e2;
  border-radius: 3px;
  padding: 1px 5px;
  margin-left: 6px;
  font-family: sans-serif;
  vertical-align: middle;
  white-space: nowrap;
}
.kc-null {
  color: #bbb;
  font-style: italic;
  font-family: sans-serif;
}
.kc-auth-method {
  color: var(--text, #111);
  font-family: sans-serif;
}
.kc-empty-state {
  padding: 24px 16px;
  color: #888;
  font-style: italic;
  text-align: center;
}
.kc-error {
  margin: 16px;
  padding: 12px 16px;
  background: #fef2f2;
  border: 1px solid #fca5a5;
  border-radius: 6px;
  color: #991b1b;
  font-size: 12px;
}
.kc-raw-fallback {
  padding: 12px 16px;
  font-family: monospace;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
  color: var(--text, #111);
}
`;

export async function render(intake) {
  const text = intake.text ?? '';

  const root = document.createElement('div');
  root.className = 'kc-root';

  const styleEl = document.createElement('style');
  styleEl.textContent = STYLES;
  root.appendChild(styleEl);

  let parsed = null;
  let parseError = null;

  try {
    parsed = parseKubeconfig(text);
  } catch (e) {
    parseError = e.message ?? String(e);
  }

  // Header
  const header = document.createElement('div');
  header.className = 'kc-header';

  const title = document.createElement('span');
  title.className = 'kc-title';

  const badge = document.createElement('span');
  badge.className = 'kc-badge';
  badge.textContent = 'K8s';
  title.appendChild(badge);

  const titleText = document.createTextNode('Kubernetes Config');
  title.appendChild(titleText);
  header.appendChild(title);

  if (parsed && !parseError) {
    const clusterCount = document.createElement('span');
    clusterCount.className = 'kc-count';
    clusterCount.textContent = `${parsed.clusters.length} cluster${parsed.clusters.length !== 1 ? 's' : ''}`;
    header.appendChild(clusterCount);

    const ctxCount = document.createElement('span');
    ctxCount.className = 'kc-count';
    ctxCount.textContent = `${parsed.contexts.length} context${parsed.contexts.length !== 1 ? 's' : ''}`;
    header.appendChild(ctxCount);
  }

  root.appendChild(header);

  if (parseError) {
    const errEl = document.createElement('div');
    errEl.className = 'kc-error';
    errEl.textContent = `Parse error: ${parseError}`;
    root.appendChild(errEl);

    const rawEl = document.createElement('pre');
    rawEl.className = 'kc-raw-fallback';
    rawEl.textContent = text;
    root.appendChild(rawEl);

    return { parentNode: root, revoke() {} };
  }

  const body = document.createElement('div');
  body.className = 'kc-body';

  // Current context section
  if (parsed.currentContext) {
    const ctxBox = document.createElement('div');
    ctxBox.className = 'kc-current-ctx';

    const ctxLabel = document.createElement('span');
    ctxLabel.className = 'kc-current-ctx-label';
    ctxLabel.textContent = 'Current context';

    const ctxValue = document.createElement('span');
    ctxValue.className = 'kc-current-ctx-value';
    ctxValue.textContent = parsed.currentContext;

    ctxBox.appendChild(ctxLabel);
    ctxBox.appendChild(ctxValue);
    body.appendChild(ctxBox);
  }

  // Contexts table
  if (parsed.contexts.length > 0) {
    const section = document.createElement('div');
    section.className = 'kc-section';

    const sectionTitle = document.createElement('div');
    sectionTitle.className = 'kc-section-title';
    sectionTitle.textContent = 'Contexts';
    section.appendChild(sectionTitle);

    const table = document.createElement('table');
    table.className = 'kc-table';

    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Context</th><th>Cluster</th><th>User</th><th>Namespace</th></tr>';
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (const ctx of parsed.contexts) {
      const isCurrent = ctx.name === parsed.currentContext;
      const tr = document.createElement('tr');
      if (isCurrent) tr.className = 'kc-active-row';

      const nameTd = document.createElement('td');
      if (isCurrent) {
        const star = document.createElement('span');
        star.className = 'kc-star';
        star.textContent = '★';
        nameTd.appendChild(star);
      }
      nameTd.appendChild(document.createTextNode(ctx.name));

      const clusterTd = document.createElement('td');
      clusterTd.textContent = ctx.cluster ?? '';

      const userTd = document.createElement('td');
      userTd.textContent = ctx.user ?? '';

      const nsTd = document.createElement('td');
      if (ctx.namespace) {
        nsTd.textContent = ctx.namespace;
      } else {
        const nullSpan = document.createElement('span');
        nullSpan.className = 'kc-null';
        nullSpan.textContent = 'default';
        nsTd.appendChild(nullSpan);
      }

      tr.appendChild(nameTd);
      tr.appendChild(clusterTd);
      tr.appendChild(userTd);
      tr.appendChild(nsTd);
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    section.appendChild(table);
    body.appendChild(section);
  }

  // Clusters table
  if (parsed.clusters.length > 0) {
    const section = document.createElement('div');
    section.className = 'kc-section';

    const sectionTitle = document.createElement('div');
    sectionTitle.className = 'kc-section-title';
    sectionTitle.textContent = 'Clusters';
    section.appendChild(sectionTitle);

    const table = document.createElement('table');
    table.className = 'kc-table';

    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Cluster</th><th>API Server</th></tr>';
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (const cluster of parsed.clusters) {
      const tr = document.createElement('tr');

      const nameTd = document.createElement('td');
      nameTd.textContent = cluster.name ?? '';

      const serverTd = document.createElement('td');
      if (cluster.server) {
        const link = document.createElement('a');
        link.className = 'kc-server-link';
        link.href = cluster.server;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = cluster.server;
        serverTd.appendChild(link);

        if (cluster.insecure) {
          const insecureBadge = document.createElement('span');
          insecureBadge.className = 'kc-insecure';
          insecureBadge.textContent = 'TLS skip';
          serverTd.appendChild(insecureBadge);
        }
      } else {
        const nullSpan = document.createElement('span');
        nullSpan.className = 'kc-null';
        nullSpan.textContent = 'not specified';
        serverTd.appendChild(nullSpan);
      }

      tr.appendChild(nameTd);
      tr.appendChild(serverTd);
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    section.appendChild(table);
    body.appendChild(section);
  }

  // Users table
  if (parsed.users.length > 0) {
    const section = document.createElement('div');
    section.className = 'kc-section';

    const sectionTitle = document.createElement('div');
    sectionTitle.className = 'kc-section-title';
    sectionTitle.textContent = 'Users';
    section.appendChild(sectionTitle);

    const table = document.createElement('table');
    table.className = 'kc-table';

    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>User</th><th>Auth Method</th></tr>';
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (const user of parsed.users) {
      const tr = document.createElement('tr');

      const nameTd = document.createElement('td');
      nameTd.textContent = user.name ?? '';

      const authTd = document.createElement('td');
      const authSpan = document.createElement('span');
      authSpan.className = 'kc-auth-method';
      authSpan.textContent = user.authMethod;
      authTd.appendChild(authSpan);

      tr.appendChild(nameTd);
      tr.appendChild(authTd);
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    section.appendChild(table);
    body.appendChild(section);
  }

  if (parsed.clusters.length === 0 && parsed.contexts.length === 0 && parsed.users.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'kc-empty-state';
    empty.textContent = 'No clusters, contexts, or users found.';
    body.appendChild(empty);
  }

  root.appendChild(body);

  return { parentNode: root, revoke() {} };
}
