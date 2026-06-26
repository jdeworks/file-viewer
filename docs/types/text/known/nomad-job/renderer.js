import { ensureKnownUiStyle, issueList, maskedValue, sourcePreview, wireSourceLinks } from '../../../../core/known-ui.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const SECRETISH = /password|passwd|pwd|secret|token|api[_-]?key|private[_-]?key|client[_-]?secret|credential|auth|access[_-]?key/i;

const CSS = `
.nj-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.nj-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#00BC7D;color:#fff;vertical-align:middle;margin-right:8px}
.nj-title{font-size:18px;font-weight:700;margin:0 0 4px}
.nj-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.nj-sec{margin:14px 0}
.nj-sec h3{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;font-weight:600}
.nj-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin-bottom:8px}
.nj-card-title{font-size:13px;font-weight:600;margin:0 0 8px;color:var(--fg,#24292f);display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.nj-row{display:flex;gap:8px;font-size:13px;padding:3px 0;border-bottom:1px solid var(--border,#f0f0f0)}
.nj-row:last-child{border-bottom:none}
.nj-key{color:var(--fg-2,#888);min-width:120px;flex-shrink:0;font-size:12px}
.nj-val{font-family:ui-monospace,monospace;word-break:break-all}
.nj-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;background:var(--bg-2,#f0f0f0);border:1px solid var(--border,#e0e0e0);color:var(--fg,#333);margin:1px 2px 1px 0}
.nj-chip-warn{background:#fff7ed;border-color:#fed7aa;color:#c2410c}
.nj-type-service{background:#dbeafe;border-color:#93c5fd;color:#1d4ed8}
.nj-type-batch{background:#ffedd5;border-color:#fdba74;color:#c2410c}
.nj-type-system{background:#ede9fe;border-color:#c4b5fd;color:#6d28d9}
.nj-dc-chip{display:inline-block;font-size:11px;padding:2px 8px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:2px 3px 2px 0}
.nj-svc-chip{display:inline-block;font-size:12px;padding:2px 9px;border-radius:6px;background:#dcfce7;border:1px solid #86efac;color:#15803d;font-family:ui-monospace,monospace;margin:2px 3px 2px 0}
.nj-tbl{width:100%;border-collapse:collapse;font-size:13px}
.nj-tbl td{padding:5px 12px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top}
.nj-tbl tr:last-child td{border-bottom:none}
.nj-label{color:var(--fg-2,#888);font-size:12px;white-space:nowrap;min-width:120px}
.nj-link{border:0;background:transparent;color:inherit;font:inherit;padding:0;text-align:left;cursor:pointer;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px}
.nj-link:hover{color:var(--accent,#2563eb)}
.nj-mask-reason{font-size:11px;color:var(--fg-2,#888);font-family:system-ui,sans-serif;margin-left:4px}
.nj-source-key{color:#00a36c;font-weight:700}
.nj-source-comment{color:#6e7781;font-style:italic}
`;

const HELP = {
  job: 'Nomad job identity and type. Service jobs run continuously.',
  datacenters: 'Datacenters where Nomad may place allocations.',
  groups: 'Task groups are scheduled together and share network context.',
  tasks: 'Nomad tasks define the driver, runtime config, env, resources, and service checks.',
  driver: 'Task driver such as docker or exec.',
  image: 'Container image used by a docker task. Digest pinning is most reproducible.',
  env: 'Task environment variables. Secret-looking values are redacted.',
  service: 'Service registration and health check coverage.',
  resources: 'CPU and memory reservations used for scheduling.',
};

