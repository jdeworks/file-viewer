const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const mvnUrl = (g, a) => 'https://mvnrepository.com/artifact/' + encodeURIComponent(g) + '/' + encodeURIComponent(a);
const extLink = (href, text) =>
  '<a class="bgr-link" href="' + esc(href) + '" target="_blank" rel="noopener noreferrer">' + esc(text) + ' <span class="bgr-ext">↗</span></a>';

const CSS = `
.buildgradle-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.bgr-badge{display:inline-block;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;background:#02303a;color:#fff;vertical-align:middle;margin-right:8px}
.bgr-dsl{display:inline-block;background:#7c3aed;color:#fff;padding:1px 7px;border-radius:3px;font-size:10px;font-weight:700;margin-left:6px;vertical-align:middle}
.bgr-title{font-size:18px;font-weight:700;margin:0 0 4px}
.bgr-sub{font-size:13px;color:var(--fg-2,#888);margin:0 0 16px}
.bgr-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:12px 16px;margin:0 0 14px}
.bgr-card h3{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--fg-2,#888);margin:0 0 8px}
.bgr-table{width:100%;border-collapse:collapse;font-size:13px}
.bgr-table td{padding:4px 8px;border-bottom:1px solid var(--border,#e0e0e0)}
.bgr-table td:first-child{font-size:12px;color:var(--fg-2,#666);width:40%}
.bgr-table td:last-child{font:13px/1.4 ui-monospace,monospace}
.bgr-chips{display:flex;flex-wrap:wrap;gap:6px;list-style:none;margin:0;padding:0}
.bgr-chips li{background:var(--bg-3,#eaf0f6);border-radius:4px;padding:2px 8px;font:12px ui-monospace,monospace;color:var(--accent,#0366d6)}
.bgr-sec{margin:0 0 14px}
.bgr-sec h3{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--fg-2,#888);margin:0 0 8px;display:flex;align-items:center;gap:6px}
.bgr-count{background:var(--bg-3,#e0e0e0);border-radius:10px;padding:1px 7px;font-size:11px;font-weight:400;color:var(--fg,#444)}
.bgr-deplist{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px}
.bgr-deplist li{display:flex;align-items:center;gap:6px;padding:4px 10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e8e8e8);border-radius:6px;font-size:13px}
.bgr-link{color:var(--accent,#0366d6);text-decoration:none;font:13px ui-monospace,monospace}
.bgr-link:hover{text-decoration:underline}
.bgr-ext{font-size:10px;opacity:.5}
.bgr-ver{margin-left:auto;font:11px ui-monospace,monospace;color:var(--fg-2,#888);white-space:nowrap}
.bgr-note{color:var(--fg-2,#888);font-size:13px;padding:8px 0}
`;

const CONFIGS = 'implementation|api|compileOnly|runtimeOnly|testImplementation|testRuntimeOnly|annotationProcessor|kapt|ksp|classpath|androidTestImplementation|debugImplementation';
const DEP_RE = new RegExp('\\b(' + CONFIGS + ')\\b[\\s(]+["\\\']([^"\\\':]+):([^"\\\':]+):([^"\\\'@\\s)]+)', 'g');

function extractPlugins(text) {
  const plugins = [];
  // Match id '...' or id("...") with optional version
  const re = /\bid\s*[\s(]+['"]([^'"]+)['"]\s*\)?(?:\s+version\s+['"]([^'"]+)['"])?/g;
  let m;
  while ((m = re.exec(text))) plugins.push({ id: m[1], version: m[2] || null });
  return plugins;
}

function extractMeta(text) {
  const meta = {};
  // group, version, sourceCompatibility, javaVersion
  const patterns = [
    ['group', /^group\s*=\s*['"]([^'"]+)['"]/m],
    ['version', /^version\s*=\s*['"]([^'"]+)['"]/m],
    ['sourceCompatibility', /\bsourceCompatibility\s*=\s*['"]?([^\s'"]+)['"]?/m],
    ['javaVersion', /\bjavaVersion\s*=\s*['"]?([^\s'"]+)['"]?/m],
  ];
  for (const [key, re] of patterns) {
    const m = re.exec(text);
    if (m) meta[key] = m[1];
  }
  return meta;
}

