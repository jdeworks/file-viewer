import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
import { ensureKnownUiStyle, issueList, maskedValue, sourcePreview, wireSourceLinks } from '../../../../../core/known-ui.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const SECRETISH = /password|passwd|pwd|secret|token|api[_-]?key|private[_-]?key|client[_-]?secret|credential|auth|access[_-]?key/i;

const CSS = `
.wpc-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-wpc{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#F5222D;color:#fff;vertical-align:middle;margin-right:8px;}
.wpc-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.wpc-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.wpc-sec{margin:12px 0;}
.wpc-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.wpc-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:2px;}
.wpc-pill.warn{background:#fff7ed;border-color:#fed7aa;color:#c2410c;}
.wpc-step{padding:6px 12px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);margin:4px 0;font-size:13px;display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;}
.wpc-step-name{font-weight:600;}
.wpc-step-img{font:11px ui-monospace,monospace;color:var(--fg-2,#888);}
.wpc-note{font-size:11px;color:var(--fg-2,#888);}
.wpc-kv{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;font-size:13px;margin:6px 0;}
.wpc-k{font:12px/1.6 ui-monospace,monospace;color:var(--fg-2,#888);}
.wpc-v{font:12px/1.6 ui-monospace,monospace;font-weight:600;}
.wpc-link{border:0;background:transparent;color:inherit;font:inherit;padding:0;text-align:left;cursor:pointer;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px;}
.wpc-link:hover{color:var(--accent,#2563eb);}
.wpc-mask-reason{font-size:11px;color:var(--fg-2,#888);font-family:system-ui,sans-serif;margin-left:4px;}
.wpc-source-key{color:#F5222D;font-weight:700;}
.wpc-source-comment{color:#6e7781;font-style:italic;}
`;

const HELP = {
  steps: 'Woodpecker steps run containers in pipeline order unless guarded by when conditions.',
  services: 'Sidecar services are available to pipeline steps and often need pinned images.',
  image: 'Container image used by this step or service. Digests are most reproducible.',
  commands: 'Shell commands executed inside the step container.',
  when: 'Branch, event, repo, status, path, or environment conditions controlling execution.',
  matrix: 'Matrix axes multiply the pipeline over several values.',
  secrets: 'Secret references are injected by Woodpecker; names are shown, values should stay outside the file.',
  clone: 'Clone settings control the repository checkout image and depth.',
  environment: 'Environment values. Secret-looking values are redacted.',
};

function helpFor(key) {
  return HELP[key] || 'Open this Woodpecker item in source.';
}

