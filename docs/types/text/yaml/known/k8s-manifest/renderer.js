import { chip, ensureKnownUiStyle, esc, issueList, maskedValue, sourceButton, sourcePreview, wireSourceLinks } from '../../../../../core/known-ui.js';

const CSS = `
.k8s-doc{padding:16px 18px;max-width:920px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-k8s{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#326CE5;color:#fff;margin-right:8px;vertical-align:middle;}
.k8s-kind{font-size:19px;font-weight:700;margin:0;}
.k8s-api{font-size:12px;color:var(--fg-2,#888);margin:2px 0 10px;}
.k8s-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.k8s-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.k8s-card strong{display:block;font-size:1.2rem;font-weight:700;}
.k8s-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.k8s-sec{margin:14px 0;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.k8s-sec-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.k8s-list{margin:0;padding:0;list-style:none;}
.k8s-list li{padding:6px 14px;border-bottom:1px solid var(--border,#eaecf0);font-size:12px;display:flex;gap:7px;align-items:baseline;flex-wrap:wrap;}
.k8s-list li:last-child{border-bottom:none;}
.k8s-note{color:var(--fg-2,#5a6678);font-family:system-ui,sans-serif;font-size:12px;flex-basis:100%;}
.k8s-yaml-key{color:#0550ae;font-weight:600;}
.k8s-yaml-str{color:#0a6640;}
.k8s-yaml-comment{color:#6e7781;font-style:italic;}
`;

const KIND_COLOR = {
  Deployment: '#326CE5', Service: '#7B61FF', ConfigMap: '#F5A623', Secret: '#E53935',
  Ingress: '#00897B', Pod: '#6D4C41', StatefulSet: '#00838F', DaemonSet: '#546E7A',
  Job: '#558B2F', CronJob: '#EF6C00', Namespace: '#5E35B1', default: '#326CE5',
};

export async function render(intake) {
  const text = intake.text || '';
  const model = parseManifest(text);
  const color = KIND_COLOR[model.kind.value] || KIND_COLOR.default;

  const host = document.createElement('div');
  host.className = 'k8s-doc';
  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);
  ensureKnownUiStyle(host);

  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:4px';
  const badge = document.createElement('span');
  badge.className = 'badge-k8s';
  badge.style.background = color;
  badge.textContent = 'Kubernetes';
  const kindEl = document.createElement('span');
  kindEl.className = 'k8s-kind';
  kindEl.textContent = model.kind.value;
  header.appendChild(badge);
  header.appendChild(kindEl);
  host.appendChild(header);

  const api = document.createElement('div');
  api.className = 'k8s-api';
  api.textContent = model.apiVersion.value;
  host.appendChild(api);

  const cards = document.createElement('div');
  cards.className = 'k8s-cards';
  for (const { value, label } of [
    { value: model.containers.length, label: 'Containers' },
    { value: model.ports.length, label: 'Ports' },
    { value: model.env.length, label: 'Env vars' },
    { value: model.issues.length, label: 'Review notes' },
  ]) {
    const card = document.createElement('div');
    card.className = 'k8s-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  appendList(host, 'Resource', [
    { label: 'Name', value: model.name.value, line: model.name.line, tone: 'ok' },
    { label: 'Namespace', value: model.namespace.value, line: model.namespace.line, tone: 'info' },
    { label: 'Kind', value: model.kind.value, line: model.kind.line, tone: 'info' },
  ].filter((item) => item.value), (li, item) => {
    li.appendChild(chip(item.label, item.tone));
    li.appendChild(sourceButton(item.value, item.line, `Open ${item.label.toLowerCase()} in source`));
  });

  appendList(host, 'Containers', model.containers, (li, c) => {
    li.appendChild(chip('container', 'ok'));
    li.appendChild(sourceButton(c.name || c.image || 'container', c.line, 'Open container in source'));
    if (c.image) li.appendChild(chip(c.image, isMutableImage(c.image) ? 'warn' : 'muted', isMutableImage(c.image) ? 'Image tag is mutable or omitted.' : 'Container image.'));
    if (c.ports.length) li.appendChild(chip(`ports ${c.ports.join(', ')}`, 'info'));
    if (c.hasProbe) li.appendChild(chip('probe', 'ok', 'Container has liveness/readiness/startup probe.'));
  });

  appendList(host, 'Environment Variables', model.env, (li, item) => {
    const masked = maskedValue(item.key, item.value);
    li.appendChild(chip('env', masked.masked ? 'warn' : 'info', masked.reason || 'Container environment variable.'));
    li.appendChild(sourceButton(item.key, item.line, 'Open environment variable in source'));
    if (item.value) li.appendChild(chip(masked.text, masked.masked ? 'danger' : 'muted', masked.reason));
  });

  const issueEl = issueList(model.issues, { title: 'Workload Review' });
  if (issueEl) host.appendChild(issueEl);

  host.appendChild(sourcePreview(redactSecretEnv(text, model.env), { title: 'Source', collapsed: true, idPrefix: 'k8s-line', highlighter: highlightYamlLine }));
  wireSourceLinks(host, { idPrefix: 'k8s-line' });

  return { parentNode: host };
}

