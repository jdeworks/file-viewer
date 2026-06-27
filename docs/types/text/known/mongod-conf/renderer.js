import { loadGlobal, vendor } from '../../../../core/script-loader.js';
import { ensureKnownUiStyle, issueList, maskedValue, sourcePreview, wireSourceLinks } from '../../../../core/known-ui.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const SENSITIVE = /password|secret|key|token|pass|pwd/i;

const CSS = `
.mg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-mg{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#00684a;color:#fff;vertical-align:middle;margin-right:8px;}
.mg-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.mg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.mg-sec{margin:14px 0;}
.mg-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.mg-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.mg-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:12px;}
.mg-kv-k{color:var(--fg-2,#888);min-width:180px;font-family:ui-monospace,monospace;}
.mg-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.mg-masked{font-family:ui-monospace,monospace;color:var(--fg-2,#999);letter-spacing:2px;}
.mg-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.mg-pill.on{background:#dcfce7;border-color:#86efac;color:#166534;}
.mg-pill.warn{background:#fff7ed;border-color:#fed7aa;color:#c2410c;}
.mg-mask-reason{font-size:11px;color:var(--fg-2,#888);font-family:system-ui,sans-serif;margin-left:6px;letter-spacing:0;}
.mg-link{border:0;background:transparent;color:inherit;font:inherit;padding:0;text-align:left;cursor:pointer;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px;}
.mg-link:hover{color:var(--accent,#2563eb);}
.mg-source-key{color:#00684a;font-weight:700;}
.mg-source-comment{color:#6e7781;font-style:italic;}
`;

const HELP = {
  'storage.dbPath': 'Filesystem path where MongoDB stores data files.',
  'storage.engine': 'Storage engine used by mongod.',
  'storage.journal.enabled': 'Controls durability journal writes.',
  'net.port': 'TCP port used by MongoDB clients.',
  'net.bindIp': 'Network interfaces mongod listens on. Public binds need firewalling and auth review.',
  'net.tls.mode': 'TLS mode for client connections.',
  'net.ssl.mode': 'Legacy SSL mode for client connections.',
  'replication.replSetName': 'Replica set name this mongod belongs to.',
  'replication.oplogSizeMB': 'Size of the replication operation log.',
  'security.authorization': 'Enables role-based access control for clients.',
  'security.keyFile': 'Shared key file used for internal replica set authentication.',
  'systemLog.destination': 'Where mongod sends log output.',
  'systemLog.path': 'File path used when logging to a file.',
  'systemLog.logAppend': 'Appends to the existing log file instead of overwriting it.',
  'processManagement.pidFilePath': 'Path containing the mongod process id.',
};

function helpFor(path) {
  return HELP[path] || 'Open this MongoDB setting in source.';
}

function lineButton(label, entry, path = label) {
  const line = entry?.line || 1;
  const title = `${helpFor(path)} Open line ${line} in source.`;
  return `<button class="mg-link" type="button" data-source-line="${line}" title="${esc(title)}">${esc(label)}</button>`;
}

function value(entry, path) {
  const raw = entry?.value;
  if (raw == null || raw === '') return '';
  const sensitive = SENSITIVE.test(path);
  const masked = sensitive ? { text: '[configured]', masked: true, reason: `masked because "${path}" is a MongoDB sensitive file or credential setting` } : maskedValue(path, raw);
  if (masked.masked) {
    return `<span class="mg-masked" title="${esc(masked.reason)}">[configured]</span><span class="mg-mask-reason">${esc(masked.reason)}</span>`;
  }
  return `<span class="mg-kv-v">${esc(String(raw))}</span>`;
}

function kv(label, path, entry) {
  if (!entry || entry.value == null || entry.value === '') return '';
  return `<div class="mg-kv"><span class="mg-kv-k">${lineButton(label, entry, path)}</span>${value(entry, path)}</div>`;
}

function get(obj, ...path) {
  let cur = obj;
  for (const key of path) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[key];
  }
  return cur;
}