function lineButton(label, line, key = label) {
  const title = `${helpFor(key)} Open line ${line || 1} in source.`;
  return `<button class="wpc-link" type="button" data-source-line="${line || 1}" title="${esc(title)}">${esc(label)}</button>`;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

function lineContaining(text, pattern, fallbackLine = 1) {
  const rx = pattern instanceof RegExp ? pattern : new RegExp(escapeRegExp(pattern));
  const lines = String(text || '').split(/\r?\n/);
  const idx = lines.findIndex((line) => rx.test(line));
  return idx >= 0 ? idx + 1 : fallbackLine;
}

function secretName(s) {
  if (typeof s === 'string') return s;
  if (s && typeof s === 'object') return s.source || s.name || JSON.stringify(s);
  return String(s);
}

function whenSummary(when) {
  if (!when) return null;
  const parts = [];
  if (when.branch) parts.push('branch: ' + [].concat(when.branch).join(', '));
  if (when.event) parts.push('event: ' + [].concat(when.event).join(', '));
  if (when.repo) parts.push('repo: ' + [].concat(when.repo).join(', '));
  if (when.status) parts.push('status: ' + [].concat(when.status).join(', '));
  if (when.path) parts.push('path: ' + [].concat(when.path?.include || when.path).join(', '));
  if (when.environment) parts.push('env: ' + [].concat(when.environment).join(', '));
  return parts.length ? parts.join(' | ') : null;
}

function imageMutable(image) {
  if (!image) return false;
  if (/@sha256:/i.test(image)) return false;
  return true;
}

function imageReason(image) {
  if (!image) return '';
  if (!image.includes(':')) return `${image} has no explicit tag or digest.`;
  if (/:latest(?:$|@)/i.test(image)) return `${image} uses the moving latest tag.`;
  if (!/@sha256:/i.test(image)) return `${image} is tag-pinned but can still move; digest pinning is stricter.`;
  return '';
}

function commandText(step) {
  return Array.isArray(step?.commands) ? step.commands.join('\n') : '';
}

function commandHasDownloadPipe(step) {
  return /(curl|wget)\b[^|;&]*(\||\bbash\b|\bsh\b)/i.test(commandText(step));
}

function commandDeploys(step) {
  const text = `${step?.name || ''}\n${step?.image || ''}\n${commandText(step)}`;
  return /deploy|publish|release|kubectl|helm|docker\s+push|plugins\/docker|gh-pages|slack/i.test(text);
}

function stepLine(text, step, index, fallbackLine) {
  const name = step?.name;
  if (name) return lineContaining(text, new RegExp(`name:\\s*${escapeRegExp(name)}\\b`), fallbackLine);
  const image = step?.image;
  if (image) return lineContaining(text, new RegExp(`image:\\s*${escapeRegExp(image)}\\b`), fallbackLine);
  return fallbackLine + index;
}

function imageLine(text, image, fallbackLine) {
  return image ? lineContaining(text, new RegExp(`image:\\s*${escapeRegExp(image)}\\b`), fallbackLine) : fallbackLine;
}

function collectSecrets(steps, text, fallbackLine) {
  const allSecrets = [];
  const seenSecrets = new Set();
  for (const step of steps) {
    const sec = Array.isArray(step.secrets) ? step.secrets : [];
    for (const s of sec) {
      const n = secretName(s);
      if (seenSecrets.has(n)) continue;
      seenSecrets.add(n);
      allSecrets.push({
        name: n,
        line: lineContaining(text, new RegExp(`source:\\s*${escapeRegExp(n)}\\b|\\-\\s*${escapeRegExp(n)}\\b`), fallbackLine),
      });
    }
  }
  return allSecrets;
}

function environmentItems(step, text, fallbackLine) {
  if (!step?.environment || typeof step.environment !== 'object') return [];
  return Object.entries(step.environment).map(([key, value]) => ({
    key,
    value,
    line: lineContaining(text, new RegExp(`${escapeRegExp(key)}:\\s*`), fallbackLine),
  }));
}

function collectIssues(model) {
  const issues = [];
  for (const step of model.steps) {
    const reason = imageReason(step.image);
    if (imageMutable(step.image)) {
      issues.push({
        severity: /latest|no explicit/i.test(reason) ? 'warning' : 'info',
        label: 'step image',
        line: imageLine(model.text, step.image, step.line),
        message: `${step.name} uses ${reason} Prefer digest pinning for reproducible CI.`,
      });
    }
    if (step.privileged === true) {
      issues.push({ severity: 'warning', label: 'privileged', line: step.line, message: `${step.name} runs privileged; confirm the step needs elevated container access.` });
    }
    if (commandHasDownloadPipe(step)) {
      issues.push({ severity: 'warning', label: 'download pipe', line: step.line, message: `${step.name} pipes downloaded content into a shell.` });
    }
    if (commandDeploys(step)) {
      issues.push({ severity: 'info', label: 'deploy step', line: step.line, message: `${step.name} looks like a publish, deploy, notify, or release step.` });
    }
    for (const env of environmentItems(step, model.text, step.line)) {
      if (SECRETISH.test(env.key) || maskedValue(env.key, env.value).masked) {
        issues.push({ severity: 'warning', label: 'secret env', line: env.line, message: `${step.name}.${env.key} looks sensitive; use Woodpecker secrets instead of inline environment values.` });
      }
    }
  }
  for (const service of model.services) {
    const reason = imageReason(service.image);
    if (imageMutable(service.image)) {
      issues.push({ severity: 'info', label: 'service image', line: imageLine(model.text, service.image, service.line), message: `${service.name} service uses ${reason}` });
    }
    for (const env of service.environment || []) {
      if (SECRETISH.test(env.key) || maskedValue(env.key, env.value).masked) {
        issues.push({ severity: 'warning', label: 'service secret', line: env.line, message: `${service.name}.${env.key} looks sensitive; store it as a secret.` });
      }
    }
  }
  for (const secret of model.secrets) {
    issues.push({ severity: 'info', label: 'secret ref', line: secret.line, message: `${secret.name} is referenced by a step. Confirm it is scoped to the least necessary repositories/events.` });
  }
  if (model.pipelineWhen) {
    issues.push({ severity: 'info', label: 'pipeline guard', line: model.pipelineWhenLine, message: `Pipeline-level when condition: ${whenSummary(model.pipelineWhen)}.` });
  }
  return issues.slice(0, 18);
}

function redactSource(text) {
  return String(text || '').split(/\r?\n/).map((line) => {
    const m = line.match(/^(\s*)(?:-\s*)?([A-Za-z_.$][\w:.$-]*)\s*:\s*(.*)$/);
    if (!m) return line;
    const prefix = `${m[1]}${line.trimStart().startsWith('- ') ? '- ' : ''}${m[2]}:`;
    if (SECRETISH.test(m[2]) || maskedValue(m[2], m[3].trim()).masked) return `${prefix} [configured]`;
    return line;
  }).join('\n');
}

function highlightYamlLine(line) {
  const raw = esc(line);
  return raw.replace(/^(\s*(?:-\s*)?)([A-Za-z_.$][\w:.$-]*)(\s*:)/, `$1<span class="wpc-source-key">$2</span>$3`)
    .replace(/(#.*)$/, '<span class="wpc-source-comment">$1</span>');
}

function renderValue(key, value, line) {
  const masked = maskedValue(key, value);
  if (masked.masked || SECRETISH.test(key)) {
    const reason = masked.reason || `masked because "${key}" looks sensitive`;
    return `<span class="wpc-pill warn" title="${esc(reason)}">${lineButton(key, line, 'environment')}=[configured]</span><span class="wpc-mask-reason">${esc(reason)}</span>`;
  }
  return `<span class="wpc-v">${lineButton(String(value), line, 'environment')}</span>`;
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = {}; }

  ensureKnownUiStyle(document);
  const text = intake.text || '';
  const lineMap = buildLineMap(text);
  const name = cfg.name || (intake.filename || '').split('/').pop() || 'Pipeline';
  const steps = (Array.isArray(cfg.steps) ? cfg.steps : []).map((step, index) => ({
    ...step,
    line: stepLine(text, step, index, lineFor(lineMap, 'steps')),
  }));
  const services = (Array.isArray(cfg.services) ? cfg.services : []).map((service, index) => ({
    ...service,
    line: stepLine(text, service, index, lineFor(lineMap, 'services')),
    environment: service?.environment && typeof service.environment === 'object'
      ? Object.entries(service.environment).map(([key, value]) => ({ key, value, line: lineContaining(text, new RegExp(`${escapeRegExp(key)}:\\s*`), lineFor(lineMap, 'services')) }))
      : [],
  }));
  const matrix = cfg.matrix || null;
  const cloneCfg = cfg.clone || null;
  const pipelineWhen = cfg.when || null;
  const secrets = collectSecrets(steps, text, lineFor(lineMap, 'steps'));
  const model = {
    text,
    steps,
    services,
    secrets,
    pipelineWhen,
    pipelineWhenLine: lineFor(lineMap, 'when'),
  };

  const stepsHtml = steps.length
    ? `<div class="wpc-sec"><h3>${lineButton(`Steps (${steps.length})`, lineFor(lineMap, 'steps'), 'steps')}</h3>${steps.slice(0, 10).map((s) => {
        const sname = s.name || '?';
        const img = s.image || '';
        const cmds = Array.isArray(s.commands) ? s.commands.length : 0;
        const when = whenSummary(s.when);
        const envCount = s.environment && typeof s.environment === 'object' ? Object.keys(s.environment).length : 0;
        return `<div class="wpc-step">
          <span class="wpc-step-name">${lineButton(sname, s.line, 'steps')}</span>
          ${img ? `<span class="wpc-step-img" title="${esc(helpFor('image'))}">${lineButton(img, imageLine(text, img, s.line), 'image')}</span>` : ''}
          ${cmds ? `<span class="wpc-note" title="${esc(helpFor('commands'))}">${cmds} cmd${cmds !== 1 ? 's' : ''}</span>` : ''}
          ${envCount ? `<span class="wpc-note" title="${esc(helpFor('environment'))}">${envCount} env</span>` : ''}
          ${when ? `<span class="wpc-note" title="${esc(helpFor('when'))}">when: ${esc(when)}</span>` : ''}
        </div>`;
      }).join('')}${steps.length > 10 ? `<div class="wpc-note">...and ${steps.length - 10} more</div>` : ''}</div>`
    : '';

  const pipelineWhenSummary = whenSummary(pipelineWhen);
  const whenHtml = pipelineWhenSummary
    ? `<div class="wpc-sec"><h3>${lineButton('Pipeline when', lineFor(lineMap, 'when'), 'when')}</h3><div class="wpc-kv"><span class="wpc-k">conditions</span><span class="wpc-v">${esc(pipelineWhenSummary)}</span></div></div>`
    : '';

  let matrixHtml = '';
  if (matrix && typeof matrix === 'object') {
    const axes = Object.entries(matrix)
      .filter(([k]) => k !== 'include' && k !== 'exclude')
      .map(([k, v]) => `<span class="wpc-k">${lineButton(k, lineFor(lineMap, `matrix.${k}`, 'matrix'), 'matrix')}</span><span class="wpc-v">${esc(Array.isArray(v) ? v.join(', ') : String(v))}</span>`)
      .join('');
    if (axes) matrixHtml = `<div class="wpc-sec"><h3>${lineButton('Matrix builds', lineFor(lineMap, 'matrix'), 'matrix')}</h3><div class="wpc-kv">${axes}</div></div>`;
  }

  const secretsHtml = secrets.length
    ? `<div class="wpc-sec"><h3>${lineButton(`Secrets used (${secrets.length})`, secrets[0].line, 'secrets')}</h3><div style="display:flex;flex-wrap:wrap;gap:4px;">${secrets.map((s) => `<span class="wpc-pill warn" title="${esc(helpFor('secrets'))}">${lineButton(s.name, s.line, 'secrets')}</span>`).join('')}</div></div>`
    : '';

  const servicesHtml = services.length
    ? `<div class="wpc-sec"><h3>${lineButton(`Services (${services.length})`, lineFor(lineMap, 'services'), 'services')}</h3>${services.slice(0, 8).map((s) => {
        const sname = s.name || '?';
        const img = s.image || '';
        const envHtml = (s.environment || []).map((item) => renderValue(item.key, item.value, item.line)).join('');
        return `<div class="wpc-step"><span class="wpc-step-name">${lineButton(sname, s.line, 'services')}</span>${img ? `<span class="wpc-step-img">${lineButton(img, imageLine(text, img, s.line), 'image')}</span>` : ''}${envHtml}</div>`;
      }).join('')}</div>`
    : '';

  let cloneHtml = '';
  if (cloneCfg && typeof cloneCfg === 'object') {
    const cloneEntries = Object.entries(cloneCfg)
      .map(([k, v]) => `<span class="wpc-k">${lineButton(k, lineFor(lineMap, `clone.${k}`, 'clone'), 'clone')}</span><span class="wpc-v">${esc(typeof v === 'object' ? JSON.stringify(v) : String(v))}</span>`)
      .join('');
    if (cloneEntries) cloneHtml = `<div class="wpc-sec"><h3>${lineButton('Clone config', lineFor(lineMap, 'clone'), 'clone')}</h3><div class="wpc-kv">${cloneEntries}</div></div>`;
  }

  const sub = [
    steps.length ? `${steps.length} step${steps.length !== 1 ? 's' : ''}` : '',
    services.length ? `${services.length} service${services.length !== 1 ? 's' : ''}` : '',
    matrix ? 'matrix build' : '',
    secrets.length ? `${secrets.length} secret${secrets.length !== 1 ? 's' : ''}` : '',
  ].filter(Boolean).join(' · ');

  const host = document.createElement('div');
  host.className = 'wpc-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="wpc-title"><span class="badge-wpc">Woodpecker CI</span>${esc(name)}</div>
<div class="wpc-sub">${esc(sub)}</div>
${stepsHtml}${servicesHtml}${whenHtml}${matrixHtml}${secretsHtml}${cloneHtml}`;

  const review = issueList(collectIssues(model), { title: 'Woodpecker Review' });
  if (review) host.insertBefore(review, host.querySelector('.wpc-sec') || null);
  host.appendChild(sourcePreview(redactSource(text), {
    title: 'Redacted source',
    collapsed: true,
    idPrefix: 'wpc-line',
    highlighter: highlightYamlLine,
  }));
  wireSourceLinks(host, { idPrefix: 'wpc-line' });
  return { parentNode: host };
}
