import { chip, ensureKnownUiStyle, esc, issueList, sourceButton, sourcePreview, wireSourceLinks } from '../../../../../core/known-ui.js';

const CSS = `
.plk-doc{padding:16px 18px;max-width:940px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-plk{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#cb3837;color:#fff;vertical-align:middle;margin-right:8px;}
.plk-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.plk-sub{font-size:12px;color:var(--fg-2,#5a6678);margin:0 0 14px;}
.plk-stats{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 14px;}
.plk-stat{display:flex;flex-direction:column;align-items:center;padding:8px 16px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);min-width:80px;}
.plk-stat-n{font-size:22px;font-weight:700;color:var(--fg,#24292f);}
.plk-stat-l{font-size:11px;color:var(--fg-2,#5a6678);text-transform:uppercase;letter-spacing:.04em;}
.plk-sec{margin:14px 0;}
.plk-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#5a6678);margin:0 0 6px;}
.plk-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:8px;margin:0;}
.plk-row{display:flex;gap:7px;align-items:baseline;flex-wrap:wrap;border:1px solid var(--border,#e0e0e0);background:var(--bg,#fff);border-radius:8px;padding:8px 10px;min-width:0;}
.plk-name{font-family:ui-monospace,monospace;font-weight:700;overflow-wrap:anywhere;}
.plk-version{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#5a6678);}
.plk-note{color:var(--fg-2,#5a6678);font-size:12px;flex-basis:100%;}
.plk-ext{font-size:11px;text-decoration:none;}
.plk-json-key{color:#0550ae;font-weight:600}
.plk-json-str{color:#0a6640}
`;

const SHOW_PACKAGES = 60;

export function render(intake) {
  let lock = {};
  try { lock = JSON.parse(intake.text || new TextDecoder().decode(intake.bytes || new Uint8Array())); }
  catch { lock = {}; }

  const text = intake.text || JSON.stringify(lock, null, 2);
  const lines = buildLineMap(text);
  const analysis = analyzeLock(lock, lines);

  const host = document.createElement('div');
  host.className = 'plk-doc';
  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);
  ensureKnownUiStyle(host);

  host.appendChild(header(lock, analysis));
  host.appendChild(stats(analysis));

  const rootSec = dependencySection('Root Dependencies', analysis.rootDeps);
  if (rootSec) host.appendChild(rootSec);
  const packagesSec = packageSection(analysis.packages);
  if (packagesSec) host.appendChild(packagesSec);
  const issues = issueList(analysis.issues, { title: 'Package Lock Review' });
  if (issues) host.appendChild(issues);
  host.appendChild(sourcePreview(text, { title: 'Source', collapsed: true, idPrefix: 'plk-line', highlighter: highlightJsonLine }));
  wireSourceLinks(host, { idPrefix: 'plk-line' });

  return { parentNode: host };
}

function header(lock, analysis) {
  const wrap = document.createElement('div');
  const title = document.createElement('div');
  title.className = 'plk-title';
  title.appendChild(badge('npm'));
  title.appendChild(document.createTextNode(lock.name ? `${lock.name} - package-lock.json` : 'package-lock.json'));
  wrap.appendChild(title);
  const sub = document.createElement('div');
  sub.className = 'plk-sub';
  sub.textContent = `lockfileVersion ${versionLabel(lock.lockfileVersion)} · ${analysis.totalCount} package${analysis.totalCount !== 1 ? 's' : ''}`;
  wrap.appendChild(sub);
  return wrap;
}

function stats(analysis) {
  const wrap = document.createElement('div');
  wrap.className = 'plk-stats';
  for (const [label, value] of [
    ['Total', analysis.totalCount],
    ['Direct', analysis.directCount],
    ['Transitive', Math.max(0, analysis.totalCount - analysis.directCount)],
    ['Integrity', analysis.integrityCount],
  ]) {
    const card = document.createElement('div');
    card.className = 'plk-stat';
    const n = document.createElement('span');
    n.className = 'plk-stat-n';
    n.textContent = String(value);
    const l = document.createElement('span');
    l.className = 'plk-stat-l';
    l.textContent = label;
    card.append(n, l);
    wrap.appendChild(card);
  }
  return wrap;
}

