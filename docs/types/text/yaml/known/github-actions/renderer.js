import { chip, ensureKnownUiStyle, esc, issueList, maskedValue, sourceButton, sourcePreview, wireSourceLinks } from '../../../../../core/known-ui.js';

const CSS = `
.gha-doc{padding:16px 18px;max-width:920px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-gha{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1a7f37;color:#fff;margin-right:8px;vertical-align:middle;}
.gha-title{font-size:19px;font-weight:700;margin:0 0 4px;}
.gha-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.gha-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.gha-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.gha-card strong{display:block;font-size:1.2rem;font-weight:700;}
.gha-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.gha-sec{margin:14px 0;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.gha-sec-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.gha-list{margin:0;padding:0;list-style:none;}
.gha-list li{padding:6px 14px;border-bottom:1px solid var(--border,#eaecf0);font-size:12px;display:flex;gap:7px;align-items:baseline;flex-wrap:wrap;}
.gha-list li:last-child{border-bottom:none;}
.gha-edge{font-family:ui-monospace,monospace;}
.gha-note{color:var(--fg-2,#5a6678);font-family:system-ui,sans-serif;font-size:12px;flex-basis:100%;}
.gha-yaml-key{color:#0550ae;font-weight:600;}
.gha-yaml-str{color:#0a6640;}
.gha-yaml-comment{color:#6e7781;font-style:italic;}
`;

const TRIGGER_TITLE = {
  push: 'Runs after pushes to matching branches or tags.',
  pull_request: 'Runs on pull request activity with normal fork protections.',
  pull_request_target: 'Runs in the base repository context; risky when executing PR-controlled code.',
  workflow_dispatch: 'Manual trigger from the GitHub UI or API.',
  schedule: 'Runs from a cron schedule.',
  workflow_call: 'Reusable workflow callable by other workflows.',
};

