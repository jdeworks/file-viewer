const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.pw-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-pw{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#7c3aed;color:#fff;vertical-align:middle;margin-right:8px}
.pw-title{font-size:18px;font-weight:700;margin:0 0 4px}
.pw-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.pw-sec{margin:12px 0}
.pw-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.pw-kv{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;font-size:13px;margin:6px 0}
.pw-k{font:12px/1.6 ui-monospace,monospace;color:var(--fg-2,#888)}
.pw-v{font:12px/1.6 ui-monospace,monospace;font-weight:600}
.pw-pills{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0}
.pw-pill{display:inline-flex;align-items:center;gap:5px;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.pw-pill-webkit{background:#fdf2f8;border-color:#f0abfc;color:#86198f}
.pw-pill-chromium{background:#eff6ff;border-color:#93c5fd;color:#1d4ed8}
.pw-pill-firefox{background:#fff7ed;border-color:#fdba74;color:#c2410c}
.pw-pill-mobile{background:#f0fdf4;border-color:#86efac;color:#15803d}
.pw-check{display:inline-block;margin-right:5px}
.pw-yes{color:#16a34a}
.pw-no{color:#9ca3af}
.pw-warn{font-size:12px;color:var(--fg-2,#888);margin:4px 0;padding:6px 10px;border-radius:6px;background:var(--bg-2,#f6f8fa)}
`;

// Very lightweight regex-based extraction — Playwright configs are JS/TS, not JSON.
// We look for common patterns without trying to eval the config.
function extract(text) {
  const result = {
    testDir: null,
    browsers: [],
    baseURL: null,
    timeout: null,
    expectTimeout: null,
    reporter: null,
    workers: null,
    retries: null,
    hasWebServer: false,
    shards: null,
  };

  // testDir
  const tdM = /testDir\s*:\s*['"`]([^'"`]+)['"`]/.exec(text);
  if (tdM) result.testDir = tdM[1];

  // baseURL
  const buM = /baseURL\s*:\s*['"`]([^'"`]+)['"`]/.exec(text);
  if (buM) result.baseURL = buM[1];

  // timeout (top-level)
  const toM = /(?:^|,|\{)\s*timeout\s*:\s*(\d+)/m.exec(text);
  if (toM) result.timeout = Number(toM[1]);

  // expect timeout
  const etM = /expect\s*:\s*\{[^}]*timeout\s*:\s*(\d+)/.exec(text);
  if (etM) result.expectTimeout = Number(etM[1]);

  // workers
  const wkM = /workers\s*:\s*(\d+|'100%'|"100%"|process\.env\.[A-Z_]+\s*\?\s*\d+\s*:\s*\d+)/.exec(text);
  if (wkM) result.workers = wkM[1].trim();

  // retries
  const rtM = /retries\s*:\s*(\d+)/.exec(text);
  if (rtM) result.retries = Number(rtM[1]);

  // webServer
  if (/webServer\s*:/.test(text)) result.hasWebServer = true;

  // sharding
  const shM = /shard\s*:\s*\{[^}]*total\s*:\s*(\d+)/.exec(text);
  if (shM) result.shards = Number(shM[1]);

  // reporter — first string value after reporter:
  const rpM = /reporter\s*:\s*(?:\[?\s*)?['"`]([^'"`]+)['"`]/.exec(text);
  if (rpM) result.reporter = rpM[1];

  // Browsers from projects[].name or devices
  const browserNames = new Set();
  // Pattern: name: 'chromium' / 'firefox' / 'webkit'
  for (const m of text.matchAll(/(?:name\s*:\s*|browserName\s*:\s*)['"`]([^'"`]+)['"`]/g)) {
    const n = m[1].toLowerCase();
    if (n.includes('chromium') || n.includes('chrome')) browserNames.add('chromium');
    else if (n.includes('firefox')) browserNames.add('firefox');
    else if (n.includes('webkit') || n.includes('safari')) browserNames.add('webkit');
    else if (n.includes('mobile') || n.includes('pixel') || n.includes('iphone')) browserNames.add('mobile');
    else if (n.includes('edge')) browserNames.add('chromium');
    else browserNames.add(n);
  }
  // devices reference
  if (/devices\[/.test(text)) {
    for (const m of text.matchAll(/devices\['([^']+)'\]/g)) {
      const d = m[1].toLowerCase();
      if (d.includes('pixel') || d.includes('android') || d.includes('mobile chrome')) browserNames.add('mobile');
      else if (d.includes('iphone') || d.includes('ipad') || d.includes('mobile safari')) browserNames.add('mobile');
    }
  }
  result.browsers = [...browserNames];

  return result;
}

function browserPill(b) {
  const cls = {
    chromium: 'pw-pill-chromium',
    firefox: 'pw-pill-firefox',
    webkit: 'pw-pill-webkit',
    mobile: 'pw-pill-mobile',
  }[b] || '';
  const icons = { chromium: '🟦', firefox: '🦊', webkit: '🍎', mobile: '📱' };
  return `<span class="pw-pill ${cls}">${icons[b] || ''}${esc(b)}</span>`;
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const cfg = extract(text);

  const browsersHtml = cfg.browsers.length
    ? `<div class="pw-sec"><h3>Browsers (${cfg.browsers.length})</h3><div class="pw-pills">${cfg.browsers.map(browserPill).join('')}</div></div>`
    : '';

  const kvRows = [];
  if (cfg.testDir) kvRows.push(`<div class="pw-k">testDir</div><div class="pw-v">${esc(cfg.testDir)}</div>`);
  if (cfg.baseURL) kvRows.push(`<div class="pw-k">baseURL</div><div class="pw-v">${esc(cfg.baseURL)}</div>`);
  if (cfg.timeout != null) kvRows.push(`<div class="pw-k">timeout</div><div class="pw-v">${esc(cfg.timeout)} ms</div>`);
  if (cfg.expectTimeout != null) kvRows.push(`<div class="pw-k">expect timeout</div><div class="pw-v">${esc(cfg.expectTimeout)} ms</div>`);
  if (cfg.workers != null) kvRows.push(`<div class="pw-k">workers</div><div class="pw-v">${esc(cfg.workers)}</div>`);
  if (cfg.retries != null) kvRows.push(`<div class="pw-k">retries</div><div class="pw-v">${esc(cfg.retries)}</div>`);
  if (cfg.reporter) kvRows.push(`<div class="pw-k">reporter</div><div class="pw-v">${esc(cfg.reporter)}</div>`);
  if (cfg.shards != null) kvRows.push(`<div class="pw-k">shards</div><div class="pw-v">${esc(cfg.shards)}</div>`);

  const settingsHtml = kvRows.length
    ? `<div class="pw-sec"><h3>Settings</h3><div class="pw-kv">${kvRows.join('')}</div></div>`
    : '';

  const webServerHtml = cfg.hasWebServer
    ? `<div class="pw-warn"><span class="pw-check pw-yes">✓</span>Web server configured (dev server started automatically before tests)</div>`
    : '';

  const host = document.createElement('div');
  host.className = 'pw-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="pw-title"><span class="badge-pw">Playwright</span>playwright.config</div>
<div class="pw-sub">End-to-end test configuration</div>
${browsersHtml}${settingsHtml}${webServerHtml}`;
  return { parentNode: host };
}
