import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
import { ensureKnownUiStyle, issueList, maskedValue, sourcePreview, wireSourceLinks } from '../../../../../core/known-ui.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const SECRETISH = /password|passwd|pwd|secret|token|api[_-]?key|private[_-]?key|client[_-]?secret|credential|auth/i;

const CSS = `
.glb-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-glb{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#fc6d26;color:#fff;vertical-align:middle;margin-right:8px;}
.glb-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.glb-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.glb-sec{margin:12px 0;}
.glb-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.glb-pills{display:flex;flex-wrap:wrap;gap:6px;}
.glb-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font:12px/1.4 ui-monospace,monospace;}
.glb-pill.stage{background:#fff7ed;border-color:#fed7aa;color:#9a3412;}
.glb-pill.job{background:#eff6ff;border-color:#93c5fd;color:#1d4ed8;}
.glb-pill.warn{background:#fff7ed;border-color:#fed7aa;color:#c2410c;}
.glb-job{padding:6px 10px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);margin:4px 0;font-size:13px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.glb-job-note{font-size:12px;color:var(--fg-2,#888);}
.glb-link{border:0;background:transparent;color:inherit;font:inherit;padding:0;text-align:left;cursor:pointer;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px;}
.glb-link:hover{color:var(--accent,#2563eb);}
.glb-mask-reason{font-size:11px;color:var(--fg-2,#888);font-family:system-ui,sans-serif;margin-left:4px;}
.glb-source-key{color:#fc6d26;font-weight:700;}
.glb-source-comment{color:#6e7781;font-style:italic;}
`;

const RESERVED = new Set(['stages','variables','include','image','services','before_script','after_script','cache','default','workflow','rules']);

const HELP = {
  stages: 'Ordered GitLab stage list; jobs run by stage unless needs creates a DAG.',
  variables: 'Pipeline variables available to jobs. Secret-looking values are redacted.',
  include: 'External GitLab CI templates or project files imported into this pipeline.',
  image: 'Default container image for jobs.',
  needs: 'Job dependency DAG. Jobs can start before earlier stages when their needs are ready.',
  rules: 'Conditions that decide whether a job is created.',
  script: 'Commands executed by a job.',
};

function helpFor(key) {
  return HELP[key] || 'Open this GitLab CI item in source.';
}

