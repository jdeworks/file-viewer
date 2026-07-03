const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.vt-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-vt{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#729b1b;color:#fff;vertical-align:middle;margin-right:8px;}
.vt-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.vt-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.vt-sec{margin:12px 0;}
.vt-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.vt-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 3px 1px 0;}
.vt-chip-list{display:flex;flex-wrap:wrap;gap:4px;margin:4px 0;}
.vt-kv{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;font-size:13px;margin:6px 0;}
.vt-k{font:12px/1.6 ui-monospace,monospace;color:var(--fg-2,#888);}
.vt-v{font:12px/1.6 ui-monospace,monospace;font-weight:600;}
.vt-cov-bar{height:8px;border-radius:4px;background:var(--bg-2,#e5e7eb);overflow:hidden;min-width:80px;display:inline-block;vertical-align:middle;}
.vt-cov-fill{height:100%;border-radius:4px;}
`;

function covBar(pct) {
  const n = Math.min(100, Math.max(0, Number(pct) || 0));
  const color = n >= 80 ? '#16a34a' : n >= 50 ? '#ca8a04' : '#dc2626';
  return `<span class="vt-cov-bar"><span class="vt-cov-fill" style="width:${n}%;background:${color};"></span></span> <span style="font-size:11px;">${n}%</span>`;
}

export function render(intake) {
  let cfg;
  try { cfg = JSON.parse(intake.text || '{}'); } catch {
    const host = document.createElement('div');
    host.className = 'vt-doc';
    host.innerHTML = `<style>${CSS}</style><div class="vt-title"><span class="badge-vt">Vitest</span>Invalid JSON</div>`;
    return { parentNode: host };
  }

  // test config lives under cfg.test if present (vitest.config.json wraps in {test:...})
  const test = cfg.test || cfg;
  const env = test.environment || 'node';
  const include = Array.isArray(test.include) ? test.include : [];
  const exclude = Array.isArray(test.exclude) ? test.exclude : [];
  const reporters = Array.isArray(test.reporters) ? test.reporters : (test.reporters ? [test.reporters] : []);
  const globals = test.globals != null ? test.globals : null;
  const testTimeout = test.testTimeout != null ? test.testTimeout : null;
  const coverage = test.coverage || {};
  const coverageProvider = coverage.provider || null;
  const coverageThreshold = coverage.thresholds || coverage.threshold || null;
  const workspace = Array.isArray(cfg.workspace) ? cfg.workspace : [];

  const settingsHtml = `<div class="vt-kv">
    <span class="vt-k">environment</span><span class="vt-v">${esc(env)}</span>
    ${globals != null ? `<span class="vt-k">globals</span><span class="vt-v">${esc(globals)}</span>` : ''}
    ${testTimeout != null ? `<span class="vt-k">testTimeout</span><span class="vt-v">${esc(testTimeout)}ms</span>` : ''}
    ${coverageProvider ? `<span class="vt-k">coverage.provider</span><span class="vt-v">${esc(coverageProvider)}</span>` : ''}
  </div>`;

  const includeHtml = include.length
    ? `<div class="vt-sec"><h3>Include patterns (${include.length})</h3><div class="vt-chip-list">${include.map((p) => `<span class="vt-chip">${esc(p)}</span>`).join('')}</div></div>`
    : '';

  const excludeHtml = exclude.length
    ? `<div class="vt-sec"><h3>Exclude patterns (${exclude.length})</h3><div class="vt-chip-list">${exclude.slice(0, 6).map((p) => `<span class="vt-chip">${esc(p)}</span>`).join('')}${exclude.length > 6 ? `<span style="font-size:11px;color:var(--fg-2,#888)">+${exclude.length - 6} more</span>` : ''}</div></div>`
    : '';

  const reportersHtml = reporters.length
    ? `<div class="vt-sec"><h3>Reporters</h3><div class="vt-chip-list">${reporters.map((r) => `<span class="vt-chip">${esc(typeof r === 'string' ? r : JSON.stringify(r))}</span>`).join('')}</div></div>`
    : '';

  let covHtml = '';
  if (coverageThreshold) {
    const keys = ['lines', 'branches', 'functions', 'statements'].filter((k) => coverageThreshold[k] != null);
    if (keys.length) {
      covHtml = `<div class="vt-sec"><h3>Coverage thresholds</h3><div class="vt-kv">${keys.map((k) =>
        `<span class="vt-k">${k}</span><span class="vt-v">${covBar(coverageThreshold[k])}</span>`
      ).join('')}</div></div>`;
    }
  }

  const workspaceHtml = workspace.length
    ? `<div class="vt-sec"><h3>Workspace projects (${workspace.length})</h3><div class="vt-chip-list">${workspace.slice(0, 6).map((w) => `<span class="vt-chip">${esc(typeof w === 'string' ? w : w.extends || JSON.stringify(w))}</span>`).join('')}</div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'vt-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="vt-title"><span class="badge-vt">Vitest</span>Vitest config</div>
<div class="vt-sub">env: ${esc(env)}${reporters.length ? ` · reporters: ${reporters.length}` : ''}${coverageProvider ? ` · coverage: ${esc(coverageProvider)}` : ''}</div>
<div class="vt-sec"><h3>Settings</h3>${settingsHtml}</div>
${includeHtml}${excludeHtml}${reportersHtml}${covHtml}${workspaceHtml}`;

  return { parentNode: host };
}
