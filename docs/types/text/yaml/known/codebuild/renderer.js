import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
import { ensureKnownUiStyle, issueList, maskedValue, sourcePreview, wireSourceLinks } from '../../../../../core/known-ui.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const SECRETISH = /password|passwd|pwd|secret|token|api[_-]?key|private[_-]?key|client[_-]?secret|credential|auth|access[_-]?key/i;

const CSS = `
.cod-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-cod{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#232f3e;color:#ff9900;vertical-align:middle;margin-right:8px;}
.cod-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.cod-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.cod-sec{margin:12px 0;}
.cod-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.cod-phase{border:1px solid var(--border,#e0e0e0);border-radius:6px;margin:6px 0;overflow:hidden;}
.cod-phase-hd{padding:6px 10px;background:var(--bg-2,#f6f8fa);font-size:13px;font-weight:600;}
.cod-cmd{font:12px/1.5 ui-monospace,monospace;padding:3px 10px;border-top:1px solid var(--border,#e0e0e0);white-space:pre-wrap;word-break:break-all;}
.cod-pills{display:flex;flex-wrap:wrap;gap:6px;}
.cod-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.cod-pill.warn{background:#fff7ed;border-color:#fed7aa;color:#c2410c;}
.cod-link{border:0;background:transparent;color:inherit;font:inherit;padding:0;text-align:left;cursor:pointer;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px;}
.cod-link:hover{color:var(--accent,#2563eb);}
.cod-mask-reason{font-size:11px;color:var(--fg-2,#888);font-family:system-ui,sans-serif;margin-left:4px;}
.cod-source-key{color:#232f3e;font-weight:700;}
.cod-source-comment{color:#6e7781;font-style:italic;}
`;

const HELP = {
  version: 'CodeBuild buildspec schema version.',
  phases: 'Ordered CodeBuild lifecycle phases.',
  commands: 'Shell commands executed during a phase.',
  runtime: 'Managed runtime versions provisioned for the build image.',
  env: 'Build environment variables. Secret-looking values are redacted.',
  artifacts: 'Files exported from the build.',
  cache: 'Paths restored and saved between builds.',
};

function helpFor(key) {
  return HELP[key] || 'Open this CodeBuild item in source.';
}

function lineButton(label, line, key = label) {
  const title = `${helpFor(key)} Open line ${line || 1} in source.`;
  return `<button class="cod-link" type="button" data-source-line="${line || 1}" title="${esc(title)}">${esc(label)}</button>`;
}

