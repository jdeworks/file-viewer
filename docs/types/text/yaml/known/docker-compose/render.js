// Enhanced docker-compose view: one card per service. Parses YAML with the vendored js-yaml.
import { ensureKnownUiStyle, esc, issueList, maskedValue, sourcePreview, wireSourceLinks } from '../../../../../core/known-ui.js';
import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
import { asArray, buildContext, classifyVolume, imageLink, isLocalPath, isRelativePath, splitVolumeShortSyntax } from './shared.js';

const ext = (href, text) => '<a class="pj-link" href="' + esc(href) + '" target="_blank" rel="noopener noreferrer">' + esc(text) + ' <span class="pj-ext">↗</span></a>';
const tag = (text) => '<span class="kf-tag">' + esc(text) + '</span>';
const sourceLink = (text, line) => '<button type="button" class="kf-source-link" data-source-line="' + esc(line || 1) + '">' + esc(text) + '</button>';

const asList = (v) => Array.isArray(v) ? v : (v && typeof v === 'object' ? Object.entries(v).map(([k, val]) => k + '=' + val) : v != null ? [v] : []);

function field(label, v, formatter = defaultValue) {
  const items = asList(v);
  if (!items.length) return '';
  return '<div class="kf-field"><span class="kf-flabel">' + esc(label) + '</span>'
    + '<span class="kf-fvals">' + items.map(formatter).join(' ') + '</span></div>';
}

function defaultValue(x) {
  return '<code>' + esc(typeof x === 'object' ? JSON.stringify(x) : x) + '</code>';
}

function renderSource(svc) {
  if (svc.image) {
    const text = String(svc.image);
    const href = imageLink(text);
    return 'image: ' + (href ? ext(href, text) : '<code>' + esc(text) + '</code>');
  }
  if (!svc.build) return '';
  const context = buildContext(svc.build);
  const raw = typeof svc.build === 'object' ? JSON.stringify(svc.build) : svc.build;
  const note = context === '.'
    ? ' ' + tag('current directory build context')
    : context && isLocalPath(context) ? ' ' + tag('local build context') : '';
  return 'build: <code>' + esc(raw) + '</code>' + note;
}

function renderVolume(entry, topVolumes) {
  const kind = classifyVolume(entry, topVolumes);
  let source = '';
  if (typeof entry === 'string') source = splitVolumeShortSyntax(entry).source;
  else if (entry && typeof entry === 'object') source = String(entry.source || entry.src || '');
  const detail = kind === 'bind'
    ? (isRelativePath(source) ? 'relative bind' : 'bind mount')
    : kind === 'named' ? 'Docker-managed volume' : 'volume';
  return defaultValue(entry) + tag(detail);
}

function renderEnv(entry) {
  if (typeof entry === 'string') {
    const idx = entry.indexOf('=');
    if (idx < 0) return defaultValue(entry);
    const key = entry.slice(0, idx);
    const value = entry.slice(idx + 1);
    const masked = maskedValue(key, value);
    return '<code title="' + esc(masked.reason || '') + '">' + esc(key + '=' + masked.text) + '</code>'
      + (masked.masked ? tag('masked secret-like value') : '');
  }
  if (entry && typeof entry === 'object') {
    return Object.entries(entry).map(([key, value]) => {
      const masked = maskedValue(key, value);
      return '<code title="' + esc(masked.reason || '') + '">' + esc(key + '=' + masked.text) + '</code>'
        + (masked.masked ? tag('masked secret-like value') : '');
    }).join(' ');
  }
  return defaultValue(entry);
}

function localHints(svc, topVolumes) {
  const hints = [];
  if (!svc.image && !svc.build) hints.push('No image or build source is declared.');
  const context = buildContext(svc.build);
  if (context === '.') hints.push('build: . sends the current Compose file directory as the build context.');
  else if (context && isLocalPath(context)) hints.push('Build context depends on a local path: ' + context);
  const binds = asArray(svc.volumes).filter((volume) => classifyVolume(volume, topVolumes) === 'bind').length;
  if (binds) hints.push(String(binds) + ' bind mount' + (binds === 1 ? '' : 's') + ' depend on host-local paths.');
  const envFiles = asArray(svc.env_file).length;
  if (envFiles) hints.push(String(envFiles) + ' env_file reference' + (envFiles === 1 ? '' : 's') + ' depend on local files.');
  return hints;
}

