// Enhanced Cargo.toml view. Rendered in the parent pane so dependency links work without
// loosening iframe sandboxing. Links are href-only; no request is made until clicked.
import { chip, ensureKnownUiStyle, esc, issueList, sourceButton, sourcePreview, wireSourceLinks } from '../../../../../core/known-ui.js';
import { parseTOML } from '../../toml.js';

const CSS = `
.cargo-src-key{color:#0550ae;font-weight:700}
.cargo-src-string{color:#0a7f38}
.cargo-note{color:var(--fg-2,#5a6678);font-family:system-ui,sans-serif;font-size:12px}
`;

const DEP_SECTIONS = [
  ['dependencies', 'Dependencies'],
  ['dev-dependencies', 'Dev dependencies'],
  ['build-dependencies', 'Build dependencies'],
  ['target', 'Target dependencies'],
];

function extNode(href, text, className = 'pj-link') {
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

function crateUrl(name) {
  return 'https://crates.io/crates/' + encodeURIComponent(name);
}

function docsUrl(name) {
  return 'https://docs.rs/' + encodeURIComponent(name);
}

function verOf(spec) {
  if (spec == null) return '';
  if (typeof spec === 'string') return spec;
  if (typeof spec === 'object') return spec.version || (spec.git ? 'git' : spec.path ? 'path' : '');
  return String(spec);
}

function depSpecTitle(spec) {
  if (typeof spec === 'object' && spec) {
    const bits = [];
    if (spec.git) bits.push('git dependency');
    if (spec.path) bits.push('local path dependency');
    if (spec.rev || spec.tag) bits.push('pinned git reference');
    if (spec.branch && !spec.rev) bits.push('branch reference can move');
    if (spec.features) bits.push(`features: ${Array.isArray(spec.features) ? spec.features.join(', ') : spec.features}`);
    return bits.join(' · ');
  }
  return versionHint(spec);
}

function versionHint(spec) {
  const v = verOf(spec);
  if (!v) return '';
  if (v === '*' || /^[~^]?[0-9]+$/.test(v)) return 'Broad version requirement; consider a narrower compatible range.';
  if (/^[~^]/.test(v)) return 'Cargo semver-compatible requirement.';
  if (/^[<>=]/.test(v)) return 'Explicit version comparator.';
  return '';
}

function lineButton(label, line, title) {
  return sourceButton(label, line || 1, title || 'Open declaration in source');
}

function depSection(title, entries, lineMap) {
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
  ul.className = 'pj-deps';
  for (const dep of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const li = document.createElement('li');
    const name = document.createElement('span');
    name.className = 'pj-dep';
    name.appendChild(extNode(crateUrl(dep.name), dep.name));
    name.appendChild(document.createTextNode(' '));
    name.appendChild(extNode(docsUrl(dep.name), 'docs.rs', 'pj-ext-min'));
    li.appendChild(name);
    const ver = document.createElement('span');
    ver.className = 'pj-ver';
    ver.textContent = verOf(dep.spec);
    ver.title = depSpecTitle(dep.spec);
    li.appendChild(ver);
    if (dep.kind) li.appendChild(chip(dep.kind, dep.kind === 'path' || dep.kind === 'git' ? 'warn' : 'muted', depSpecTitle(dep.spec)));
    const line = lineMap.get(dep.pathKey) || lineMap.get(dep.name);
    if (line) li.appendChild(lineButton('source', line, 'Open dependency declaration in source'));
    ul.appendChild(li);
  }
  sec.appendChild(ul);
  return sec;
}

export async function render(intake, _ctx) {
  const host = document.createElement('div');
  host.className = 'pj-doc';
  let toml;
  try { toml = parseTOML(intake.text || ''); }
  catch (e) { host.innerHTML = '<p class="pj-err">Invalid TOML: ' + esc(e.message) + '</p>'; return { parentNode: host }; }

  ensureKnownUiStyle(host);
  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const lineMap = buildLineMap(intake.text || '');
  const analysis = analyzeCargo(toml, lineMap);
  const pkg = toml.package || {};

  const header = document.createElement('header');
  header.className = 'pj-head';
  const title = document.createElement('h2');
  title.textContent = pkg.name || 'Cargo package';
  if (pkg.version) {
    title.appendChild(document.createTextNode(' '));
    const version = document.createElement('span');
    version.className = 'pj-pkgver';
    version.textContent = pkg.version;
    title.appendChild(version);
  }
  header.appendChild(title);
  if (pkg.description) {
    const desc = document.createElement('p');
    desc.className = 'pj-desc';
    desc.textContent = pkg.description;
    header.appendChild(desc);
  }
  const metaBits = [pkg.edition && `edition ${pkg.edition}`, pkg.license].filter(Boolean);
  if (metaBits.length) {
    const meta = document.createElement('p');
    meta.className = 'pj-meta';
    meta.textContent = metaBits.join(' · ');
    header.appendChild(meta);
  }
  const links = linkNodes(pkg);
  if (links.length) {
    const wrap = document.createElement('div');
    wrap.className = 'pj-links';
    for (const link of links) wrap.appendChild(link);
    header.appendChild(wrap);
  }
  host.appendChild(header);

  for (const [section, label] of DEP_SECTIONS) {
    if (section === 'target') {
      for (const target of analysis.targetDeps) {
        const sec = depSection(`${label}: ${target.target}`, target.entries, lineMap);
        if (sec) host.appendChild(sec);
      }
    } else {
      const sec = depSection(label, analysis.sections.get(section) || [], lineMap);
      if (sec) host.appendChild(sec);
    }
  }

  const review = packageReviewSection(analysis);
  if (review) host.appendChild(review);
  const issues = issueList(analysis.issues, { title: 'Cargo Review' });
  if (issues) host.appendChild(issues);
  host.appendChild(sourcePreview(intake.text || '', {
    title: 'Source',
    collapsed: true,
    idPrefix: 'cargo-line',
    highlighter: highlightTomlLine,
  }));
  wireSourceLinks(host, { idPrefix: 'cargo-line' });
  return { parentNode: host };
}

function linkNodes(pkg) {
  const links = [];
  if (pkg.homepage) links.push(extNode(pkg.homepage, 'Homepage'));
  if (pkg.repository) links.push(extNode(pkg.repository, 'Repository'));
  if (pkg.documentation) links.push(extNode(pkg.documentation, 'Docs'));
  if (pkg.name) links.push(extNode(crateUrl(pkg.name), 'View on crates.io'));
  return links;
}

function normalizeEntries(sectionName, deps) {
  if (!deps || typeof deps !== 'object') return [];
  return Object.entries(deps).map(([name, spec]) => ({
    name,
    spec,
    section: sectionName,
    pathKey: `${sectionName}.${name}`,
    kind: typeof spec === 'object' && spec ? (spec.git ? 'git' : spec.path ? 'path' : '') : '',
  }));
}

function analyzeCargo(toml, lineMap) {
  const sections = new Map();
  const issues = [];
  const all = [];
  for (const [section] of DEP_SECTIONS.filter(([name]) => name !== 'target')) {
    const entries = normalizeEntries(section, toml[section]);
    sections.set(section, entries);
    all.push(...entries);
  }
  const targetDeps = [];
  if (toml.target && typeof toml.target === 'object') {
    for (const [target, cfg] of Object.entries(toml.target)) {
      const entries = [];
      for (const depSectionName of ['dependencies', 'dev-dependencies', 'build-dependencies']) {
        entries.push(...normalizeEntries(`target.${target}.${depSectionName}`, cfg?.[depSectionName]).map((entry) => ({ ...entry, target })));
      }
      if (entries.length) {
        targetDeps.push({ target, entries });
        all.push(...entries);
      }
    }
  }

  const byName = new Map();
  for (const dep of all) {
    const line = lineMap.get(dep.pathKey) || lineMap.get(dep.name) || 1;
    const version = verOf(dep.spec);
    const spec = dep.spec && typeof dep.spec === 'object' ? dep.spec : {};
    if (version === '*' || /^[~^]?[0-9]+$/.test(version)) {
      issues.push({ severity: 'warning', label: 'broad range', line, message: `${dep.name} uses broad version requirement "${version}".` });
    }
    if (spec.git && !spec.rev && !spec.tag) {
      issues.push({ severity: 'warning', label: 'git dependency', line, message: `${dep.name} is a git dependency without a fixed rev or tag.` });
    }
    if (spec.path) {
      issues.push({ severity: 'info', label: 'path dependency', line, message: `${dep.name} points at local path "${spec.path}"; publishing and reproducibility depend on workspace layout.` });
    }
    const seen = byName.get(dep.name) || [];
    for (const prev of seen) {
      if (prev.section !== dep.section) {
        issues.push({ severity: 'warning', label: 'duplicate dependency', line, message: `${dep.name} appears in both ${prev.section} and ${dep.section}.` });
        break;
      }
    }
    seen.push(dep);
    byName.set(dep.name, seen);
  }
  return { sections, targetDeps, issues };
}

function packageReviewSection(analysis) {
  const items = [];
  const deps = [...analysis.sections.values()].flat().concat(analysis.targetDeps.flatMap((target) => target.entries));
  const git = deps.filter((dep) => dep.kind === 'git').length;
  const path = deps.filter((dep) => dep.kind === 'path').length;
  const broad = analysis.issues.filter((issue) => issue.label === 'broad range').length;
  if (broad) items.push(`${broad} broad version requirement${broad !== 1 ? 's' : ''}`);
  if (git) items.push(`${git} git ${git === 1 ? 'dependency' : 'dependencies'}`);
  if (path) items.push(`${path} local path ${path === 1 ? 'dependency' : 'dependencies'}`);
  if (!items.length) return null;
  const sec = document.createElement('section');
  sec.className = 'pj-sec';
  const h3 = document.createElement('h3');
  h3.textContent = 'Manifest Review';
  sec.appendChild(h3);
  const p = document.createElement('p');
  p.className = 'cargo-note';
  p.textContent = items.join(' · ');
  sec.appendChild(p);
  return sec;
}

function buildLineMap(text) {
  const map = new Map();
  const stack = [];
  for (const [idx, rawLine] of String(text || '').split(/\r?\n/).entries()) {
    const trimmed = stripComment(rawLine).trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('[')) {
      const isArray = trimmed.startsWith('[[');
      const close = trimmed.lastIndexOf(isArray ? ']]' : ']');
      if (close < 0) continue;
      stack.length = 0;
      stack.push(trimmed.slice(isArray ? 2 : 1, close));
      map.set(stack.join('.'), idx + 1);
      continue;
    }
    const eq = firstEquals(trimmed);
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim().replace(/^["']|["']$/g, '');
    const path = [...stack, key].join('.');
    if (!map.has(path)) map.set(path, idx + 1);
    if (!map.has(key)) map.set(key, idx + 1);
  }
  return map;
}

function stripComment(line) {
  let quote = '';
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quote) {
      if (ch === '\\') i += 1;
      else if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '#') return line.slice(0, i);
  }
  return line;
}

function firstEquals(line) {
  let quote = '';
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quote) {
      if (ch === '\\') i += 1;
      else if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '=') return i;
  }
  return -1;
}

function highlightTomlLine(line) {
  const raw = esc(line);
  return raw
    .replace(/^(\s*)([A-Za-z0-9_.-]+)(\s*=)/, `$1<span class="cargo-src-key">$2</span>$3`)
    .replace(/(=\s*)("[^"]*"|'[^']*')/, `$1<span class="cargo-src-string">$2</span>`);
}
