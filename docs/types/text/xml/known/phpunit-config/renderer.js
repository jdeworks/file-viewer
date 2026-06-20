const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.puc-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.puc-head{display:flex;align-items:center;gap:10px;margin-bottom:14px;}
.badge-puc{display:inline-block;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;background:#366488;color:#fff;vertical-align:middle;}
.puc-title{font-size:18px;font-weight:700;margin:0;}
.puc-sub{font-size:12px;color:var(--fg-2,#888);margin:2px 0 0;}
.puc-sec{margin-top:16px;}
.puc-sec h3{font-size:12px;font-weight:600;color:var(--fg-2,#888);text-transform:uppercase;letter-spacing:.05em;margin:0 0 6px;}
.puc-suite{border:1px solid var(--border,#e8eaed);border-radius:6px;padding:8px 12px;margin-bottom:8px;}
.puc-suite-name{font-weight:700;font-size:13px;color:#366488;}
.puc-entries{list-style:none;margin:4px 0 0;padding:0;}
.puc-entry{font-size:12px;font-family:ui-monospace,monospace;padding:1px 0;}
.puc-entry.dir::before{content:'📁 ';font-size:11px;}
.puc-entry.file::before{content:'📄 ';font-size:11px;}
.puc-card{border:1px solid var(--border,#e8eaed);border-radius:6px;padding:8px 12px;}
.puc-kv{display:flex;gap:10px;font-size:12px;padding:3px 0;border-bottom:1px solid var(--border,#eaecef);}
.puc-kv:last-child{border-bottom:none;}
.puc-kv-k{font-family:ui-monospace,monospace;font-weight:600;min-width:160px;flex-shrink:0;color:var(--fg,#24292f);}
.puc-kv-v{font-family:ui-monospace,monospace;color:var(--fg-2,#888);}
.puc-pill{display:inline-block;padding:2px 9px;border-radius:10px;font-size:12px;font-family:ui-monospace,monospace;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.puc-pill.cov{background:#dbeafe;border-color:#93c5fd;color:#1e3a5f;}
.puc-pill.env{background:#e0f2fe;border-color:#7dd3fc;color:#0c4a6e;}
.puc-pill.ext{background:#f3e8ff;border-color:#d8b4fe;color:#4c1d95;}
.puc-pills{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;}
.puc-err{color:#c62828;font-size:13px;}
`;

function attr(el, ...names) {
  for (const n of names) { const v = el.getAttribute(n); if (v != null) return v; }
  return null;
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes || new Uint8Array());
  const host = document.createElement('div');
  host.className = 'puc-doc';

  let doc;
  try { doc = new DOMParser().parseFromString(text, 'text/xml'); } catch (e) {
    host.innerHTML = `<style>${CSS}</style><p class="puc-err">Failed to parse XML: ${esc(String(e))}</p>`;
    return { parentNode: host };
  }
  if (doc.getElementsByTagName('parsererror').length) {
    host.innerHTML = `<style>${CSS}</style><p class="puc-err">Could not parse phpunit.xml as XML.</p>`;
    return { parentNode: host };
  }

  const root = doc.documentElement;
  const bootstrap = attr(root, 'bootstrap');
  const colors = attr(root, 'colors');
  const cacheDir = attr(root, 'cacheDirectory', 'cacheDir');
  const failOnWarning = attr(root, 'failOnWarning');
  const stopOnFailure = attr(root, 'stopOnFailure');
  const defaultTestSuite = attr(root, 'defaultTestSuite');

  // Test suites
  const suites = [];
  for (const s of doc.getElementsByTagName('testsuite')) {
    const name = attr(s, 'name') || '(unnamed)';
    const entries = [];
    for (const d of s.getElementsByTagName('directory')) entries.push({ type: 'dir', path: d.textContent.trim() });
    for (const f of s.getElementsByTagName('file')) entries.push({ type: 'file', path: f.textContent.trim() });
    suites.push({ name, entries });
  }

  // Coverage
  const coverageEls = doc.getElementsByTagName('coverage');
  const coverage = coverageEls.length ? coverageEls[0] : null;
  const covIncludes = [];
  const covExcludes = [];
  if (coverage) {
    const includeEl = coverage.getElementsByTagName('include');
    if (includeEl.length) {
      for (const d of includeEl[0].getElementsByTagName('directory')) covIncludes.push(d.textContent.trim());
    }
    const excludeEl = coverage.getElementsByTagName('exclude');
    if (excludeEl.length) {
      for (const d of excludeEl[0].getElementsByTagName('directory')) covExcludes.push(d.textContent.trim());
    }
  }

  // PHP ini settings
  const iniEls = [...doc.getElementsByTagName('ini')];
  const iniSettings = iniEls.map((el) => ({ name: attr(el, 'name') || '', value: attr(el, 'value') || '' }));

  // Extensions
  const extEls = doc.getElementsByTagName('extensions');
  const extensions = [];
  for (const extGroup of extEls) {
    for (const e of extGroup.getElementsByTagName('extension')) {
      extensions.push(attr(e, 'class') || attr(e, 'bootstrap') || '');
    }
    for (const e of extGroup.getElementsByTagName('bootstrap')) {
      const cls = attr(e, 'class') || attr(e, 'name') || e.textContent.trim();
      if (cls) extensions.push(cls);
    }
  }

  const subtitle = [
    suites.length ? `${suites.length} suite${suites.length !== 1 ? 's' : ''}` : '',
    covIncludes.length ? 'coverage configured' : '',
    bootstrap ? `bootstrap: ${bootstrap}` : '',
  ].filter(Boolean).join(' · ') || 'PHPUnit configuration';

  const configRows = [
    bootstrap ? `<div class="puc-kv"><span class="puc-kv-k">bootstrap</span><span class="puc-kv-v">${esc(bootstrap)}</span></div>` : '',
    colors ? `<div class="puc-kv"><span class="puc-kv-k">colors</span><span class="puc-kv-v">${esc(colors)}</span></div>` : '',
    cacheDir ? `<div class="puc-kv"><span class="puc-kv-k">cacheDirectory</span><span class="puc-kv-v">${esc(cacheDir)}</span></div>` : '',
    defaultTestSuite ? `<div class="puc-kv"><span class="puc-kv-k">defaultTestSuite</span><span class="puc-kv-v">${esc(defaultTestSuite)}</span></div>` : '',
    failOnWarning ? `<div class="puc-kv"><span class="puc-kv-k">failOnWarning</span><span class="puc-kv-v">${esc(failOnWarning)}</span></div>` : '',
    stopOnFailure ? `<div class="puc-kv"><span class="puc-kv-k">stopOnFailure</span><span class="puc-kv-v">${esc(stopOnFailure)}</span></div>` : '',
  ].filter(Boolean).join('');

  const configHtml = configRows ? `<div class="puc-sec"><h3>Configuration</h3><div class="puc-card">${configRows}</div></div>` : '';

  const suitesHtml = suites.length ? `<div class="puc-sec"><h3>Test Suites (${suites.length})</h3>
${suites.map((s) => `<div class="puc-suite">
  <div class="puc-suite-name">${esc(s.name)}</div>
  <ul class="puc-entries">
    ${s.entries.map((e) => `<li class="puc-entry ${e.type}">${esc(e.path)}</li>`).join('')}
  </ul>
</div>`).join('')}</div>` : '';

  const covHtml = (covIncludes.length || covExcludes.length) ? `<div class="puc-sec"><h3>Coverage</h3>
${covIncludes.length ? `<div style="margin-bottom:6px;"><div style="font-size:11px;color:var(--fg-2,#888);margin-bottom:4px;">Include</div><div class="puc-pills">${covIncludes.map((d) => `<span class="puc-pill cov">${esc(d)}</span>`).join('')}</div></div>` : ''}
${covExcludes.length ? `<div><div style="font-size:11px;color:var(--fg-2,#888);margin-bottom:4px;">Exclude</div><div class="puc-pills">${covExcludes.map((d) => `<span class="puc-pill">${esc(d)}</span>`).join('')}</div></div>` : ''}
</div>` : '';

  const iniHtml = iniSettings.length ? `<div class="puc-sec"><h3>PHP ini Settings</h3><div class="puc-card">
${iniSettings.map((i) => `<div class="puc-kv"><span class="puc-kv-k">${esc(i.name)}</span><span class="puc-kv-v">${esc(i.value)}</span></div>`).join('')}
</div></div>` : '';

  const extHtml = extensions.length ? `<div class="puc-sec"><h3>Extensions (${extensions.length})</h3><div class="puc-pills">
${extensions.map((e) => `<span class="puc-pill ext">${esc(e.split('\\').pop())}</span>`).join('')}
</div></div>` : '';

  host.innerHTML = `<style>${CSS}</style>
<div class="puc-head">
  <span class="badge-puc">PHPUnit</span>
  <div>
    <div class="puc-title">phpunit.xml</div>
    <div class="puc-sub">${esc(subtitle)}</div>
  </div>
</div>
${configHtml}${suitesHtml}${covHtml}${iniHtml}${extHtml}`;

  return { parentNode: host };
}
