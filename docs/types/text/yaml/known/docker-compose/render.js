// Enhanced docker-compose view: one card per service. Parses YAML with the vendored js-yaml.
import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const asList = (v) => Array.isArray(v) ? v : (v && typeof v === 'object' ? Object.entries(v).map(([k, val]) => k + '=' + val) : v != null ? [v] : []);

function field(label, v) {
  const items = asList(v);
  if (!items.length) return '';
  return '<div class="kf-field"><span class="kf-flabel">' + esc(label) + '</span>'
    + '<span class="kf-fvals">' + items.map((x) => '<code>' + esc(typeof x === 'object' ? JSON.stringify(x) : x) + '</code>').join(' ') + '</span></div>';
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
  const names = Object.keys(services);
  const cards = names.map((name) => {
    const s = services[name] || {};
    const src = s.image ? 'image: <code>' + esc(s.image) + '</code>' : s.build ? 'build: <code>' + esc(typeof s.build === 'object' ? JSON.stringify(s.build) : s.build) + '</code>' : '';
    return '<section class="kf-svc"><h3>' + esc(name) + '</h3>'
      + (src ? '<div class="kf-field"><span class="kf-fvals">' + src + '</span></div>' : '')
      + field('ports', s.ports) + field('depends on', s.depends_on) + field('environment', s.environment)
      + field('volumes', s.volumes) + field('networks', s.networks) + '</section>';
  }).join('');

  const extras = ['volumes', 'networks'].filter((k) => doc[k] && typeof doc[k] === 'object')
    .map((k) => '<p class="pj-meta">' + esc(k) + ': ' + Object.keys(doc[k]).map(esc).join(', ') + '</p>').join('');

  host.innerHTML = '<header class="pj-head"><h2>Compose stack</h2><p class="pj-meta">' + names.length
    + ' service' + (names.length === 1 ? '' : 's') + (doc.version ? ' · schema ' + esc(doc.version) : '') + '</p>' + extras + '</header>'
    + (cards || '<p class="pj-meta">No services defined.</p>');
  return { parentNode: host };
}