function extractRepositories(text) {
  const repos = [];
  const known = [
    ['mavenCentral()', 'Maven Central'],
    ['google()', 'Google'],
    ['gradlePluginPortal()', 'Gradle Plugin Portal'],
    ['jcenter()', 'JCenter (deprecated)'],
    ['mavenLocal()', 'Maven Local'],
  ];
  for (const [pat, label] of known) {
    if (new RegExp('\\b' + pat.replace('()', '') + '\\s*\\(').test(text)) repos.push(label);
  }
  // Custom maven URLs
  const urlRe = /\bmaven\b[^{]*\{[^}]*\burl\s*['"]?([^'"\s)]+)/g;
  let m;
  while ((m = urlRe.exec(text))) repos.push(m[1]);
  return repos;
}

function extractDependencies(text) {
  const byConfig = new Map();
  DEP_RE.lastIndex = 0;
  let m;
  while ((m = DEP_RE.exec(text))) {
    const [, config, group, artifact, version] = m;
    if (!byConfig.has(config)) byConfig.set(config, []);
    byConfig.get(config).push({ group, artifact, version: version.trim() });
  }
  return byConfig;
}

function extractTasks(text) {
  const tasks = [];
  // task name(...) or tasks.register("name") or task name {
  const re = /(?:\btask\s+(\w+)|\btasks\.register\s*\(\s*["'](\w+)["'])/g;
  let m;
  while ((m = re.exec(text))) {
    const name = m[1] || m[2];
    if (name && !tasks.includes(name)) tasks.push(name);
    if (tasks.length >= 10) break;
  }
  return tasks;
}

function detectDsl(filename, text) {
  if ((filename || '').toLowerCase().endsWith('.kts')) return 'kotlin';
  // Kotlin DSL signs: val keyword, fun keyword, setOf(), listOf(), or .set( patterns
  if (/\bval\s+\w+\s*=|\bfun\s+\w+\(|\.set\(|setOf\(|listOf\(/.test(text)) return 'kotlin';
  return 'groovy';
}

export function render(intake) {
  const text = intake.text || '';
  const filename = (intake.name || intake.filename || 'build.gradle').split('/').pop();
  const dsl = detectDsl(filename, text);

  const plugins = extractPlugins(text);
  const meta = extractMeta(text);
  const repos = extractRepositories(text);
  const depsByConfig = extractDependencies(text);
  const tasks = extractTasks(text);

  let totalDeps = 0;
  for (const deps of depsByConfig.values()) totalDeps += deps.length;

  let html = '';

  // Project meta card
  const metaRows = [];
  if (meta.group) metaRows.push(['Group', meta.group]);
  if (meta.version) metaRows.push(['Version', meta.version]);
  const jv = meta.sourceCompatibility || meta.javaVersion;
  if (jv) metaRows.push(['Java version', jv]);
  metaRows.push(['DSL', dsl === 'kotlin' ? 'Kotlin DSL' : 'Groovy DSL']);

  if (metaRows.length) {
    html += `<div class="bgr-card"><table class="bgr-table"><tbody>${
      metaRows.map(([l, v]) => `<tr><td>${esc(l)}</td><td>${esc(v)}</td></tr>`).join('')
    }</tbody></table></div>`;
  }

  // Plugins block
  if (plugins.length) {
    html += `<div class="bgr-card"><h3>Applied plugins (${plugins.length})</h3><ul class="bgr-chips">${
      plugins.map((p) => `<li>${esc(p.id)}${p.version ? ' <span style="opacity:.6">v' + esc(p.version) + '</span>' : ''}</li>`).join('')
    }</ul></div>`;
  }

  // Repositories
  if (repos.length) {
    html += `<div class="bgr-card"><h3>Repositories</h3><ul class="bgr-chips">${
      repos.map((r) => `<li>${esc(r)}</li>`).join('')
    }</ul></div>`;
  }

  // Dependencies by configuration
  if (depsByConfig.size) {
    const configOrder = ['implementation', 'api', 'compileOnly', 'runtimeOnly', 'annotationProcessor', 'kapt', 'ksp', 'testImplementation', 'testRuntimeOnly', 'classpath', 'androidTestImplementation', 'debugImplementation'];
    const sorted = [...depsByConfig.entries()].sort(([a], [b]) => {
      const ai = configOrder.indexOf(a), bi = configOrder.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
    for (const [config, deps] of sorted) {
      const shown = deps.slice(0, 15);
      html += `<div class="bgr-sec bgr-card"><h3>${esc(config)} <span class="bgr-count">${deps.length}</span></h3><ul class="bgr-deplist">${
        shown.map((d) =>
          `<li>${extLink(mvnUrl(d.group, d.artifact), d.group + ':' + d.artifact)}<span class="bgr-ver">${esc(d.version)}</span></li>`
        ).join('')
      }${deps.length > 15 ? `<li class="bgr-note">…and ${deps.length - 15} more</li>` : ''}</ul></div>`;
    }
  } else {
    html += '<p class="bgr-note">No dependency declarations found.</p>';
  }

  // Tasks
  if (tasks.length) {
    html += `<div class="bgr-card"><h3>Defined tasks (${tasks.length})</h3><ul class="bgr-chips">${
      tasks.map((t) => `<li>${esc(t)}</li>`).join('')
    }</ul></div>`;
  }

  const host = document.createElement('div');
  host.className = 'buildgradle-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="bgr-title"><span class="bgr-badge">Gradle</span>${esc(filename)}${dsl === 'kotlin' ? '<span class="bgr-dsl">Kotlin DSL</span>' : ''}</div>
<div class="bgr-sub">${totalDeps} dependenc${totalDeps === 1 ? 'y' : 'ies'} · ${plugins.length} plugin${plugins.length !== 1 ? 's' : ''}${tasks.length ? ' · ' + tasks.length + ' task' + (tasks.length !== 1 ? 's' : '') : ''}</div>
${html}`;
  return { parentNode: host };
}
