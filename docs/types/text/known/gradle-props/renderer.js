const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.gp-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.gp-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#02A84E;color:#fff;vertical-align:middle;margin-right:8px}
.gp-title{font-size:18px;font-weight:700;margin:0 0 14px}
.gp-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:12px 16px;margin:0 0 14px}
.gp-card h3{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--fg-2,#888);margin:0 0 8px}
.gp-table{width:100%;border-collapse:collapse;font-size:13px}
.gp-table td{padding:4px 8px;border-bottom:1px solid var(--border,#e0e0e0)}
.gp-table td:first-child{font-size:12px;color:var(--fg-2,#666);white-space:nowrap;width:40%}
.gp-table td:last-child{font:13px/1.4 ui-monospace,monospace;word-break:break-all}
.gp-pill{display:inline-block;padding:1px 7px;border-radius:4px;font-size:11px;font-weight:600;margin-left:4px}
.gp-yes{background:#d1fae5;color:#065f46}.gp-no{background:#fee2e2;color:#991b1b}
.gp-sec{margin:0 0 14px}
`;

function parseProps(text) {
  const props = new Map();
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#') || t.startsWith('!')) continue;
    const eq = t.indexOf('=');
    if (eq < 0) continue;
    const key = t.slice(0, eq).trim();
    const val = t.slice(eq + 1).trim();
    props.set(key, val);
  }
  return props;
}

function bool(val) {
  if (val == null) return null;
  return val.toLowerCase() === 'true';
}

function pill(val) {
  if (val == null) return '';
  const yes = val === true || val === 'true';
  return `<span class="gp-pill ${yes ? 'gp-yes' : 'gp-no'}">${yes ? 'yes' : 'no'}</span>`;
}

export async function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes || new Uint8Array());
  const props = parseProps(text);

  // Build settings rows
  const buildRows = [];
  if (props.has('org.gradle.jvmargs')) buildRows.push(['JVM args', props.get('org.gradle.jvmargs')]);
  const parallel = props.get('org.gradle.parallel');
  if (parallel != null) buildRows.push(['Parallel builds', `${esc(parallel)}${pill(parallel)}`]);
  const daemon = props.get('org.gradle.daemon');
  if (daemon != null) buildRows.push(['Daemon', `${esc(daemon)}${pill(daemon)}`]);
  if (props.has('org.gradle.workers.max')) buildRows.push(['Max workers', props.get('org.gradle.workers.max')]);
  if (props.has('org.gradle.caching')) {
    const c = props.get('org.gradle.caching');
    buildRows.push(['Build cache', `${esc(c)}${pill(c)}`]);
  }
  const configureOnDemand = props.get('org.gradle.configureondemand');
  if (configureOnDemand != null) buildRows.push(['Configure on demand', `${esc(configureOnDemand)}${pill(configureOnDemand)}`]);

  // SDK / version rows
  const versionRows = [];
  if (props.has('kotlin.version')) versionRows.push(['Kotlin version', props.get('kotlin.version')]);
  if (props.has('android.compileSdkVersion')) versionRows.push(['Android compile SDK', props.get('android.compileSdkVersion')]);
  if (props.has('android.minSdkVersion')) versionRows.push(['Android min SDK', props.get('android.minSdkVersion')]);
  if (props.has('android.targetSdkVersion')) versionRows.push(['Android target SDK', props.get('android.targetSdkVersion')]);

  // Custom (non-org.gradle) properties
  const customProps = [...props.entries()].filter(([k]) =>
    !k.startsWith('org.gradle.') && !k.startsWith('android.') &&
    k !== 'kotlin.version' && k !== 'kotlin.incremental'
  );

  const kotlinInc = props.get('kotlin.incremental');
  if (kotlinInc != null) versionRows.push(['Kotlin incremental', `${esc(kotlinInc)}${pill(kotlinInc)}`]);

  function tableRows(rows) {
    return rows.map(([label, val]) =>
      `<tr><td>${esc(label)}</td><td>${val}</td></tr>`
    ).join('');
  }

  let html = '';

  if (buildRows.length) {
    html += `<div class="gp-sec"><div class="gp-card"><h3>Build settings</h3><table class="gp-table"><tbody>${tableRows(buildRows)}</tbody></table></div></div>`;
  }
  if (versionRows.length) {
    html += `<div class="gp-sec"><div class="gp-card"><h3>SDK &amp; versions</h3><table class="gp-table"><tbody>${tableRows(versionRows)}</tbody></table></div></div>`;
  }
  if (customProps.length) {
    const customRows = customProps.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('');
    html += `<div class="gp-sec"><div class="gp-card"><h3>Project properties</h3><table class="gp-table"><tbody>${customRows}</tbody></table></div></div>`;
  }

  if (!html) {
    html = '<p style="color:var(--fg-2);font-size:13px">No recognized Gradle properties found.</p>';
  }

  const host = document.createElement('div');
  host.className = 'gp-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="gp-title"><span class="gp-badge">Gradle</span>gradle.properties</div>
${html}`;
  return { parentNode: host };
}
