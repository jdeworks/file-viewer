const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.sg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.sg-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#02A84E;color:#fff;vertical-align:middle;margin-right:8px}
.sg-title{font-size:18px;font-weight:700;margin:0 0 4px}
.sg-sub{font-size:13px;color:var(--fg-2,#888);margin:0 0 16px}
.sg-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:12px 16px;margin:0 0 14px}
.sg-card h3{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--fg-2,#888);margin:0 0 8px}
.sg-list{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:6px}
.sg-list li{background:var(--bg-3,#eaf0f6);border-radius:4px;padding:2px 8px;font:12px ui-monospace,monospace;color:var(--accent,#0366d6)}
.sg-table{width:100%;border-collapse:collapse;font-size:13px}
.sg-table td{padding:4px 8px;border-bottom:1px solid var(--border,#e0e0e0)}
.sg-table td:first-child{font-size:12px;color:var(--fg-2,#666);width:40%}
.sg-table td:last-child{font:13px/1.4 ui-monospace,monospace}
.sg-kts{display:inline-block;background:#7c3aed;color:#fff;padding:1px 6px;border-radius:3px;font-size:10px;font-weight:700;margin-left:6px;vertical-align:middle}
`;

function extractRootName(text) {
  // Groovy: rootProject.name = 'my-app' or rootProject.name = "my-app"
  // Kotlin: rootProject.name = "my-app"
  const m = /rootProject\.name\s*=\s*["']([^"']+)["']/.exec(text);
  return m ? m[1] : null;
}

function extractIncludes(text) {
  const projects = new Set();
  // Groovy style: include 'proj1', 'proj2' or include ':proj1'
  // Kotlin style: include("proj1", "proj2") or include(":proj1")
  const re = /\binclude\s*\(?(['":][^)]+)\)?/g;
  let m;
  while ((m = re.exec(text))) {
    // Split by comma and clean each
    const parts = m[1].split(',');
    for (const p of parts) {
      const name = p.trim().replace(/^["':]+|["':]+$/g, '').trim();
      if (name) projects.add(name);
    }
  }
  return [...projects];
}

function extractPluginRepos(text) {
  const repos = [];
  const knownRepos = {
    'google()': 'Google',
    'mavenCentral()': 'Maven Central',
    'gradlePluginPortal()': 'Gradle Plugin Portal',
    'mavenLocal()': 'Maven Local',
    'jcenter()': 'JCenter (deprecated)',
  };
  for (const [pattern, label] of Object.entries(knownRepos)) {
    const key = pattern.replace('()', '');
    if (new RegExp('\\b' + key + '\\b').test(text)) repos.push(label);
  }
  return repos;
}

function hasDependencyResolutionManagement(text) {
  return /dependencyResolutionManagement/.test(text);
}

export async function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes || new Uint8Array());
  const filename = intake.name || intake.filename || 'settings.gradle';
  const isKts = filename.toLowerCase().endsWith('.kts');

  const rootName = extractRootName(text);
  const projects = extractIncludes(text);
  const pluginRepos = extractPluginRepos(text);
  const hasDRM = hasDependencyResolutionManagement(text);

  let html = '';

  // Header info card
  const infoRows = [];
  if (rootName) infoRows.push(['Root project', rootName]);
  infoRows.push(['Subprojects', String(projects.length)]);
  infoRows.push(['Kotlin DSL', isKts ? 'Yes' : 'No']);
  if (hasDRM) infoRows.push(['Dependency resolution mgmt', 'Yes']);

  html += `<div class="sg-card"><table class="sg-table"><tbody>${
    infoRows.map(([l, v]) => `<tr><td>${esc(l)}</td><td>${esc(v)}</td></tr>`).join('')
  }</tbody></table></div>`;

  if (projects.length) {
    html += `<div class="sg-card"><h3>Included subprojects (${projects.length})</h3><ul class="sg-list">${
      projects.map((p) => `<li>${esc(p)}</li>`).join('')
    }</ul></div>`;
  }

  if (pluginRepos.length) {
    html += `<div class="sg-card"><h3>Plugin management repositories</h3><ul class="sg-list">${
      pluginRepos.map((r) => `<li>${esc(r)}</li>`).join('')
    }</ul></div>`;
  }

  const host = document.createElement('div');
  host.className = 'sg-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="sg-title"><span class="sg-badge">Gradle Settings</span>${esc(filename)}${isKts ? '<span class="sg-kts">KTS</span>' : ''}</div>
${rootName ? `<div class="sg-sub">${esc(rootName)}</div>` : ''}
${html}`;
  return { parentNode: host };
}
