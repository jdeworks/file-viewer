import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
import { ensureKnownUiStyle, issueList, maskedValue, sourcePreview, wireSourceLinks } from '../../../../../core/known-ui.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const SECRETISH = /password|passwd|pwd|secret|token|api[_-]?key|private[_-]?key|client[_-]?secret|credential|auth|access[_-]?key/i;

const CSS = `
.circleciconfig-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-cci{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#343434;color:#fff;vertical-align:middle;margin-right:8px;}
.cci-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.cci-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.cci-sec{margin:12px 0;}
.cci-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.cci-pills{display:flex;flex-wrap:wrap;gap:6px;}
.cci-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.cci-pill.orb{background:#fef3c7;border-color:#fcd34d;color:#92400e;}
.cci-pill.job{background:#eff6ff;border-color:#93c5fd;color:#1d4ed8;}
.cci-pill.warn{background:#fff7ed;border-color:#fed7aa;color:#c2410c;}
.cci-job{padding:6px 10px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);margin:4px 0;font-size:13px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
.cci-note{font-size:12px;color:var(--fg-2,#888);}
.cci-link{border:0;background:transparent;color:inherit;font:inherit;padding:0;text-align:left;cursor:pointer;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px;}
.cci-link:hover{color:var(--accent,#2563eb);}
.cci-mask-reason{font-size:11px;color:var(--fg-2,#888);font-family:system-ui,sans-serif;margin-left:4px;}
.cci-source-key{color:#343434;font-weight:700;}
.cci-source-comment{color:#6e7781;font-style:italic;}
`;

const HELP = {
  orbs: 'Reusable CircleCI packages. Prefer exact orb versions for reproducible pipelines.',
  workflows: 'Workflow job graph. requires controls job dependencies.',
  jobs: 'CircleCI jobs define executors, steps, environment, and artifacts.',
  requires: 'Workflow dependency list for a job.',
  context: 'CircleCI context injecting shared environment variables and secrets.',
  environment: 'Job environment variables. Secret-looking values are redacted.',
  steps: 'Commands and reusable steps executed by a job.',
};

function helpFor(key) {
  return HELP[key] || 'Open this CircleCI item in source.';
}