export async function render(intake) {
  const text = intake.text || '';
  const model = parseWorkflow(text, intake.filename || '');

  const host = document.createElement('div');
  host.className = 'gha-doc';
  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);
  ensureKnownUiStyle(host);

  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:4px';
  const badge = document.createElement('span');
  badge.className = 'badge-gha';
  badge.textContent = 'GitHub Actions';
  const title = document.createElement('span');
  title.className = 'gha-title';
  title.textContent = model.name.value;
  header.appendChild(badge);
  header.appendChild(title);
  host.appendChild(header);

  const sub = document.createElement('div');
  sub.className = 'gha-sub';
  sub.textContent = `${model.triggers.length} trigger${model.triggers.length !== 1 ? 's' : ''} · ${model.jobs.length} job${model.jobs.length !== 1 ? 's' : ''} · ${model.actions.length} action step${model.actions.length !== 1 ? 's' : ''}`;
  host.appendChild(sub);

  const cards = document.createElement('div');
  cards.className = 'gha-cards';
  for (const { value, label } of [
    { value: model.triggers.length, label: 'Triggers' },
    { value: model.jobs.length, label: 'Jobs' },
    { value: model.actions.length, label: 'Actions' },
    { value: model.runs.length, label: 'Run steps' },
    { value: model.env.length, label: 'Env vars' },
    { value: model.issues.length, label: 'Risk notes' },
  ]) {
    const card = document.createElement('div');
    card.className = 'gha-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  appendList(host, 'Triggers', model.triggers, (li, trigger) => {
    li.appendChild(chip(trigger.event, trigger.event === 'pull_request_target' ? 'warn' : 'info', TRIGGER_TITLE[trigger.event] || 'Workflow event trigger.'));
    li.appendChild(sourceButton(trigger.detail || trigger.event, trigger.line, 'Open trigger in source'));
  });

  appendList(host, 'Job Graph', model.jobs, (li, job) => {
    li.appendChild(chip('job', 'ok'));
    li.appendChild(sourceButton(job.id, job.line, 'Open job in source'));
    if (job.runsOn) li.appendChild(chip(job.runsOn, /latest/i.test(job.runsOn) ? 'warn' : 'muted', 'Runner label. latest can shift as GitHub updates images.'));
    if (job.needs.length) li.appendChild(chip(`needs ${job.needs.join(', ')}`, 'info', 'Job dependency edges.'));
    li.appendChild(chip(`${job.stepCount} steps`, 'muted'));
  });

  appendList(host, 'Dependency Edges', model.edges, (li, edge) => {
    li.appendChild(chip('needs', edge.missing ? 'warn' : 'info', edge.missing ? 'Dependency target is not defined as a job in this workflow.' : 'Job dependency edge.'));
    const text = `${edge.from} -> ${edge.to}`;
    const label = document.createElement('span');
    label.className = 'gha-edge';
    label.appendChild(sourceButton(text, edge.line, 'Open dependency in source'));
    li.appendChild(label);
  });

  appendList(host, 'Action Steps', model.actions, (li, action) => {
    li.appendChild(chip('uses', isPinnedAction(action.ref) ? 'ok' : 'warn', isPinnedAction(action.ref) ? 'Pinned to a commit SHA.' : 'Mutable tags and missing refs can change without review.'));
    li.appendChild(sourceButton(action.uses, action.line, 'Open action step in source'));
  });

  appendList(host, 'Environment Variables', model.env, (li, env) => {
    const masked = maskedValue(env.key, env.value);
    li.appendChild(chip('env', masked.masked ? 'warn' : 'info', masked.reason || 'Workflow environment variable.'));
    li.appendChild(sourceButton(env.key, env.line, 'Open environment variable in source'));
    if (env.value) li.appendChild(chip(masked.text, masked.masked ? 'danger' : 'muted', masked.reason));
  });

  const issueEl = issueList(model.issues, { title: 'Workflow Review' });
  if (issueEl) host.appendChild(issueEl);

  host.appendChild(sourcePreview(redactSecretEnv(text, model.env), { title: 'Source', collapsed: true, idPrefix: 'gha-line', highlighter: highlightYamlLine }));
  wireSourceLinks(host, { idPrefix: 'gha-line' });

  return { parentNode: host };
}

function redactSecretEnv(text, env) {
  const secretLines = new Map();
  for (const item of env) {
    if (maskedValue(item.key, item.value).masked) secretLines.set(item.line, item.key);
  }
  if (!secretLines.size) return text;
  return text.split(/\r?\n/).map((line, idx) => {
    const key = secretLines.get(idx + 1);
    if (!key) return line;
    return line.replace(new RegExp(`(${escapeRegExp(key)}\\s*:\\s*).*$`), '$1********');
  }).join('\n');
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseWorkflow(text, filename) {
  const lines = text.split(/\r?\n/);
  const name = { value: scalarAt(lines, 'name')?.value || filename.split('/').pop() || 'Workflow', line: scalarAt(lines, 'name')?.line || 1 };
  const triggers = parseTriggers(lines);
  const jobs = parseJobs(lines);
  const env = parseTopEnv(lines);
  const actions = [];
  const runs = [];
  const permissions = parsePermissions(lines);
  const issues = [];
  const edges = collectEdges(jobs);
  const jobIds = new Set(jobs.map((job) => job.id));

  for (const job of jobs) {
    actions.push(...job.actions);
    runs.push(...job.runs);
  }

  for (const trigger of triggers) {
    if (trigger.event === 'pull_request_target') {
      issues.push({ severity: 'warning', label: 'risky trigger', line: trigger.line, message: 'pull_request_target runs with base-repository privileges. Avoid checking out and executing untrusted pull request code.' });
    }
  }
  for (const permission of permissions) {
    if (permission.scope === 'write-all' || permission.level === 'write') {
      issues.push({ severity: 'warning', label: 'broad permission', line: permission.line, message: permission.scope === 'write-all' ? 'Workflow grants write-all permissions.' : `Workflow grants ${permission.scope}: write.` });
    }
  }
  for (const action of actions) {
    if (!isPinnedAction(action.ref)) {
      issues.push({ severity: 'warning', label: 'unpinned action', line: action.line, message: `Action "${action.uses}" is not pinned to a full commit SHA.` });
    }
  }
  for (const run of runs) {
    if (/(curl|wget)\b[^|\n]*(\||>\s*\/tmp\/|bash|sh)|\|\s*(bash|sh)\b/i.test(run.command)) {
      issues.push({ severity: 'warning', label: 'shell download', line: run.line, message: 'Run step appears to download and execute shell content. Review supply-chain risk.' });
    }
  }
  for (const item of env) {
    const masked = maskedValue(item.key, item.value);
    if (masked.masked) issues.push({ severity: 'warning', label: 'secret env', line: item.line, message: `${item.key} looks sensitive and is masked in the preview.` });
  }
  for (const edge of edges) {
    if (!jobIds.has(edge.from)) {
      edge.missing = true;
      issues.push({ severity: 'warning', label: 'missing need', line: edge.line, message: `${edge.to} needs "${edge.from}", but no job with that id was found.` });
    }
  }

  return { name, triggers, jobs, env, actions, runs, permissions, edges, issues };
}

function scalarAt(lines, key) {
  const re = new RegExp(`^${key}\\s*:\\s*(.+)$`);
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(re);
    if (m) return { value: cleanScalar(m[1]), line: i + 1 };
  }
  return null;
}

