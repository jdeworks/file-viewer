// Enhanced build.gradle view (parent pane, trusted DOM). Scans dependency declarations like
// `implementation 'group:artifact:version'` or Kotlin `implementation("group:artifact:version")`
// and lists them by configuration, linking each to mvnrepository (href-only — no runtime request).
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const mvnUrl = (g, a) => 'https://mvnrepository.com/artifact/' + encodeURIComponent(g) + '/' + encodeURIComponent(a);
const ext = (href, text) => '<a class="pj-link" href="' + esc(href) + '" target="_blank" rel="noopener noreferrer">' + esc(text) + ' <span class="pj-ext">↗</span></a>';

const CONFIGS = 'implementation|api|compileOnly|runtimeOnly|testImplementation|testRuntimeOnly|annotationProcessor|kapt|ksp|classpath|androidTestImplementation|debugImplementation';
const DEP_RE = new RegExp('\\b(' + CONFIGS + ')\\b[\\s(]+["\\\']([^"\\\':]+):([^"\\\':]+):([^"\\\'@]+)', 'g');

export async function render(intake, _ctx) {
  const text = intake.text || '';
  const byConfig = new Map();
  let m;
  while ((m = DEP_RE.exec(text))) {
    const [, config, group, artifact, version] = m;
    if (!byConfig.has(config)) byConfig.set(config, []);
    byConfig.get(config).push({ group, artifact, version });
  }

  let total = 0;
  const sections = [...byConfig.entries()].map(([config, deps]) => {
    total += deps.length;
    const rows = deps.map((d) =>
      '<li class="kf-pat">' + ext(mvnUrl(d.group, d.artifact), d.group + ':' + d.artifact)
      + '<span style="flex:1"></span><code class="pj-ver">' + esc(d.version) + '</code></li>').join('');
    return '<section class="pj-sec"><h3>' + esc(config) + ' <span class="pj-count">' + deps.length + '</span></h3><ul class="kf-list">' + rows + '</ul></section>';
  }).join('');

  const el = document.createElement('div');
  el.className = 'pj-doc';
  el.innerHTML =
    '<header class="pj-head"><div class="pj-title">🐘 ' + esc((intake.filename || 'build.gradle').split('/').pop()) + '</div>'
    + '<div class="pj-meta"><span class="pj-tag">' + total + ' dependenc' + (total === 1 ? 'y' : 'ies') + '</span></div></header>'
    + (sections || '<p class="kf-note">No dependency declarations found.</p>');
  return { parentNode: el };
}
