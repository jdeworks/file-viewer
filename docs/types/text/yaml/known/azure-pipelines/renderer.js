import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
import { ensureKnownUiStyle, issueList, maskedValue, sourcePreview, wireSourceLinks } from '../../../../../core/known-ui.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const SECRETISH = /password|passwd|pwd|secret|token|api[_-]?key|private[_-]?key|client[_-]?secret|credential|auth|access[_-]?key/i;

const CSS = `
.azp-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-azp{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0078d4;color:#fff;vertical-align:middle;margin-right:8px;}
.azp-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.azp-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.azp-sec{margin:12px 0;}
.azp-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.azp-pills{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0;}
.azp-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.azp-pill.trigger{background:#eff6ff;border-color:#93c5fd;color:#1d4ed8;}
.azp-pill.warn{background:#fff7ed;border-color:#fed7aa;color:#c2410c;}
.azp-stage{padding:6px 10px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);margin:4px 0;font-size:13px;}
.azp-stage-name{font-weight:600;}
.azp-kv{font-size:12px;color:var(--fg-2,#888);margin-left:8px;}
.azp-var-table{width:100%;border-collapse:collapse;font-size:13px;}
.azp-var-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.azp-var-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);}
.azp-mono{font:12px/1.4 ui-monospace,monospace;}
.azp-link{border:0;background:transparent;color:inherit;font:inherit;padding:0;text-align:left;cursor:pointer;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px;}
.azp-link:hover{color:var(--accent,#2563eb);}
.azp-mask-reason{font-size:11px;color:var(--fg-2,#888);font-family:system-ui,sans-serif;margin-left:4px;}
.azp-source-key{color:#0078d4;font-weight:700;}
.azp-source-comment{color:#6e7781;font-style:italic;}
`;

const HELP = {
  trigger: 'Branch/path trigger for normal pipeline runs.',
  pr: 'Pull request trigger branches.',
  pool: 'Agent pool or hosted VM image used by jobs.',
  stages: 'Pipeline stages. dependsOn creates stage ordering.',
  jobs: 'Jobs inside a stage or top-level pipeline.',
  steps: 'Tasks and scripts executed by a job.',
  variables: 'Pipeline variables. Secret-looking values are redacted.',
  matrix: 'Strategy matrix variations for a job.',
};

function normalizeBranches(trigger) {
  if (!trigger) return [];
  if (trigger === 'none') return [];
  if (Array.isArray(trigger)) return trigger;
  if (typeof trigger === 'object') {
    const inc = trigger.branches?.include || trigger.include || [];
    return Array.isArray(inc) ? inc : [inc];
  }
  return [String(trigger)];
}

function helpFor(key) {
  return HELP[key] || 'Open this Azure Pipelines item in source.';
}

function lineButton(label, line, key = label) {
  const title = `${helpFor(key)} Open line ${line || 1} in source.`;
  return `<button class="azp-link" type="button" data-source-line="${line || 1}" title="${esc(title)}">${esc(label)}</button>`;
}

