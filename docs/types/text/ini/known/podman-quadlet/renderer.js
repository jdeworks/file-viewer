import { parseIni } from '../../renderer.js';
import { ensureKnownUiStyle, issueList, maskedValue, sourcePreview, wireSourceLinks } from '../../../../../core/known-ui.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const SECRET_RE = /PASSWORD|SECRET|TOKEN|KEY|PASS/i;

const CSS = `
.pq-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.pq-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#892CA0;color:#fff;vertical-align:middle;margin-right:8px;}
.pq-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.pq-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.pq-sec{margin:14px 0;}
.pq-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.pq-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.pq-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:12px;}
.pq-kv-k{color:var(--fg-2,#888);min-width:140px;font-family:ui-monospace,monospace;flex-shrink:0;}
.pq-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.pq-env-list{display:flex;flex-direction:column;gap:3px;margin:0;}
.pq-env-row{display:flex;gap:6px;align-items:baseline;font-size:12px;font-family:ui-monospace,monospace;flex-wrap:wrap;}
.pq-env-key{color:var(--fg,#24292f);font-weight:600;}
.pq-env-val{color:var(--fg-2,#555);word-break:break-all;}
.pq-env-masked{color:#c2410c;font-style:italic;}
.pq-pills{display:flex;flex-wrap:wrap;gap:6px;}
.pq-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.pq-pill.warn{background:#fff7ed;border-color:#fed7aa;color:#c2410c;}
.pq-tag{display:inline-block;font-size:11px;padding:2px 7px;border-radius:5px;background:#f3e8ff;border:1px solid #d8b4fe;color:#6b21a8;margin-left:4px;font-family:ui-monospace,monospace;}
.pq-link{border:0;background:transparent;color:inherit;font:inherit;padding:0;text-align:left;cursor:pointer;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px;}
.pq-link:hover{color:var(--accent,#2563eb);}
.pq-mask-reason{font-size:11px;color:var(--fg-2,#888);font-family:system-ui,sans-serif;margin-left:4px;}
.pq-source-section{color:#892CA0;font-weight:700;}
.pq-source-key{color:#6b21a8;font-weight:700;}
.pq-source-comment{color:#6e7781;font-style:italic;}
`;