function buildLineMap(text) {
  const entries = new Map();
  const stack = [];
  for (const [idx, rawLine] of String(text || '').split(/\r?\n/).entries()) {
    if (!rawLine.trim() || /^\s*#/.test(rawLine)) continue;
    const m = rawLine.match(/^(\s*)([A-Za-z_][\w.-]*)\s*:\s*(.*)$/);
    if (!m) continue;
    const indent = m[1].replace(/\t/g, '  ').length;
    const key = m[2];
    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    const path = [...stack.map((item) => item.key), key].join('.');
    entries.set(path, { line: idx + 1, raw: m[3] });
    if (m[3].trim() === '') stack.push({ indent, key });
  }
  return entries;
}

function entry(cfg, lineMap, path) {
  const value = get(cfg, ...path.split('.'));
  if (value == null) return null;
  const lineInfo = lineMap.get(path) || {};
  return { value: String(value), line: lineInfo.line || 1, path };
}

function collectIssues(items) {
  const issues = [];
  const bindIp = items.bindIp?.value || '';
  if (/(^|,|\s)(0\.0\.0\.0|\*|::)(,|\s|$)/.test(bindIp)) {
    issues.push({
      severity: 'warning',
      label: 'public bind',
      line: items.bindIp?.line || 1,
      message: `net.bindIp is ${bindIp}; confirm firewall rules and authorization before exposing MongoDB.`,
    });
  } else if (bindIp) {
    issues.push({
      severity: 'info',
      label: 'bind scope',
      line: items.bindIp.line,
      message: `net.bindIp is ${bindIp}; verify it matches intended client networks.`,
    });
  }
  if ((items.authorization?.value || '').toLowerCase() !== 'enabled') {
    issues.push({
      severity: 'warning',
      label: 'authorization',
      line: items.authorization?.line || 1,
      message: 'security.authorization is not enabled; client access may not require MongoDB roles.',
    });
  } else {
    issues.push({
      severity: 'info',
      label: 'authorization',
      line: items.authorization.line,
      message: 'Role-based access control is enabled.',
    });
  }
  if (items.replSetName && !items.keyFile) {
    issues.push({
      severity: 'warning',
      label: 'key file',
      line: items.replSetName.line,
      message: 'Replica set is configured but security.keyFile is missing for internal authentication.',
    });
  }
  if (items.keyFile) {
    issues.push({
      severity: 'info',
      label: 'key file',
      line: items.keyFile.line,
      message: 'Replica set keyFile is configured and redacted in the source preview.',
    });
  }
  const tlsMode = (items.tls?.value || '').toLowerCase();
  if (!tlsMode && bindIp && !/127\.0\.0\.1|localhost|::1/.test(bindIp)) {
    issues.push({
      severity: 'warning',
      label: 'tls missing',
      line: items.bindIp?.line || 1,
      message: 'No net.tls.mode is configured for a non-local bind address.',
    });
  } else if (tlsMode) {
    issues.push({
      severity: 'info',
      label: 'tls mode',
      line: items.tls.line,
      message: `TLS mode is ${items.tls.value}.`,
    });
  }
  return issues;
}

function redactedSource(text) {
  return String(text || '').split(/\r?\n/).map((line) => {
    const m = line.match(/^(\s*([A-Za-z_][\w.-]*)\s*:\s*)(.*)$/);
    if (!m || !SENSITIVE.test(m[2])) return line;
    return `${m[1]}[configured]`;
  }).join('\n');
}

function highlightYamlLine(line) {
  const escaped = esc(line);
  if (/^\s*#/.test(line)) return `<span class="mg-source-comment">${escaped}</span>`;
  return escaped.replace(/^(\s*[A-Za-z_][\w.-]*)(\s*:)/, '<span class="mg-source-key">$1</span>$2');
}

export async function render(intake) {
  const jsYaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
  const text = intake.text || '';
  let cfg = {};
  try {
    cfg = jsYaml.load(text) || {};
  } catch {
    // fall back to empty
  }

  const host = document.createElement('div');
  ensureKnownUiStyle(document);
  host.className = 'mg-doc';
  const lineMap = buildLineMap(text);
  const items = {
    dbPath: entry(cfg, lineMap, 'storage.dbPath'),
    engine: entry(cfg, lineMap, 'storage.engine'),
    journalEnabled: entry(cfg, lineMap, 'storage.journal.enabled'),
    port: entry(cfg, lineMap, 'net.port'),
    bindIp: entry(cfg, lineMap, 'net.bindIp'),
    tls: entry(cfg, lineMap, 'net.tls.mode') || entry(cfg, lineMap, 'net.ssl.mode'),
    replSetName: entry(cfg, lineMap, 'replication.replSetName'),
    oplogSize: entry(cfg, lineMap, 'replication.oplogSizeMB'),
    authorization: entry(cfg, lineMap, 'security.authorization'),
    keyFile: entry(cfg, lineMap, 'security.keyFile'),
    logDest: entry(cfg, lineMap, 'systemLog.destination'),
    logPath: entry(cfg, lineMap, 'systemLog.path'),
    logAppend: entry(cfg, lineMap, 'systemLog.logAppend'),
  };

  // Storage
  const dbPath = items.dbPath?.value;
  const engine = items.engine?.value;
  const journalEnabled = items.journalEnabled?.value;
  const storageHtml = (dbPath || engine || journalEnabled != null) ? `
<div class="mg-sec"><h3>Storage</h3><div class="mg-card">
${kv('storage.dbPath', 'storage.dbPath', items.dbPath)}
${kv('storage.engine', 'storage.engine', items.engine)}
${journalEnabled != null ? kv('storage.journal.enabled', 'storage.journal.enabled', items.journalEnabled) : ''}
</div></div>` : '';

  // Network
  const port = items.port?.value;
  const bindIp = items.bindIp?.value;
  const tls = items.tls?.value;
  const netHtml = (port || bindIp || tls) ? `
<div class="mg-sec"><h3>Network</h3><div class="mg-card">
${kv('net.port', 'net.port', items.port)}
${kv('net.bindIp', 'net.bindIp', items.bindIp)}
${tls ? kv('net.tls.mode', items.tls.path, items.tls) : ''}
</div></div>` : '';

  // Replication
  const replSetName = items.replSetName?.value;
  const oplogSize = items.oplogSize?.value;
  const replHtml = replSetName ? `
<div class="mg-sec"><h3>Replication</h3><div class="mg-card">
${kv('replication.replSetName', 'replication.replSetName', items.replSetName)}
${kv('replication.oplogSizeMB', 'replication.oplogSizeMB', items.oplogSize)}
</div></div>` : '';

  // Security
  const authorization = items.authorization?.value;
  const keyFile = items.keyFile?.value;
  const secHtml = (authorization || keyFile) ? `
<div class="mg-sec"><h3>Security</h3><div class="mg-card">
${kv('security.authorization', 'security.authorization', items.authorization)}
${keyFile ? kv('security.keyFile', 'security.keyFile', items.keyFile) : ''}
</div></div>` : '';

  // System Log
  const logDest = items.logDest?.value;
  const logPath = items.logPath?.value;
  const logAppend = items.logAppend?.value;
  const logHtml = (logDest || logPath) ? `
<div class="mg-sec"><h3>System Log</h3><div class="mg-card">
${kv('systemLog.destination', 'systemLog.destination', items.logDest)}
${kv('systemLog.path', 'systemLog.path', items.logPath)}
${logAppend != null ? kv('systemLog.logAppend', 'systemLog.logAppend', items.logAppend) : ''}
</div></div>` : '';

  // Summary
  const subParts = [];
  if (port) subParts.push(`port ${port}`);
  if (bindIp) subParts.push(`bind ${bindIp}`);
  if (replSetName) subParts.push(`replSet ${replSetName}`);
  if (authorization) subParts.push(`auth: ${authorization}`);

  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-mg">MongoDB</span>
  <span class="mg-title">Server Configuration</span>
</div>
<div class="mg-sub">${esc(subParts.join(' · '))}</div>
${storageHtml}${netHtml}${replHtml}${secHtml}${logHtml}`;
  const review = issueList(collectIssues(items), { title: 'MongoDB Review' });
  if (review) host.insertBefore(review, host.querySelector('.mg-sec'));
  host.appendChild(sourcePreview(redactedSource(text), { title: 'Redacted source', collapsed: true, idPrefix: 'mg-line', highlighter: highlightYamlLine }));
  wireSourceLinks(host, { idPrefix: 'mg-line' });

  return { parentNode: host };
}