function buildLineMap(text) {
  const entries = new Map();
  const stack = [];
  for (const [idx, rawLine] of String(text || '').split(/\r?\n/).entries()) {
    if (!rawLine.trim() || /^\s*#/.test(rawLine)) continue;
    const m = rawLine.match(/^(\s*)([A-Za-z_.$][\w:.$-]*)\s*:\s*(.*)$/);
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

function lineFor(map, ...paths) {
  for (const path of paths) {
    const hit = map.get(path);
    if (hit) return hit.line;
  }
  return 1;
}

function commandLine(text, command, fallbackLine) {
  const needle = String(command).trim();
  const lines = String(text || '').split(/\r?\n/);
  const idx = lines.findIndex((line) => line.trim() === `- ${needle}`);
  return idx >= 0 ? idx + 1 : fallbackLine;
}

function envEntries(cfg, lineMap) {
  const variables = cfg.env?.variables && typeof cfg.env.variables === 'object' ? cfg.env.variables : {};
  const secrets = cfg.env?.['secrets-manager'] && typeof cfg.env['secrets-manager'] === 'object' ? cfg.env['secrets-manager'] : {};
  const params = cfg.env?.['parameter-store'] && typeof cfg.env['parameter-store'] === 'object' ? cfg.env['parameter-store'] : {};
  return [
    ...Object.entries(variables).map(([key, value]) => ({ key, value, kind: 'variable', line: lineFor(lineMap, `env.variables.${key}`, 'env.variables', 'env') })),
    ...Object.entries(secrets).map(([key, value]) => ({ key, value, kind: 'secrets-manager', line: lineFor(lineMap, `env.secrets-manager.${key}`, 'env.secrets-manager', 'env') })),
    ...Object.entries(params).map(([key, value]) => ({ key, value, kind: 'parameter-store', line: lineFor(lineMap, `env.parameter-store.${key}`, 'env.parameter-store', 'env') })),
  ];
}

function runtimeEntries(phases, lineMap) {
  const runtime = phases.install?.['runtime-versions'] || {};
  return runtime && typeof runtime === 'object'
    ? Object.entries(runtime).map(([name, value]) => ({ name, value, line: lineFor(lineMap, `phases.install.runtime-versions.${name}`, 'phases.install.runtime-versions') }))
    : [];
}

function renderEnvPill(entry) {
  const masked = maskedValue(entry.key, entry.value);
  if (entry.kind !== 'variable' || masked.masked || SECRETISH.test(entry.key)) {
    const reason = entry.kind === 'variable' ? (masked.reason || `masked because "${entry.key}" looks sensitive`) : `masked because "${entry.key}" comes from ${entry.kind}`;
    return `<span class="cod-pill warn" title="${esc(reason)}">${lineButton(entry.key, entry.line, 'env')}=[configured]</span><span class="cod-mask-reason">${esc(reason)}</span>`;
  }
  return `<span class="cod-pill">${lineButton(entry.key, entry.line, 'env')}</span>`;
}

function commandHasDownloadPipe(command) {
  return /(curl|wget)\b[^|;&]*(\||\bbash\b|\bsh\b)/i.test(String(command));
}

function commandDeploys(command) {
  return /\baws\s+(s3|cloudfront|ecr|ecs|lambda|deploy)\b|kubectl\s+apply|helm\s+upgrade|serverless\s+deploy/i.test(String(command));
}

function collectIssues(model) {
  const issues = [];
  for (const runtime of model.runtimes) {
    if (/^\d+$/.test(String(runtime.value))) {
      issues.push({
        severity: 'info',
        label: 'runtime version',
        line: runtime.line,
        message: `${runtime.name} runtime ${runtime.value} is major-only; pin a minor/patch version when build reproducibility matters.`,
      });
    }
  }
  for (const phase of model.phases) {
    for (const cmd of phase.commands) {
      if (commandHasDownloadPipe(cmd.value)) {
        issues.push({
          severity: 'warning',
          label: 'download pipe',
          line: cmd.line,
          message: `${phase.name} pipes downloaded content into a shell.`,
        });
      }
      if (commandDeploys(cmd.value)) {
        issues.push({
          severity: 'info',
          label: 'deploy command',
          line: cmd.line,
          message: `${phase.name} runs "${cmd.value}". Confirm IAM role scope and branch/source controls outside the buildspec.`,
        });
      }
    }
  }
  for (const env of model.env) {
    if (env.kind !== 'variable' || SECRETISH.test(env.key) || maskedValue(env.key, env.value).masked) {
      issues.push({
        severity: env.kind === 'variable' ? 'warning' : 'info',
        label: env.kind === 'variable' ? 'secret env' : env.kind,
        line: env.line,
        message: `${env.key} ${env.kind === 'variable' ? 'looks sensitive' : `is loaded from ${env.kind}`}.`,
      });
    }
  }
  if (!model.artifacts.length) {
    issues.push({
      severity: 'info',
      label: 'artifacts',
      line: model.artifactsLine,
      message: 'No build artifacts are exported from this buildspec.',
    });
  }
  return issues;
}

function redactSource(text) {
  return String(text || '').split(/\r?\n/).map((line) => {
    const m = line.match(/^(\s*)([A-Za-z_.$][\w:.$-]*)\s*:\s*(.*)$/);
    if (m && SECRETISH.test(m[2])) return `${m[1]}${m[2]}: [configured]`;
    return line;
  }).join('\n');
}

function highlightYamlLine(line) {
  const escaped = esc(line);
  if (/^\s*#/.test(line)) return `<span class="cod-source-comment">${escaped}</span>`;
  return escaped.replace(/^(\s*[A-Za-z_.$][\w:.$-]*)(\s*:)/, '<span class="cod-source-key">$1</span>$2');
}

function renderPhase(name, phase, text, lineMap) {
  if (!phase) return '';
  const cmds = Array.isArray(phase.commands) ? phase.commands : [];
  if (!cmds.length) return '';
  const phaseLine = lineFor(lineMap, `phases.${name}`);
  return `<div class="cod-phase">
    <div class="cod-phase-hd">${lineButton(name, phaseLine, 'phases')}</div>
    ${cmds.slice(0, 5).map((c) => `<div class="cod-cmd">${lineButton(String(c), commandLine(text, c, phaseLine), 'commands')}</div>`).join('')}
    ${cmds.length > 5 ? `<div class="cod-cmd" style="color:var(--fg-2,#888)">…and ${cmds.length - 5} more</div>` : ''}
  </div>`;
}

export async function render(intake) {
  const text = intake.text || '';
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(text) || [])[0] || {};
  } catch { cfg = {}; }
  const lineMap = buildLineMap(text);

  const version = cfg.version || '?';
  const phases = cfg.phases || {};
  const artifacts = cfg.artifacts || {};
  const cache = cfg.cache || {};
  const env = envEntries(cfg, lineMap);
  const runtimes = runtimeEntries(phases, lineMap);

  const PHASE_NAMES = ['install', 'pre_build', 'build', 'post_build'];
  const phaseModels = PHASE_NAMES.map((name) => ({
    name,
    commands: (Array.isArray(phases[name]?.commands) ? phases[name].commands : []).map((value) => ({ value: String(value), line: commandLine(text, value, lineFor(lineMap, `phases.${name}`)) })),
  })).filter((phase) => phase.commands.length);
  const phasesHtml = PHASE_NAMES.map((p) => renderPhase(p, phases[p], text, lineMap)).filter(Boolean).join('');

  const artFiles = Array.isArray(artifacts.files) ? artifacts.files : [];
  const artHtml = artFiles.length
    ? `<div class="cod-sec"><h3>${lineButton('Artifacts', lineFor(lineMap, 'artifacts.files', 'artifacts'), 'artifacts')}</h3><div class="cod-pills">${artFiles.slice(0, 5).map((f) => `<span class="cod-pill">${esc(f)}</span>`).join('')}</div></div>`
    : '';

  const cachePaths = Array.isArray(cache.paths) ? cache.paths : [];
  const cacheHtml = cachePaths.length
    ? `<div class="cod-sec"><h3>${lineButton('Cache paths', lineFor(lineMap, 'cache.paths', 'cache'), 'cache')}</h3><div class="cod-pills">${cachePaths.slice(0, 5).map((p) => `<span class="cod-pill">${esc(p)}</span>`).join('')}</div></div>`
    : '';

  const runtimeHtml = runtimes.length
    ? `<div class="cod-sec"><h3>${lineButton('Runtime versions', lineFor(lineMap, 'phases.install.runtime-versions'), 'runtime')}</h3><div class="cod-pills">${runtimes.map((r) => `<span class="cod-pill">${lineButton(`${r.name}: ${r.value}`, r.line, 'runtime')}</span>`).join('')}</div></div>`
    : '';

  const envHtml = env.length
    ? `<div class="cod-sec"><h3>${lineButton(`Environment (${env.length})`, lineFor(lineMap, 'env'), 'env')}</h3><div class="cod-pills">${env.map(renderEnvPill).join('')}</div></div>`
    : '';

  const totalCmds = PHASE_NAMES.reduce((n, p) => n + (Array.isArray(phases[p]?.commands) ? phases[p].commands.length : 0), 0);
  const model = { phases: phaseModels, env, runtimes, artifacts: artFiles, artifactsLine: lineFor(lineMap, 'artifacts.files', 'artifacts') };

  const host = document.createElement('div');
  ensureKnownUiStyle(document);
  host.className = 'cod-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="cod-title"><span class="badge-cod">CodeBuild</span>Buildspec</div>
<div class="cod-sub">version ${esc(version)}${totalCmds ? ` · ${totalCmds} command${totalCmds !== 1 ? 's' : ''}` : ''}</div>
${phasesHtml ? `<div class="cod-sec"><h3>Build phases</h3>${phasesHtml}</div>` : ''}${runtimeHtml}${envHtml}${artHtml}${cacheHtml}`;
  const review = issueList(collectIssues(model), { title: 'CodeBuild Review' });
  if (review) host.insertBefore(review, host.querySelector('.cod-sec'));
  host.appendChild(sourcePreview(redactSource(text), { title: 'Redacted source', collapsed: true, idPrefix: 'cod-line', highlighter: highlightYamlLine }));
  wireSourceLinks(host, { idPrefix: 'cod-line' });
  return { parentNode: host };
}
