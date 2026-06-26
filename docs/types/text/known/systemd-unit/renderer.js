import { ensureKnownUiStyle, issueList, sourcePreview, wireSourceLinks } from '../../../../core/known-ui.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.sysd-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.sysd-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#5F4B8B;color:#fff;vertical-align:middle;margin-right:8px;}
.sysd-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.sysd-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 16px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.sysd-chip{display:inline-block;padding:1px 8px;border-radius:10px;font-size:11px;font-weight:600;background:var(--bg-2,#f3f0f9);color:#5F4B8B;border:1px solid #c9b8e8;}
.sysd-chip.warn{background:#fff7ed;border-color:#fed7aa;color:#c2410c;}
.sysd-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:12px 16px;margin-bottom:10px;}
.sysd-card-hd{font-family:ui-monospace,monospace;font-size:13px;font-weight:700;color:var(--fg,#24292f);margin:0 0 8px;padding-bottom:6px;border-bottom:1px solid var(--border,#e0e0e0);}
.sysd-table{width:100%;border-collapse:collapse;font-size:13px;}
.sysd-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.sysd-table tr:last-child td{border-bottom:none;}
.sysd-table td:first-child{color:var(--fg-2,#666);width:30%;white-space:nowrap;font-family:ui-monospace,monospace;font-size:12px;}
.sysd-val{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg,#24292f);word-break:break-all;}
.sysd-val-env{font-family:ui-monospace,monospace;font-size:12px;color:#6f42c1;word-break:break-all;}
.sysd-empty{color:var(--fg-2,#888);font-size:12px;font-style:italic;}
.sysd-link{border:0;background:transparent;color:inherit;font:inherit;padding:0;text-align:left;cursor:pointer;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px;}
.sysd-link:hover{color:#5F4B8B;}
.sysd-source-section{color:#5F4B8B;font-weight:700;}
.sysd-source-key{color:#6f42c1;font-weight:700;}
.sysd-source-comment{color:#6e7781;font-style:italic;}
`;

const SECTION_FIELDS = {
  Unit: ['Description', 'Documentation', 'After', 'Requires', 'Wants', 'ConditionPathExists'],
  Service: ['Type', 'ExecStart', 'ExecReload', 'ExecStop', 'User', 'Group', 'WorkingDirectory', 'Restart', 'RestartSec', 'Environment', 'EnvironmentFile', 'NoNewPrivileges', 'PrivateTmp', 'ProtectSystem', 'ProtectHome', 'CapabilityBoundingSet'],
  Timer: ['OnCalendar', 'OnBootSec', 'OnUnitActiveSec', 'Persistent'],
  Socket: ['ListenStream', 'ListenDatagram', 'ListenSequentialPacket', 'Accept', 'SocketUser', 'SocketGroup'],
  Install: ['WantedBy', 'RequiredBy'],
};

const HELP = {
  Unit: 'Unit-level metadata and ordering dependencies.',
  Service: 'Service process, restart, environment, and sandbox settings.',
  Timer: 'Timer schedule settings that activate a paired unit.',
  Socket: 'Socket activation listeners and ownership.',
  Install: 'Targets that enable or require this unit.',
  Description: 'Human-readable unit description.',
  Documentation: 'Documentation URL or man page for operators.',
  After: 'Ordering dependency. This unit starts after the listed units, but does not require them by itself.',
  Requires: 'Strong dependency. If the dependency fails, this unit is stopped too.',
  Wants: 'Weak dependency. systemd starts it if possible but this unit can continue if it fails.',
  ConditionPathExists: 'Start condition based on whether a path exists.',
  ExecStart: 'Main command executed for this service.',
  ExecReload: 'Command used to reload the service without a full restart.',
  Restart: 'Restart policy after exit or failure.',
  RestartSec: 'Delay before attempting restart.',
  User: 'User account used to run the service process.',
  Group: 'Group account used to run the service process.',
  WorkingDirectory: 'Directory used as the service process working directory.',
  Environment: 'Inline environment variables passed to the process.',
  EnvironmentFile: 'External environment file loaded by systemd.',
  NoNewPrivileges: 'Prevents gaining additional privileges through execve.',
  PrivateTmp: 'Gives the service private /tmp and /var/tmp namespaces.',
  ProtectSystem: 'Makes parts of the filesystem read-only or inaccessible.',
  ProtectHome: 'Restricts access to home directories.',
  CapabilityBoundingSet: 'Limits Linux capabilities available to the service.',
};

function parseIni(text) {
  const sections = new Map();
  let current = null;
  for (const [idx, raw] of String(text || '').split(/\r?\n/).entries()) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) continue;
    const secMatch = line.match(/^\[([^\]]+)\]$/);
    if (secMatch) {
      current = secMatch[1];
      if (!sections.has(current)) sections.set(current, { name: current, line: idx + 1, entries: [] });
      continue;
    }
    const kvMatch = line.match(/^([^=]+?)\s*=\s*(.*)$/);
    if (kvMatch && current) {
      sections.get(current).entries.push({
        key: kvMatch[1].trim(),
        value: kvMatch[2].trim(),
        line: idx + 1,
      });
    }
  }
  return sections;
}

function detectUnitType(sections) {
  if (sections.has('Service')) return 'service';
  if (sections.has('Timer')) return 'timer';
  if (sections.has('Socket')) return 'socket';
  if (sections.has('Mount')) return 'mount';
  if (sections.has('Target')) return 'target';
  if (sections.has('Path')) return 'path';
  if (sections.has('Scope')) return 'scope';
  if (sections.has('Slice')) return 'slice';
  return 'unit';
}

function firstEntry(sections, section, key) {
  return (sections.get(section)?.entries || []).find((entry) => entry.key === key) || null;
}

function entriesFor(sections, section, key) {
  return (sections.get(section)?.entries || []).filter((entry) => entry.key === key);
}

function helpFor(key, section = '') {
  return HELP[key] || HELP[section] || 'Open this systemd directive in source.';
}

function lineButton(label, line, key = label, section = '') {
  const title = `${helpFor(key, section)} Open line ${line || 1} in source.`;
  return `<button class="sysd-link" type="button" data-source-line="${line || 1}" title="${esc(title)}">${esc(label)}</button>`;
}

function renderSection(section) {
  const allowedFields = SECTION_FIELDS[section.name];
  const rows = (allowedFields
    ? section.entries.filter((entry) => allowedFields.includes(entry.key))
    : section.entries
  );
  if (!rows.length) return '';

  const trs = rows.map((entry) => {
    const isEnvKey = entry.key === 'Environment' || entry.key === 'EnvironmentFile';
    const valClass = isEnvKey ? 'sysd-val-env' : 'sysd-val';
    return `<tr><td>${lineButton(entry.key, entry.line, entry.key, section.name)}</td><td><span class="${valClass}">${lineButton(entry.value || '[empty]', entry.line, entry.key, section.name)}</span></td></tr>`;
  }).join('');

  return `<div class="sysd-card">
<div class="sysd-card-hd">${lineButton(`[${section.name}]`, section.line, section.name)}</div>
<table class="sysd-table"><tbody>${trs}</tbody></table>
</div>`;
}

function collectIssues(sections, unitType) {
  const issues = [];
  const service = sections.get('Service');
  const unit = sections.get('Unit');
  const after = firstEntry(sections, 'Unit', 'After');
  const wants = firstEntry(sections, 'Unit', 'Wants');
  const requires = firstEntry(sections, 'Unit', 'Requires');
  const condition = firstEntry(sections, 'Unit', 'ConditionPathExists');
  const restart = firstEntry(sections, 'Service', 'Restart');
  const envFile = firstEntry(sections, 'Service', 'EnvironmentFile');
  const user = firstEntry(sections, 'Service', 'User');
  const execStart = firstEntry(sections, 'Service', 'ExecStart');

  if (after || wants || requires) {
    issues.push({
      severity: 'info',
      label: 'ordering',
      line: after?.line || wants?.line || requires?.line || unit?.line,
      message: 'Ordering/dependency directives are configured; remember After only orders startup and does not require the dependency.',
    });
  }
  if (condition) {
    issues.push({ severity: 'info', label: 'condition', line: condition.line, message: `${condition.value} gates whether the unit starts.` });
  }
  if (restart) {
    issues.push({ severity: 'info', label: 'restart', line: restart.line, message: `Restart=${restart.value} controls automatic restart behavior after process exit.` });
  }
  if (envFile) {
    issues.push({ severity: 'info', label: 'env file', line: envFile.line, message: `${envFile.value} is loaded at service start; check permissions if it contains secrets.` });
  }
  if (execStart && /(?:^|\s)(bash|sh)\s+-c\b/.test(execStart.value)) {
    issues.push({ severity: 'warning', label: 'shell exec', line: execStart.line, message: 'ExecStart runs through a shell; quote and environment expansion are easier to get wrong.' });
  }
  if (service && unitType === 'service') {
    const hardening = ['NoNewPrivileges', 'PrivateTmp', 'ProtectSystem', 'ProtectHome', 'CapabilityBoundingSet'];
    const configured = new Set(service.entries.map((entry) => entry.key));
    const missing = hardening.filter((key) => !configured.has(key));
    if (missing.length) {
      issues.push({ severity: 'warning', label: 'hardening', line: service.line, message: `No explicit service hardening for ${missing.slice(0, 4).join(', ')}${missing.length > 4 ? ', ...' : ''}.` });
    }
    if (!user || /^(root)?$/i.test(user.value)) {
      issues.push({ severity: 'warning', label: 'service user', line: user?.line || service.line, message: 'Service has no non-root User= directive.' });
    }
  }
  for (const entry of entriesFor(sections, 'Service', 'Environment')) {
    if (/password|secret|token|key|credential/i.test(entry.value)) {
      issues.push({ severity: 'warning', label: 'inline env', line: entry.line, message: 'Inline Environment= may contain sensitive material; prefer EnvironmentFile with restricted permissions or a secret manager.' });
    }
  }
  return issues;
}

function highlightIniLine(line) {
  const raw = esc(line);
  return raw.replace(/^(\s*\[[^\]]+\])/, '<span class="sysd-source-section">$1</span>')
    .replace(/^(\s*)([A-Za-z][\w-]*)(\s*=)/, `$1<span class="sysd-source-key">$2</span>$3`)
    .replace(/([#;].*)$/, '<span class="sysd-source-comment">$1</span>');
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const sections = parseIni(text);
  const unitType = detectUnitType(sections);

  ensureKnownUiStyle(document);
  const description = firstEntry(sections, 'Unit', 'Description');
  const descText = description ? description.value : '';
  const service = sections.get('Service');
  const hardeningKeys = ['NoNewPrivileges', 'PrivateTmp', 'ProtectSystem', 'ProtectHome', 'CapabilityBoundingSet'];
  const hardeningCount = service ? service.entries.filter((entry) => hardeningKeys.includes(entry.key)).length : 0;

  const sectionOrder = ['Unit', 'Service', 'Timer', 'Socket', 'Mount', 'Target', 'Path', 'Scope', 'Slice', 'Install'];
  const cardsHtml = sectionOrder
    .filter((name) => sections.has(name))
    .map((name) => renderSection(sections.get(name)))
    .filter(Boolean)
    .join('');

  const host = document.createElement('div');
  host.className = 'sysd-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="sysd-title"><span class="sysd-badge">systemd</span>${lineButton(descText || 'systemd Unit', description?.line || 1, 'Description', 'Unit')}</div>
<div class="sysd-sub">
  <span class="sysd-chip">${esc(unitType)}</span>
  <span>${sections.size} section${sections.size !== 1 ? 's' : ''}</span>
  ${unitType === 'service' ? `<span class="sysd-chip ${hardeningCount ? '' : 'warn'}">${hardeningCount} hardening directive${hardeningCount === 1 ? '' : 's'}</span>` : ''}
</div>
${cardsHtml || '<p class="sysd-empty">No recognized sections found.</p>'}`;

  const review = issueList(collectIssues(sections, unitType), { title: 'systemd Review' });
  if (review) host.insertBefore(review, host.querySelector('.sysd-card') || null);
  host.appendChild(sourcePreview(text, {
    title: 'Source',
    collapsed: true,
    idPrefix: 'sysd-line',
    highlighter: highlightIniLine,
  }));
  wireSourceLinks(host, { idPrefix: 'sysd-line' });
  return { parentNode: host };
}
