// Enhanced PHPUnit config view. Parses phpunit.xml with DOMParser and shows
// test suites, coverage settings, PHP version, and logging.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.pu-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.pu-head{display:flex;align-items:center;gap:10px;margin-bottom:14px;}
.badge-pu{display:inline-block;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;background:#6b21a8;color:#fff;vertical-align:middle;}
.pu-title{font-size:18px;font-weight:700;margin:0;}
.pu-sub{font-size:12px;color:var(--fg-2,#888);margin:2px 0 0;}
.pu-sec{margin-top:16px;}
.pu-sec h3{font-size:12px;font-weight:600;color:var(--fg-2,#888);text-transform:uppercase;letter-spacing:.05em;margin:0 0 6px;}
.pu-suite{border:1px solid var(--border,#e8eaed);border-radius:6px;padding:8px 12px;margin-bottom:8px;}
.pu-suite-name{font-weight:700;font-size:13px;color:#6b21a8;}
.pu-suite-dirs{list-style:none;margin:4px 0 0;padding:0;}
.pu-suite-dir{font-size:12px;font-family:ui-monospace,monospace;color:var(--fg,#24292f);padding:1px 0;}
.pu-suite-dir::before{content:'📁 ';font-size:11px;}
.pu-suite-file::before{content:'📄 ';font-size:11px;}
.pu-pills{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;}
.pu-pill{display:inline-block;padding:2px 9px;border-radius:10px;font-size:12px;font-family:ui-monospace,monospace;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.pu-pill.cov{background:#f3e8ff;border-color:#d8b4fe;color:#6b21a8;}
.pu-pill.env{background:#e0f2fe;border-color:#7dd3fc;color:#0c4a6e;}
.pu-kv{display:flex;gap:10px;font-size:12px;padding:3px 0;border-bottom:1px solid var(--border,#eaecef);}
.pu-kv:last-child{border-bottom:none;}
.pu-kv-k{font-family:ui-monospace,monospace;font-weight:600;min-width:160px;flex-shrink:0;color:var(--fg,#24292f);}
.pu-kv-v{font-family:ui-monospace,monospace;color:var(--fg-2,#888);}
.pu-err{color:#c62828;font-size:13px;}
`;

function attr(el, ...names) {
  for (const n of names) {
    const v = el.getAttribute(n);
    if (v != null) return v;
  }
  return null;
}

function textOf(el, tag) {
  const found = el.getElementsByTagName(tag);
  return found.length ? found[0].textContent.trim() : null;
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes || new Uint8Array());
  const host = document.createElement('div');
  host.className = 'pu-doc';

  let doc;
  try { doc = new DOMParser().parseFromString(text, 'text/xml'); } catch (e) {
    host.innerHTML = `<style>${CSS}</style><p class="pu-err">Failed to parse XML: ${esc(String(e))}</p>`;
    return { parentNode: host };
  }
  if (doc.getElementsByTagName('parsererror').length) {
    host.innerHTML = `<style>${CSS}</style><p class="pu-err">Could not parse phpunit.xml as XML.</p>`;
    return { parentNode: host };
  }

  const root = doc.documentElement;
  const phpVersion = attr(root, 'xmlns') || null;
  const colors = attr(root, 'colors') || null;
  const bootstrap = attr(root, 'bootstrap') || null;
  const stopOnFailure = attr(root, 'stopOnFailure') || attr(root, 'failOnWarning') || null;

  // Test suites
  const suitesEl = doc.getElementsByTagName('testsuite');
  const suites = [];
  for (const s of suitesEl) {
    const name = attr(s, 'name') || '(unnamed)';
    const dirs = [];
    for (const d of s.getElementsByTagName('directory')) dirs.push({ type: 'dir', path: d.textContent.trim() });
    for (const f of s.getElementsByTagName('file')) dirs.push({ type: 'file', path: f.textContent.trim() });
    suites.push({ name, entries: dirs });
  }

  // Coverage
  const coverageEls = doc.getElementsByTagName('coverage');
  const coverage = coverageEls.length ? coverageEls[0] : null;
  const covInclude = coverage ? [...coverage.getElementsByTagName('directory')].map((d) => d.textContent.trim()) : [];
  const covDriverAttr = coverage ? attr(coverage, 'cacheDirectory') : null;

  // PHP ini / env
  const phpIniEls = [...doc.getElementsByTagName('ini')];
  const phpIni = phpIniEls.map((el) => ({ name: attr(el, 'name') || '', value: attr(el, 'value') || '' }));

  // Logging
  const loggingEls = [...doc.getElementsByTagName('log'), ...doc.getElementsByTagName('logging')];
  const logs = [];
  for (const l of loggingEls) {
    for (const t of l.getElementsByTagName('log')) logs.push({ type: attr(t, 'type') || '', target: attr(t, 'target') || '' });
  }

  // Extensions
  const extEls = doc.getElementsByTagName('extensions');
  const extensions = [];
  for (const extGroup of extEls) {
    for (const e of extGroup.getElementsByTagName('extension')) {
      extensions.push(attr(e, 'class') || attr(e, 'bootstrap') || '');
    }
  }

  // Build HTML
  const suitesHtml = suites.map((s) => `
    <div class="pu-suite">
      <div class="pu-suite-name">${esc(s.name)}</div>
      <ul class="pu-suite-dirs">
        ${s.entries.map((e) => `<li class="pu-suite-dir${e.type === 'file' ? ' pu-suite-file' : ''}">${esc(e.path)}</li>`).join('')}
      </ul>
    </div>`).join('');

  const infoRows = [
    bootstrap ? `<div class="pu-kv"><span class="pu-kv-k">bootstrap</span><span class="pu-kv-v">${esc(bootstrap)}</span></div>` : '',
    colors ? `<div class="pu-kv"><span class="pu-kv-k">colors</span><span class="pu-kv-v">${esc(colors)}</span></div>` : '',
    stopOnFailure ? `<div class="pu-kv"><span class="pu-kv-k">failOnWarning</span><span class="pu-kv-v">${esc(stopOnFailure)}</span></div>` : '',
  ].filter(Boolean).join('');

  const covHtml = covInclude.length ? `<div class="pu-sec"><h3>Coverage Paths</h3><div class="pu-pills">
    ${covInclude.map((d) => `<span class="pu-pill cov">${esc(d)}</span>`).join('')}
  </div></div>` : '';

  const iniHtml = phpIni.length ? `<div class="pu-sec"><h3>PHP ini Settings</h3>
    ${phpIni.map((i) => `<div class="pu-kv"><span class="pu-kv-k">${esc(i.name)}</span><span class="pu-kv-v">${esc(i.value)}</span></div>`).join('')}
  </div>` : '';

  const logHtml = logs.length ? `<div class="pu-sec"><h3>Logging</h3><div class="pu-pills">
    ${logs.map((l) => `<span class="pu-pill env">${esc(l.type)}${l.target ? ` → ${esc(l.target)}` : ''}</span>`).join('')}
  </div></div>` : '';

  const extHtml = extensions.length ? `<div class="pu-sec"><h3>Extensions (${extensions.length})</h3><div class="pu-pills">
    ${extensions.map((e) => `<span class="pu-pill">${esc(e.split('\\').pop())}</span>`).join('')}
  </div></div>` : '';

  const subtitle = [
    suites.length ? `${suites.length} suite${suites.length !== 1 ? 's' : ''}` : '',
    covInclude.length ? 'coverage configured' : '',
    bootstrap ? `bootstrap: ${bootstrap}` : '',
  ].filter(Boolean).join(' · ') || 'PHPUnit test configuration';

  host.innerHTML = `<style>${CSS}</style>
<div class="pu-head">
  <span class="badge-pu">PHPUnit</span>
  <div>
    <div class="pu-title">phpunit.xml</div>
    <div class="pu-sub">${esc(subtitle)}</div>
  </div>
</div>
${infoRows ? `<div class="pu-sec"><h3>Configuration</h3>${infoRows}</div>` : ''}
${suites.length ? `<div class="pu-sec"><h3>Test Suites (${suites.length})</h3>${suitesHtml}</div>` : '<p style="color:var(--fg-2,#888);font-size:13px;">No test suites defined.</p>'}
${covHtml}${iniHtml}${logHtml}${extHtml}`;

  return { parentNode: host };
}
