// Enhanced docker-compose view: one card per service. Parses YAML with the vendored js-yaml.
import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
import { asArray, buildContext, classifyVolume, imageLink, isLocalPath, isRelativePath, splitVolumeShortSyntax } from './shared.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ext = (href, text) => '<a class="pj-link" href="' + esc(href) + '" target="_blank" rel="noopener noreferrer">' + esc(text) + ' <span class="pj-ext">↗</span></a>';
const tag = (text) => '<span class="kf-tag">' + esc(text) + '</span>';

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

export async function render(intake, _ctx) {
  const host = document.createElement('div');
  host.className = 'pj-doc';
  let doc;
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    doc = jsyaml.load(intake.text || '') || {};
  } catch (e) { host.innerHTML = '<p class="pj-err">Invalid YAML: ' + esc(e.message) + '</p>'; return { parentNode: host }; }

  const services = doc.services && typeof doc.services === 'object' ? doc.services : {};
  const topVolumes = doc.volumes && typeof doc.volumes === 'object' ? doc.volumes : {};
  const names = Object.keys(services);
  const cards = names.map((name) => {
    const s = services[name] || {};
    const src = renderSource(s);
    const hints = localHints(s, topVolumes);
    return '<section class="kf-svc"><h3>' + esc(name) + '</h3>'
      + (src ? '<div class="kf-field"><span class="kf-fvals">' + src + '</span></div>' : '')
      + field('ports', s.ports) + field('depends on', s.depends_on) + field('environment', s.environment)
      + field('volumes', s.volumes, (volume) => renderVolume(volume, topVolumes)) + field('networks', s.networks)
      + (hints.length ? field('local hints', hints) : '') + '</section>';
  }).join('');

  const extras = ['volumes', 'networks'].filter((k) => doc[k] && typeof doc[k] === 'object')
    .map((k) => '<p class="pj-meta">' + esc(k) + ': ' + Object.keys(doc[k]).map(esc).join(', ') + '</p>').join('');

  host.innerHTML = '<header class="pj-head"><h2>Compose stack</h2><p class="pj-meta">' + names.length
    + ' service' + (names.length === 1 ? '' : 's') + (doc.version ? ' · schema ' + esc(doc.version) : '') + '</p>' + extras + '</header>'
    + (cards || '<p class="pj-meta">No services defined.</p>');
  return { parentNode: host };
}

export const testExports = { imageLink, localHints, renderSource, renderVolume };
