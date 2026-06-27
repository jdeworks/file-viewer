// Enhanced package.json view. Rendered in the PARENT pane (trusted, generated DOM) so the
// external links work without loosening the iframe sandbox. The links are href-only — no
// request is made until the user clicks — so the zero-off-origin-at-runtime guarantee holds.
import { chip, ensureKnownUiStyle, esc, issueList, sourceButton, sourcePreview, wireSourceLinks } from '../../../../../core/known-ui.js';

const npmUrl = (name) => 'https://www.npmjs.com/package/' + name.split('/').map(encodeURIComponent).join('/');

const CSS = `
.pj-review-list{margin:0;padding:0;list-style:none;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden}
.pj-review-list li{padding:6px 14px;border-bottom:1px solid var(--border,#eaecf0);display:flex;gap:7px;align-items:baseline;flex-wrap:wrap;font-size:12px}
.pj-review-list li:last-child{border-bottom:none}
.pj-script-risk{border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;margin:0;padding:0;list-style:none}
.pj-script-risk li{padding:6px 14px;border-bottom:1px solid var(--border,#eaecf0);display:flex;gap:7px;align-items:baseline;flex-wrap:wrap;font-size:12px}
.pj-script-risk li:last-child{border-bottom:none}
.pj-note{color:var(--fg-2,#5a6678);font-family:system-ui,sans-serif;font-size:12px;flex-basis:100%}
.pj-json-key{color:#0550ae;font-weight:600}
.pj-json-str{color:#0a6640}
.pj-json-lit{color:#8250df}
`;