function dependencySection(title, deps) {
  if (!deps.length) return null;
  const sec = document.createElement('section');
  sec.className = 'plk-sec';
  const h3 = document.createElement('h3');
  h3.textContent = `${title} (${deps.length})`;
  sec.appendChild(h3);
  const list = document.createElement('div');
  list.className = 'plk-list';
  for (const dep of deps.sort((a, b) => a.name.localeCompare(b.name))) {
    list.appendChild(depRow(dep));
  }
  sec.appendChild(list);
  return sec;
}

function packageSection(packages) {
  if (!packages.length) return null;
  const sec = document.createElement('section');
  sec.className = 'plk-sec';
  const h3 = document.createElement('h3');
  h3.textContent = `Resolved Packages (${packages.length})`;
  sec.appendChild(h3);
  const list = document.createElement('div');
  list.className = 'plk-list';
  for (const pkg of packages.slice(0, SHOW_PACKAGES)) list.appendChild(packageRow(pkg));
  sec.appendChild(list);
  if (packages.length > SHOW_PACKAGES) {
    const note = document.createElement('p');
    note.className = 'plk-note';
    note.textContent = `and ${packages.length - SHOW_PACKAGES} more packages`;
    sec.appendChild(note);
  }
  return sec;
}

function depRow(dep) {
  const row = document.createElement('div');
  row.className = 'plk-row';
  row.appendChild(nameSpan(dep.name));
  const version = document.createElement('span');
  version.className = 'plk-version';
  version.textContent = dep.spec;
  version.title = dependencyHint(dep.spec);
  row.appendChild(version);
  row.appendChild(chip(dep.kind, dep.kind === 'devDependencies' ? 'muted' : 'info', dep.kind === 'devDependencies' ? 'Development-only dependency from the root package.' : 'Runtime dependency from the root package.'));
  if (dep.line) row.appendChild(sourceButton('source', dep.line, 'Open dependency declaration in source'));
  return row;
}

function packageRow(pkg) {
  const row = document.createElement('div');
  row.className = 'plk-row';
  if (pkg.resolved) row.appendChild(registryLink(pkg.name, pkg.resolved));
  else row.appendChild(nameSpan(pkg.name));
  if (pkg.version) {
    const version = document.createElement('span');
    version.className = 'plk-version';
    version.textContent = pkg.version;
    row.appendChild(version);
  }
  row.appendChild(chip(pkg.dev ? 'dev' : 'resolved', pkg.dev ? 'muted' : 'ok', pkg.dev ? 'Marked as a development dependency in the lockfile.' : 'Resolved package entry.'));
  row.appendChild(chip(pkg.integrity ? 'integrity' : 'no integrity', pkg.integrity ? 'ok' : 'warn', pkg.integrity ? 'Subresource integrity hash is present.' : 'Missing integrity hash; installs have weaker tamper evidence.'));
  if (pkg.line) row.appendChild(sourceButton('source', pkg.line, 'Open resolved package entry in source'));
  if (pkg.resolved) {
    const note = document.createElement('span');
    note.className = 'plk-note';
    note.textContent = compactUrl(pkg.resolved);
    note.title = pkg.resolved;
    row.appendChild(note);
  }
  return row;
}