function lineButton(label, line, key = label, className = 'glb-link') {
  const title = `${helpFor(key)} Open line ${line || 1} in source.`;
  return `<button class="${className}" type="button" data-source-line="${line || 1}" title="${esc(title)}">${esc(label)}</button>`;
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

function normalizeImage(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return value.name || value.image || '';
  return String(value);
}

function imageMutable(image) {
  if (!image) return false;
  if (image.includes('@sha256:')) return false;
  const last = image.split('/').pop();
  return !last.includes(':') || /:latest$/i.test(last) || /:[\w.-]+$/i.test(last);
}

function scriptHasDownloadPipe(script) {
  return toList(script).some((cmd) => /(curl|wget)\b[^|;&]*(\||\bbash\b|\bsh\b)/i.test(String(cmd)));
}

function renderValuePill(key, value, line) {
  const masked = maskedValue(key, value);
  if (masked.masked) {
    return `<span class="glb-pill warn" title="${esc(masked.reason)}">${lineButton(key, line, 'variables')}=[configured]</span><span class="glb-mask-reason">${esc(masked.reason)}</span>`;
  }
  return `<span class="glb-pill">${lineButton(key, line, 'variables')}</span>`;
}

function collectIssues(model) {
  const issues = [];
  if (model.image && imageMutable(model.image)) {
    issues.push({
      severity: 'warning',
      label: 'mutable image',
      line: model.imageLine,
      message: `Default image "${model.image}" is tag-based; pin to a digest for reproducible CI.`,
    });
  }
  for (const variable of model.variables) {
    if (SECRETISH.test(variable.name) || maskedValue(variable.name, variable.value).masked) {
      issues.push({
        severity: 'warning',
        label: 'secret variable',
        line: variable.line,
        message: `${variable.name} looks sensitive; store secrets in protected GitLab CI variables instead of source.`,
      });
    }
  }
  for (const job of model.jobs) {
    if (scriptHasDownloadPipe(job.script)) {
      issues.push({
        severity: 'warning',
        label: 'download pipe',
        line: job.line,
        message: `${job.name} pipes a downloaded script into a shell.`,
      });
    }
    if (job.environment && !job.rules.length && !job.only && !job.whenManual) {
      issues.push({
        severity: 'warning',
        label: 'deploy guard',
        line: job.line,
        message: `${job.name} deploys to an environment without rules, only/except, or manual gating.`,
      });
    }
    if (job.needs.length) {
      issues.push({
        severity: 'info',
        label: 'needs graph',
        line: job.line,
        message: `${job.name} waits for ${job.needs.join(', ')}.`,
      });
    }
  }
  return issues;
}

function redactSource(text) {
  const lines = String(text || '').split(/\r?\n/);
  const out = [];
  const stack = [];
  for (const [idx, line] of lines.entries()) {
    const m = line.match(/^(\s*)([A-Za-z_.$][\w:.$-]*)\s*:\s*(.*)$/);
    if (!m) {
      out.push(line);
      continue;
    }
    const indent = m[1].replace(/\t/g, '  ').length;
    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    const path = [...stack.map((item) => item.key), m[2]].join('.');
    if (m[3].trim() === '') stack.push({ indent, key: m[2] });
    if ((path.startsWith('variables.') || SECRETISH.test(m[2])) && maskedValue(m[2], m[3].trim()).masked) {
      out.push(`${m[1]}${m[2]}: [configured]`);
    } else {
      out.push(line);
    }
  }
  return out.join('\n');
}

function highlightYamlLine(line) {
  const escaped = esc(line);
  if (/^\s*#/.test(line)) return `<span class="glb-source-comment">${escaped}</span>`;
  return escaped.replace(/^(\s*[A-Za-z_.$][\w:.$-]*)(\s*:)/, '<span class="glb-source-key">$1</span>$2');
}

export async function render(intake) {
  const text = intake.text || '';
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(text) || [])[0] || {};
  } catch { cfg = {}; }
  const lineMap = buildLineMap(text);

  const stages = Array.isArray(cfg.stages) ? cfg.stages : [];
  const image = normalizeImage(cfg.image || (cfg.default?.image) || '');
  const imageLine = lineFor(lineMap, 'image', 'default.image');
  const variables = cfg.variables && typeof cfg.variables === 'object'
    ? Object.entries(cfg.variables).map(([name, value]) => ({ name, value: typeof value === 'object' && value?.value != null ? value.value : value, line: lineFor(lineMap, `variables.${name}`, 'variables') }))
    : [];
  const includes = Array.isArray(cfg.include) ? cfg.include : (cfg.include ? [cfg.include] : []);
  const jobs = Object.entries(cfg)
    .filter(([k]) => !RESERVED.has(k) && typeof cfg[k] === 'object' && cfg[k])
    .map(([name, job]) => ({
      name,
      raw: job,
      line: lineFor(lineMap, name),
      stage: job.stage || '',
      script: job.script,
      scriptCount: Array.isArray(job.script) ? job.script.length : (job.script ? 1 : 0),
      needs: toList(job.needs).map((need) => typeof need === 'string' ? need : need?.job).filter(Boolean),
      rules: Array.isArray(job.rules) ? job.rules : [],
      only: job.only || job.except || '',
      environment: typeof job.environment === 'string' ? job.environment : job.environment?.name || '',
      whenManual: job.when === 'manual' || toList(job.rules).some((rule) => rule?.when === 'manual'),
    }));
  const model = { stages, image, imageLine, variables, includes, jobs };

  const stagesHtml = stages.length
    ? `<div class="glb-sec"><h3>${lineButton(`Stages (${stages.length})`, lineFor(lineMap, 'stages'), 'stages')}</h3><div class="glb-pills">${stages.map((s) => `<span class="glb-pill stage">${esc(s)}</span>`).join('')}</div></div>`
    : '';

  const jobsHtml = jobs.length
    ? `<div class="glb-sec"><h3>Jobs (${jobs.length})</h3>${jobs.slice(0, 10).map((j) => {
        const needs = j.needs.length ? `needs: ${j.needs.join(', ')}` : '';
        return `<div class="glb-job">
          <span class="glb-pill job">${lineButton(j.name, j.line, 'script')}</span>
          ${j.stage ? `<span class="glb-pill stage">${esc(j.stage)}</span>` : ''}
          ${j.scriptCount ? `<span class="glb-job-note">${j.scriptCount} script step${j.scriptCount !== 1 ? 's' : ''}</span>` : ''}
          ${needs ? `<span class="glb-pill" title="${esc(helpFor('needs'))}">${esc(needs)}</span>` : ''}
          ${j.rules.length ? `<span class="glb-pill" title="${esc(helpFor('rules'))}">${j.rules.length} rule${j.rules.length !== 1 ? 's' : ''}</span>` : ''}
          ${j.environment ? `<span class="glb-pill warn">env: ${esc(j.environment)}</span>` : ''}
        </div>`;
      }).join('')}${jobs.length > 10 ? `<div style="font-size:12px;color:var(--fg-2,#888)">…and ${jobs.length - 10} more</div>` : ''}</div>`
    : '';

  const varsHtml = variables.length
    ? `<div class="glb-sec"><h3>${lineButton(`Variables (${variables.length})`, lineFor(lineMap, 'variables'), 'variables')}</h3><div class="glb-pills">${variables.slice(0, 8).map((v) => renderValuePill(v.name, v.value, v.line)).join('')}${variables.length > 8 ? `<span class="glb-pill">+${variables.length - 8}</span>` : ''}</div></div>`
    : '';

  const inclHtml = includes.length
    ? `<div class="glb-sec"><h3>${lineButton(`Includes (${includes.length})`, lineFor(lineMap, 'include'), 'include')}</h3><div class="glb-pills">${includes.slice(0, 4).map((inc) => {
        const label = typeof inc === 'string' ? inc : (inc.project || inc.file || inc.template || 'remote');
        return `<span class="glb-pill">${esc(String(label).split('/').pop())}</span>`;
      }).join('')}</div></div>`
    : '';

  const sub = [
    stages.length ? `${stages.length} stage${stages.length !== 1 ? 's' : ''}` : '',
    jobs.length ? `${jobs.length} job${jobs.length !== 1 ? 's' : ''}` : '',
    image ? image.split(':')[0].split('/').pop() : '',
  ].filter(Boolean).join(' · ');

  const host = document.createElement('div');
  ensureKnownUiStyle(document);
  host.className = 'glb-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="glb-title"><span class="badge-glb">GitLab CI</span>.gitlab-ci.yml</div>
<div class="glb-sub">${esc(sub) || 'GitLab CI/CD pipeline'}</div>
${stagesHtml}${jobsHtml}${varsHtml}${inclHtml}`;
  const review = issueList(collectIssues(model), { title: 'GitLab CI Review' });
  if (review) host.insertBefore(review, host.querySelector('.glb-sec'));
  host.appendChild(sourcePreview(redactSource(text), { title: 'Redacted source', collapsed: true, idPrefix: 'glb-line', highlighter: highlightYamlLine }));
  wireSourceLinks(host, { idPrefix: 'glb-line' });
  return { parentNode: host };
}
