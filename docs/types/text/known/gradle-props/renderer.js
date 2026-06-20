const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.gp-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.gp-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#02303a;color:#13b981;vertical-align:middle;margin-right:8px;letter-spacing:.04em}
.gp-title{font-size:18px;font-weight:700;margin:0 0 14px}
.gp-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:12px 16px;margin:0 0 14px}
.gp-card h3{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--fg-2,#888);margin:0 0 8px}
.gp-table{width:100%;border-collapse:collapse;font-size:13px}
.gp-table td{padding:4px 8px;border-bottom:1px solid var(--border,#e0e0e0)}
.gp-table td:first-child{font-size:12px;color:var(--fg-2,#666);white-space:nowrap;width:40%}
.gp-table td:last-child{font:13px/1.4 ui-monospace,monospace;word-break:break-all}
.gp-pill{display:inline-block;padding:1px 7px;border-radius:4px;font-size:11px;font-weight:600;margin-left:4px}
.gp-yes{background:#d1fae5;color:#065f46}.gp-no{background:#fee2e2;color:#991b1b}
.gp-orange{background:#fef3c7;color:#92400e}
.gp-chip{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;margin:0 4px 4px 0;border:1px solid transparent}
.gp-chip-on{background:#d1fae5;color:#065f46;border-color:#a7f3d0}
.gp-chip-off{background:#fee2e2;color:#991b1b;border-color:#fca5a5}
.gp-chip-gray{background:var(--bg-3,#f0f0f0);color:var(--fg-2,#555);border-color:var(--border,#d0d0d0)}
.gp-heap{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;background:#1e40af;color:#fff;margin-right:6px}
.gp-sec{margin:0 0 14px}
.gp-chips{display:flex;flex-wrap:wrap;gap:4px;margin:4px 0 2px}
`;

const SENSITIVE_RE = /password|token|secret|apikey|api_key|credentials/i;

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

function pill(val) {
  if (val == null) return '';
  const yes = val === true || val === 'true';
  return `<span class="gp-pill ${yes ? 'gp-yes' : 'gp-no'}">${yes ? 'yes' : 'no'}</span>`;
}

function boolChip(label, val, trueIsGood = true) {
  if (val == null) return '';
  const yes = val.toLowerCase() === 'true';
  let cls;
  if (yes) cls = trueIsGood ? 'gp-chip-on' : 'gp-chip-off';
  else cls = trueIsGood ? 'gp-chip-off' : 'gp-chip-on';
  return `<span class="gp-chip ${cls}">${esc(label)}: ${yes ? 'on' : 'off'}</span>`;
}

function extractJvmHeap(jvmargs) {
  // extract -Xms and -Xmx values
  const xms = (jvmargs.match(/-Xms(\S+)/) || [])[1];
  const xmx = (jvmargs.match(/-Xmx(\S+)/) || [])[1];
  if (!xms && !xmx) return null;
  const parts = [];
  if (xms) parts.push(`Xms: ${xms}`);
  if (xmx) parts.push(`Xmx: ${xmx}`);
  return parts.join(' / ');
}

function extractJvmFlags(jvmargs) {
  // GC flags, -XX: options
  const gcFlags = [...jvmargs.matchAll(/-XX:[+\-](\w+)/g)].map((m) => (jvmargs.includes(`-XX:+${m[1]}`) ? `+${m[1]}` : `-${m[1]}`));
  return gcFlags;
}

function tableRows(rows) {
  return rows.map(([label, val]) =>
    `<tr><td>${esc(label)}</td><td>${val}</td></tr>`
  ).join('');
}

export async function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes || new Uint8Array());
  const props = parseProps(text);

  // --- JVM settings ---
  const jvmRows = [];
  const jvmargs = props.get('org.gradle.jvmargs');
  if (jvmargs) {
    const heap = extractJvmHeap(jvmargs);
    if (heap) {
      jvmRows.push(['Heap', `<span class="gp-heap">${esc(heap)}</span>`]);
    }
    const gcFlags = extractJvmFlags(jvmargs);
    if (gcFlags.length) {
      const flagChips = gcFlags.map((f) => `<span class="gp-chip gp-chip-gray">${esc(f)}</span>`).join('');
      jvmRows.push(['GC flags', `<span class="gp-chips">${flagChips}</span>`]);
    }
    const enc = (jvmargs.match(/-Dfile\.encoding=(\S+)/) || [])[1];
    if (enc) jvmRows.push(['file.encoding', esc(enc)]);
    jvmRows.push(['JVM args', esc(jvmargs)]);
  }
  const javaHome = props.get('org.gradle.java.home');
  if (javaHome) jvmRows.push(['java.home', esc(javaHome)]);

  // --- Daemon settings ---
  const daemonRows = [];
  const daemon = props.get('org.gradle.daemon');
  if (daemon != null) {
    const yes = daemon.toLowerCase() === 'true';
    daemonRows.push(['Daemon', `${esc(daemon)}<span class="gp-pill ${yes ? 'gp-yes' : 'gp-no'}">${yes ? 'enabled' : 'disabled'}</span>`]);
  }
  const daemonTimeout = props.get('org.gradle.daemon.idletimeout');
  if (daemonTimeout) {
    const mins = Math.round(parseInt(daemonTimeout, 10) / 60000);
    daemonRows.push(['Idle timeout', `${esc(daemonTimeout)} ms${mins ? ` (${mins} min)` : ''}`]);
  }

  // --- Build performance ---
  const perfChips = [];
  const parallel = props.get('org.gradle.parallel');
  if (parallel != null) perfChips.push(boolChip('parallel', parallel));
  const workersMax = props.get('org.gradle.workers.max');
  if (workersMax) perfChips.push(`<span class="gp-chip gp-chip-gray">workers.max: ${esc(workersMax)}</span>`);
  const caching = props.get('org.gradle.caching');
  if (caching != null) perfChips.push(boolChip('build cache', caching));
  const configCache = props.get('org.gradle.configuration-cache');
  if (configCache != null) perfChips.push(boolChip('configuration-cache', configCache));
  const configOnDemand = props.get('org.gradle.configureondemand');
  if (configOnDemand != null) perfChips.push(boolChip('configure on demand', configOnDemand));

  // --- Android-specific ---
  const androidProps = [...props.entries()].filter(([k]) => k.startsWith('android.') || k === 'sdk.dir' || k === 'ANDROID_HOME');
  const androidChips = [];
  const androidRows = [];
  if (androidProps.length) {
    const useAndroidX = props.get('android.useAndroidX');
    if (useAndroidX != null) androidChips.push(boolChip('useAndroidX', useAndroidX));
    const jetifier = props.get('android.enableJetifier');
    if (jetifier != null) {
      const yes = jetifier.toLowerCase() === 'true';
      androidChips.push(`<span class="gp-chip ${yes ? 'gp-chip-off' : 'gp-chip-on'}">${yes ? 'Jetifier: on' : 'Jetifier: off'}</span>`);
    }
    const nonTransitive = props.get('android.nonTransitiveRClass');
    if (nonTransitive != null) androidChips.push(boolChip('nonTransitiveRClass', nonTransitive));
    const buildConfig = props.get('android.defaults.buildfeatures.buildconfig');
    if (buildConfig != null) androidChips.push(boolChip('buildconfig', buildConfig));
    const sdkDir = props.get('sdk.dir') || props.get('ANDROID_HOME');
    if (sdkDir) androidRows.push(['SDK dir', esc(sdkDir)]);
  }

  // --- SDK / version rows (Kotlin) ---
  const versionRows = [];
  if (props.has('kotlin.version')) versionRows.push(['Kotlin version', esc(props.get('kotlin.version'))]);
  if (props.has('kotlin.incremental')) {
    const ki = props.get('kotlin.incremental');
    versionRows.push(['Kotlin incremental', `${esc(ki)}${pill(ki)}`]);
  }
  if (props.has('android.compileSdkVersion')) versionRows.push(['Android compile SDK', esc(props.get('android.compileSdkVersion'))]);
  if (props.has('android.minSdkVersion')) versionRows.push(['Android min SDK', esc(props.get('android.minSdkVersion'))]);
  if (props.has('android.targetSdkVersion')) versionRows.push(['Android target SDK', esc(props.get('android.targetSdkVersion'))]);
  if (props.has('compileSdkVersion')) versionRows.push(['compileSdkVersion', esc(props.get('compileSdkVersion'))]);
  if (props.has('minSdkVersion')) versionRows.push(['minSdkVersion', esc(props.get('minSdkVersion'))]);
  if (props.has('targetSdkVersion')) versionRows.push(['targetSdkVersion', esc(props.get('targetSdkVersion'))]);

  // --- Project properties (non-gradle, non-android, non-kotlin) ---
  const SKIP_KEYS = new Set(['sdk.dir', 'ANDROID_HOME', 'kotlin.version', 'kotlin.incremental', 'kotlin.code.style',
    'compileSdkVersion', 'minSdkVersion', 'targetSdkVersion']);
  const customProps = [...props.entries()].filter(([k]) =>
    !k.startsWith('org.gradle.') &&
    !k.startsWith('android.') &&
    !k.startsWith('kotlin.') &&
    !SKIP_KEYS.has(k)
  );

  // Build HTML
  let html = '';

  if (jvmRows.length) {
    html += `<div class="gp-sec"><div class="gp-card"><h3>JVM settings</h3><table class="gp-table"><tbody>${tableRows(jvmRows)}</tbody></table></div></div>`;
  }

  if (daemonRows.length) {
    html += `<div class="gp-sec"><div class="gp-card"><h3>Daemon</h3><table class="gp-table"><tbody>${tableRows(daemonRows)}</tbody></table></div></div>`;
  }

  if (perfChips.length) {
    html += `<div class="gp-sec"><div class="gp-card"><h3>Build performance</h3><div class="gp-chips">${perfChips.join('')}</div></div></div>`;
  }

  if (androidProps.length) {
    let ahtml = '';
    if (androidChips.length) ahtml += `<div class="gp-chips">${androidChips.join('')}</div>`;
    if (androidRows.length) ahtml += `<table class="gp-table"><tbody>${tableRows(androidRows)}</tbody></table>`;
    html += `<div class="gp-sec"><div class="gp-card"><h3>Android</h3>${ahtml}</div></div>`;
  }

  if (versionRows.length) {
    html += `<div class="gp-sec"><div class="gp-card"><h3>SDK &amp; versions</h3><table class="gp-table"><tbody>${tableRows(versionRows)}</tbody></table></div></div>`;
  }

  if (customProps.length) {
    const customRows = customProps.map(([k, v]) => {
      const redact = SENSITIVE_RE.test(k);
      return `<tr><td>${esc(k)}</td><td>${redact ? '[configured]' : esc(v)}</td></tr>`;
    }).join('');
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