function extract(text, pattern) {
  const m = text.match(pattern);
  return m ? m[1] : null;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function lineContaining(text, pattern, fallbackLine = 1) {
  const rx = pattern instanceof RegExp ? pattern : new RegExp(escapeRegExp(pattern));
  const lines = String(text || '').split(/\r?\n/);
  const idx = lines.findIndex((line) => rx.test(line));
  return idx >= 0 ? idx + 1 : fallbackLine;
}

function helpFor(key) {
  return HELP[key] || 'Open this Nomad item in source.';
}

function lineButton(label, line, key = label) {
  const title = `${helpFor(key)} Open line ${line || 1} in source.`;
  return `<button class="nj-link" type="button" data-source-line="${line || 1}" title="${esc(title)}">${esc(label)}</button>`;
}

function blockSlices(text, re) {
  const hits = [];
  let match;
  while ((match = re.exec(text)) !== null) hits.push({ name: match[1], index: match.index, line: lineContaining(text, match[0]) });
  return hits.map((hit, index) => ({
    ...hit,
    slice: text.slice(hit.index, hits[index + 1]?.index ?? text.length),
  }));
}

function parseAssignments(slice, baseLine) {
  const out = [];
  for (const [idx, line] of String(slice || '').split(/\r?\n/).entries()) {
    const m = line.match(/^\s*([A-Za-z_][\w-]*)\s*=\s*(?:"([^"]*)"|([^\s#]+))/);
    if (!m) continue;
    out.push({ key: m[1], value: m[2] ?? m[3] ?? '', line: baseLine + idx });
  }
  return out;
}

function parseTasks(text) {
  return blockSlices(text, /task\s+"([^"]+)"\s*\{/g).map((task) => {
    const assignments = parseAssignments(task.slice, task.line);
    const envVars = assignments.filter((item) => SECRETISH.test(item.key) || /^\s*env\s*\{/m.test(task.slice) && /^[A-Z_][A-Z0-9_]*$/.test(item.key));
    const image = extract(task.slice, /image\s*=\s*"([^"]+)"/);
    const driver = extract(task.slice, /driver\s*=\s*"([^"]+)"/);
    const command = extract(task.slice, /command\s*=\s*"([^"]+)"/);
    const serviceCount = (task.slice.match(/\bservice\s*\{/g) || []).length;
    const checkCount = (task.slice.match(/\bcheck\s*\{/g) || []).length;
    const cpu = extract(task.slice, /cpu\s*=\s*(\d+)/);
    const memory = extract(task.slice, /memory\s*=\s*(\d+)/);
    return {
      name: task.name,
      line: task.line,
      driver,
      image,
      imageLine: image ? lineContaining(text, new RegExp(`image\\s*=\\s*"${escapeRegExp(image)}"`), task.line) : task.line,
      command,
      serviceCount,
      checkCount,
      cpu,
      memory,
      envVars,
    };
  });
}

function imageReason(image) {
  if (!image) return '';
  if (/@sha256:/i.test(image)) return '';
  if (!image.includes(':')) return `${image} has no explicit tag or digest.`;
  if (/:latest(?:$|@)/i.test(image)) return `${image} uses the moving latest tag.`;
  return `${image} is tag-pinned but can still move; digest pinning is stricter.`;
}

function collectIssues(model) {
  const issues = [];
  for (const task of model.tasks) {
    const image = imageReason(task.image);
    if (image) {
      issues.push({
        severity: /latest|no explicit/i.test(image) ? 'warning' : 'info',
        label: 'task image',
        line: task.imageLine,
        message: `${task.name} uses ${image} Prefer a digest for reproducible allocations.`,
      });
    }
    if (task.driver === 'docker' && !task.checkCount) {
      issues.push({ severity: 'warning', label: 'health check', line: task.line, message: `${task.name} is a docker task without a service health check in this task block.` });
    }
    if (task.driver === 'exec') {
      issues.push({ severity: 'info', label: 'exec driver', line: task.line, message: `${task.name} uses the exec driver; confirm host-level process isolation is intended.` });
    }
    for (const env of task.envVars) {
      if (SECRETISH.test(env.key) || maskedValue(env.key, env.value).masked) {
        issues.push({ severity: 'warning', label: 'secret env', line: env.line, message: `${task.name}.${env.key} looks sensitive; prefer Nomad variables/templates or an external secret store.` });
      }
    }
  }
  return issues;
}

function renderEnvValue(env) {
  const masked = maskedValue(env.key, env.value);
  if (masked.masked || SECRETISH.test(env.key)) {
    const reason = masked.reason || `masked because "${env.key}" looks sensitive`;
    return `<span class="nj-chip nj-chip-warn" title="${esc(reason)}">${lineButton(env.key, env.line, 'env')}=[configured]</span><span class="nj-mask-reason">${esc(reason)}</span>`;
  }
  return `${lineButton(env.key, env.line, 'env')}=${esc(env.value)}`;
}

function redactSource(text) {
  return String(text || '').split(/\r?\n/).map((line) => {
    const m = line.match(/^(\s*)([A-Za-z_][\w-]*)\s*=\s*(.*)$/);
    if (m && (SECRETISH.test(m[2]) || maskedValue(m[2], m[3]).masked)) return `${m[1]}${m[2]} = [configured]`;
    return line;
  }).join('\n');
}