function lineButton(label, line, key = label) {
  const title = `${helpFor(key)} Open line ${line || 1} in source.`;
  return `<button class="cci-link" type="button" data-source-line="${line || 1}" title="${esc(title)}">${esc(label)}</button>`;
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

function toList(value) {
  if (Array.isArray(value)) return value;
  if (value == null || value === '') return [];
  return [value];
}

function workflowJobs(cfg, lineMap) {
  const out = [];
  const workflows = cfg.workflows && typeof cfg.workflows === 'object' ? cfg.workflows : {};
  for (const [workflowName, workflow] of Object.entries(workflows)) {
    if (workflowName === 'version' || !workflow || typeof workflow !== 'object') continue;
    for (const item of toList(workflow.jobs)) {
      if (typeof item === 'string') {
        out.push({ workflow: workflowName, name: item, requires: [], context: [], filters: null, line: lineFor(lineMap, `workflows.${workflowName}.jobs`, `workflows.${workflowName}`) });
      } else if (item && typeof item === 'object') {
        const [name, config] = Object.entries(item)[0] || [];
        if (!name) continue;
        out.push({
          workflow: workflowName,
          name,
          requires: toList(config?.requires).map(String),
          context: toList(config?.context).map(String),
          filters: config?.filters || null,
          line: lineFor(lineMap, `workflows.${workflowName}.jobs`, `workflows.${workflowName}`),
        });
      }
    }
  }
  return out;
}

function jobModels(cfg, lineMap) {
  const jobs = cfg.jobs && typeof cfg.jobs === 'object' ? cfg.jobs : {};
  return Object.entries(jobs).map(([name, job]) => ({
    name,
    raw: job || {},
    line: lineFor(lineMap, `jobs.${name}`, 'jobs'),
    steps: Array.isArray(job?.steps) ? job.steps : [],
    environment: job?.environment && typeof job.environment === 'object' ? Object.entries(job.environment).map(([key, value]) => ({ key, value, line: lineFor(lineMap, `jobs.${name}.environment.${key}`, `jobs.${name}.environment`) })) : [],
    executor: typeof job?.executor === 'string' ? job.executor : job?.executor?.name || '',
  }));
}

function commandText(step) {
  if (typeof step === 'string') return step;
  if (!step || typeof step !== 'object') return '';
  const run = step.run;
  if (typeof run === 'string') return run;
  if (run && typeof run === 'object') return String(run.command || run.name || '');
  return Object.keys(step)[0] || '';
}

function stepUsesDownloadPipe(steps) {
  return steps.some((step) => /(curl|wget)\b[^|;&]*(\||\bbash\b|\bsh\b)/i.test(commandText(step)));
}

function orbUnpinned(value) {
  const spec = String(value || '');
  if (!spec.includes('@')) return true;
  const version = spec.split('@').pop();
  return !/^\d+\.\d+\.\d+($|[-+])/.test(version);
}

function collectIssues(model) {
  const issues = [];
  for (const orb of model.orbs) {
    if (orbUnpinned(orb.value)) {
      issues.push({
        severity: 'warning',
        label: 'orb version',
        line: orb.line,
        message: `${orb.name} uses ${orb.value}; pin orbs to an exact version for reproducible CI.`,
      });
    }
  }
  for (const job of model.jobs) {
    for (const variable of job.environment) {
      if (SECRETISH.test(variable.key) || maskedValue(variable.key, variable.value).masked) {
        issues.push({
          severity: 'warning',
          label: 'secret env',
          line: variable.line,
          message: `${job.name}.${variable.key} looks sensitive; use CircleCI contexts or project environment variables.`,
        });
      }
    }
    if (stepUsesDownloadPipe(job.steps)) {
      issues.push({
        severity: 'warning',
        label: 'download pipe',
        line: job.line,
        message: `${job.name} pipes a downloaded script into a shell.`,
      });
    }
  }
  for (const wfJob of model.workflowJobs) {
    if (wfJob.requires.length) {
      issues.push({
        severity: 'info',
        label: 'requires graph',
        line: wfJob.line,
        message: `${wfJob.workflow}/${wfJob.name} waits for ${wfJob.requires.join(', ')}.`,
      });
    }
    if (/deploy|release|publish/i.test(wfJob.name) && !wfJob.filters && !wfJob.context.length) {
      issues.push({
        severity: 'warning',
        label: 'deploy guard',
        line: wfJob.line,
        message: `${wfJob.name} looks like a deploy job without branch filters or a context.`,
      });
    }
  }
  return issues;
}

function renderEnvPill(variable) {
  const masked = maskedValue(variable.key, variable.value);
  if (masked.masked) {
    return `<span class="cci-pill warn" title="${esc(masked.reason)}">${lineButton(variable.key, variable.line, 'environment')}=[configured]</span><span class="cci-mask-reason">${esc(masked.reason)}</span>`;
  }
  return `<span class="cci-pill">${lineButton(variable.key, variable.line, 'environment')}</span>`;
}

function redactSource(text) {
  const lines = String(text || '').split(/\r?\n/);
  const out = [];
  const stack = [];
  for (const line of lines) {
    const m = line.match(/^(\s*)([A-Za-z_.$][\w:.$-]*)\s*:\s*(.*)$/);
    if (!m) {
      out.push(line);
      continue;
    }
    const indent = m[1].replace(/\t/g, '  ').length;
    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    const path = [...stack.map((item) => item.key), m[2]].join('.');
    if (m[3].trim() === '') stack.push({ indent, key: m[2] });
    if ((path.includes('.environment.') || SECRETISH.test(m[2])) && maskedValue(m[2], m[3].trim()).masked) {
      out.push(`${m[1]}${m[2]}: [configured]`);
    } else {
      out.push(line);
    }
  }
  return out.join('\n');
}

function highlightYamlLine(line) {
  const escaped = esc(line);
  if (/^\s*#/.test(line)) return `<span class="cci-source-comment">${escaped}</span>`;
  return escaped.replace(/^(\s*[A-Za-z_.$][\w:.$-]*)(\s*:)/, '<span class="cci-source-key">$1</span>$2');
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
  const orbs = cfg.orbs && typeof cfg.orbs === 'object'
    ? Object.entries(cfg.orbs).map(([name, value]) => ({ name, value: String(value), line: lineFor(lineMap, `orbs.${name}`, 'orbs') }))
    : [];
  const jobs = jobModels(cfg, lineMap);
  const workflows = cfg.workflows ? Object.keys(cfg.workflows).filter((k) => k !== 'version') : [];
  const wfJobs = workflowJobs(cfg, lineMap);
  const model = { orbs, jobs, workflowJobs: wfJobs };

  const orbsHtml = orbs.length
    ? `<div class="cci-sec"><h3>${lineButton(`Orbs (${orbs.length})`, lineFor(lineMap, 'orbs'), 'orbs')}</h3><div class="cci-pills">${orbs.map((o) => `<span class="cci-pill orb">${lineButton(o.name, o.line, 'orbs')}</span>`).join('')}</div></div>`
    : '';

  const workflowsHtml = workflows.length
    ? `<div class="cci-sec"><h3>${lineButton(`Workflows (${workflows.length})`, lineFor(lineMap, 'workflows'), 'workflows')}</h3>
      <div class="cci-pills">${workflows.map((w) => `<span class="cci-pill">${lineButton(w, lineFor(lineMap, `workflows.${w}`), 'workflows')}</span>`).join('')}</div>
      ${wfJobs.length ? `<div style="margin-top:8px">${wfJobs.slice(0, 8).map((j) => `<div class="cci-job"><span class="cci-pill job">${lineButton(j.name, j.line, 'requires')}</span>${j.requires.length ? `<span class="cci-pill" title="${esc(helpFor('requires'))}">requires: ${esc(j.requires.join(', '))}</span>` : ''}${j.context.length ? `<span class="cci-pill warn" title="${esc(helpFor('context'))}">context: ${esc(j.context.join(', '))}</span>` : ''}${j.filters ? '<span class="cci-pill">filters</span>' : ''}</div>`).join('')}</div>` : ''}
    </div>`
    : '';

  const jobsHtml = jobs.length
    ? `<div class="cci-sec"><h3>Jobs (${jobs.length})</h3>${jobs.slice(0, 10).map((j) => {
        const steps = j.steps.length;
        return `<div class="cci-job"><span class="cci-pill job">${lineButton(j.name, j.line, 'jobs')}</span>${j.executor ? `<span class="cci-pill">${esc(j.executor)}</span>` : ''}${steps ? `<span class="cci-note">${steps} step${steps !== 1 ? 's' : ''}</span>` : ''}${j.environment.length ? `<span class="cci-pills">${j.environment.map(renderEnvPill).join('')}</span>` : ''}</div>`;
      }).join('')}${jobs.length > 8 ? `<div style="font-size:12px;color:var(--fg-2,#888)">…and ${jobs.length - 8} more</div>` : ''}</div>`
    : '';

  const sub = [`v${esc(version)}`, workflows.length ? `${workflows.length} workflow${workflows.length !== 1 ? 's' : ''}` : '', jobs.length ? `${jobs.length} job${jobs.length !== 1 ? 's' : ''}` : ''].filter(Boolean).join(' · ');

  const host = document.createElement('div');
  ensureKnownUiStyle(document);
  host.className = 'circleciconfig-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="cci-title"><span class="badge-cci">CircleCI</span>Pipeline config</div>
<div class="cci-sub">${sub}</div>
${orbsHtml}${workflowsHtml}${jobsHtml}`;
  const review = issueList(collectIssues(model), { title: 'CircleCI Review' });
  if (review) host.insertBefore(review, host.querySelector('.cci-sec'));
  host.appendChild(sourcePreview(redactSource(text), { title: 'Redacted source', collapsed: true, idPrefix: 'cci-line', highlighter: highlightYamlLine }));
  wireSourceLinks(host, { idPrefix: 'cci-line' });
  return { parentNode: host };
}
