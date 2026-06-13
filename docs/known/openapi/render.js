// Enhanced OpenAPI/Swagger view (parent pane, trusted DOM). Parses the spec (JSON directly, or
// YAML via the vendored js-yaml) and renders the API info + every path's operations as a scannable
// endpoint list with colour-coded HTTP methods. Pure data parsing — nothing is requested or run.
import { loadGlobal, vendor } from '../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'];

async function parseSpec(intake) {
  const text = intake.text || '';
  try { return JSON.parse(text); } catch { /* not JSON — try YAML */ }
  const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
  return jsyaml.load(text);
}

export async function render(intake, _ctx) {
  let spec;
  try { spec = await parseSpec(intake); }
  catch (e) { const d = document.createElement('div'); d.className = 'pj-doc'; d.innerHTML = '<p class="pj-err">Could not parse spec: ' + esc(e.message) + '</p>'; return { parentNode: d }; }

  const info = spec.info || {};
  const version = spec.openapi || spec.swagger || '';
  const paths = spec.paths && typeof spec.paths === 'object' ? spec.paths : {};
  const rows = [];
  for (const p of Object.keys(paths).sort()) {
    const ops = paths[p] || {};
    for (const method of METHODS) {
      if (!ops[method]) continue;
      const op = ops[method] || {};
      const summary = op.summary || op.operationId || '';
      rows.push('<li class="oa-row"><span class="oa-method oa-' + method + '">' + method.toUpperCase() + '</span>'
        + '<code class="oa-path">' + esc(p) + '</code>'
        + (summary ? '<span class="oa-summary">' + esc(summary) + '</span>' : '') + '</li>');
    }
  }

  const meta = [version && ('spec ' + version), info.version && ('v' + info.version)]
    .filter(Boolean).map((m) => '<span class="pj-tag">' + esc(m) + '</span>').join('');

  const el = document.createElement('div');
  el.className = 'pj-doc';
  el.innerHTML =
    '<header class="pj-head"><div class="pj-title">🔌 ' + esc(info.title || 'API') + '</div>'
    + '<div class="pj-meta">' + meta + '</div></header>'
    + (info.description ? '<p class="pj-desc">' + esc(String(info.description).slice(0, 300)) + '</p>' : '')
    + '<section class="pj-sec"><h3>Endpoints <span class="pj-count">' + rows.length + '</span></h3>'
    + (rows.length ? '<ul class="kf-list oa-list">' + rows.join('') + '</ul>' : '<p class="kf-note">No paths defined.</p>')
    + '</section>';
  return { parentNode: el };
}
