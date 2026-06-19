import { parseTOML } from '../../toml.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.bun-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-bun{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#14b8a6;color:#fff;vertical-align:middle;margin-right:8px}
.bun-title{font-size:18px;font-weight:700;margin:0 0 4px}
.bun-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px}
.bun-sec{margin:12px 0}
.bun-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.bun-pills{display:flex;flex-wrap:wrap;gap:6px}
.bun-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.bun-kv{display:flex;gap:6px;align-items:baseline;font-size:13px;padding:4px 10px;border-radius:6px;background:var(--bg-2,#f6f8fa);margin:3px 0}
.bun-kv span:first-child{color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;letter-spacing:.04em;min-width:100px}
.bun-kv span:last-child{font-family:ui-monospace,monospace;font-weight:600;color:#14b8a6}
.bun-bool{display:inline-block;padding:1px 7px;border-radius:8px;font-size:11px;font-weight:700}
.bun-bool.on{background:#dcfce7;color:#166534}
.bun-bool.off{background:#fee2e2;color:#991b1b}
`;

function boolChip(val) {
  const on = val === true || val === 'true';
  return `<span class="bun-bool ${on ? 'on' : 'off'}">${on ? 'yes' : 'no'}</span>`;
}

export function render(intake) {
  let cfg = {};
  try { cfg = parseTOML(intake.text || '') || {}; } catch { cfg = {}; }

  const install = cfg.install || {};
  const run = cfg.run || {};
  const test = cfg.test || {};
  const serve = cfg.serve || {};
  const telemetry = cfg.telemetry || {};

  // Install section
  const registry = install.registry || null;
  const frozenLockfile = install.frozenLockfile !== undefined ? install.frozenLockfile : null;
  const installItems = [
    registry ? `<div class="bun-kv"><span>Registry</span><span>${esc(registry)}</span></div>` : '',
    frozenLockfile !== null ? `<div class="bun-kv"><span>Frozen Lockfile</span><span>${boolChip(frozenLockfile)}</span></div>` : '',
  ].filter(Boolean).join('');

  // Run section
  const bunVersion = run.bun || null;
  const runItems = bunVersion
    ? `<div class="bun-kv"><span>Bun Version</span><span>${esc(bunVersion)}</span></div>`
    : '';

  // Test section
  const preloadArr = Array.isArray(test.preload) ? test.preload : (test.preload ? [test.preload] : []);
  const testTimeout = test.timeout !== undefined ? test.timeout : null;
  const testItems = [
    testTimeout !== null ? `<div class="bun-kv"><span>Timeout</span><span>${esc(testTimeout)}ms</span></div>` : '',
  ].filter(Boolean).join('');

  // Serve section
  const servePort = serve.port !== undefined ? serve.port : null;
  const serveItems = servePort !== null
    ? `<div class="bun-kv"><span>Port</span><span>${esc(servePort)}</span></div>`
    : '';

  // Telemetry
  const telDisable = telemetry.disable !== undefined ? telemetry.disable : null;

  const installHtml = installItems
    ? `<div class="bun-sec"><h3>Install</h3>${installItems}</div>`
    : '';

  const runHtml = runItems
    ? `<div class="bun-sec"><h3>Run</h3>${runItems}</div>`
    : '';

  const preloadHtml = preloadArr.length
    ? `<div class="bun-sec"><h3>Test Preloads</h3><div class="bun-pills">${preloadArr.map((p) => `<span class="bun-pill">${esc(p)}</span>`).join('')}</div></div>`
    : '';

  const testHtml = testItems
    ? `<div class="bun-sec"><h3>Test</h3>${testItems}</div>`
    : '';

  const serveHtml = serveItems
    ? `<div class="bun-sec"><h3>Serve</h3>${serveItems}</div>`
    : '';

  const telHtml = telDisable !== null
    ? `<div class="bun-sec"><h3>Telemetry</h3><div class="bun-kv"><span>Disabled</span><span>${boolChip(telDisable)}</span></div></div>`
    : '';

  const subParts = [
    registry && registry !== 'https://registry.npmjs.org/' ? `registry: ${registry}` : null,
    servePort ? `port ${servePort}` : null,
    telDisable ? 'telemetry off' : null,
  ].filter(Boolean);
  const sub = subParts.join(' · ') || 'Bun runtime configuration';

  const host = document.createElement('div');
  host.className = 'bun-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="bun-title"><span class="badge-bun">Bun</span>bunfig.toml</div>
<div class="bun-sub">${esc(sub)}</div>
${installHtml}${runHtml}${preloadHtml}${testHtml}${serveHtml}${telHtml}`;
  return { parentNode: host };
}
