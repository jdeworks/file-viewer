// Enhanced composer.json view (parent pane, trusted DOM). PHP package manifest:
// metadata, require/require-dev dependencies, Packagist links, source jumps, and review notes.
import { chip, ensureKnownUiStyle, esc, issueList, sourceButton, sourcePreview, wireSourceLinks } from '../../../../../core/known-ui.js';

const packagistUrl = (name) => 'https://packagist.org/packages/' + name.split('/').map(encodeURIComponent).join('/');
const isPlatform = (name) => /^(php(-64bit)?|hhvm|ext-|lib-|composer(-.*)?)/i.test(name);
const isSafeHref = (href) => /^https?:\/\//i.test(String(href || ''));

const CSS = `
.composer-json-key{color:#0550ae;font-weight:600}
.composer-json-str{color:#0a6640}
.composer-note{color:var(--fg-2,#5a6678);font-family:system-ui,sans-serif;font-size:12px}
`;

// `href` may come straight from an untrusted composer.json (homepage/support.source/support.issues) —
// only ever wire it up as a clickable link if it's http(s); otherwise render as inert text so a
// "javascript:" URI can't execute in the page's origin when clicked.
function extNode(href, text, className = 'pj-link') {
  if (!isSafeHref(href)) {
    const span = document.createElement('span');
    span.className = className;
    span.textContent = text;
    return span;
  }
  const a = document.createElement('a');
  a.className = className;
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.appendChild(document.createTextNode(text + ' '));
  const span = document.createElement('span');
  span.className = 'pj-ext';
  span.textContent = '↗';
  a.appendChild(span);
  return a;
}

function depSection(title, entries, lines) {
  if (!entries.length) return null;
  const sec = document.createElement('section');
  sec.className = 'pj-sec';
  const h3 = document.createElement('h3');
  h3.textContent = title + ' ';
  const count = document.createElement('span');
  count.className = 'pj-count';
  count.textContent = String(entries.length);
  h3.appendChild(count);
  sec.appendChild(h3);

  const ul = document.createElement('ul');
  ul.className = 'kf-list';
  for (const dep of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const li = document.createElement('li');
    li.className = 'kf-pat';
    if (isPlatform(dep.name)) {
      const code = document.createElement('code');
      code.className = 'ts-key';
      code.textContent = dep.name;
      li.appendChild(code);
      li.appendChild(chip('platform', dep.version === '*' ? 'warn' : 'muted', 'Composer platform requirement, not a Packagist package.'));
    } else {
      li.appendChild(extNode(packagistUrl(dep.name), dep.name));
    }
    const spacer = document.createElement('span');
    spacer.style.flex = '1';
    li.appendChild(spacer);
    const version = document.createElement('code');
    version.className = 'pj-ver';
    version.textContent = dep.version;
    version.title = versionHint(dep.version);
    li.appendChild(version);
    const line = lines.get(`${dep.section}.${dep.name}`) || lines.get(dep.name);
    if (line) li.appendChild(sourceButton('source', line, 'Open dependency declaration in source'));
    ul.appendChild(li);
  }
  sec.appendChild(ul);
  return sec;
}

export async function render(intake, _ctx) {
  let pkg;
  try { pkg = JSON.parse(intake.text || '{}'); }
  catch (e) {
    const d = document.createElement('div');
    d.className = 'pj-doc';
    d.innerHTML = '<p class="pj-err">Invalid JSON: ' + esc(e.message) + '</p>';
    return { parentNode: d };
  }

  const lines = buildLineMap(intake.text || '');
  const analysis = analyzeComposer(pkg, lines);
  const el = document.createElement('div');
  el.className = 'pj-doc';
  const style = document.createElement('style');
  style.textContent = CSS;
  el.appendChild(style);
  ensureKnownUiStyle(el);

  const header = document.createElement('header');
  header.className = 'pj-head';
  const title = document.createElement('div');
  title.className = 'pj-title';
  title.textContent = 'Composer ' + (pkg.name || '(unnamed package)');
  header.appendChild(title);
  const meta = document.createElement('div');
  meta.className = 'pj-meta';
  for (const value of [pkg.type, licenseText(pkg.license)].filter(Boolean)) {
    const tag = document.createElement('span');
    tag.className = 'pj-tag';
    tag.textContent = value;
    meta.appendChild(tag);
  }
  header.appendChild(meta);
  el.appendChild(header);

  if (pkg.description) {
    const desc = document.createElement('p');
    desc.className = 'pj-desc';
    desc.textContent = pkg.description;
    el.appendChild(desc);
  }

  const links = linkNodes(pkg);
  if (links.length) {
    const wrap = document.createElement('div');
    wrap.className = 'pj-links';
    for (const link of links) wrap.appendChild(link);
    el.appendChild(wrap);
  }

  for (const [section, label] of [['require', 'require'], ['require-dev', 'require-dev']]) {
    const sec = depSection(label, analysis.sections.get(section) || [], lines);
    if (sec) el.appendChild(sec);
  }

  const review = reviewSection(analysis);
  if (review) el.appendChild(review);
  const issueEl = issueList(analysis.issues, { title: 'Composer Review' });
  if (issueEl) el.appendChild(issueEl);
  el.appendChild(sourcePreview(intake.text || '', { title: 'Source', collapsed: true, idPrefix: 'composer-line', highlighter: highlightJsonLine }));
  wireSourceLinks(el, { idPrefix: 'composer-line' });
  return { parentNode: el };
}

