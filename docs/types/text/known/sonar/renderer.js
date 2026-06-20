const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.sonarprops-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.sonarprops-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#4e9bcd;color:#fff;vertical-align:middle;margin-right:8px}
.sonarprops-title{font-size:18px;font-weight:700;margin:0 0 4px}
.sonarprops-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.sonarprops-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin-left:6px;vertical-align:middle}
.sonarprops-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:12px 16px;margin:0 0 14px}
.sonarprops-card h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px}
.sonarprops-table{width:100%;border-collapse:collapse;font-size:13px}
.sonarprops-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:4px 8px;border-bottom:1px solid var(--border,#e0e0e0)}
.sonarprops-table td{padding:5px 8px;border-bottom:1px solid var(--border,#e0e0e0)}
.sonarprops-table td:first-child{font:12px/1.4 ui-monospace,monospace;color:var(--fg-2,#666);white-space:nowrap}
.sonarprops-table td:last-child{font:13px/1.4 ui-monospace,monospace;word-break:break-all}
.sonarprops-masked{font:11px ui-monospace,monospace;color:var(--fg-2,#888);font-style:italic}
.sonarprops-paths{list-style:none;padding:0;margin:2px 0 0;display:flex;flex-direction:column;gap:2px}
.sonarprops-paths li{font:12px ui-monospace,monospace;color:var(--fg-2,#666)}
`;

// Keys that should be masked
const SENSITIVE = /password|token|login|secret|credential/i;

function maskVal(key, val) {
  if (SENSITIVE.test(key)) return '<span class="sonarprops-masked">[configured]</span>';
  return esc(val);
}

export function render(intake) {
  const text = intake.text || '';
  const lines = text.split(/\r?\n/);

  const props = new Map();
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    props.set(key, val);
  }

  const g = (k) => props.get(k) || '';

  const projectName = g('sonar.projectName');
  const projectKey = g('sonar.projectKey');
  const version = g('sonar.projectVersion');

  // Header
  let html = `<style>${CSS}</style>`;
  html += `<div class="sonarprops-title"><span class="sonarprops-badge">SonarQube</span>${esc(projectName || 'sonar-project.properties')}`;
  if (version) html += `<span class="sonarprops-chip">${esc(version)}</span>`;
  html += `</div>`;
  if (projectKey) html += `<div class="sonarprops-sub">${esc(projectKey)}</div>`;

  // Project card
  const projectRows = [
    ['sonar.projectKey', 'Project Key'],
    ['sonar.projectName', 'Project Name'],
    ['sonar.projectVersion', 'Version'],
  ].filter(([k]) => props.has(k));

  if (projectRows.length) {
    html += `<div class="sonarprops-card"><h3>Project</h3><table class="sonarprops-table"><tbody>`;
    for (const [k, label] of projectRows) {
      html += `<tr><td>${esc(label)}</td><td>${maskVal(k, g(k))}</td></tr>`;
    }
    html += `</tbody></table></div>`;
  }

  // Server card
  const hostUrl = g('sonar.host.url');
  const hasServer = hostUrl || props.has('sonar.token') || props.has('sonar.login');
  if (hasServer) {
    html += `<div class="sonarprops-card"><h3>Server</h3><table class="sonarprops-table"><tbody>`;
    if (hostUrl) html += `<tr><td>Host URL</td><td>${esc(hostUrl)}</td></tr>`;
    if (props.has('sonar.token')) html += `<tr><td>Token</td><td>${maskVal('sonar.token', g('sonar.token'))}</td></tr>`;
    if (props.has('sonar.login')) html += `<tr><td>Login</td><td>${maskVal('sonar.login', g('sonar.login'))}</td></tr>`;
    html += `</tbody></table></div>`;
  }

  // Source settings card
  const sources = g('sonar.sources');
  const tests = g('sonar.tests');
  const javaSrc = g('sonar.java.source');
  const javaTarget = g('sonar.java.target');
  const encoding = g('sonar.sourceEncoding');
  const javaBin = g('sonar.java.binaries');
  const hasSource = sources || tests || javaSrc || javaTarget || encoding || javaBin;

  if (hasSource) {
    html += `<div class="sonarprops-card"><h3>Source Settings</h3><table class="sonarprops-table"><tbody>`;
    if (sources) {
      const paths = sources.split(',').map((p) => p.trim()).filter(Boolean);
      html += `<tr><td>Sources</td><td><ul class="sonarprops-paths">${paths.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></td></tr>`;
    }
    if (tests) {
      const tpaths = tests.split(',').map((p) => p.trim()).filter(Boolean);
      html += `<tr><td>Tests</td><td><ul class="sonarprops-paths">${tpaths.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></td></tr>`;
    }
    if (javaBin) html += `<tr><td>Java Binaries</td><td>${esc(javaBin)}</td></tr>`;
    if (javaSrc || javaTarget) {
      const chips = [javaSrc && `<span class="sonarprops-chip">source: ${esc(javaSrc)}</span>`, javaTarget && `<span class="sonarprops-chip">target: ${esc(javaTarget)}</span>`].filter(Boolean).join(' ');
      html += `<tr><td>Java Version</td><td>${chips}</td></tr>`;
    }
    if (encoding) html += `<tr><td>Encoding</td><td><span class="sonarprops-chip">${esc(encoding)}</span></td></tr>`;
    html += `</tbody></table></div>`;
  }

  // Coverage card
  const jacocoPath = g('sonar.coverage.jacoco.xmlReportPaths');
  const junitPath = g('sonar.junit.reportPaths');
  if (jacocoPath || junitPath) {
    html += `<div class="sonarprops-card"><h3>Coverage</h3><table class="sonarprops-table"><tbody>`;
    if (jacocoPath) html += `<tr><td>JaCoCo Report</td><td title="${esc(jacocoPath)}">${esc(jacocoPath.length > 60 ? jacocoPath.slice(0, 57) + '…' : jacocoPath)}</td></tr>`;
    if (junitPath) html += `<tr><td>JUnit Report</td><td title="${esc(junitPath)}">${esc(junitPath.length > 60 ? junitPath.slice(0, 57) + '…' : junitPath)}</td></tr>`;
    html += `</tbody></table></div>`;
  }

  // Exclusions card
  const excl = g('sonar.exclusions');
  const covExcl = g('sonar.coverage.exclusions');
  if (excl || covExcl) {
    html += `<div class="sonarprops-card"><h3>Exclusions</h3>`;
    if (excl) {
      const patterns = excl.split(',').map((p) => p.trim()).filter(Boolean);
      html += `<div style="margin-bottom:6px"><div style="font-size:11px;color:var(--fg-2,#888);margin-bottom:3px">Source exclusions</div><ul class="sonarprops-paths">${patterns.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></div>`;
    }
    if (covExcl) {
      const patterns = covExcl.split(',').map((p) => p.trim()).filter(Boolean);
      html += `<div><div style="font-size:11px;color:var(--fg-2,#888);margin-bottom:3px">Coverage exclusions</div><ul class="sonarprops-paths">${patterns.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></div>`;
    }
    html += `</div>`;
  }

  const host = document.createElement('div');
  host.className = 'sonarprops-doc';
  host.innerHTML = html;
  return { parentNode: host };
}