function composeIssues(services, topVolumes, text) {
  const out = [];
  for (const [name, svc] of Object.entries(services)) {
    const line = lineOfService(text, name);
    const image = String(svc.image || '');
    if (svc.privileged === true) out.push({ severity: 'high', label: 'privileged', line: lineOfServiceKey(text, name, 'privileged') || line, message: `${name} runs with privileged container access.` });
    if (svc.network_mode === 'host') out.push({ severity: 'warning', label: 'host network', line: lineOfServiceKey(text, name, 'network_mode') || line, message: `${name} shares the host network namespace.` });
    if (svc.pid === 'host') out.push({ severity: 'warning', label: 'host pid', line: lineOfServiceKey(text, name, 'pid') || line, message: `${name} shares the host PID namespace.` });
    if (svc.ipc === 'host') out.push({ severity: 'warning', label: 'host ipc', line: lineOfServiceKey(text, name, 'ipc') || line, message: `${name} shares the host IPC namespace.` });
    if (svc.userns_mode === 'host') out.push({ severity: 'warning', label: 'host userns', line: lineOfServiceKey(text, name, 'userns_mode') || line, message: `${name} disables user-namespace isolation.` });
    const capabilities = asArray(svc.cap_add).map(String);
    if (capabilities.length) {
      const all = capabilities.some((capability) => capability.toUpperCase() === 'ALL');
      out.push({ severity: all ? 'high' : 'warning', label: 'added capabilities',
        line: lineOfServiceKey(text, name, 'cap_add') || line,
        message: `${name} adds ${all ? 'all Linux capabilities' : capabilities.join(', ')}.` });
    }
    const securityOptions = asArray(svc.security_opt).map(String);
    if (securityOptions.some((option) => /(?:seccomp|apparmor)[=:]unconfined/i.test(option))) {
      out.push({ severity: 'high', label: 'unconfined security',
        line: lineOfServiceKey(text, name, 'security_opt') || line,
        message: `${name} disables a seccomp or AppArmor confinement profile.` });
    }
    if (asArray(svc.devices).length || asArray(svc.device_cgroup_rules).length) {
      out.push({ severity: 'warning', label: 'host devices',
        line: lineOfServiceKey(text, name, 'devices') || line,
        message: `${name} receives explicit host-device access.` });
    }
    if (/^(?:0|root)(?::(?:0|root))?$/i.test(String(svc.user || ''))) {
      out.push({ severity: 'warning', label: 'root user', line: lineOfServiceKey(text, name, 'user') || line,
        message: `${name} explicitly runs as root.` });
    }
    const command = [svc.entrypoint, svc.command].flatMap(asArray).map(String).join(' ');
    if (/(?:curl|wget)\b[^\n|]*\|\s*(?:bash|sh)\b/i.test(command)) {
      out.push({ severity: 'high', label: 'network shell', line: lineOfServiceKey(text, name, svc.entrypoint ? 'entrypoint' : 'command') || line,
        message: `${name} appears to download and execute shell content at startup.` });
    }
    if (image.endsWith(':latest') || (!/:/.test(image) && image)) out.push({ severity: 'warning', label: 'floating image', line: lineOfServiceKey(text, name, 'image') || line, message: `${name} uses an unpinned image tag.` });
    for (const port of asArray(svc.ports)) {
      const value = typeof port === 'object' ? JSON.stringify(port) : String(port);
      if (/^(0\.0\.0\.0:)?\d+:\d+/.test(value) || /^"\d+:\d+"/.test(value)) {
        out.push({ severity: 'info', label: 'published port', line: lineOfServiceKey(text, name, 'ports') || line, message: `${name} publishes ${value}; confirm it should be reachable from the host.` });
      }
    }
    for (const volume of asArray(svc.volumes)) {
      const raw = typeof volume === 'object' ? JSON.stringify(volume) : String(volume);
      if (/docker\.sock/.test(raw)) out.push({ severity: 'high', label: 'docker socket', line: lineOfServiceKey(text, name, 'volumes') || line, message: `${name} mounts the Docker socket, which grants broad host control.` });
    }
    if (!svc.healthcheck && (svc.image || svc.build)) out.push({ severity: 'info', label: 'no healthcheck', line, message: `${name} has no healthcheck; depends_on will not wait for readiness.` });
    const envEntries = asArray(svc.environment);
    for (const env of envEntries) {
      if (typeof env === 'string') {
        const [key, value = ''] = env.split(/=(.*)/s);
        if (maskedValue(key, value).masked) out.push({ severity: 'warning', label: 'secret env', line: lineOfServiceKey(text, name, 'environment') || line, message: `${name} includes secret-like environment key ${key}; value is masked in this view.` });
      } else if (env && typeof env === 'object') {
        for (const [key, value] of Object.entries(env)) {
          if (maskedValue(key, value).masked) out.push({ severity: 'warning', label: 'secret env', line: lineOfServiceKey(text, name, 'environment') || line, message: `${name} includes secret-like environment key ${key}; value is masked in this view.` });
        }
      }
    }
  }
  return out;
}

