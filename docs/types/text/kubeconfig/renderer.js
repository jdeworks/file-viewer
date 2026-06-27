// Kubernetes kubeconfig viewer
import { ensureKnownUiStyle, issueList, sourcePreview, wireSourceLinks } from '../../../core/known-ui.js';
import { appendKubeconfigTables } from './kubeconfig-tables.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/**
 * Parse a kubeconfig file using targeted line-by-line approach.
 * Handles standard kubeconfig structure robustly without a YAML lib.
 */
function parseKubeconfig(text) {
  const lineInfo = buildLineInfo(text);
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
    currentContextLine: lineInfo.currentContextLine,
    clusters: clusters.map((c) => ({
      name: c.name,
      server: (clusterServers[c.name] && clusterServers[c.name].server) || null,
      insecure: (clusterServers[c.name] && clusterServers[c.name].insecure) || false,
      line: lineInfo.clusters[c.name]?.line || 1,
      serverLine: lineInfo.clusters[c.name]?.serverLine || lineInfo.clusters[c.name]?.line || 1,
      insecureLine: lineInfo.clusters[c.name]?.insecureLine || lineInfo.clusters[c.name]?.line || 1,
      certLine: lineInfo.clusters[c.name]?.certLine || 0,
    })),
    contexts: contexts.map((c) => {
      const det = contextDetails[c.name] || {};
      const ctxInfo = lineInfo.contexts[c.name] || {};
      return {
        name: c.name,
        cluster: det.cluster || c.cluster || null,
        user: det.user || c.user || null,
        namespace: det.namespace || c.namespace || null,
        line: ctxInfo.line || 1,
        clusterLine: ctxInfo.clusterLine || ctxInfo.line || 1,
        userLine: ctxInfo.userLine || ctxInfo.line || 1,
        namespaceLine: ctxInfo.namespaceLine || ctxInfo.line || 1,
      };
    }),
    users: users.map((u) => {
      const userInfo = lineInfo.users[u.name] || {};
      return {
        name: u.name,
        authMethod: userAuthMethods[u.name] || 'Unknown',
        line: userInfo.line || 1,
        authLine: userInfo.authLine || userInfo.line || 1,
        hasEmbeddedSecret: !!userInfo.hasEmbeddedSecret,
      };
    }),
  };
}

function buildLineInfo(text) {
  const lines = String(text || '').split(/\r?\n/);
  const info = { currentContextLine: 1, clusters: {}, contexts: {}, users: {}, secretLines: new Map() };
  let section = '';
  let current = null;

  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1;
    const raw = lines[i];
    const trimmed = raw.trim();
    if (/^current-context:\s*/.test(trimmed)) info.currentContextLine = lineNo;
    const sectionMatch = raw.match(/^([A-Za-z-]+):\s*$/);
    if (sectionMatch) {
      section = sectionMatch[1];
      current = null;
      continue;
    }
    if (!['clusters', 'contexts', 'users'].includes(section)) continue;

    if (/^\s*-\s*/.test(raw)) {
      current = { line: lineNo };
    }
    const itemName = raw.match(/^\s*(?:-\s+)?name:\s*(.+)$/);
    if (itemName) {
      current = current || { line: lineNo };
      current.name = itemName[1].trim();
      current.nameLine = lineNo;
      info[section][current.name] = current;
      continue;
    }
    if (!current) continue;
    if (/^\s*server:\s*/.test(raw)) current.serverLine = lineNo;
    if (/^\s*insecure-skip-tls-verify:\s*true\b/i.test(raw)) current.insecureLine = lineNo;
    if (/^\s*certificate-authority-data:\s*/.test(raw)) {
      current.certLine = lineNo;
      info.secretLines.set(lineNo, 'cluster certificate authority data');
    }
    if (/^\s*cluster:\s*/.test(raw)) current.clusterLine = lineNo;
    if (/^\s*user:\s*/.test(raw)) current.userLine = lineNo;
    if (/^\s*namespace:\s*/.test(raw)) current.namespaceLine = lineNo;
    if (/^\s*(client-certificate-data|client-key-data|token|password):\s*/.test(raw)) {
      current.authLine = current.authLine || lineNo;
      current.hasEmbeddedSecret = true;
      info.secretLines.set(lineNo, trimmed.split(':')[0]);
    }
    if (/^\s*(exec|auth-provider|username):\s*/.test(raw)) current.authLine = current.authLine || lineNo;
  }
  info.secretLinesMap = info.secretLines;
  return info;
}

function collectIssues(parsed) {
  const issues = [];
  for (const cluster of parsed.clusters) {
    if (cluster.insecure) {
      issues.push({
        severity: 'high',
        label: 'TLS skip',
        line: cluster.insecureLine,
        message: `${cluster.name} disables TLS verification. This can hide a man-in-the-middle API server.`,
      });
    }
    if (cluster.certLine) {
      issues.push({
        severity: 'info',
        label: 'embedded CA',
        line: cluster.certLine,
        message: `${cluster.name} embeds certificate authority data; it is redacted in the source preview.`,
      });
    }
  }
  for (const user of parsed.users) {
    if (user.hasEmbeddedSecret) {
      issues.push({
        severity: /prod|admin/i.test(user.name) ? 'high' : 'warning',
        label: 'embedded credential',
        line: user.authLine,
        message: `${user.name} has token or key material in this file. Prefer exec plugins or short-lived external credentials where possible.`,
      });
    }
  }
  if (parsed.currentContext) {
    issues.push({
      severity: /prod/i.test(parsed.currentContext) ? 'warning' : 'info',
      label: 'current context',
      line: parsed.currentContextLine,
      message: `kubectl commands will target ${parsed.currentContext} by default.`,
    });
  }
  return issues;
}

function redactedSource(text) {
  const lines = String(text || '').split(/\r?\n/);
  const sensitive = /^(certificate-authority-data|client-certificate-data|client-key-data|token|password):/;
  return lines.map((line) => {
    const trimmed = line.trim();
    if (!sensitive.test(trimmed)) return line;
    const indent = line.match(/^\s*/)?.[0] || '';
    const key = trimmed.split(':')[0];
    return `${indent}${key}: "[REDACTED ${key}]"`;
  }).join('\n');
}

function highlightYamlLine(line) {
  let out = esc(line);
  out = out.replace(/^(\s*-?\s*)([A-Za-z0-9_.-]+)(:)/, '$1<span style="color:#8250df">$2</span>$3');
  out = out.replace(/(:\s*)(&quot;[^&]*&quot;|https?:\/\/\S+|true|false)/i, '$1<span style="color:#0f766e">$2</span>');
  return out;
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
.kc-review {
  margin: 0;
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
  ensureKnownUiStyle(document);

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
  const issues = issueList(collectIssues(parsed), { title: 'Kubeconfig Review' });
  if (issues) {
    issues.classList.add('kc-review');
    body.appendChild(issues);
  }
  appendKubeconfigTables(body, parsed);
  body.appendChild(sourcePreview(redactedSource(text), { title: 'Redacted source', collapsed: true, idPrefix: 'kc-line', highlighter: highlightYamlLine }));
  wireSourceLinks(body, { idPrefix: 'kc-line' });

  root.appendChild(body);

  return { parentNode: root, revoke() {} };
}
