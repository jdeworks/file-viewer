const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.wdio-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-wdio{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0f7a8e;color:#fff;vertical-align:middle;margin-right:8px}
.wdio-title{font-size:18px;font-weight:700;margin:0 0 4px}
.wdio-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.wdio-sec{margin:12px 0}
.wdio-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.wdio-kv{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;font-size:13px;margin:6px 0}
.wdio-k{font:12px/1.6 ui-monospace,monospace;color:var(--fg-2,#888)}
.wdio-v{font:12px/1.6 ui-monospace,monospace;font-weight:600}
.wdio-pills{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0}
.wdio-pill{display:inline-flex;align-items:center;gap:5px;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.wdio-pill-chrome{background:#eff6ff;border-color:#93c5fd;color:#1d4ed8}
.wdio-pill-firefox{background:#fff7ed;border-color:#fdba74;color:#c2410c}
.wdio-pill-safari{background:#fdf2f8;border-color:#f0abfc;color:#86198f}
.wdio-pill-edge{background:#ecfdf5;border-color:#6ee7b7;color:#065f46}
.wdio-badge-fw{display:inline-block;font-size:11px;padding:2px 8px;border-radius:6px;background:#e0f2fe;border:1px solid #7dd3fc;color:#0369a1;font-weight:600;margin-left:4px}
`;

function extract(text) {
  const result = {
    framework: null,
    specs: [],
    capabilities: [],
    reporters: [],
    maxInstances: null,
    baseUrl: null,
    services: [],
  };

  // framework
  const fwM = /framework\s*:\s*['"`]([^'"`]+)['"`]/.exec(text);
  if (fwM) result.framework = fwM[1];

  // specs array items
  for (const m of text.matchAll(/['"`](\.\/)?(?:test|spec|e2e|src)[^'"`]*\.(?:js|ts|mjs|cjs)['"`]/g)) {
    result.specs.push(m[0].replace(/^['"`]|['"`]$/g, ''));
    if (result.specs.length >= 5) break;
  }
  // specs glob patterns
  if (!result.specs.length) {
    const specsM = /specs\s*:\s*\[([^\]]+)\]/s.exec(text);
    if (specsM) {
      for (const m of specsM[1].matchAll(/['"`]([^'"`]+)['"`]/g)) {
        result.specs.push(m[1]);
        if (result.specs.length >= 5) break;
      }
    }
  }

  // capabilities: look for browserName strings
  const capBrowsers = new Set();
  for (const m of text.matchAll(/browserName\s*:\s*['"`]([^'"`]+)['"`]/g)) {
    capBrowsers.add(m[1].toLowerCase());
  }
  // also detect device/browser names in capabilities array strings
  if (/chrome|chromium/.test(text.toLowerCase())) capBrowsers.add('chrome');
  if (/firefox/.test(text.toLowerCase())) capBrowsers.add('firefox');
  if (/safari/.test(text.toLowerCase())) capBrowsers.add('safari');
  if (/\bedge\b/i.test(text)) capBrowsers.add('edge');
  // De-dup chrome/chromium
  if (capBrowsers.has('chromium')) { capBrowsers.add('chrome'); capBrowsers.delete('chromium'); }
  result.capabilities = [...capBrowsers];

  // reporters
  const repM = /reporters\s*:\s*\[([^\]]+)\]/s.exec(text);
  if (repM) {
    for (const m of repM[1].matchAll(/['"`]([^'"`]+)['"`]/g)) {
      result.reporters.push(m[1]);
    }
  }
  if (!result.reporters.length) {
    const rM = /reporter\s*:\s*['"`]([^'"`]+)['"`]/.exec(text);
    if (rM) result.reporters.push(rM[1]);
  }

  // maxInstances
  const miM = /maxInstances\s*:\s*(\d+)/.exec(text);
  if (miM) result.maxInstances = Number(miM[1]);

  // baseUrl
  const buM = /baseUrl\s*:\s*['"`]([^'"`]+)['"`]/.exec(text);
  if (buM) result.baseUrl = buM[1];

  // services
  const svcM = /services\s*:\s*\[([^\]]+)\]/s.exec(text);
  if (svcM) {
    for (const m of svcM[1].matchAll(/['"`]([^'"`]+)['"`]/g)) {
      result.services.push(m[1]);
    }
  }

  return result;
}

function browserPill(b) {
  const cls = { chrome: 'wdio-pill-chrome', firefox: 'wdio-pill-firefox', safari: 'wdio-pill-safari', edge: 'wdio-pill-edge' }[b] || '';
  return `<span class="wdio-pill ${cls}">${esc(b)}</span>`;
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const cfg = extract(text);

  const kvRows = [];
  if (cfg.framework) kvRows.push(`<div class="wdio-k">framework</div><div class="wdio-v">${esc(cfg.framework)}<span class="wdio-badge-fw">${esc(cfg.framework)}</span></div>`);
  if (cfg.baseUrl) kvRows.push(`<div class="wdio-k">baseUrl</div><div class="wdio-v">${esc(cfg.baseUrl)}</div>`);
  if (cfg.maxInstances != null) kvRows.push(`<div class="wdio-k">maxInstances</div><div class="wdio-v">${esc(cfg.maxInstances)}</div>`);

  const settingsHtml = kvRows.length
    ? `<div class="wdio-sec"><h3>Settings</h3><div class="wdio-kv">${kvRows.join('')}</div></div>`
    : '';

  const browsersHtml = cfg.capabilities.length
    ? `<div class="wdio-sec"><h3>Browsers (${cfg.capabilities.length})</h3><div class="wdio-pills">${cfg.capabilities.map(browserPill).join('')}</div></div>`
    : '';

  const reportersHtml = cfg.reporters.length
    ? `<div class="wdio-sec"><h3>Reporters</h3><div class="wdio-pills">${cfg.reporters.map((r) => `<span class="wdio-pill">${esc(r)}</span>`).join('')}</div></div>`
    : '';

  const specsHtml = cfg.specs.length
    ? `<div class="wdio-sec"><h3>Spec Patterns</h3><div class="wdio-pills">${cfg.specs.map((s) => `<span class="wdio-pill">${esc(s)}</span>`).join('')}</div></div>`
    : '';

  const servicesHtml = cfg.services.length
    ? `<div class="wdio-sec"><h3>Services</h3><div class="wdio-pills">${cfg.services.map((s) => `<span class="wdio-pill">${esc(s)}</span>`).join('')}</div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'wdio-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="wdio-title"><span class="badge-wdio">WebdriverIO</span>wdio.conf</div>
<div class="wdio-sub">WebdriverIO test runner configuration</div>
${settingsHtml}${browsersHtml}${reportersHtml}${specsHtml}${servicesHtml}`;
  return { parentNode: host };
}