function parseTriggers(lines) {
  const onLine = lines.findIndex((line) => /^on\s*:/.test(line));
  if (onLine < 0) return [];
  const inline = lines[onLine].match(/^on\s*:\s*(.+)$/);
  if (inline) return cleanScalar(inline[1]).replace(/[[\]]/g, '').split(',').map((event) => ({ event: event.trim(), detail: '', line: onLine + 1 })).filter((item) => item.event);
  const triggers = [];
  for (let i = onLine + 1; i < lines.length; i++) {
    if (/^\S/.test(lines[i])) break;
    const m = lines[i].match(/^ {2}([\w_-]+)\s*:/);
    if (!m) continue;
    const event = m[1];
    const detail = triggerDetail(lines, i);
    triggers.push({ event, detail, line: i + 1 });
  }
  return triggers;
}

function triggerDetail(lines, start) {
  const details = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (/^ {0,2}\S/.test(lines[i])) break;
    const branches = lines[i].match(/^ {4}branches\s*:\s*(.+)$/);
    if (branches) details.push(`branches ${cleanScalar(branches[1])}`);
    const cron = lines[i].match(/^ {6}-\s+cron\s*:\s*(.+)$/);
    if (cron) details.push(`cron ${cleanScalar(cron[1])}`);
  }
  return details.join(', ');
}

function parseJobs(lines) {
  const jobsLine = lines.findIndex((line) => /^jobs\s*:/.test(line));
  if (jobsLine < 0) return [];
  const jobs = [];
  for (let i = jobsLine + 1; i < lines.length; i++) {
    if (/^\S/.test(lines[i])) break;
    const m = lines[i].match(/^ {2}([\w-]+)\s*:/);
    if (!m) continue;
    const end = nextSiblingLine(lines, i, 2);
    const block = lines.slice(i, end);
    const runsOn = firstMatch(block, /^ {4}runs-on\s*:\s*(.+)$/);
    const needsRaw = firstMatch(block, /^ {4}needs\s*:\s*(.+)$/);
    const actions = [];
    const runs = [];
    for (let j = 0; j < block.length; j++) {
      const uses = block[j].match(/^ {6}-?\s*uses\s*:\s*(.+)$/) || block[j].match(/^ {8}uses\s*:\s*(.+)$/);
      if (uses) actions.push(actionInfo(cleanScalar(uses[1]), i + j + 1));
      const run = block[j].match(/^ {6}-?\s*run\s*:\s*(.+)$/) || block[j].match(/^ {8}run\s*:\s*(.+)$/);
      if (run) runs.push({ command: cleanScalar(run[1]), line: i + j + 1 });
    }
    const needsLine = needsRaw ? i + block.findIndex((line) => /^ {4}needs\s*:/.test(line)) + 1 : i + 1;
    jobs.push({ id: m[1], line: i + 1, needsLine, runsOn: runsOn ? cleanScalar(runsOn) : '', needs: parseNeeds(needsRaw), stepCount: (block.join('\n').match(/^ {6}-\s/gm) || []).length, actions, runs });
    i = end - 1;
  }
  return jobs;
}