function highlightHclLine(line) {
  const raw = esc(line);
  return raw.replace(/^(\s*)([A-Za-z_][\w-]*)(\s*=)/, `$1<span class="nj-source-key">$2</span>$3`)
    .replace(/(#.*|\/\/.*)$/, '<span class="nj-source-comment">$1</span>');
}

export async function render(intake) {
  const text = intake.text || (intake.bytes ? new TextDecoder().decode(intake.bytes) : '');

  ensureKnownUiStyle(document);
  const jobName = extract(text, /job\s+"([^"]+)"/);
  const jobLine = lineContaining(text, /job\s+"/);
  const jobType = extract(text, /type\s*=\s*"([^"]+)"/);
  const typeLine = lineContaining(text, /type\s*=/, jobLine);
  const dcLine = lineContaining(text, /datacenters\s*=/, jobLine);
  const dcMatch = text.match(/datacenters\s*=\s*\[([^\]]+)\]/);
  const datacenters = dcMatch
    ? dcMatch[1].match(/"([^"]+)"/g)?.map((s) => s.replace(/"/g, '')) || []
    : [];

  const groups = blockSlices(text, /group\s+"([^"]+)"\s*\{/g).map((group) => {
    const count = extract(group.slice, /count\s*=\s*(\d+)/);
    const driver = extract(group.slice, /driver\s*=\s*"([^"]+)"/);
    return { name: group.name, count: count || '1', driver: driver || null, line: group.line };
  });
  const tasks = parseTasks(text);
  const services = [];
  let sm;
  const svcRe = /service\s*\{[^}]*name\s*=\s*"([^"]+)"/gs;
  while ((sm = svcRe.exec(text)) !== null) services.push({ name: sm[1], line: lineContaining(text, new RegExp(`name\\s*=\\s*"${escapeRegExp(sm[1])}"`), jobLine) });

  const typeBadgeClass = jobType === 'service'
    ? 'nj-chip nj-type-service'
    : jobType === 'batch'
      ? 'nj-chip nj-type-batch'
      : jobType === 'system'
        ? 'nj-chip nj-type-system'
        : 'nj-chip';

  const dcsHtml = datacenters.length
    ? `<div class="nj-sec"><h3>${lineButton(`Datacenters (${datacenters.length})`, dcLine, 'datacenters')}</h3><div>${datacenters.map((dc) => `<span class="nj-dc-chip">${esc(dc)}</span>`).join('')}</div></div>`
    : '';

  const groupsHtml = groups.length
    ? `<div class="nj-sec"><h3>${lineButton(`Task Groups (${groups.length})`, groups[0].line, 'groups')}</h3>${groups.map((g) => `
<div class="nj-card">
  <div class="nj-card-title">${lineButton(g.name, g.line, 'groups')}</div>
  <table class="nj-tbl">
    <tr><td class="nj-label">count</td><td class="nj-val">${esc(g.count)}</td></tr>
    ${g.driver ? `<tr><td class="nj-label">first driver</td><td class="nj-val">${esc(g.driver)}</td></tr>` : ''}
  </table>
</div>`).join('')}</div>`
    : '';

  const tasksHtml = tasks.length
    ? `<div class="nj-sec"><h3>${lineButton(`Tasks (${tasks.length})`, tasks[0].line, 'tasks')}</h3>${tasks.map((task) => `
<div class="nj-card">
  <div class="nj-card-title">${lineButton(task.name, task.line, 'tasks')}${task.driver ? `<span class="nj-chip">${lineButton(task.driver, task.line, 'driver')}</span>` : ''}</div>
  <table class="nj-tbl">
    ${task.image ? `<tr><td class="nj-label">image</td><td class="nj-val">${lineButton(task.image, task.imageLine, 'image')}</td></tr>` : ''}
    ${task.command ? `<tr><td class="nj-label">command</td><td class="nj-val">${esc(task.command)}</td></tr>` : ''}
    ${task.cpu || task.memory ? `<tr><td class="nj-label">resources</td><td class="nj-val">${task.cpu ? `${esc(task.cpu)} MHz` : ''}${task.cpu && task.memory ? ' / ' : ''}${task.memory ? `${esc(task.memory)} MB` : ''}</td></tr>` : ''}
    <tr><td class="nj-label">services</td><td class="nj-val">${esc(task.serviceCount)} registration${task.serviceCount === 1 ? '' : 's'}, ${esc(task.checkCount)} check${task.checkCount === 1 ? '' : 's'}</td></tr>
    ${task.envVars.length ? `<tr><td class="nj-label">env</td><td class="nj-val">${task.envVars.map(renderEnvValue).join(' ')}</td></tr>` : ''}
  </table>
</div>`).join('')}</div>`
    : '';

  const servicesHtml = services.length
    ? `<div class="nj-sec"><h3>${lineButton(`Services (${services.length})`, services[0].line, 'service')}</h3><div>${services.map((s) => `<span class="nj-svc-chip">${lineButton(s.name, s.line, 'service')}</span>`).join('')}</div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'nj-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="nj-title"><span class="nj-badge">Nomad Job</span>${lineButton(jobName || 'Nomad Job', jobLine, 'job')}</div>
<div class="nj-sub">${jobType ? `<span class="${typeBadgeClass}">${lineButton(jobType, typeLine, 'job')}</span>` : ''}HashiCorp Nomad job specification</div>
${dcsHtml}
${groupsHtml}
${tasksHtml}
${servicesHtml}`;

  const review = issueList(collectIssues({ tasks }), { title: 'Nomad Review' });
  if (review) host.insertBefore(review, host.querySelector('.nj-sec') || null);
  host.appendChild(sourcePreview(redactSource(text), {
    title: 'Redacted source',
    collapsed: true,
    idPrefix: 'nomad-line',
    highlighter: highlightHclLine,
  }));
  wireSourceLinks(host, { idPrefix: 'nomad-line' });
  return { parentNode: host };
}
