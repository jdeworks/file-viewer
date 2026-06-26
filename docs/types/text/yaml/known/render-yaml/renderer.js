import { ensureKnownUiStyle, issueList, maskedValue, sourcePreview, wireSourceLinks } from '../../../../../core/known-ui.js';
import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.renderyaml-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-rdr{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#46E3B7;color:#0f3630;vertical-align:middle;margin-right:8px}
.rdr-title{font-size:18px;font-weight:700;margin:0 0 4px}
.rdr-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.rdr-sec{margin:12px 0}
.rdr-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.rdr-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px}
.rdr-head{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-weight:600;font-size:13px;margin-bottom:6px}
.rdr-type{display:inline-block;padding:1px 7px;border-radius:8px;font-size:11px;font-weight:600;border:1px solid}
.rdr-type-web{background:#eff6ff;border-color:#93c5fd;color:#1d4ed8}
.rdr-type-worker{background:#f5f3ff;border-color:#c4b5fd;color:#5b21b6}
.rdr-type-cron{background:#fff7ed;border-color:#fdba74;color:#9a3412}
.rdr-type-job{background:#f0fdf4;border-color:#86efac;color:#166534}
.rdr-type-other{background:var(--bg,#fff);border-color:var(--border,#e0e0e0);color:var(--fg-2,#888)}
.rdr-kv{display:grid;grid-template-columns:max-content 1fr;gap:4px 14px;align-items:start;font-size:12px}
.rdr-kk{color:var(--fg-2,#888);white-space:nowrap;padding-top:1px}
.rdr-vv{font-family:ui-monospace,monospace;word-break:break-all}
.rdr-cmd{font:11px/1.4 ui-monospace,monospace;word-break:break-all}
.rdr-pill{display:inline-block;font-size:11px;padding:2px 8px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);margin:2px 2px 2px 0}
.rdr-plan{font-size:11px;color:var(--fg-2,#888)}
.rdr-link{border:0;background:transparent;color:inherit;font:inherit;padding:0;text-align:left;cursor:pointer;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px}
.rdr-link:hover{color:var(--accent,#2563eb)}
.rdr-masked{color:var(--fg-2,#888);font-style:italic}
.rdr-src-key{color:#0550ae;font-weight:700}
.rdr-src-string{color:#0a7f38}
`;

const HELP = {
  service: 'Render service definition including type, runtime, build, deploy command, and environment variables.',
  type: 'Render service type. Web services receive HTTP traffic; workers and cron jobs run background work.',
  runtime: 'Runtime environment Render uses to build and run this service.',
  plan: 'Render instance or database plan. Review cost and production capacity separately.',
  build: 'Command Render runs before deploy. Network install commands can affect reproducibility.',
  start: 'Command Render runs to start the deployed process.',
  schedule: 'Cron expression for scheduled Render jobs.',
  env: 'Environment variable declaration. Secret values should be dashboard-managed or references, not plaintext.',
  database: 'Managed Render database definition and service reference target.',
  open: 'Open this Render setting in source.',
};

function typeClass(type) {
  const t = (type || '').toLowerCase();
  if (t === 'web') return 'rdr-type-web';
  if (t === 'worker' || t === 'private_service') return 'rdr-type-worker';
  if (t === 'cron') return 'rdr-type-cron';
  if (t === 'job') return 'rdr-type-job';
  return 'rdr-type-other';
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function lineContaining(text, pattern, fallbackLine = 1, fromLine = 1) {
  const rx = pattern instanceof RegExp ? pattern : new RegExp(escapeRegExp(pattern));
  const lines = String(text || '').split(/\r?\n/);
  const start = Math.max(0, (fromLine || 1) - 1);
  for (let i = start; i < lines.length; i += 1) {
    if (rx.test(lines[i])) return i + 1;
  }
  return fallbackLine;
}

function keyLine(text, key, fallbackLine = 1, fromLine = 1) {
  return lineContaining(text, new RegExp(`^\\s*-?\\s*${escapeRegExp(key)}\\s*:`), fallbackLine, fromLine);
}

function valueLine(text, key, value, fallbackLine = 1, fromLine = 1) {
  if (value == null || value === '') return keyLine(text, key, fallbackLine, fromLine);
  return lineContaining(text, new RegExp(`^\\s*-?\\s*${escapeRegExp(key)}\\s*:\\s*["']?${escapeRegExp(value)}\\b`), keyLine(text, key, fallbackLine, fromLine), fromLine);
}

function helpFor(key) {
  return HELP[key] || HELP.open;
}

function lineButton(label, line, key = 'open') {
  const title = `${helpFor(key)} Open line ${line || 1} in source.`;
  return `<button class="rdr-link" type="button" data-source-line="${line || 1}" title="${esc(title)}">${esc(label)}</button>`;
}

function envEntries(svc) {
  if (Array.isArray(svc.envVars)) return svc.envVars;
  if (svc.envVars && typeof svc.envVars === 'object') {
    return Object.entries(svc.envVars).map(([key, value]) => ({ key, value }));
  }
  return [];
}

function envLine(text, entry, fallbackLine) {
  return valueLine(text, 'key', entry.key, fallbackLine, fallbackLine);
}

function renderEnvValue(entry, line) {
  if (entry.sync === false) {
    return `<span class="rdr-masked" title="Render will keep this value managed outside source.">${lineButton('[dashboard managed]', line, 'env')}</span>`;
  }
  if (entry.fromDatabase) {
    const db = entry.fromDatabase.name || 'database';
    const prop = entry.fromDatabase.property || 'connectionString';
    return `<span class="rdr-vv">${lineButton(`fromDatabase:${db}.${prop}`, line, 'database')}</span>`;
  }
  if (entry.value == null) return `<span class="rdr-masked">${lineButton('[not set]', line, 'env')}</span>`;
  const masked = maskedValue(entry.key, entry.value);
  const title = masked.reason ? ` title="${esc(masked.reason)}"` : '';
  const text = masked.masked ? '[configured]' : masked.text;
  return `<span class="${masked.masked ? 'rdr-masked' : 'rdr-vv'}"${title}>${lineButton(text, line, 'env')}</span>`;
}

function renderEnvVars(entries, text, fallbackLine) {
  if (!entries.length) return '';
  return `<div style="margin-top:8px;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin-bottom:4px">${lineButton(`Env (${entries.length})`, keyLine(text, 'envVars', fallbackLine, fallbackLine), 'env')}</div>${
    entries.map((entry) => {
      const line = envLine(text, entry, fallbackLine);
      return `<div class="rdr-kv"><span class="rdr-kk">${lineButton(entry.key || '(unnamed)', line, 'env')}</span>${renderEnvValue(entry, line)}</div>`;
    }).join('')
  }`;
}

function renderService(svc, idx, text) {
  const name = svc.name || `Service ${idx + 1}`;
  const serviceLine = valueLine(text, 'name', name, keyLine(text, 'services'));
  const type = svc.type || 'unknown';
  const runtime = svc.runtime || svc.env || '';
  const plan = svc.plan || '';
  const entries = envEntries(svc);
  const rows = [
    `<span class="rdr-kk">${lineButton('type', valueLine(text, 'type', type, serviceLine), 'type')}</span><span><span class="rdr-type ${typeClass(type)}">${lineButton(type, valueLine(text, 'type', type, serviceLine), 'type')}</span></span>`,
    runtime ? `<span class="rdr-kk">${lineButton('runtime', valueLine(text, 'runtime', runtime, serviceLine), 'runtime')}</span><span class="rdr-vv">${lineButton(runtime, valueLine(text, 'runtime', runtime, serviceLine), 'runtime')}</span>` : '',
    plan ? `<span class="rdr-kk">${lineButton('plan', valueLine(text, 'plan', plan, serviceLine), 'plan')}</span><span class="rdr-plan">${lineButton(plan, valueLine(text, 'plan', plan, serviceLine), 'plan')}</span>` : '',
    svc.buildCommand ? `<span class="rdr-kk">${lineButton('build cmd', valueLine(text, 'buildCommand', svc.buildCommand, serviceLine), 'build')}</span><span class="rdr-cmd">${lineButton(svc.buildCommand, valueLine(text, 'buildCommand', svc.buildCommand, serviceLine), 'build')}</span>` : '',
    svc.startCommand ? `<span class="rdr-kk">${lineButton('start cmd', valueLine(text, 'startCommand', svc.startCommand, serviceLine), 'start')}</span><span class="rdr-cmd">${lineButton(svc.startCommand, valueLine(text, 'startCommand', svc.startCommand, serviceLine), 'start')}</span>` : '',
    svc.schedule ? `<span class="rdr-kk">${lineButton('schedule', valueLine(text, 'schedule', svc.schedule, serviceLine), 'schedule')}</span><span class="rdr-vv">${lineButton(svc.schedule, valueLine(text, 'schedule', svc.schedule, serviceLine), 'schedule')}</span>` : '',
  ].filter(Boolean).join('');

  return `<div class="rdr-card">
    <div class="rdr-head">${lineButton(name, serviceLine, 'service')}<span class="rdr-type ${typeClass(type)}">${esc(type)}</span></div>
    <div class="rdr-kv">${rows}</div>
    ${renderEnvVars(entries, text, serviceLine)}
  </div>`;
}

function renderDatabases(databases, text) {
  if (!databases.length) return '';
  return `<div class="rdr-sec"><h3>${lineButton(`Databases (${databases.length})`, keyLine(text, 'databases'), 'database')}</h3>
    <div>${databases.map((db) => {
      const label = db.name || 'database';
      const line = valueLine(text, 'name', label, keyLine(text, 'databases'));
      const dbName = db.databaseName ? ` · <span style="font-size:11px;color:var(--fg-2,#888)">${esc(db.databaseName)}</span>` : '';
      const plan = db.plan ? ` · <span style="font-size:11px;color:var(--fg-2,#888)">${esc(db.plan)}</span>` : '';
      return `<span class="rdr-pill"><span style="font-family:ui-monospace,monospace">${lineButton(label, line, 'database')}</span>${dbName}${plan}</span>`;
    }).join('')}</div>
  </div>`;
}

function collectIssues(cfg, text, services, databases) {
  const issues = [];
  const databaseNames = new Set(databases.map((db) => db.name).filter(Boolean));
  for (const svc of services) {
    const name = svc.name || 'service';
    const serviceLine = valueLine(text, 'name', name, keyLine(text, 'services'));
    const type = String(svc.type || '').toLowerCase();
    if ((type === 'web' || type === 'private_service') && !svc.healthCheckPath && !svc.healthcheckPath) {
      issues.push({ severity: 'warning', label: 'healthcheck', line: serviceLine, message: `${name} has no health check path configured.` });
    }
    if ((type === 'web' || type === 'worker' || type === 'cron') && !svc.startCommand) {
      issues.push({ severity: 'warning', label: 'start', line: serviceLine, message: `${name} has no explicit start command.` });
    }
    if (svc.buildCommand && /\bcurl\b|\bwget\b/.test(svc.buildCommand)) {
      issues.push({ severity: 'warning', label: 'network install', line: valueLine(text, 'buildCommand', svc.buildCommand, serviceLine), message: `${name} build command downloads from the network; prefer pinned package manager inputs.` });
    }
    for (const entry of envEntries(svc)) {
      const line = envLine(text, entry, serviceLine);
      if (entry.fromDatabase?.name && !databaseNames.has(entry.fromDatabase.name)) {
        issues.push({ severity: 'warning', label: 'reference', line, message: `${entry.key} references unknown Render database "${entry.fromDatabase.name}".` });
      }
      if (entry.sync === false) {
        issues.push({ severity: 'info', label: 'managed secret', line, message: `${entry.key} is marked sync:false, so the value is expected to be managed outside source.` });
      } else if (entry.value != null && maskedValue(entry.key, entry.value).masked) {
        issues.push({ severity: 'warning', label: 'secret', line, message: `${entry.key} looks sensitive; keep real values dashboard-managed or referenced, not plaintext in render.yaml.` });
      }
    }
  }
  if (!services.length) {
    issues.push({ severity: 'info', label: 'empty', line: 1, message: 'No Render services were found in this config.' });
  }
  return issues;
}

function redactSource(text) {
  const lines = String(text || '').split(/\r?\n/);
  let pendingSecretKey = '';
  return lines.map((line) => {
    const envKey = line.match(/^(\s*-?\s*key\s*:\s*)(["']?)([^"']+)\2\s*$/);
    if (envKey) {
      pendingSecretKey = envKey[3].trim();
      return line;
    }
    const envValue = line.match(/^(\s*value\s*:\s*)(["']?)(.*?)\2\s*$/);
    if (envValue && pendingSecretKey) {
      const masked = maskedValue(pendingSecretKey, envValue[3]);
      const out = masked.masked ? `${envValue[1]}[configured]` : line;
      pendingSecretKey = '';
      return out;
    }
    const direct = line.match(/^(\s*([A-Za-z0-9_-]*(?:password|secret|token|api[_-]?key|private[_-]?key)[A-Za-z0-9_-]*)\s*:\s*)(.*)$/i);
    if (direct) return `${direct[1]}[configured]`;
    if (/^\s*(key|sync|fromDatabase|name|property)\s*:/.test(line)) return line;
    pendingSecretKey = '';
    return line;
  }).join('\n');
}

function highlightYamlLine(line) {
  const raw = esc(line);
  return raw
    .replace(/^(\s*-?\s*)([A-Za-z0-9_-]+)(\s*:)/, `$1<span class="rdr-src-key">$2</span>$3`)
    .replace(/(:\s*)("[^"]*"|'[^']*')/, `$1<span class="rdr-src-string">$2</span>`);
}

export async function render(intake) {
  const text = intake.text || '';
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(text) || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  ensureKnownUiStyle(document);

  const services = Array.isArray(cfg.services) ? cfg.services : [];
  const databases = Array.isArray(cfg.databases) ? cfg.databases : [];
  const subParts = [];
  if (services.length) subParts.push(`${services.length} service${services.length !== 1 ? 's' : ''}`);
  if (databases.length) subParts.push(`${databases.length} database${databases.length !== 1 ? 's' : ''}`);
  const sub = subParts.join(' · ') || 'Render.com config';

  const body = [
    services.length ? `<div class="rdr-sec"><h3>${lineButton(`Services (${services.length})`, keyLine(text, 'services'), 'service')}</h3>${services.map((svc, i) => renderService(svc, i, text)).join('')}</div>` : '',
    renderDatabases(databases, text),
  ].join('');

  const host = document.createElement('div');
  host.className = 'renderyaml-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="rdr-title"><span class="badge-rdr">${lineButton('Render', 1, 'open')}</span>${lineButton('render.yaml', 1, 'open')}</div>
<div class="rdr-sub">${esc(sub)}</div>
${body}`;

  const review = issueList(collectIssues(cfg, text, services, databases), { title: 'Render Review' });
  if (review) host.appendChild(review);
  host.appendChild(sourcePreview(redactSource(text), {
    title: 'Redacted source',
    collapsed: true,
    idPrefix: 'render-line',
    highlighter: highlightYamlLine,
  }));
  wireSourceLinks(host, { idPrefix: 'render-line' });
  return { parentNode: host };
}