function parseTopEnv(lines) {
  const envLine = lines.findIndex((line) => /^env\s*:/.test(line));
  if (envLine < 0) return [];
  const env = [];
  for (let i = envLine + 1; i < lines.length; i++) {
    if (/^\S/.test(lines[i])) break;
    const m = lines[i].match(/^ {2}([\w.-]+)\s*:\s*(.*)$/);
    if (m) env.push({ key: m[1], value: cleanScalar(m[2] || ''), line: i + 1 });
  }
  return env;
}

function parsePermissions(lines) {
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const single = lines[i].match(/^\s*permissions\s*:\s*(write-all|read-all|{})\s*$/);
    if (single) out.push({ scope: single[1], level: single[1], line: i + 1 });
    const scope = lines[i].match(/^\s{2,6}([\w-]+)\s*:\s*(write|read|none)\s*$/);
    if (scope) out.push({ scope: scope[1], level: scope[2], line: i + 1 });
  }
  return out;
}

function nextSiblingLine(lines, start, indent) {
  const re = new RegExp(`^ {${indent}}[\\w-]+\\s*:`);
  for (let i = start + 1; i < lines.length; i++) {
    if (/^\S/.test(lines[i])) return i;
    if (re.test(lines[i])) return i;
  }
  return lines.length;
}

function firstMatch(lines, re) {
  for (const line of lines) {
    const m = line.match(re);
    if (m) return m[1];
  }
  return '';
}

function cleanScalar(value) {
  return String(value || '').trim().replace(/^['"]|['"]$/g, '');
}

function parseNeeds(raw = '') {
  return cleanScalar(raw).replace(/[[\]]/g, '').split(',').map((s) => s.trim()).filter(Boolean);
}

function collectEdges(jobs) {
  const edges = [];
  for (const job of jobs) {
    for (const need of job.needs) {
      edges.push({ from: need, to: job.id, line: job.needsLine || job.line, missing: false });
    }
  }
  return edges;
}

function actionInfo(uses, line) {
  const at = uses.lastIndexOf('@');
  return { uses, ref: at >= 0 ? uses.slice(at + 1) : '', line };
}

function isPinnedAction(ref) {
  return /^[a-f0-9]{40}$/i.test(ref || '');
}

function appendList(host, title, items, renderItem) {
  if (!items.length) return;
  const sec = document.createElement('section');
  sec.className = 'gha-sec';
  const hd = document.createElement('div');
  hd.className = 'gha-sec-hd';
  hd.textContent = `${title} (${items.length})`;
  sec.appendChild(hd);
  const ul = document.createElement('ul');
  ul.className = 'gha-list';
  for (const item of items) {
    const li = document.createElement('li');
    renderItem(li, item);
    ul.appendChild(li);
  }
  sec.appendChild(ul);
  host.appendChild(sec);
}

function highlightYamlLine(line) {
  let out = esc(line);
  out = out.replace(/(#.*)$/g, '<span class="gha-yaml-comment">$1</span>');
  out = out.replace(/^(\s*[-\w.]+)(\s*:)/, '<span class="gha-yaml-key">$1</span>$2');
  out = out.replace(/(:\s*)("[^"]*"|'[^']*')/, '$1<span class="gha-yaml-str">$2</span>');
  return out;
}
