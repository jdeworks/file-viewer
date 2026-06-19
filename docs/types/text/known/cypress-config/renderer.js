const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.cy-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-cy{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1a9e6a;color:#fff;vertical-align:middle;margin-right:8px}
.cy-title{font-size:18px;font-weight:700;margin:0 0 4px}
.cy-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.cy-sec{margin:12px 0}
.cy-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.cy-kv{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;font-size:13px;margin:6px 0}
.cy-k{font:12px/1.6 ui-monospace,monospace;color:var(--fg-2,#888)}
.cy-v{font:12px/1.6 ui-monospace,monospace;font-weight:600}
.cy-pills{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0}
.cy-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.cy-flag{display:inline-flex;align-items:center;gap:5px;font-size:13px;padding:4px 10px;border-radius:8px;background:var(--bg-2,#f6f8fa);margin:3px 4px 3px 0}
.cy-on{color:#16a34a}
.cy-off{color:#9ca3af}
.cy-tag{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:#dcfce7;border:1px solid #86efac;color:#15803d;margin-left:6px;font-weight:600}
`;

// Extract values from JS/TS config via regex (not eval).
function extract(text) {
  // Determine if this is legacy JSON (cypress.json)
  let jsonCfg = null;
  if (text.trim().startsWith('{')) {
    try { jsonCfg = JSON.parse(text); } catch { /* not JSON */ }
  }

  if (jsonCfg) return extractFromJson(jsonCfg);
  return extractFromJs(text);
}

function extractFromJson(cfg) {
  return {
    baseUrl: cfg.baseUrl || null,
    specPattern: cfg.integrationFolder || null,
    viewportWidth: cfg.viewportWidth || null,
    viewportHeight: cfg.viewportHeight || null,
    video: cfg.video !== undefined ? Boolean(cfg.video) : null,
    screenshotOnFailure: cfg.screenshotOnFailure !== undefined ? Boolean(cfg.screenshotOnFailure) : null,
    hasComponent: false,
    defaultCommandTimeout: cfg.defaultCommandTimeout || null,
    pageLoadTimeout: cfg.pageLoadTimeout || null,
    requestTimeout: cfg.requestTimeout || null,
    envCount: cfg.env ? Object.keys(cfg.env).length : 0,
    browsers: [],
  };
}

function extractFromJs(text) {
  // baseUrl from e2e section first, then top-level
  let baseUrl = null;
  const e2eBlockM = /e2e\s*:\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/.exec(text);
  if (e2eBlockM) {
    const e2eBlock = e2eBlockM[1];
    const buM = /baseUrl\s*:\s*['"`]([^'"`]+)['"`]/.exec(e2eBlock);
    if (buM) baseUrl = buM[1];
  }
  if (!baseUrl) {
    const buM = /baseUrl\s*:\s*['"`]([^'"`]+)['"`]/.exec(text);
    if (buM) baseUrl = buM[1];
  }

  // specPattern
  let specPattern = null;
  if (e2eBlockM) {
    const spM = /specPattern\s*:\s*['"`]([^'"`]+)['"`]/.exec(e2eBlockM[1]);
    if (spM) specPattern = spM[1];
  }
  if (!specPattern) {
    const spM = /specPattern\s*:\s*['"`]([^'"`]+)['"`]/.exec(text);
    if (spM) specPattern = spM[1];
  }
  if (!specPattern) {
    const ifM = /integrationFolder\s*:\s*['"`]([^'"`]+)['"`]/.exec(text);
    if (ifM) specPattern = ifM[1];
  }

  // viewport
  const vwM = /viewportWidth\s*:\s*(\d+)/.exec(text);
  const vhM = /viewportHeight\s*:\s*(\d+)/.exec(text);

  // video
  let video = null;
  const vidM = /video\s*:\s*(true|false)/.exec(text);
  if (vidM) video = vidM[1] === 'true';

  // screenshotOnFailure
  let screenshotOnFailure = null;
  const sofM = /screenshotOnRunFailure\s*:\s*(true|false)/.exec(text);
  if (sofM) screenshotOnFailure = sofM[1] === 'true';

  // component testing
  const hasComponent = /component\s*:/.test(text);

  // timeouts
  const dctM = /defaultCommandTimeout\s*:\s*(\d+)/.exec(text);
  const pltM = /pageLoadTimeout\s*:\s*(\d+)/.exec(text);
  const rtM = /requestTimeout\s*:\s*(\d+)/.exec(text);

  // env var count (rough: count keys in env: {...})
  let envCount = 0;
  const envBlockM = /(?:^|\s)env\s*:\s*\{([^}]+)\}/m.exec(text);
  if (envBlockM) {
    envCount = (envBlockM[1].match(/\w+\s*:/g) || []).length;
  }

  // browsers mentioned
  const browsers = new Set();
  for (const m of text.matchAll(/(?:browser|browsers)\s*:\s*['"`]([^'"`]+)['"`]/g)) {
    browsers.add(m[1]);
  }
  // Array form: browsers: ['chrome', 'firefox']
  const browsersArrM = /browsers\s*:\s*\[([^\]]+)\]/.exec(text);
  if (browsersArrM) {
    for (const m of browsersArrM[1].matchAll(/['"`]([^'"`]+)['"`]/g)) browsers.add(m[1]);
  }

  return {
    baseUrl,
    specPattern,
    viewportWidth: vwM ? Number(vwM[1]) : null,
    viewportHeight: vhM ? Number(vhM[1]) : null,
    video,
    screenshotOnFailure,
    hasComponent,
    defaultCommandTimeout: dctM ? Number(dctM[1]) : null,
    pageLoadTimeout: pltM ? Number(pltM[1]) : null,
    requestTimeout: rtM ? Number(rtM[1]) : null,
    envCount,
    browsers: [...browsers],
  };
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const cfg = extract(text);

  // Settings KV
  const kvRows = [];
  if (cfg.baseUrl) kvRows.push(`<div class="cy-k">baseUrl</div><div class="cy-v">${esc(cfg.baseUrl)}</div>`);
  if (cfg.specPattern) kvRows.push(`<div class="cy-k">specPattern</div><div class="cy-v">${esc(cfg.specPattern)}</div>`);
  if (cfg.viewportWidth && cfg.viewportHeight) kvRows.push(`<div class="cy-k">viewport</div><div class="cy-v">${esc(cfg.viewportWidth)} × ${esc(cfg.viewportHeight)}</div>`);
  if (cfg.defaultCommandTimeout != null) kvRows.push(`<div class="cy-k">command timeout</div><div class="cy-v">${esc(cfg.defaultCommandTimeout)} ms</div>`);
  if (cfg.pageLoadTimeout != null) kvRows.push(`<div class="cy-k">page load timeout</div><div class="cy-v">${esc(cfg.pageLoadTimeout)} ms</div>`);
  if (cfg.requestTimeout != null) kvRows.push(`<div class="cy-k">request timeout</div><div class="cy-v">${esc(cfg.requestTimeout)} ms</div>`);
  if (cfg.envCount > 0) kvRows.push(`<div class="cy-k">env vars</div><div class="cy-v">${esc(cfg.envCount)} defined</div>`);

  const settingsHtml = kvRows.length
    ? `<div class="cy-sec"><h3>Settings</h3><div class="cy-kv">${kvRows.join('')}</div></div>`
    : '';

  // Flags row
  const flags = [];
  if (cfg.video !== null) {
    const on = cfg.video;
    flags.push(`<span class="cy-flag"><span class="${on ? 'cy-on' : 'cy-off'}">${on ? '●' : '○'}</span> Video ${on ? 'enabled' : 'disabled'}</span>`);
  }
  if (cfg.screenshotOnFailure !== null) {
    const on = cfg.screenshotOnFailure;
    flags.push(`<span class="cy-flag"><span class="${on ? 'cy-on' : 'cy-off'}">${on ? '●' : '○'}</span> Screenshots on failure ${on ? 'enabled' : 'disabled'}</span>`);
  }
  if (cfg.hasComponent) {
    flags.push(`<span class="cy-flag cy-on">● Component testing configured<span class="cy-tag">component</span></span>`);
  }

  const flagsHtml = flags.length
    ? `<div class="cy-sec"><h3>Features</h3><div>${flags.join('')}</div></div>`
    : '';

  const browsersHtml = cfg.browsers.length
    ? `<div class="cy-sec"><h3>Browsers</h3><div class="cy-pills">${cfg.browsers.map((b) => `<span class="cy-pill">${esc(b)}</span>`).join('')}</div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'cy-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="cy-title"><span class="badge-cy">Cypress</span>cypress.config</div>
<div class="cy-sub">End-to-end test configuration</div>
${settingsHtml}${flagsHtml}${browsersHtml}`;
  return { parentNode: host };
}
