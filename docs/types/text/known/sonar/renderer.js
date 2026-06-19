const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.snr-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.snr-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#4E9BCD;color:#fff;vertical-align:middle;margin-right:8px}
.snr-title{font-size:18px;font-weight:700;margin:0 0 4px}
.snr-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.snr-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:12px 16px;margin:0 0 14px}
.snr-table{width:100%;border-collapse:collapse;font-size:13px}
.snr-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:4px 8px;border-bottom:1px solid var(--border,#e0e0e0)}
.snr-table td{padding:5px 8px;border-bottom:1px solid var(--border,#e0e0e0)}
.snr-table td:first-child{font:12px/1.4 ui-monospace,monospace;color:var(--fg-2,#666);white-space:nowrap}
.snr-table td:last-child{font:13px/1.4 ui-monospace,monospace;word-break:break-all}
.snr-sec{margin:14px 0}
.snr-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px}
`;

const KEY_LABELS = {
  'sonar.projectKey': 'Project Key',
  'sonar.projectName': 'Project Name',
  'sonar.projectVersion': 'Version',
  'sonar.sources': 'Sources',
  'sonar.tests': 'Tests',
  'sonar.language': 'Language',
  'sonar.java.binaries': 'Java Binaries',
  'sonar.exclusions': 'Exclusions',
  'sonar.coverage.exclusions': 'Coverage Exclusions',
  'sonar.host.url': 'Host URL',
  'sonar.login': 'Login',
  'sonar.token': 'Token',
};

// Keys shown in the summary card
const SUMMARY_KEYS = ['sonar.projectKey', 'sonar.projectName', 'sonar.projectVersion', 'sonar.sources', 'sonar.tests', 'sonar.language'];

export async function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const lines = text.split(/\r?\n/);

  const props = new Map();
  const allPairs = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    props.set(key, val);
    allPairs.push({ key, val });
  }

  const summaryRows = SUMMARY_KEYS
    .filter((k) => props.has(k))
    .map((k) => `<tr><td>${esc(KEY_LABELS[k] || k)}</td><td>${esc(props.get(k))}</td></tr>`)
    .join('');

  const otherRows = allPairs
    .filter(({ key }) => !SUMMARY_KEYS.includes(key))
    .map(({ key, val }) => `<tr><td>${esc(key)}</td><td>${esc(val)}</td></tr>`)
    .join('');

  const summaryHtml = summaryRows
    ? `<div class="snr-sec"><h3>Project Info</h3><div class="snr-card"><table class="snr-table"><thead><tr><th>Setting</th><th>Value</th></tr></thead><tbody>${summaryRows}</tbody></table></div></div>`
    : '';

  const otherHtml = otherRows
    ? `<div class="snr-sec"><h3>Additional Properties</h3><div class="snr-card"><table class="snr-table"><thead><tr><th>Key</th><th>Value</th></tr></thead><tbody>${otherRows}</tbody></table></div></div>`
    : '';

  const projectKey = props.get('sonar.projectKey') || '';
  const projectName = props.get('sonar.projectName') || '';
  const version = props.get('sonar.projectVersion') || '';
  const language = props.get('sonar.language') || '';

  const subParts = [projectKey, version, language].filter(Boolean);

  const host = document.createElement('div');
  host.className = 'snr-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="snr-title"><span class="snr-badge">SonarQube</span>${esc(projectName || 'sonar-project.properties')}</div>
<div class="snr-sub">${esc(subParts.join(' · '))}</div>
${summaryHtml}${otherHtml}`;
  return { parentNode: host };
}