function buildLineMap(text) {
  const entries = new Map();
  const stack = [];
  for (const [idx, rawLine] of String(text || '').split(/\r?\n/).entries()) {
    if (!rawLine.trim() || /^\s*#/.test(rawLine)) continue;
    const m = rawLine.match(/^(\s*)(?:-\s*)?([A-Za-z_.$][\w:.$-]*)\s*:\s*(.*)$/);
    if (!m) continue;
    const indent = m[1].replace(/\t/g, '  ').length + (rawLine.trimStart().startsWith('- ') ? 2 : 0);
    const key = m[2];
    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    const path = [...stack.map((item) => item.key), key].join('.');
    if (!entries.has(path)) entries.set(path, { line: idx + 1, raw: m[3] });
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

function lineContaining(text, pattern, fallbackLine) {
  const rx = pattern instanceof RegExp ? pattern : new RegExp(String(pattern).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const lines = String(text || '').split(/\r?\n/);
  const idx = lines.findIndex((line) => rx.test(line));
  return idx >= 0 ? idx + 1 : fallbackLine;
}

function normalizeVariables(vars, lineMap, text) {
  if (!vars) return [];
  if (Array.isArray(vars)) {
    return vars.filter((v) => v?.name).map((v) => ({
      key: v.name,
      val: v.value ?? '',
      line: lineContaining(text, new RegExp(`name:\\s*${escapeRegExp(v.name)}\\b`), lineFor(lineMap, 'variables')),
    }));
  }
  return Object.entries(vars).map(([k, v]) => ({ key: k, val: String(v), line: lineFor(lineMap, `variables.${k}`, 'variables') }));
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stageModels(stages, lineMap, text) {
  return stages.map((stage) => {
    const name = stage.stage || stage.displayName || '?';
    const line = lineContaining(text, new RegExp(`stage:\\s*${escapeRegExp(stage.stage || name)}\\b`), lineFor(lineMap, 'stages'));
    return {
      name,
      line,
      dependsOn: [].concat(stage.dependsOn || []).filter(Boolean).map(String),
      jobs: Array.isArray(stage.jobs) ? stage.jobs : [],
    };
  });
}

function jobModels(jobs, lineMap, text) {
  return jobs.map((job) => {
    const name = job.job || job.displayName || '?';
    const line = lineContaining(text, new RegExp(`job:\\s*${escapeRegExp(job.job || name)}\\b`), lineFor(lineMap, 'jobs'));
    return {
      name,
      line,
      dependsOn: [].concat(job.dependsOn || []).filter(Boolean).map(String),
      steps: Array.isArray(job.steps) ? job.steps : [],
    };
  });
}

function stepCommand(step) {
  if (!step || typeof step !== 'object') return '';
  return String(step.script || step.bash || step.pwsh || step.powershell || step.command || step.task || '');
}

function stepHasDownloadPipe(step) {
  return /(curl|wget)\b[^|;&]*(\||\bbash\b|\bsh\b)/i.test(stepCommand(step));
}

function stepDeploys(step) {
  return /AzureCLI|Kubernetes|HelmDeploy|kubectl|az\s+(webapp|functionapp|deployment|acr|aks)|PublishBuildArtifacts/i.test(stepCommand(step));
}

function imageMutable(image) {
  if (!image) return false;
  if (/@sha256:/i.test(image)) return false;
  return /latest/i.test(image) || /ubuntu-latest|windows-latest|macOS-latest/i.test(image);
}

function collectIssues(model) {
  const issues = [];
  if (imageMutable(model.vmImage)) {
    issues.push({
      severity: 'info',
      label: 'hosted image',
      line: model.poolLine,
      message: `${model.vmImage} tracks a moving hosted image; pin a versioned image if exact reproducibility matters.`,
    });
  }
  for (const variable of model.variables) {
    if (SECRETISH.test(variable.key) || maskedValue(variable.key, variable.val).masked) {
      issues.push({
        severity: 'warning',
        label: 'secret variable',
        line: variable.line,
        message: `${variable.key} looks sensitive; use secret pipeline variables or variable groups.`,
      });
    }
  }
  for (const stage of model.stages) {
    if (stage.dependsOn.length) {
      issues.push({
        severity: 'info',
        label: 'stage dependency',
        line: stage.line,
        message: `${stage.name} depends on ${stage.dependsOn.join(', ')}.`,
      });
    }
    for (const job of stage.jobs) {
      for (const step of job.steps || []) {
        if (stepHasDownloadPipe(step)) {
          issues.push({ severity: 'warning', label: 'download pipe', line: stage.line, message: `${stage.name}/${job.job || job.displayName || 'job'} pipes downloaded content into a shell.` });
        }
        if (stepDeploys(step)) {
          issues.push({ severity: 'info', label: 'deploy step', line: stage.line, message: `${stage.name}/${job.job || job.displayName || 'job'} contains publish/deploy-like task "${stepCommand(step)}".` });
        }
      }
    }
  }
  for (const job of model.jobs) {
    if (job.dependsOn.length) {
      issues.push({ severity: 'info', label: 'job dependency', line: job.line, message: `${job.name} depends on ${job.dependsOn.join(', ')}.` });
    }
  }
  return issues;
}

function renderVariableValue(variable) {
  const masked = maskedValue(variable.key, variable.val);
  if (masked.masked || SECRETISH.test(variable.key)) {
    const reason = masked.reason || `masked because "${variable.key}" looks sensitive`;
    return `<span class="azp-pill warn" title="${esc(reason)}">[configured]</span><span class="azp-mask-reason">${esc(reason)}</span>`;
  }
  return `<span class="azp-mono">${esc(variable.val) || '—'}</span>`;
}

function redactSource(text) {
  return String(text || '').split(/\r?\n/).map((line) => {
    const m = line.match(/^(\s*)(?:-\s*)?([A-Za-z_.$][\w:.$-]*)\s*:\s*(.*)$/);
    if (m && SECRETISH.test(m[2])) return `${m[1]}${line.trimStart().startsWith('- ') ? '- ' : ''}${m[2]}: [configured]`;
    return line;
  }).join('\n');
}

function highlightYamlLine(line) {
  const escaped = esc(line);
  if (/^\s*#/.test(line)) return `<span class="azp-source-comment">${escaped}</span>`;
  return escaped.replace(/^(\s*(?:-\s*)?[A-Za-z_.$][\w:.$-]*)(\s*:)/, '<span class="azp-source-key">$1</span>$2');
}

export async function render(intake) {
  const text = intake.text || '';
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(text) || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }
  const lineMap = buildLineMap(text);

  const trigger = normalizeBranches(cfg.trigger);
  const prTrigger = normalizeBranches(cfg.pr);
  const pool = cfg.pool || {};
  const vmImage = typeof pool === 'string' ? pool : (pool.vmImage || pool.name || '');
  const poolLine = lineFor(lineMap, 'pool.vmImage', 'pool');

  const stages = Array.isArray(cfg.stages) ? cfg.stages : [];
  const jobs = Array.isArray(cfg.jobs) ? cfg.jobs : [];
  const steps = Array.isArray(cfg.steps) ? cfg.steps : [];

  const variables = normalizeVariables(cfg.variables, lineMap, text);
  const modeledStages = stageModels(stages, lineMap, text);
  const modeledJobs = jobModels(jobs, lineMap, text);

  const strategyMatrix = cfg.strategy?.matrix;

  const host = document.createElement('div');
  ensureKnownUiStyle(document);
  host.className = 'azp-doc';

  const triggerHtml = trigger.length
    ? `<div class="azp-sec"><h3>${lineButton('Trigger branches', lineFor(lineMap, 'trigger.branches.include', 'trigger'), 'trigger')}</h3><div class="azp-pills">${trigger.map((b) => `<span class="azp-pill trigger">${esc(b)}</span>`).join('')}</div></div>`
    : '';

  const prHtml = prTrigger.length
    ? `<div class="azp-sec"><h3>${lineButton('PR trigger', lineFor(lineMap, 'pr.branches.include', 'pr'), 'pr')}</h3><div class="azp-pills">${prTrigger.map((b) => `<span class="azp-pill trigger">${esc(b)}</span>`).join('')}</div></div>`
    : '';

  const poolHtml = vmImage
    ? `<div class="azp-sec"><h3>${lineButton('Pool', poolLine, 'pool')}</h3><div class="azp-pills"><span class="azp-pill">${lineButton(vmImage, poolLine, 'pool')}</span></div></div>`
    : '';

  const stagesHtml = stages.length
    ? `<div class="azp-sec"><h3>Stages (${stages.length})</h3>${modeledStages.map((s) => {
        const name = s.name || '?';
        const jobCount = Array.isArray(s.jobs) ? s.jobs.length : 0;
        return `<div class="azp-stage"><span class="azp-stage-name">${lineButton(name, s.line, 'stages')}</span>${jobCount ? `<span class="azp-kv">${jobCount} job${jobCount !== 1 ? 's' : ''}</span>` : ''}${s.dependsOn.length ? `<span class="azp-pill" title="${esc(helpFor('stages'))}">depends on ${esc(s.dependsOn.join(', '))}</span>` : ''}</div>`;
      }).join('')}</div>`
    : jobs.length
    ? `<div class="azp-sec"><h3>Jobs (${jobs.length})</h3>${modeledJobs.map((j) => {
        const name = j.name || '?';
        const stepCount = Array.isArray(j.steps) ? j.steps.length : 0;
        return `<div class="azp-stage"><span class="azp-stage-name">${lineButton(name, j.line, 'jobs')}</span>${stepCount ? `<span class="azp-kv">${stepCount} step${stepCount !== 1 ? 's' : ''}</span>` : ''}${j.dependsOn.length ? `<span class="azp-pill">depends on ${esc(j.dependsOn.join(', '))}</span>` : ''}</div>`;
      }).join('')}</div>`
    : steps.length
    ? `<div class="azp-sec"><h3>${lineButton('Steps', lineFor(lineMap, 'steps'), 'steps')}</h3><div class="azp-pills"><span class="azp-pill">${steps.length} step${steps.length !== 1 ? 's' : ''}</span></div></div>`
    : '';

  const varRows = variables.slice(0, 20).map((v) => `<tr><td><span class="azp-mono">${lineButton(v.key, v.line, 'variables')}</span></td><td>${renderVariableValue(v)}</td></tr>`).join('');
  const varHtml = variables.length
    ? `<div class="azp-sec"><h3>${lineButton(`Variables (${variables.length})`, lineFor(lineMap, 'variables'), 'variables')}</h3>
      <table class="azp-var-table"><thead><tr><th>Name</th><th>Value</th></tr></thead>
      <tbody>${varRows}${variables.length > 20 ? `<tr><td colspan="2" style="color:var(--fg-2,#888);font-size:12px">…and ${variables.length - 20} more</td></tr>` : ''}</tbody>
      </table></div>`
    : '';

  const matrixKeys = strategyMatrix ? Object.keys(strategyMatrix) : [];
  const matrixHtml = matrixKeys.length
    ? `<div class="azp-sec"><h3>${lineButton('Strategy matrix', lineFor(lineMap, 'strategy.matrix'), 'matrix')}</h3><div class="azp-pills">${matrixKeys.map((k) => {
        const vals = [].concat(strategyMatrix[k]);
        return `<span class="azp-pill">${esc(k)}: ${vals.map(esc).join(', ')}</span>`;
      }).join('')}</div></div>`
    : '';

  const totalSteps = stages.reduce((acc, s) => {
    if (!Array.isArray(s.jobs)) return acc;
    return acc + s.jobs.reduce((a, j) => a + (Array.isArray(j.steps) ? j.steps.length : 0), 0);
  }, steps.length || jobs.reduce((a, j) => a + (Array.isArray(j.steps) ? j.steps.length : 0), 0));
  const model = { vmImage, poolLine, variables, stages: modeledStages, jobs: modeledJobs };

  host.innerHTML = `<style>${CSS}</style>
<div class="azp-title"><span class="badge-azp">Azure Pipelines</span>Pipeline config</div>
<div class="azp-sub">${stages.length ? `${stages.length} stage${stages.length !== 1 ? 's' : ''}` : jobs.length ? `${jobs.length} job${jobs.length !== 1 ? 's' : ''}` : 'no stages'}${totalSteps ? ` · ${totalSteps} step${totalSteps !== 1 ? 's' : ''}` : ''}${trigger.length ? ` · triggers on ${trigger.length} branch${trigger.length !== 1 ? 'es' : ''}` : ''}</div>
${triggerHtml}${prHtml}${poolHtml}${stagesHtml}${varHtml}${matrixHtml}`;
  const review = issueList(collectIssues(model), { title: 'Azure Pipelines Review' });
  if (review) host.insertBefore(review, host.querySelector('.azp-sec'));
  host.appendChild(sourcePreview(redactSource(text), { title: 'Redacted source', collapsed: true, idPrefix: 'azp-line', highlighter: highlightYamlLine }));
  wireSourceLinks(host, { idPrefix: 'azp-line' });

  return { parentNode: host };
}
