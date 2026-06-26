import { ensureKnownUiStyle, issueList, maskedValue, sourcePreview, wireSourceLinks } from '../../../../../core/known-ui.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.railwayjson-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-railwayjson{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#7c3aed;color:#fff;vertical-align:middle;margin-right:8px}
.rwj2-title{font-size:18px;font-weight:700;margin:0 0 4px}
.rwj2-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.rwj2-sec{margin:12px 0}
.rwj2-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.rwj2-schema{font:11px/1.4 ui-monospace,monospace;color:var(--fg-2,#888);margin-bottom:10px;word-break:break-all}
.rwj2-table{width:100%;border-collapse:collapse;font-size:13px}
.rwj2-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0)}
.rwj2-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;font-size:12px}
.rwj2-name{font-family:ui-monospace,monospace;font-weight:600}
.rwj2-source{display:inline-block;padding:1px 7px;border-radius:8px;font-size:11px;font-weight:600;background:#f5f3ff;border:1px solid #c4b5fd;color:#5b21b6}
.rwj2-kv{display:grid;grid-template-columns:max-content 1fr;gap:4px 14px;align-items:start;font-size:12px}
.rwj2-kk{color:var(--fg-2,#888);white-space:nowrap;padding-top:1px}
.rwj2-vv{font-family:ui-monospace,monospace;word-break:break-all}
.rwj2-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px}
.rwj2-masked{color:var(--fg-2,#888);font-style:italic}
.rwj2-pill{display:inline-block;font-size:11px;padding:2px 8px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);margin:2px 2px 2px 0;font-family:ui-monospace,monospace}
.rwj2-link{border:0;background:transparent;color:inherit;font:inherit;padding:0;text-align:left;cursor:pointer;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px}
.rwj2-link:hover{color:var(--accent,#2563eb)}
.rwj2-json-key{color:#0550ae;font-weight:700}
.rwj2-json-string{color:#0a7f38}
`;

const HELP = {
  schema: 'Railway schema URL for editor validation and config-as-code support.',
  service: 'Railway service definition including source, build, deploy, variables, and mounts.',
  source: 'Repository or container image Railway deploys from.',
  build: 'Build system and build command used before deployment.',
  deploy: 'Runtime deploy behavior such as start command, restart policy, healthcheck, and replicas.',
  variables: 'Service environment variables. Secret-like values should live in Railway variables, not source.',
  mounts: 'Persistent volume mounts attached to the service.',
  networks: 'Railway private network names used by services.',
  open: 'Open this Railway setting in source.',
};

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function lineContaining(text, pattern, fallbackLine = 1) {
  const rx = pattern instanceof RegExp ? pattern : new RegExp(escapeRegExp(pattern));
  const lines = String(text || '').split(/\r?\n/);
  const idx = lines.findIndex((line) => rx.test(line));
  return idx >= 0 ? idx + 1 : fallbackLine;
}

function keyLine(text, key, fallbackLine = 1) {
  return lineContaining(text, new RegExp(`"${escapeRegExp(key)}"\\s*:`), fallbackLine);
}

function valueLine(text, key, value, fallbackLine = 1) {
  if (value == null || value === '') return keyLine(text, key, fallbackLine);
  return lineContaining(text, new RegExp(`"${escapeRegExp(key)}"\\s*:\\s*"?${escapeRegExp(value)}\\b`), keyLine(text, key, fallbackLine));
}

function helpFor(key) {
  return HELP[key] || HELP.open;
}

function lineButton(label, line, key = 'open') {
  const title = `${helpFor(key)} Open line ${line || 1} in source.`;
  return `<button class="rwj2-link" type="button" data-source-line="${line || 1}" title="${esc(title)}">${esc(label)}</button>`;
}

function sourceSummary(svc) {
  if (svc.source?.image) return { label: `docker:${svc.source.image}`, key: 'image', value: svc.source.image };
  if (svc.source?.repo) return { label: `repo:${svc.source.repo}`, key: 'repo', value: svc.source.repo };
  return { label: svc.build?.builder || 'nixpacks', key: 'builder', value: svc.build?.builder || 'nixpacks' };
}

function serviceVars(svc) {
  const envVars = svc.variables || svc.envVars || null;
  if (!envVars || typeof envVars !== 'object') return [];
  return Array.isArray(envVars)
    ? envVars.map((e) => [e.name || e.key || '', e.value ?? ''])
    : Object.entries(envVars);
}

function maskEnv(key, val, line) {
  const masked = maskedValue(key, val);
  const title = masked.reason ? ` title="${esc(masked.reason)}"` : '';
  const text = masked.masked ? '[configured]' : masked.text;
  return `<span class="${masked.masked ? 'rwj2-masked' : 'rwj2-vv'}"${title}>${lineButton(text, line, 'variables')}</span>`;
}

function renderEnvVars(entries, text, fallbackLine) {
  if (!entries.length) return '';
  return entries.map(([key, value]) => {
    const line = valueLine(text, key, value, fallbackLine);
    return `<div class="rwj2-kv"><span class="rwj2-kk">${lineButton(key, line, 'variables')}</span>${maskEnv(key, value, line)}</div>`;
  }).join('');
}

function renderService(svc, idx, text) {
  const name = svc.name || `Service ${idx + 1}`;
  const serviceLine = valueLine(text, 'name', name, keyLine(text, 'services'));
  const source = sourceSummary(svc);
  const sourceLine = valueLine(text, source.key, source.value, serviceLine);
  const deploy = svc.deploy || {};
  const build = svc.build || {};
  const vars = serviceVars(svc);
  const volumes = Array.isArray(svc.mounts) ? svc.mounts : [];

  const rows = [
    `<span class="rwj2-kk">${lineButton('source', sourceLine, 'source')}</span><span><span class="rwj2-source">${lineButton(source.label, sourceLine, 'source')}</span></span>`,
    build.builder ? `<span class="rwj2-kk">${lineButton('builder', valueLine(text, 'builder', build.builder, serviceLine), 'build')}</span><span class="rwj2-vv">${lineButton(build.builder, valueLine(text, 'builder', build.builder, serviceLine), 'build')}</span>` : '',
    build.buildCommand ? `<span class="rwj2-kk">${lineButton('build cmd', valueLine(text, 'buildCommand', build.buildCommand, serviceLine), 'build')}</span><span class="rwj2-vv">${lineButton(build.buildCommand, valueLine(text, 'buildCommand', build.buildCommand, serviceLine), 'build')}</span>` : '',
    deploy.startCommand ? `<span class="rwj2-kk">${lineButton('start cmd', valueLine(text, 'startCommand', deploy.startCommand, serviceLine), 'deploy')}</span><span class="rwj2-vv">${lineButton(deploy.startCommand, valueLine(text, 'startCommand', deploy.startCommand, serviceLine), 'deploy')}</span>` : '',
    deploy.restartPolicyType ? `<span class="rwj2-kk">${lineButton('restart policy', valueLine(text, 'restartPolicyType', deploy.restartPolicyType, serviceLine), 'deploy')}</span><span class="rwj2-vv">${lineButton(deploy.restartPolicyType, valueLine(text, 'restartPolicyType', deploy.restartPolicyType, serviceLine), 'deploy')}</span>` : '',
    deploy.healthcheckPath ? `<span class="rwj2-kk">${lineButton('healthcheck', valueLine(text, 'healthcheckPath', deploy.healthcheckPath, serviceLine), 'deploy')}</span><span class="rwj2-vv">${lineButton(deploy.healthcheckPath, valueLine(text, 'healthcheckPath', deploy.healthcheckPath, serviceLine), 'deploy')}</span>` : '',
    deploy.numReplicas != null ? `<span class="rwj2-kk">${lineButton('replicas', valueLine(text, 'numReplicas', deploy.numReplicas, serviceLine), 'deploy')}</span><span class="rwj2-vv">${lineButton(deploy.numReplicas, valueLine(text, 'numReplicas', deploy.numReplicas, serviceLine), 'deploy')}</span>` : '',
  ].filter(Boolean).join('');

  let inner = `<div class="rwj2-kv">${rows}</div>`;
  if (vars.length) {
    inner += `<div style="margin-top:8px;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin-bottom:4px">${lineButton(`Env (${vars.length})`, keyLine(text, 'variables', serviceLine), 'variables')}</div>`;
    inner += renderEnvVars(vars, text, keyLine(text, 'variables', serviceLine));
  }
  if (volumes.length) {
    inner += `<div style="margin-top:8px"><span style="font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888)">${lineButton('Volumes', keyLine(text, 'mounts', serviceLine), 'mounts')}</span><div style="margin-top:4px">${
      volumes.map((mount) => {
        const label = mount.mountPath || mount;
        return `<span class="rwj2-pill">${lineButton(label, valueLine(text, 'mountPath', label, serviceLine), 'mounts')}</span>`;
      }).join('')
    }</div></div>`;
  }

  return `<div class="rwj2-card"><div style="font-weight:600;font-size:13px;margin-bottom:6px">${lineButton(name, serviceLine, 'service')}</div>${inner}</div>`;
}

function collectServices(cfg) {
  return Array.isArray(cfg.services) ? cfg.services : null;
}

function collectIssues(cfg, text, services) {
  const issues = [];
  if (!cfg.$schema) {
    issues.push({ severity: 'info', label: 'schema', line: 1, message: 'No Railway schema URL is declared; editor validation may be weaker.' });
  }
  const list = services || [{ name: 'service', build: cfg.build || {}, deploy: cfg.deploy || {}, variables: cfg.variables || cfg.envVars }];
  for (const svc of list) {
    const name = svc.name || 'service';
    const serviceLine = valueLine(text, 'name', name, keyLine(text, 'services'));
    const deploy = svc.deploy || {};
    if (!deploy.startCommand && !(svc.source?.image)) {
      issues.push({ severity: 'warning', label: 'start', line: serviceLine, message: `${name} has no explicit start command.` });
    }
    if (!deploy.healthcheckPath) {
      issues.push({ severity: 'warning', label: 'healthcheck', line: serviceLine, message: `${name} has no healthcheck path configured.` });
    }
    if (deploy.restartPolicyType === 'ALWAYS' && !deploy.healthcheckPath) {
      issues.push({ severity: 'warning', label: 'restart', line: valueLine(text, 'restartPolicyType', deploy.restartPolicyType, serviceLine), message: `${name} restarts always without a healthcheck signal.` });
    }
    if ((deploy.restartPolicyMaxRetries || 0) >= 10) {
      issues.push({ severity: 'info', label: 'retries', line: valueLine(text, 'restartPolicyMaxRetries', deploy.restartPolicyMaxRetries, serviceLine), message: `${name} allows ${deploy.restartPolicyMaxRetries} restart retries.` });
    }
    if (Array.isArray(svc.mounts) && svc.mounts.length) {
      issues.push({ severity: 'info', label: 'volume', line: keyLine(text, 'mounts', serviceLine), message: `${name} has persistent mounts; confirm backup and lifecycle expectations.` });
    }
    for (const [key, value] of serviceVars(svc)) {
      const masked = maskedValue(key, value);
      if (masked.masked) {
        issues.push({ severity: 'warning', label: 'secret', line: valueLine(text, key, value, serviceLine), message: `${key} looks sensitive; keep real values in Railway variables rather than config source.` });
      } else if (/\$\{\{[^}]+}}/.test(String(value))) {
        issues.push({ severity: 'info', label: 'reference', line: valueLine(text, key, value, serviceLine), message: `${key} references another Railway service variable.` });
      }
    }
  }
  return issues;
}

function redactSource(text) {
  return String(text || '').split(/\r?\n/).map((line) => {
    const m = line.match(/^(\s*)"([^"]+)"(\s*:\s*)"([^"]*)"(.*)$/);
    if (!m) return line;
    const masked = maskedValue(m[2], m[4]);
    return masked.masked ? `${m[1]}"${m[2]}"${m[3]}"[configured]"${m[5]}` : line;
  }).join('\n');
}

function highlightJsonLine(line) {
  const raw = esc(line);
  return raw
    .replace(/^(\s*)"([^"]+)"(\s*:)/, `$1<span class="rwj2-json-key">"$2"</span>$3`)
    .replace(/(:\s*)"([^"]*)"/, `$1<span class="rwj2-json-string">"$2"</span>`);
}

export function render(intake) {
  const text = intake.text || '';
  const cfg = intake.parsed ?? (() => { try { return JSON.parse(text || '{}'); } catch { return {}; } })();
  ensureKnownUiStyle(document);

  const services = collectServices(cfg);
  const networks = Array.isArray(cfg.networks) ? cfg.networks : (cfg.networks ? Object.keys(cfg.networks) : []);
  const schema = cfg.$schema || '';

  const subParts = [];
  if (services) {
    subParts.push(`${services.length} service${services.length !== 1 ? 's' : ''}`);
  } else {
    const builder = (cfg.build || {}).builder;
    if (builder) subParts.push(builder);
    if ((cfg.deploy || {}).cronSchedule) subParts.push('cron');
    const replicas = (cfg.deploy || {}).numReplicas;
    if (replicas != null) subParts.push(`${replicas} replica${replicas !== 1 ? 's' : ''}`);
  }
  const sub = subParts.join(' · ') || 'Railway deployment';

  let body = '';
  if (schema) {
    body += `<div class="rwj2-schema">${lineButton(schema, valueLine(text, '$schema', schema), 'schema')}</div>`;
  }

  if (services) {
    body += `<div class="rwj2-sec"><h3>${lineButton(`Services (${services.length})`, keyLine(text, 'services'), 'service')}</h3>${services.map((svc, i) => renderService(svc, i, text)).join('')}</div>`;
  } else {
    const fakeService = { name: 'deployment', build: cfg.build || {}, deploy: cfg.deploy || {}, variables: cfg.variables || cfg.envVars };
    body += `<div class="rwj2-sec"><h3>${lineButton('Deployment', keyLine(text, 'deploy', keyLine(text, 'build')), 'deploy')}</h3>${renderService(fakeService, 0, text)}</div>`;
  }

  if (networks.length) {
    body += `<div class="rwj2-sec"><h3>${lineButton('Networks', keyLine(text, 'networks'), 'networks')}</h3><div>${networks.map((network) => {
      const label = typeof network === 'string' ? network : network.name || JSON.stringify(network);
      return `<span class="rwj2-pill">${lineButton(label, lineContaining(text, `"${escapeRegExp(label)}"`, keyLine(text, 'networks')), 'networks')}</span>`;
    }).join('')}</div></div>`;
  }

  const host = document.createElement('div');
  host.className = 'railwayjson-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="rwj2-title"><span class="badge-railwayjson">${lineButton('Railway', 1, 'open')}</span>${lineButton('railway.json', 1, 'open')}</div>
<div class="rwj2-sub">${esc(sub)}</div>
${body}`;

  const review = issueList(collectIssues(cfg, text, services), { title: 'Railway Review' });
  if (review) host.appendChild(review);
  host.appendChild(sourcePreview(redactSource(text), {
    title: 'Redacted source',
    collapsed: true,
    idPrefix: 'railway-line',
    highlighter: highlightJsonLine,
  }));
  wireSourceLinks(host, { idPrefix: 'railway-line' });
  return { parentNode: host };
}
