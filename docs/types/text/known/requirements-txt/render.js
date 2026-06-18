// Enhanced requirements.txt view (parent pane, trusted DOM). Each requirement line is parsed
// into { name, extras, version } and linked to its PyPI page (href-only — no request until the
// user clicks, so the zero-off-origin-at-runtime guarantee holds). Non-dependency lines
// (options like -r/-e, editable installs, comments) are summarized so the view stays scannable.
import { parseRequirementsText, summarizeRequirements } from './parse.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pypiUrl = (name) => 'https://pypi.org/project/' + encodeURIComponent(name) + '/';
const ext = (href, text) => '<a class="pj-link" href="' + esc(href) + '" target="_blank" rel="noopener noreferrer">' + esc(text) + ' <span class="pj-ext">↗</span></a>';

export async function render(intake, _ctx) {
  const entries = parseRequirementsText(intake.text || '');
  const stats = summarizeRequirements(entries);
  const reqs = stats.requirements;
  const options = entries.filter((entry) => entry.kind !== 'requirement');

  const rows = reqs.map((r) => {
    const extras = r.extras.length ? '<span class="kf-tag">' + esc(r.extras.join(',')) + '</span>' : '';
    const marker = r.marker ? '<span class="kf-tag">' + esc(r.marker) + '</span>' : '';
    const spec = r.directRef ? '@ ' + r.directRef : r.specifier;
    const ver = spec ? '<code class="pj-ver">' + esc(spec) + '</code>' : '<span class="kf-note">(unpinned)</span>';
    return '<li class="kf-pat">' + ext(pypiUrl(r.name), r.name) + extras + marker + '<span style="flex:1"></span>' + ver + '</li>';
  }).join('');

  const optHtml = options.length
    ? '<section class="pj-sec"><h3>Options <span class="pj-count">' + options.length + '</span></h3><ul class="kf-list">'
      + options.map((o) => '<li class="kf-pat"><code>' + esc(o.raw) + '</code><span class="kf-tag">' + esc(o.kind) + '</span></li>').join('') + '</ul></section>'
    : '';

  const el = document.createElement('div');
  el.className = 'pj-doc';
  el.innerHTML =
    '<header class="pj-head"><div class="pj-title">🐍 ' + esc((intake.filename || 'requirements.txt').split('/').pop()) + '</div>'
    + '<div class="pj-meta">' + reqs.length + ' package' + (reqs.length === 1 ? '' : 's') + '</div></header>'
    + (reqs.length
        ? '<section class="pj-sec"><h3>Dependencies <span class="pj-count">' + reqs.length + '</span></h3><ul class="kf-list">' + rows + '</ul></section>'
        : '<p class="kf-note">No pinned packages found.</p>')
    + optHtml;
  return { parentNode: el };
}