function parseManifest(text) {
  const lines = text.split(/\r?\n/);
  const apiVersion = rootScalar(lines, 'apiVersion') || { value: '', line: 1 };
  const kind = rootScalar(lines, 'kind') || { value: 'Resource', line: 1 };
  const name = nestedScalar(lines, ['metadata', 'name']) || { value: '', line: 1 };
  const namespace = nestedScalar(lines, ['metadata', 'namespace']) || { value: '', line: 1 };
  const containers = parseContainers(lines);
  const env = containers.flatMap((c) => c.env);
  const ports = containers.flatMap((c) => c.ports.map((port) => ({ port, line: c.line })));
  const issues = [];
  const workload = ['Pod', 'Deployment', 'StatefulSet', 'DaemonSet', 'Job', 'CronJob'].includes(kind.value);

  for (const c of containers) {
    if (isMutableImage(c.image)) issues.push({ severity: 'warning', label: 'mutable image', line: c.imageLine || c.line, message: `Container "${c.name || c.image}" uses a mutable or missing image tag.` });
    if (workload && !c.hasProbe) issues.push({ severity: 'info', label: 'missing healthcheck', line: c.line, message: `Container "${c.name || c.image}" has no liveness, readiness, or startup probe.` });
    if (c.privileged) issues.push({ severity: 'warning', label: 'privileged', line: c.privilegedLine, message: `Container "${c.name || c.image}" runs privileged.` });
    if (c.allowPrivilegeEscalation) issues.push({ severity: 'warning', label: 'privilege escalation', line: c.allowPrivilegeLine, message: `Container "${c.name || c.image}" allows privilege escalation.` });
    for (const hostPort of c.hostPorts) issues.push({ severity: 'warning', label: 'public bind', line: hostPort.line, message: `Container "${c.name || c.image}" exposes hostPort ${hostPort.port}.` });
  }
  for (const flag of ['hostNetwork', 'hostPID', 'hostIPC']) {
    const found = scalarAny(lines, flag);
    if (found?.value === 'true') issues.push({ severity: 'warning', label: flag, line: found.line, message: `${flag}: true shares host-level namespaces with the workload.` });
  }
  const serviceType = kind.value === 'Service' ? nestedScalar(lines, ['spec', 'type']) : null;
  if (serviceType && /^(NodePort|LoadBalancer)$/i.test(serviceType.value)) {
    issues.push({ severity: 'warning', label: 'public service', line: serviceType.line, message: `Service type ${serviceType.value} can expose traffic outside the cluster.` });
  }
  for (const item of env) {
    if (maskedValue(item.key, item.value).masked) issues.push({ severity: 'warning', label: 'secret env', line: item.line, message: `${item.key} looks sensitive and is masked in the preview.` });
  }

  return { apiVersion, kind, name, namespace, containers, env, ports, issues };
}