function lineOfService(text, name) {
  const re = new RegExp('^\\s{2}' + escapeRegExp(name) + ':\\s*$', 'm');
  const m = re.exec(text || '');
  return m ? (text.slice(0, m.index).match(/\n/g) || []).length + 1 : 1;
}

function lineOfServiceKey(text, name, key) {
  const lines = String(text || '').split(/\r?\n/);
  const start = lineOfService(text, name) - 1;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^\s{2}\S/.test(lines[i])) break;
    if (new RegExp('^\\s{4}' + escapeRegExp(key) + ':').test(lines[i])) return i + 1;
  }
  return 0;
}

function highlightComposeSourceLine(line) {
  const envM = String(line).match(/^(\s*(?:-\s*)?)([A-Za-z0-9_.-]*(?:PASSWORD|TOKEN|SECRET|API_KEY|PRIVATE_KEY|CLIENT_SECRET)[A-Za-z0-9_.-]*)(\s*[:=]\s*)(.+)$/i);
  if (!envM) return esc(line);
  return esc(`${envM[1]}${envM[2]}${envM[3]}********`);
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function render(intake, _ctx) {
  const host = document.createElement('div');
  host.className = 'pj-doc';
  ensureKnownUiStyle(host);
  let doc;
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    doc = jsyaml.load(intake.text || '') || {};
  } catch (e) { host.innerHTML = '<p class="pj-err">Invalid YAML: ' + esc(e.message) + '</p>'; return { parentNode: host }; }

  const services = doc.services && typeof doc.services === 'object' ? doc.services : {};
  const topVolumes = doc.volumes && typeof doc.volumes === 'object' ? doc.volumes : {};
  const names = Object.keys(services);
  const issues = composeIssues(services, topVolumes, intake.text || '');
  const cards = names.map((name) => {
    const s = services[name] || {};
    const src = renderSource(s);
    const hints = localHints(s, topVolumes);
    const line = lineOfService(intake.text || '', name);
    return '<section class="kf-svc" data-source-line="' + esc(line) + '"><h3>' + sourceLink(name, line) + '</h3>'
      + (src ? '<div class="kf-field"><span class="kf-fvals">' + src + '</span></div>' : '')
      + field('command', s.command) + field('entrypoint', s.entrypoint) + field('user', s.user)
      + field('restart', s.restart) + field('read only', s.read_only) + field('privileged', s.privileged)
      + field('network mode', s.network_mode) + field('pid namespace', s.pid) + field('ipc namespace', s.ipc)
      + field('user namespace', s.userns_mode) + field('add capabilities', s.cap_add) + field('drop capabilities', s.cap_drop)
      + field('security options', s.security_opt) + field('devices', [...asArray(s.devices), ...asArray(s.device_cgroup_rules)])
      + field('ports', s.ports) + field('depends on', s.depends_on) + field('healthcheck', s.healthcheck ? [s.healthcheck] : null)
      + field('environment', s.environment, renderEnv)
      + field('volumes', s.volumes, (volume) => renderVolume(volume, topVolumes)) + field('networks', s.networks)
      + field('secrets', s.secrets) + field('configs', s.configs) + field('deploy', s.deploy ? [s.deploy] : null)
      + (hints.length ? field('local hints', hints) : '') + '</section>';
  }).join('');

  const extras = ['volumes', 'networks'].filter((k) => doc[k] && typeof doc[k] === 'object')
    .map((k) => '<p class="pj-meta">' + esc(k) + ': ' + Object.keys(doc[k]).map(esc).join(', ') + '</p>').join('');

  host.innerHTML = '<header class="pj-head"><h2>Compose stack</h2><p class="pj-meta">' + names.length
    + ' service' + (names.length === 1 ? '' : 's') + (doc.version ? ' · schema ' + esc(doc.version) : '') + '</p>' + extras + '</header>'
    + (cards || '<p class="pj-meta">No services defined.</p>');
  const issueEl = issueList(issues, { title: 'Compose Review' });
  if (issueEl) host.appendChild(issueEl);
  host.appendChild(sourcePreview(intake.text || '', { title: 'Source', collapsed: true, idPrefix: 'compose-line', highlighter: highlightComposeSourceLine }));
  wireSourceLinks(host, { idPrefix: 'compose-line' });
  return { parentNode: host };
}

export const testExports = { imageLink, localHints, renderSource, renderVolume };
