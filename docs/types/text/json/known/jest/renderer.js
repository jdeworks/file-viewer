const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.jest-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-jest{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#C21325;color:#fff;vertical-align:middle;margin-right:8px;}
.jest-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.jest-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.jest-sec{margin:12px 0;}
.jest-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.jest-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 3px 1px 0;}
.jest-chip-list{display:flex;flex-wrap:wrap;gap:4px;margin:4px 0;}
.jest-kv{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;font-size:13px;margin:6px 0;}
.jest-k{font:12px/1.6 ui-monospace,monospace;color:var(--fg-2,#888);}
.jest-v{font:12px/1.6 ui-monospace,monospace;font-weight:600;}
.jest-cov-bar{height:8px;border-radius:4px;background:var(--bg-2,#e5e7eb);overflow:hidden;min-width:80px;display:inline-block;vertical-align:middle;}
.jest-cov-fill{height:100%;border-radius:4px;background:#16a34a;}
`;

function covBar(pct) {
  const n = Math.min(100, Math.max(0, Number(pct) || 0));
  const color = n >= 80 ? '#16a34a' : n >= 50 ? '#ca8a04' : '#dc2626';
  return `<span class="jest-cov-bar"><span class="jest-cov-fill" style="width:${n}%;background:${color};"></span></span> <span style="font-size:11px;">${n}%</span>`;
}

export function render(intake) {
  let cfg;
  try { cfg = JSON.parse(intake.text || '{}'); } catch {
    const host = document.createElement('div');
    host.className = 'jest-doc';
    host.innerHTML = `<style>${CSS}</style><div class="jest-title"><span class="badge-jest">Jest</span>Invalid JSON</div>`;
    return { parentNode: host };
  }

  const testEnv = cfg.testEnvironment || 'node';
  const testMatch = Array.isArray(cfg.testMatch) ? cfg.testMatch : [];
  const testPathIgnore = Array.isArray(cfg.testPathIgnorePatterns) ? cfg.testPathIgnorePatterns : [];
  const allSetup = [...(Array.isArray(cfg.setupFiles) ? cfg.setupFiles : []), ...(Array.isArray(cfg.setupFilesAfterEnv) ? cfg.setupFilesAfterEnv : [])];
  const transforms = cfg.transform ? Object.keys(cfg.transform) : [];
  const moduleNameMapper = cfg.moduleNameMapper ? Object.keys(cfg.moduleNameMapper) : [];
  const coverage = cfg.collectCoverage;
  const coverageThreshold = cfg.coverageThreshold && cfg.coverageThreshold.global;
  const projects = Array.isArray(cfg.projects) ? cfg.projects : [];

  const settingsHtml = `<div class="jest-kv">
    <span class="jest-k">testEnvironment</span><span class="jest-v">${esc(testEnv)}</span>
    ${cfg.rootDir ? `<span class="jest-k">rootDir</span><span class="jest-v">${esc(cfg.rootDir)}</span>` : ''}
    ${cfg.testTimeout != null ? `<span class="jest-k">testTimeout</span><span class="jest-v">${esc(cfg.testTimeout)}ms</span>` : ''}
    ${cfg.maxWorkers != null ? `<span class="jest-k">maxWorkers</span><span class="jest-v">${esc(cfg.maxWorkers)}</span>` : ''}
    ${coverage != null ? `<span class="jest-k">collectCoverage</span><span class="jest-v">${esc(coverage)}</span>` : ''}
  </div>`;

  const covHtml = coverageThreshold ? `<div class="jest-sec"><h3>Coverage thresholds</h3>
    <div class="jest-kv">
      ${['lines', 'branches', 'functions', 'statements'].filter((k) => coverageThreshold[k] != null).map((k) =>
        `<span class="jest-k">${k}</span><span class="jest-v">${covBar(coverageThreshold[k])}</span>`
      ).join('')}
    </div>
  </div>` : '';

  const transformHtml = transforms.length ? `<div class="jest-sec"><h3>Transforms (${transforms.length})</h3><div class="jest-chip-list">${transforms.map((t) => `<span class="jest-chip">${esc(t)}</span>`).join('')}</div></div>` : '';
  const mapperHtml = moduleNameMapper.length ? `<div class="jest-sec"><h3>Module aliases (${moduleNameMapper.length})</h3><div class="jest-chip-list">${moduleNameMapper.slice(0, 8).map((t) => `<span class="jest-chip">${esc(t)}</span>`).join('')}</div></div>` : '';
  const setupHtml = allSetup.length ? `<div class="jest-sec"><h3>Setup files</h3><div class="jest-chip-list">${allSetup.map((f) => `<span class="jest-chip">${esc(f)}</span>`).join('')}</div></div>` : '';

  const host = document.createElement('div');
  host.className = 'jest-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="jest-title"><span class="badge-jest">Jest</span>Jest config</div>
<div class="jest-sub">env: ${esc(testEnv)}${projects.length ? ` · ${projects.length} project${projects.length !== 1 ? 's' : ''}` : ''}${transforms.length ? ` · ${transforms.length} transform${transforms.length !== 1 ? 's' : ''}` : ''}</div>
<div class="jest-sec"><h3>Settings</h3>${settingsHtml}</div>
${covHtml}
${transformHtml}
${mapperHtml}
${setupHtml}`;

  return { parentNode: host };
}
