const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.jestconfig-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-jestconfig{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#C21325;color:#fff;vertical-align:middle;margin-right:8px;}
.jestconfig-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.jestconfig-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.jestconfig-sec{margin:12px 0;}
.jestconfig-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.jestconfig-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:2px 3px 2px 0;}
.jestconfig-chip-list{display:flex;flex-wrap:wrap;gap:4px;margin:4px 0;}
.jestconfig-chip-env{background:#fef3c7;border-color:#fcd34d;color:#92400e;}
.jestconfig-kv{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;font-size:13px;margin:6px 0;}
.jestconfig-k{font:12px/1.6 ui-monospace,monospace;color:var(--fg-2,#888);}
.jestconfig-v{font:12px/1.6 ui-monospace,monospace;font-weight:600;}
.jestconfig-cov-bar{height:8px;border-radius:4px;background:var(--bg-2,#e5e7eb);overflow:hidden;min-width:80px;display:inline-block;vertical-align:middle;margin-right:6px;}
.jestconfig-cov-fill{height:100%;border-radius:4px;}
.jestconfig-table{width:100%;border-collapse:collapse;font-size:12px;}
.jestconfig-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.jestconfig-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;vertical-align:top;}
`;

function covBar(pct) {
  const n = Math.min(100, Math.max(0, Number(pct) || 0));
  const color = n >= 80 ? '#16a34a' : n >= 50 ? '#ca8a04' : '#dc2626';
  return `<span class="jestconfig-cov-bar"><span class="jestconfig-cov-fill" style="width:${n}%;background:${color};"></span></span><span style="font-size:11px;">${n}%</span>`;
}

// Extract a string value from JS config text by key
function extractStr(text, key) {
  const m = text.match(new RegExp(`['"]?${key}['"]?\\s*:\\s*['"\`]([^'"\`\\n]+)['"\`]`));
  return m ? m[1] : null;
}

// Extract a number value from JS config text by key
function extractNum(text, key) {
  const m = text.match(new RegExp(`['"]?${key}['"]?\\s*:\\s*(\\d+)`));
  return m ? m[1] : null;
}

// Extract an array of string values from JS config text by key
function extractArr(text, key) {
  const re = new RegExp(`['"]?${key}['"]?\\s*:\\s*\\[([^\\]]{0,2000})\\]`, 's');
  const m = text.match(re);
  if (!m) return [];
  const inner = m[1];
  const items = [];
  const itemRe = /['"`]([^'"`]+)['"`]/g;
  let im;
  while ((im = itemRe.exec(inner)) !== null) items.push(im[1]);
  return items;
}

// Extract an object's keys from JS config text by key
function extractObjKeys(text, key) {
  const re = new RegExp(`['"]?${key}['"]?\\s*:\\s*\\{([^}]{0,3000})\\}`, 's');
  const m = text.match(re);
  if (!m) return [];
  const inner = m[1];
  const keys = [];
  const keyRe = /['"`]([^'"`]+)['"`]\s*:/g;
  let km;
  while ((km = keyRe.exec(inner)) !== null) keys.push(km[1]);
  return keys;
}

// Extract object key-value pairs (both string)
function extractObjPairs(text, key) {
  const re = new RegExp(`['"]?${key}['"]?\\s*:\\s*\\{([^}]{0,3000})\\}`, 's');
  const m = text.match(re);
  if (!m) return [];
  const inner = m[1];
  const pairs = [];
  const pairRe = /['"`]([^'"`]+)['"`]\s*:\s*['"`]([^'"`]*)['"`]/g;
  let pm;
  while ((pm = pairRe.exec(inner)) !== null) pairs.push([pm[1], pm[2]]);
  return pairs;
}

// Extract coverage threshold numeric values from global block
function extractCovThresholds(text) {
  const globalRe = /coverageThreshold\s*:\s*\{[^}]*global\s*:\s*\{([^}]{0,500})\}/s;
  const gm = text.match(globalRe);
  if (!gm) return null;
  const inner = gm[1];
  const result = {};
  for (const metric of ['lines', 'branches', 'functions', 'statements']) {
    const nm = inner.match(new RegExp(`['"]?${metric}['"]?\\s*:\\s*(\\d+(?:\\.\\d+)?)`));
    if (nm) result[metric] = nm[1];
  }
  return Object.keys(result).length ? result : null;
}

export function render(intake) {
  const text = intake.text || '';
  const filename = (intake.name || intake.filename || '').split('/').pop() || 'jest.config.js';

  const testEnv = extractStr(text, 'testEnvironment') || 'node';
  const rootDir = extractStr(text, 'rootDir');
  const testTimeout = extractNum(text, 'testTimeout');
  const maxWorkers = extractStr(text, 'maxWorkers') || extractNum(text, 'maxWorkers');
  const testMatch = extractArr(text, 'testMatch');
  const testRegex = extractStr(text, 'testRegex');
  const setupFiles = extractArr(text, 'setupFiles');
  const setupFilesAfterFramework = extractArr(text, 'setupFilesAfterFramework');
  const allSetup = [...setupFiles, ...setupFilesAfterFramework];
  const collectCoverage = /collectCoverage\s*:\s*true/.test(text);
  const collectCoverageFrom = extractArr(text, 'collectCoverageFrom');
  const coverageThreshold = extractCovThresholds(text);
  const transforms = extractObjKeys(text, 'transform');
  const moduleNameMapper = extractObjPairs(text, 'moduleNameMapper');
  const moduleDirectories = extractArr(text, 'moduleDirectories');
  const roots = extractArr(text, 'roots');

  const envChipClass = (testEnv === 'jsdom') ? ' jestconfig-chip-env' : '';
  const settingsHtml = `<div class="jestconfig-kv">
    <span class="jestconfig-k">testEnvironment</span><span class="jestconfig-v"><span class="jestconfig-chip${envChipClass}">${esc(testEnv)}</span></span>
    ${rootDir ? `<span class="jestconfig-k">rootDir</span><span class="jestconfig-v">${esc(rootDir)}</span>` : ''}
    ${testTimeout ? `<span class="jestconfig-k">testTimeout</span><span class="jestconfig-v">${esc(testTimeout)}ms</span>` : ''}
    ${maxWorkers ? `<span class="jestconfig-k">maxWorkers</span><span class="jestconfig-v">${esc(maxWorkers)}</span>` : ''}
    ${collectCoverage ? `<span class="jestconfig-k">collectCoverage</span><span class="jestconfig-v">true</span>` : ''}
  </div>`;

  const matchHtml = (testMatch.length || testRegex)
    ? `<div class="jestconfig-sec"><h3>Test patterns</h3><div class="jestconfig-chip-list">
        ${testMatch.slice(0, 6).map((p) => `<span class="jestconfig-chip">${esc(p)}</span>`).join('')}
        ${testRegex ? `<span class="jestconfig-chip">${esc(testRegex)}</span>` : ''}
      </div></div>`
    : '';

  const transformHtml = transforms.length
    ? `<div class="jestconfig-sec"><h3>Transforms (${transforms.length})</h3><div class="jestconfig-chip-list">${transforms.map((t) => `<span class="jestconfig-chip">${esc(t)}</span>`).join('')}</div></div>`
    : '';

  const mapperHtml = moduleNameMapper.length
    ? `<div class="jestconfig-sec"><h3>Module aliases (${moduleNameMapper.length})</h3>
        <table class="jestconfig-table">
          <tr><th>Pattern</th><th>Maps to</th></tr>
          ${moduleNameMapper.slice(0, 8).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}
          ${moduleNameMapper.length > 8 ? `<tr><td colspan="2" style="opacity:.6">+${moduleNameMapper.length - 8} more</td></tr>` : ''}
        </table></div>`
    : '';

  const setupHtml = allSetup.length
    ? `<div class="jestconfig-sec"><h3>Setup files (${allSetup.length})</h3><div class="jestconfig-chip-list">${allSetup.map((f) => `<span class="jestconfig-chip">${esc(f)}</span>`).join('')}</div></div>`
    : '';

  const coverageFromHtml = collectCoverageFrom.length
    ? `<div class="jestconfig-sec"><h3>Coverage from (${collectCoverageFrom.length})</h3><div class="jestconfig-chip-list">${collectCoverageFrom.slice(0, 6).map((p) => `<span class="jestconfig-chip">${esc(p)}</span>`).join('')}</div></div>`
    : '';

  const covHtml = coverageThreshold
    ? `<div class="jestconfig-sec"><h3>Coverage thresholds</h3>
        <div class="jestconfig-kv">
          ${['lines', 'branches', 'functions', 'statements'].filter((k) => coverageThreshold[k] != null).map((k) =>
            `<span class="jestconfig-k">${k}</span><span class="jestconfig-v">${covBar(coverageThreshold[k])}</span>`
          ).join('')}
        </div></div>`
    : '';

  const dirsHtml = (moduleDirectories.length || roots.length)
    ? `<div class="jestconfig-sec"><h3>Module resolution</h3>
        ${moduleDirectories.length ? `<div style="margin-bottom:4px"><span style="font-size:11px;color:var(--fg-2,#888);font-family:ui-monospace,monospace;">moduleDirectories: </span>${moduleDirectories.map((d) => `<span class="jestconfig-chip">${esc(d)}</span>`).join('')}</div>` : ''}
        ${roots.length ? `<div><span style="font-size:11px;color:var(--fg-2,#888);font-family:ui-monospace,monospace;">roots: </span>${roots.map((r) => `<span class="jestconfig-chip">${esc(r)}</span>`).join('')}</div>` : ''}
      </div>`
    : '';

  const host = document.createElement('div');
  host.className = 'jestconfig-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="jestconfig-title"><span class="badge-jestconfig">Jest</span>${esc(filename)}</div>
<div class="jestconfig-sub">Jest test runner config · env: ${esc(testEnv)}${transforms.length ? ` · ${transforms.length} transform${transforms.length !== 1 ? 's' : ''}` : ''}${moduleNameMapper.length ? ` · ${moduleNameMapper.length} alias${moduleNameMapper.length !== 1 ? 'es' : ''}` : ''}</div>
<div class="jestconfig-sec"><h3>Settings</h3>${settingsHtml}</div>
${matchHtml}
${transformHtml}
${mapperHtml}
${setupHtml}
${coverageFromHtml}
${covHtml}
${dirsHtml}`;

  return { parentNode: host };
}