const HELP = {
  image: 'Container image used by this Quadlet unit. Digest pinning is most reproducible.',
  environment: 'Environment entries passed to the container. Secret-looking values are redacted.',
  volumes: 'Volume or bind mount entries attached to the container.',
  network: 'Podman network or pod network used by the unit.',
  ports: 'Host-to-container port publishing. Check whether host exposure is intended.',
  service: 'systemd service behavior for the generated unit.',
  install: 'systemd targets that enable this unit.',
  kube: 'Kubernetes YAML loaded by a Quadlet kube unit.',
  pod: 'Pod settings for a Quadlet pod unit.',
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

function lineForKey(text, key, value = '') {
  const valuePart = value ? `\\s*=\\s*${escapeRegExp(value)}` : '\\s*=';
  return lineContaining(text, new RegExp(`^\\s*${escapeRegExp(key)}${valuePart}`, 'i'));
}

function helpFor(key) {
  return HELP[key] || 'Open this Quadlet item in source.';
}

function lineButton(label, line, key = label) {
  const title = `${helpFor(key)} Open line ${line || 1} in source.`;
  return `<button class="pq-link" type="button" data-source-line="${line || 1}" title="${esc(title)}">${esc(label)}</button>`;
}

function kv(label, value, line, helpKey = label) {
  if (value == null || value === '') return '';
  return `<div class="pq-kv"><span class="pq-kv-k">${lineButton(label, line, helpKey)}</span><span class="pq-kv-v">${lineButton(value, line, helpKey)}</span></div>`;
}

function buildSectionMap(sections) {
  const m = {};
  for (const s of sections) {
    const key = (s.name || '').toLowerCase();
    if (!m[key]) m[key] = [];
    for (const p of s.pairs) m[key].push({ key: p.key, value: p.value });
  }
  return m;
}

function allValues(pairs, keyName) {
  const k = keyName.toLowerCase();
  return pairs.filter((p) => p.key.toLowerCase() === k).map((p) => p.value);
}

function firstValue(pairs, keyName, fallback = '') {
  return allValues(pairs, keyName)[0] ?? fallback;
}

function parseEnvLines(envLines, text) {
  const envVars = [];
  for (const line of envLines) {
    const eqIdx = line.indexOf('=');
    const sourceLine = lineForKey(text, 'Environment', line);
    if (eqIdx > 0) {
      const key = line.slice(0, eqIdx).trim();
      const value = line.slice(eqIdx + 1).trim();
      const masked = maskedValue(key, value);
      envVars.push({
        key,
        value,
        line: sourceLine,
        masked: masked.masked || SECRET_RE.test(key),
        reason: masked.reason || (SECRET_RE.test(key) ? `masked because "${key}" looks sensitive` : ''),
      });
    } else if (line.trim()) {
      envVars.push({ key: line.trim(), value: '', line: sourceLine, masked: false, reason: '' });
    }
  }
  return envVars;
}

function imageReason(image) {
  if (!image) return '';
  if (/@sha256:/i.test(image)) return '';
  if (!image.includes(':')) return `${image} has no explicit tag or digest.`;
  if (/:latest(?:$|@)/i.test(image)) return `${image} uses the moving latest tag.`;
  return `${image} is tag-pinned but can still move; digest pinning is stricter.`;
}

function isHostPath(volume) {
  const left = String(volume || '').split(':')[0] || '';
  return left.startsWith('/') || left.startsWith('./') || left.startsWith('../') || left.startsWith('~');
}

function collectIssues(model) {
  const issues = [];
  const image = imageReason(model.image);
  if (image) {
    issues.push({ severity: /latest|no explicit/i.test(image) ? 'warning' : 'info', label: 'image pin', line: model.imageLine, message: `${image} Prefer a digest when exact container contents matter.` });
  }
  for (const env of model.envVars) {
    if (env.masked) issues.push({ severity: 'warning', label: 'secret env', line: env.line, message: `${env.key} looks sensitive; use EnvironmentFile with protected permissions or a secret manager.` });
  }
  for (const port of model.ports) {
    issues.push({ severity: 'info', label: 'published port', line: port.line, message: `${port.value} publishes a host port; confirm the exposure is intended.` });
  }
  for (const volume of model.volumes) {
    if (isHostPath(volume.value)) issues.push({ severity: 'info', label: 'host bind', line: volume.line, message: `${volume.value} uses a host-local path; check ownership and SELinux labels.` });
  }
  if (/always/i.test(model.restart)) {
    issues.push({ severity: 'info', label: 'restart', line: model.restartLine, message: 'Restart=always will continuously restart the unit until systemd stops it.' });
  }
  return issues;
}

function redactSource(text) {
  return String(text || '').split(/\r?\n/).map((line) => {
    const env = line.match(/^(\s*Environment\s*=\s*)([^=\s]+)=(.*)$/i);
    if (env && (SECRET_RE.test(env[2]) || maskedValue(env[2], env[3]).masked)) return `${env[1]}${env[2]}=[configured]`;
    const kv = line.match(/^(\s*[^=\s]+\s*=\s*)(.*)$/);
    if (kv && maskedValue(kv[1], kv[2]).masked) return `${kv[1]}[configured]`;
    return line;
  }).join('\n');
}

function highlightIniLine(line) {
  const raw = esc(line);
  return raw.replace(/^(\s*\[[^\]]+\])/, '<span class="pq-source-section">$1</span>')
    .replace(/^(\s*)([A-Za-z][\w-]*)(\s*=)/, `$1<span class="pq-source-key">$2</span>$3`)
    .replace(/([#;].*)$/, '<span class="pq-source-comment">$1</span>');
}

export function render(intake) {
  const text = intake.text || '';
  const sections = parseIni(text);
  const sm = buildSectionMap(sections);

  ensureKnownUiStyle(document);
  const unitPairs = sm.unit || [];
  const containerPairs = sm.container || [];
  const podPairs = sm.pod || [];
  const kubePairs = sm.kube || [];
  const servicePairs = sm.service || [];
  const installPairs = sm.install || [];

  const description = firstValue(unitPairs, 'Description');
  const image = firstValue(containerPairs, 'Image');
  const envVars = parseEnvLines(allValues(containerPairs, 'Environment'), text);
  const volumes = allValues(containerPairs, 'Volume').map((value) => ({ value, line: lineForKey(text, 'Volume', value) }));
  const network = firstValue(containerPairs, 'Network') || firstValue(podPairs, 'Network');
  const ports = allValues(containerPairs, 'PublishPort').map((value) => ({ value, line: lineForKey(text, 'PublishPort', value) }));
  const podName = firstValue(podPairs, 'PodName');
  const kubeYaml = firstValue(kubePairs, 'Yaml');
  const restart = firstValue(servicePairs, 'Restart');
  const timeoutStart = firstValue(servicePairs, 'TimeoutStartSec');
  const wantedBy = firstValue(installPairs, 'WantedBy');
  const unitType = containerPairs.length ? 'Container' : podPairs.length ? 'Pod' : kubePairs.length ? 'Kube' : 'Network';
  const filename = (intake.name || intake.filename || '').split('/').pop();
  const imageLine = lineForKey(text, 'Image', image);
  const networkLine = lineForKey(text, 'Network', network);
  const restartLine = lineForKey(text, 'Restart', restart);

  const imageHtml = image ? `
<div class="pq-sec"><h3>${lineButton('Image', imageLine, 'image')}</h3><div class="pq-card">
${kv('Image', image, imageLine, 'image')}
</div></div>` : '';

  const envHtml = envVars.length ? `
<div class="pq-sec"><h3>${lineButton('Environment', envVars[0].line, 'environment')}</h3><div class="pq-card">
<div class="pq-env-list">
${envVars.map((e) => `<div class="pq-env-row"><span class="pq-env-key">${lineButton(e.key, e.line, 'environment')}</span><span>=</span>${e.masked ? `<span class="pq-env-masked" title="${esc(e.reason)}">[configured]</span><span class="pq-mask-reason">${esc(e.reason)}</span>` : `<span class="pq-env-val">${esc(e.value)}</span>`}</div>`).join('')}
</div>
</div></div>` : '';

  const volumeHtml = volumes.length ? `
<div class="pq-sec"><h3>${lineButton('Volumes', volumes[0].line, 'volumes')}</h3><div class="pq-card">
<div class="pq-pills">
${volumes.map((v) => `<span class="pq-pill">${lineButton(v.value, v.line, 'volumes')}</span>`).join('')}
</div>
</div></div>` : '';

  const networkHtml = network ? `
<div class="pq-sec"><h3>${lineButton('Network', networkLine, 'network')}</h3><div class="pq-card">
${kv('Network', network, networkLine, 'network')}
</div></div>` : '';

  const portsHtml = ports.length ? `
<div class="pq-sec"><h3>${lineButton('Ports', ports[0].line, 'ports')}</h3><div class="pq-card">
<div class="pq-pills">
${ports.map((p) => `<span class="pq-pill warn">${lineButton(p.value, p.line, 'ports')}</span>`).join('')}
</div>
</div></div>` : '';

  const kubeHtml = kubeYaml ? `
<div class="pq-sec"><h3>${lineButton('Kube YAML', lineForKey(text, 'Yaml', kubeYaml), 'kube')}</h3><div class="pq-card">
${kv('Yaml', kubeYaml, lineForKey(text, 'Yaml', kubeYaml), 'kube')}
</div></div>` : '';

  const podHtml = podName ? `
<div class="pq-sec"><h3>${lineButton('Pod', lineForKey(text, 'PodName', podName), 'pod')}</h3><div class="pq-card">
${kv('PodName', podName, lineForKey(text, 'PodName', podName), 'pod')}
</div></div>` : '';

  const serviceHtml = (restart || timeoutStart) ? `
<div class="pq-sec"><h3>${lineButton('Service', restartLine, 'service')}</h3><div class="pq-card">
${kv('Restart', restart, restartLine, 'service')}
${kv('TimeoutStartSec', timeoutStart, lineForKey(text, 'TimeoutStartSec', timeoutStart), 'service')}
</div></div>` : '';

  const installHtml = wantedBy ? `
<div class="pq-sec"><h3>${lineButton('Install', lineForKey(text, 'WantedBy', wantedBy), 'install')}</h3><div class="pq-card">
${kv('WantedBy', wantedBy, lineForKey(text, 'WantedBy', wantedBy), 'install')}
</div></div>` : '';

  const subParts = [];
  if (image) subParts.push(image);
  if (network) subParts.push(`net: ${network}`);
  if (ports.length) subParts.push(`ports: ${ports.map((p) => p.value).join(', ')}`);
  const sub = subParts.join(' · ');

  const host = document.createElement('div');
  host.className = 'pq-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="pq-badge">Podman Quadlet</span>
  <span class="pq-title">${lineButton(description || filename, lineForKey(text, 'Description', description), 'service')}</span>
  ${unitType ? `<span class="pq-tag">${esc(unitType)}</span>` : ''}
</div>
<div class="pq-sub">${esc(sub)}</div>
${imageHtml}${envHtml}${volumeHtml}${networkHtml}${portsHtml}${kubeHtml}${podHtml}${serviceHtml}${installHtml}`;

  const review = issueList(collectIssues({ image, imageLine, envVars, ports, volumes, restart, restartLine }), { title: 'Quadlet Review' });
  if (review) host.insertBefore(review, host.querySelector('.pq-sec') || null);
  host.appendChild(sourcePreview(redactSource(text), {
    title: 'Redacted source',
    collapsed: true,
    idPrefix: 'quadlet-line',
    highlighter: highlightIniLine,
  }));
  wireSourceLinks(host, { idPrefix: 'quadlet-line' });
  return { parentNode: host };
}