function analyzeLock(lock, lines) {
  const packagesObj = lock.packages && typeof lock.packages === 'object' ? lock.packages : null;
  const dependenciesObj = lock.dependencies && typeof lock.dependencies === 'object' ? lock.dependencies : null;
  const root = packagesObj?.[''] || lock;
  const rootDeps = [];
  const issues = [];

  for (const kind of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
    const deps = root?.[kind] && typeof root[kind] === 'object' ? root[kind] : {};
    for (const [name, spec] of Object.entries(deps)) {
      const line = lines.get(`packages..${kind}.${name}`) || lines.get(`${kind}.${name}`) || lines.get(name) || 1;
      rootDeps.push({ kind, name, spec: String(spec), line });
      if (isBroadRange(spec)) {
        issues.push({ severity: 'warning', label: 'broad range', line, message: `${name} uses broad root range "${spec}".` });
      }
    }
  }

  const packages = [];
  if (packagesObj) {
    for (const [path, info] of Object.entries(packagesObj)) {
      if (!path || !info || typeof info !== 'object') continue;
      const name = path.replace(/^.*node_modules\//, '');
      const line = lines.get(`packages.${path}`) || lines.get(path) || 1;
      const pkg = { path, name, version: info.version || '', resolved: info.resolved || '', integrity: info.integrity || '', dev: !!info.dev, line };
      packages.push(pkg);
      reviewResolvedPackage(pkg, issues);
    }
  } else if (dependenciesObj) {
    for (const [name, info] of Object.entries(dependenciesObj)) {
      const line = lines.get(`dependencies.${name}`) || lines.get(name) || 1;
      const pkg = { path: name, name, version: info?.version || '', resolved: info?.resolved || '', integrity: info?.integrity || '', dev: !!info?.dev, line };
      packages.push(pkg);
      reviewResolvedPackage(pkg, issues);
    }
  }

  const directNames = new Set(rootDeps.map((dep) => dep.name));
  const directCount = packagesObj
    ? packages.filter((pkg) => (pkg.path.match(/node_modules\//g) || []).length === 1 && directNames.has(pkg.name)).length || rootDeps.length
    : packages.filter((pkg) => !pkg.dev).length;
  return {
    totalCount: packages.length,
    directCount,
    integrityCount: packages.filter((pkg) => pkg.integrity).length,
    rootDeps,
    packages: packages.sort((a, b) => a.name.localeCompare(b.name)),
    issues,
  };
}

function reviewResolvedPackage(pkg, issues) {
  if (!pkg.integrity) {
    issues.push({ severity: 'warning', label: 'missing integrity', line: pkg.line, message: `${pkg.name} has no integrity hash in the lockfile.` });
  }
  if (pkg.resolved && /^http:\/\//i.test(pkg.resolved)) {
    issues.push({ severity: 'warning', label: 'plain HTTP', line: pkg.line, message: `${pkg.name} resolves through plain HTTP.` });
  }
  if (pkg.resolved && !/registry\.npmjs\.org|npmjs\.com/i.test(pkg.resolved)) {
    issues.push({ severity: 'info', label: 'custom source', line: pkg.line, message: `${pkg.name} resolves from a non-default registry or tarball host.` });
  }
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

function badge(text) {
  const span = document.createElement('span');
  span.className = 'badge-plk';
  span.textContent = text;
  return span;
}

function nameSpan(name) {
  const span = document.createElement('span');
  span.className = 'plk-name';
  span.textContent = name;
  return span;
}

function registryLink(name, resolved) {
  const a = document.createElement('a');
  a.className = 'plk-name';
  a.href = packageUrl(name, resolved);
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.textContent = name + ' ';
  const ext = document.createElement('span');
  ext.className = 'plk-ext';
  ext.textContent = '↗';
  a.appendChild(ext);
  return a;
}

function packageUrl(name, resolved) {
  if (/registry\.npmjs\.org/i.test(resolved || '')) return 'https://www.npmjs.com/package/' + encodeURIComponent(name);
  try { return new URL(resolved).href; }
  catch { return 'https://www.npmjs.com/package/' + encodeURIComponent(name); }
}

function versionLabel(version) {
  if (version === 1) return 'v1 (legacy)';
  if (version === 2) return 'v2';
  if (version === 3) return 'v3';
  return version == null ? '?' : `v${version}`;
}

function isBroadRange(spec) {
  return spec === '*' || /^latest$/i.test(spec) || /x|\*/i.test(String(spec));
}

function dependencyHint(spec) {
  if (isBroadRange(spec)) return 'Broad range; lockfile pins an install today, but the manifest can float on regeneration.';
  if (/^[~^]/.test(String(spec))) return 'Semver-compatible range from the root manifest.';
  if (/^(file:|link:|workspace:)/.test(String(spec))) return 'Local or workspace dependency reference.';
  return 'Root dependency requirement.';
}

function compactUrl(url) {
  try {
    const u = new URL(url);
    return `${u.hostname}${u.pathname}`;
  } catch {
    return url;
  }
}

function highlightJsonLine(line) {
  return esc(line)
    .replace(/^(\s*)"([^"]+)"(\s*:)/, `$1<span class="plk-json-key">"$2"</span>$3`)
    .replace(/(:\s*)("[^"]*")/, `$1<span class="plk-json-str">$2</span>`);
}