function licenseText(license) {
  return Array.isArray(license) ? license.join(', ') : license;
}

function linkNodes(pkg) {
  const links = [];
  if (pkg.homepage) links.push(extNode(pkg.homepage, 'Homepage'));
  if (pkg.name) links.push(extNode(packagistUrl(pkg.name), 'View on Packagist'));
  const support = pkg.support && typeof pkg.support === 'object' ? pkg.support : {};
  if (support.source) links.push(extNode(support.source, 'Source'));
  if (support.issues) links.push(extNode(support.issues, 'Issues'));
  return links;
}

function entries(section, deps) {
  if (!deps || typeof deps !== 'object') return [];
  return Object.entries(deps).map(([name, version]) => ({ section, name, version: String(version) }));
}

function analyzeComposer(pkg, lines) {
  const sections = new Map([
    ['require', entries('require', pkg.require)],
    ['require-dev', entries('require-dev', pkg['require-dev'])],
  ]);
  const all = [...sections.values()].flat();
  const issues = [];
  const seen = new Map();
  for (const dep of all) {
    const line = lines.get(`${dep.section}.${dep.name}`) || lines.get(dep.name) || 1;
    if (dep.version === '*' || /^(dev-|@dev)/i.test(dep.version)) {
      issues.push({ severity: 'warning', label: 'broad range', line, message: `${dep.name} uses broad or dev version requirement "${dep.version}".` });
    }
    if (isPlatform(dep.name) && dep.version === '*') {
      issues.push({ severity: 'warning', label: 'platform wildcard', line, message: `${dep.name} allows any installed platform version; consider an explicit minimum.` });
    }
    if (/dev-master|dev-main/i.test(dep.version)) {
      issues.push({ severity: 'warning', label: 'moving branch', line, message: `${dep.name} tracks a moving branch.` });
    }
    const previous = seen.get(dep.name);
    if (previous && previous.section !== dep.section) {
      issues.push({ severity: 'warning', label: 'duplicate dependency', line, message: `${dep.name} appears in both ${previous.section} and ${dep.section}.` });
    }
    if (!previous) seen.set(dep.name, dep);
  }
  return { sections, issues };
}

function versionHint(version) {
  if (version === '*') return 'Wildcard requirement; any version can satisfy it.';
  if (/^dev-|dev-master|dev-main/i.test(version)) return 'Development branch requirement can move.';
  if (/^[~^]/.test(version)) return 'Composer semver-compatible range.';
  if (/^[<>=]/.test(version)) return 'Explicit comparator range.';
  return '';
}

function reviewSection(analysis) {
  const broad = analysis.issues.filter((issue) => issue.label === 'broad range').length;
  const platform = analysis.issues.filter((issue) => issue.label === 'platform wildcard').length;
  const dupes = analysis.issues.filter((issue) => issue.label === 'duplicate dependency').length;
  if (!broad && !platform && !dupes) return null;
  const sec = document.createElement('section');
  sec.className = 'pj-sec';
  const h3 = document.createElement('h3');
  h3.textContent = 'Manifest Review';
  sec.appendChild(h3);
  const p = document.createElement('p');
  p.className = 'composer-note';
  p.textContent = [
    broad && `${broad} broad/dev requirement${broad !== 1 ? 's' : ''}`,
    platform && `${platform} platform wildcard${platform !== 1 ? 's' : ''}`,
    dupes && `${dupes} duplicate dependency entr${dupes === 1 ? 'y' : 'ies'}`,
  ].filter(Boolean).join(' · ');
  sec.appendChild(p);
  return sec;
}

function buildLineMap(text) {
  const map = new Map();
  const stack = [];
  for (const [idx, line] of String(text || '').split(/\r?\n/).entries()) {
    const m = line.match(/^(\s*)"([^"]+)"\s*:/);
    if (!m) continue;
    const indent = m[1].length;
    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    const path = [...stack.map((item) => item.key), m[2]].join('.');
    map.set(path, idx + 1);
    if (!map.has(m[2])) map.set(m[2], idx + 1);
    if (/[{[]\s*$/.test(line)) stack.push({ indent, key: m[2] });
  }
  return map;
}

function highlightJsonLine(line) {
  return esc(line)
    .replace(/^(\s*)"([^"]+)"(\s*:)/, `$1<span class="composer-json-key">"$2"</span>$3`)
    .replace(/(:\s*)("[^"]*")/, `$1<span class="composer-json-str">$2</span>`);
}