function parseContainers(lines) {
  const containers = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(\s*)-\s+name\s*:\s*(.+)$/);
    if (!m || !isInsideContainers(lines, i)) continue;
    const indent = m[1].length;
    const end = nextListItemOrDedent(lines, i + 1, indent);
    const block = lines.slice(i, end);
    const c = {
      name: cleanScalar(m[2]),
      line: i + 1,
      image: '',
      imageLine: 0,
      ports: [],
      hostPorts: [],
      env: [],
      hasProbe: false,
      privileged: false,
      privilegedLine: 0,
      allowPrivilegeEscalation: false,
      allowPrivilegeLine: 0,
    };
    for (let j = 0; j < block.length; j++) {
      const lineNo = i + j + 1;
      const image = block[j].match(/^\s+image\s*:\s*(.+)$/);
      if (image) { c.image = cleanScalar(image[1]); c.imageLine = lineNo; }
      const port = block[j].match(/^\s+-?\s*containerPort\s*:\s*(\d+)/);
      if (port) c.ports.push(port[1]);
      const hostPort = block[j].match(/^\s+-?\s*hostPort\s*:\s*(\d+)/);
      if (hostPort) c.hostPorts.push({ port: hostPort[1], line: lineNo });
      const envName = block[j].match(/^\s+-\s+name\s*:\s*([\w.-]+)/);
      const envValue = block[j + 1]?.match(/^\s+value\s*:\s*(.+)$/);
      if (envName && envValue) c.env.push({ key: envName[1], value: cleanScalar(envValue[1]), line: lineNo });
      if (/^\s+(livenessProbe|readinessProbe|startupProbe)\s*:/.test(block[j])) c.hasProbe = true;
      const priv = block[j].match(/^\s+privileged\s*:\s*(true|false)/i);
      if (priv?.[1].toLowerCase() === 'true') { c.privileged = true; c.privilegedLine = lineNo; }
      const allow = block[j].match(/^\s+allowPrivilegeEscalation\s*:\s*(true|false)/i);
      if (allow?.[1].toLowerCase() === 'true') { c.allowPrivilegeEscalation = true; c.allowPrivilegeLine = lineNo; }
    }
    containers.push(c);
    i = end - 1;
  }
  return containers;
}

function isInsideContainers(lines, index) {
  for (let i = index - 1; i >= 0; i--) {
    if (/^\s*containers\s*:/.test(lines[i])) return true;
    if (/^\S/.test(lines[i])) return false;
  }
  return false;
}

function nextListItemOrDedent(lines, start, indent) {
  for (let i = start; i < lines.length; i++) {
    if (lines[i].trim() && leadingSpaces(lines[i]) <= indent && /^\s*-\s+name\s*:/.test(lines[i])) return i;
    if (lines[i].trim() && leadingSpaces(lines[i]) < indent) return i;
  }
  return lines.length;
}

function rootScalar(lines, key) {
  const re = new RegExp(`^${key}\\s*:\\s*(.+)$`);
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(re);
    if (m) return { value: cleanScalar(m[1]), line: i + 1 };
  }
  return null;
}

function nestedScalar(lines, path) {
  const root = lines.findIndex((line) => new RegExp(`^${path[0]}\\s*:`).test(line));
  if (root < 0) return null;
  const re = new RegExp(`^ {2}${path[1]}\\s*:\\s*(.+)$`);
  for (let i = root + 1; i < lines.length; i++) {
    if (/^\S/.test(lines[i])) break;
    const m = lines[i].match(re);
    if (m) return { value: cleanScalar(m[1]), line: i + 1 };
  }
  return null;
}

function scalarAny(lines, key) {
  const re = new RegExp(`^\\s+${key}\\s*:\\s*(.+)$`);
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(re);
    if (m) return { value: cleanScalar(m[1]), line: i + 1 };
  }
  return null;
}

function leadingSpaces(line) {
  return line.match(/^\s*/)[0].length;
}

function cleanScalar(value) {
  return String(value || '').trim().replace(/^['"]|['"]$/g, '');
}

function isMutableImage(image) {
  if (!image) return false;
  const last = image.split('/').pop();
  return !last.includes(':') || /:latest$/i.test(last);
}

function redactSecretEnv(text, env) {
  const secretLines = new Map();
  for (const item of env) {
    if (maskedValue(item.key, item.value).masked) secretLines.set(item.line + 1, item.key);
  }
  if (!secretLines.size) return text;
  return text.split(/\r?\n/).map((line, idx) => secretLines.has(idx + 1) ? line.replace(/(value\s*:\s*).+$/, '$1********') : line).join('\n');
}

function appendList(host, title, items, renderItem) {
  if (!items.length) return;
  const sec = document.createElement('section');
  sec.className = 'k8s-sec';
  const hd = document.createElement('div');
  hd.className = 'k8s-sec-hd';
  hd.textContent = `${title} (${items.length})`;
  sec.appendChild(hd);
  const ul = document.createElement('ul');
  ul.className = 'k8s-list';
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
  out = out.replace(/(#.*)$/g, '<span class="k8s-yaml-comment">$1</span>');
  out = out.replace(/^(\s*[-\w.]+)(\s*:)/, '<span class="k8s-yaml-key">$1</span>$2');
  out = out.replace(/(:\s*)("[^"]*"|'[^']*')/, '$1<span class="k8s-yaml-str">$2</span>');
  return out;
}