function extNode(href, text) {
  const a = document.createElement('a');
  a.className = 'pj-link';
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

function repoUrl(repo) {
  if (!repo) return null;
  let u = typeof repo === 'string' ? repo : repo.url;
  if (!u) return null;
  u = u.replace(/^git\+/, '').replace(/\.git$/, '').replace(/^git:\/\//, 'https://').replace(/^github:/, 'https://github.com/');
  return /^https?:\/\//.test(u) ? u : null;
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

  const analysis = analyzePackage(pkg, intake.text || '');
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
  title.textContent = '📦 ' + (pkg.name || '(unnamed package)');
  header.appendChild(title);
  const meta = document.createElement('div');
  meta.className = 'pj-meta';
  for (const value of [pkg.version && 'v' + pkg.version, pkg.license, pkg.private && 'private'].filter(Boolean)) {
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

  for (const title of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
    const sec = depSection(title, pkg[title], analysis.depLines.get(title));
    if (sec) el.appendChild(sec);
  }

  const scriptSec = scriptsSection(analysis.scripts);
  if (scriptSec) el.appendChild(scriptSec);

  const reviewSec = packageReviewSection(analysis);
  if (reviewSec) el.appendChild(reviewSec);

  const issueEl = issueList(analysis.issues, { title: 'Manifest Review' });
  if (issueEl) el.appendChild(issueEl);

  el.appendChild(sourcePreview(intake.text || '', { title: 'Source', collapsed: true, idPrefix: 'pkg-line', highlighter: highlightJsonLine }));
  wireSourceLinks(el, { idPrefix: 'pkg-line' });

  return { parentNode: el };
}

function linkNodes(pkg) {
  const links = [];
  if (pkg.homepage) links.push(extNode(pkg.homepage, 'Homepage'));
  const repo = repoUrl(pkg.repository);
  if (repo) links.push(extNode(repo, 'Repository'));
  if (pkg.bugs) links.push(extNode(typeof pkg.bugs === 'string' ? pkg.bugs : pkg.bugs.url, 'Issues'));
  if (pkg.name) links.push(extNode(npmUrl(pkg.name), 'View on npm'));
  return links;
}

function depSection(title, deps, lineMap = new Map()) {
  const names = deps && typeof deps === 'object' ? Object.keys(deps) : [];
  if (!names.length) return null;
  const sec = document.createElement('section');
  sec.className = 'pj-sec';
  const h3 = document.createElement('h3');
  h3.textContent = title + ' ';
  const count = document.createElement('span');
  count.className = 'pj-count';
  count.textContent = String(names.length);
  h3.appendChild(count);
  sec.appendChild(h3);
  const ul = document.createElement('ul');
  ul.className = 'pj-deps';
  for (const name of names.sort()) {
    const li = document.createElement('li');
    const dep = document.createElement('span');
    dep.className = 'pj-dep';
    dep.appendChild(extNode(npmUrl(name), name));
    li.appendChild(dep);
    const version = document.createElement('span');
    version.className = 'pj-ver';
    version.textContent = deps[name];
    version.title = versionHint(deps[name]);
    li.appendChild(version);
    const line = lineMap.get(name);
    if (line) li.appendChild(sourceButton('source', line, 'Open dependency declaration in source'));
    ul.appendChild(li);
  }
  sec.appendChild(ul);
  return sec;
}

function scriptsSection(scripts) {
  if (!scripts.length) return null;
  const sec = document.createElement('section');
  sec.className = 'pj-sec';
  const h3 = document.createElement('h3');
  h3.textContent = 'Scripts ';
  const count = document.createElement('span');
  count.className = 'pj-count';
  count.textContent = String(scripts.length);
  h3.appendChild(count);
  sec.appendChild(h3);
  const ul = document.createElement('ul');
  ul.className = 'pj-scripts';
  for (const script of scripts) {
    const li = document.createElement('li');
    const key = sourceButton(script.name, script.line, 'Open script in source');
    key.classList.add('pj-skey');
    li.appendChild(key);
    const cmd = document.createElement('code');
    cmd.className = 'pj-scmd';
    cmd.textContent = script.command;
    li.appendChild(cmd);
    if (script.lifecycle) li.appendChild(chip('lifecycle', 'warn', 'npm lifecycle scripts can execute during install, publish, or prepare flows.'));
    if (script.networkShell) li.appendChild(chip('network shell', 'danger', 'Script appears to download and execute shell content.'));
    ul.appendChild(li);
  }
  sec.appendChild(ul);
  return sec;
}

function packageReviewSection(analysis) {
  const rows = [
    ...analysis.duplicates.map((item) => ({ kind: 'duplicate', tone: 'warn', label: item.name, line: item.line, note: `Also appears in ${item.sections.join(', ')}.` })),
    ...analysis.broadRanges.map((item) => ({ kind: 'range', tone: 'warn', label: item.name, line: item.line, note: `${item.section}: ${item.version}` })),
  ];
  if (!rows.length) return null;
  const sec = document.createElement('section');
  sec.className = 'pj-sec';
  const h3 = document.createElement('h3');
  h3.textContent = `Dependency Review `;
  const count = document.createElement('span');
  count.className = 'pj-count';
  count.textContent = String(rows.length);
  h3.appendChild(count);
  sec.appendChild(h3);
  const ul = document.createElement('ul');
  ul.className = 'pj-review-list';
  for (const row of rows) {
    const li = document.createElement('li');
    li.appendChild(chip(row.kind, row.tone));
    li.appendChild(sourceButton(row.label, row.line, 'Open dependency in source'));
    const note = document.createElement('span');
    note.className = 'pj-note';
    note.textContent = row.note;
    li.appendChild(note);
    ul.appendChild(li);
  }
  sec.appendChild(ul);
  return sec;
}

function analyzePackage(pkg, text) {
  const scripts = Object.entries(pkg.scripts && typeof pkg.scripts === 'object' ? pkg.scripts : {}).map(([name, command]) => ({
    name,
    command: String(command),
    line: lineOfKey(text, name, 'scripts') || 1,
    lifecycle: isLifecycleScript(name),
    networkShell: isNetworkShell(String(command)),
  }));
  const depSections = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];
  const depLines = new Map();
  const allDeps = new Map();
  const broadRanges = [];
  for (const section of depSections) {
    const deps = pkg[section] && typeof pkg[section] === 'object' ? pkg[section] : {};
    const lineMap = new Map();
    depLines.set(section, lineMap);
    for (const [name, version] of Object.entries(deps)) {
      const line = lineOfKey(text, name, section) || 1;
      lineMap.set(name, line);
      if (!allDeps.has(name)) allDeps.set(name, []);
      allDeps.get(name).push({ section, version: String(version), line });
      if (isBroadRange(String(version))) broadRanges.push({ section, name, version: String(version), line });
    }
  }
  const duplicates = [...allDeps.entries()]
    .filter(([, entries]) => entries.length > 1)
    .map(([name, entries]) => ({ name, line: entries[1].line, sections: entries.map((e) => e.section) }));
  const issues = [];
  for (const script of scripts) {
    if (script.lifecycle) issues.push({ severity: 'warning', label: 'lifecycle script', line: script.line, message: `Script "${script.name}" runs automatically in npm lifecycle flows.` });
    if (script.networkShell) issues.push({ severity: 'warning', label: 'shell download', line: script.line, message: `Script "${script.name}" appears to download and execute shell content.` });
  }
  for (const dep of broadRanges) {
    issues.push({ severity: 'info', label: 'broad range', line: dep.line, message: `${dep.section} "${dep.name}" uses broad range "${dep.version}".` });
  }
  for (const dupe of duplicates) {
    issues.push({ severity: 'warning', label: 'duplicate dependency', line: dupe.line, message: `"${dupe.name}" appears in multiple dependency groups: ${dupe.sections.join(', ')}.` });
  }
  return { scripts, depLines, broadRanges, duplicates, issues };
}

function lineOfKey(text, key, parent) {
  const lines = text.split(/\r?\n/);
  const parentRe = new RegExp(`"${escapeRegExp(parent)}"\\s*:\\s*\\{`);
  const keyRe = new RegExp(`"${escapeRegExp(key)}"\\s*:`);
  let inParent = false;
  let depth = 0;
  for (let i = 0; i < lines.length; i++) {
    if (!inParent && parentRe.test(lines[i])) {
      inParent = true;
      depth = braceDelta(lines[i]);
      continue;
    }
    if (!inParent) continue;
    if (keyRe.test(lines[i])) return i + 1;
    depth += braceDelta(lines[i]);
    if (depth <= 0) break;
  }
  return 0;
}

function braceDelta(line) {
  return (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isLifecycleScript(name) {
  return /^(preinstall|install|postinstall|prepublish|prepare|prepack|postpack|prepublishOnly)$/i.test(name);
}

function isNetworkShell(command) {
  return /(curl|wget)\b[^|\n]*(\||>\s*\/tmp\/|bash|sh)|\|\s*(bash|sh)\b/i.test(command);
}

function isBroadRange(version) {
  const v = version.trim();
  if (!v || v === '*' || /^latest$/i.test(v)) return true;
  return /^[~^]/.test(v) || /[<>=|xX*]/.test(v);
}

function versionHint(version) {
  return isBroadRange(String(version)) ? 'Broad or mutable dependency range.' : 'Dependency version specifier.';
}

function highlightJsonLine(line) {
  let out = esc(line);
  out = out.replace(/"([^"]+)"(?=\s*:)/, '<span class="pj-json-key">"$1"</span>');
  out = out.replace(/(:\s*)"([^"]*)"/, '$1<span class="pj-json-str">"$2"</span>');
  out = out.replace(/\b(true|false|null)\b/g, '<span class="pj-json-lit">$1</span>');
  return out;
}
