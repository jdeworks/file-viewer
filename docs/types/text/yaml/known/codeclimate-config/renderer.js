import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.codeclimate-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.codeclimate-doc .cc-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#00AA66;color:#fff;vertical-align:middle;margin-right:8px;}
.codeclimate-doc .cc-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.codeclimate-doc .cc-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.codeclimate-doc .cc-sec{margin:12px 0;}
.codeclimate-doc .cc-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.codeclimate-doc .cc-chips{display:flex;flex-wrap:wrap;gap:4px;}
.codeclimate-doc .cc-chip{display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:2px 9px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.codeclimate-doc .cc-chip.on{background:#f0fdf4;border-color:#86efac;color:#166534;}
.codeclimate-doc .cc-chip.off{background:#fef2f2;border-color:#fca5a5;color:#991b1b;}
.codeclimate-doc .cc-path{font:12px/1.6 ui-monospace,monospace;color:var(--fg-2,#888);display:block;padding:1px 0;}
.codeclimate-doc .cc-kv{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;font-size:13px;margin:6px 0;}
.codeclimate-doc .cc-k{font:12px/1.6 ui-monospace,monospace;color:var(--fg-2,#888);}
.codeclimate-doc .cc-v{font:12px/1.6 ui-monospace,monospace;font-weight:600;}
.codeclimate-doc .cc-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin:0 0 10px;}
`;

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  const version = cfg.version || null;
  const engines = cfg.engines || cfg.plugins || {};
  const excludePatterns = Array.isArray(cfg.exclude_patterns) ? cfg.exclude_patterns : [];
  const checks = cfg.checks || {};
  const ratings = cfg.ratings || null;
  const threshold = ratings?.threshold || null;

  // Engines section
  const engineNames = Object.keys(engines);
  const enabledEngines = engineNames.filter((n) => engines[n]?.enabled !== false);
  const disabledEngines = engineNames.filter((n) => engines[n]?.enabled === false);

  const enginesHtml = engineNames.length
    ? `<div class="cc-sec"><h3>Engines / Plugins (${engineNames.length})</h3>
        <div class="cc-chips">
          ${engineNames.map((name) => {
            const enabled = engines[name]?.enabled !== false;
            return `<span class="cc-chip ${enabled ? 'on' : 'off'}">${esc(name)}</span>`;
          }).join('')}
        </div>
        ${disabledEngines.length ? `<div style="font-size:12px;color:var(--fg-2,#888);margin-top:4px;">${disabledEngines.length} engine${disabledEngines.length !== 1 ? 's' : ''} disabled</div>` : ''}
      </div>`
    : '';

  // Exclude patterns
  const excludeHtml = excludePatterns.length
    ? `<div class="cc-sec"><h3>Exclude patterns (${excludePatterns.length})</h3>
        <div class="cc-card">
          ${excludePatterns.map((p) => `<span class="cc-path">${esc(p)}</span>`).join('')}
        </div>
      </div>`
    : '';

  // Checks
  const checkNames = Object.keys(checks);
  const enabledChecks = checkNames.filter((n) => checks[n]?.enabled !== false);
  const disabledChecks = checkNames.filter((n) => checks[n]?.enabled === false);

  const checksHtml = checkNames.length
    ? `<div class="cc-sec"><h3>Checks (${checkNames.length})</h3>
        <div style="font-size:12px;color:var(--fg-2,#888);">${enabledChecks.length} enabled · ${disabledChecks.length} disabled</div>
        <div class="cc-chips" style="margin-top:6px;">
          ${checkNames.slice(0, 30).map((name) => {
            const enabled = checks[name]?.enabled !== false;
            return `<span class="cc-chip ${enabled ? 'on' : 'off'}">${esc(name)}</span>`;
          }).join('')}
          ${checkNames.length > 30 ? `<span style="font-size:11px;color:var(--fg-2,#888);">+${checkNames.length - 30} more</span>` : ''}
        </div>
      </div>`
    : '';

  // Settings
  const settingsRows = [
    version && `<span class="cc-k">version</span><span class="cc-v">${esc(String(version))}</span>`,
    threshold && `<span class="cc-k">ratings threshold</span><span class="cc-v">${esc(String(threshold))}</span>`,
  ].filter(Boolean);

  const settingsHtml = settingsRows.length
    ? `<div class="cc-sec"><h3>Settings</h3><div class="cc-card"><div class="cc-kv">${settingsRows.join('')}</div></div></div>`
    : '';

  const subParts = [
    engineNames.length ? `${engineNames.length} engine${engineNames.length !== 1 ? 's' : ''}` : '',
    excludePatterns.length ? `${excludePatterns.length} exclude pattern${excludePatterns.length !== 1 ? 's' : ''}` : '',
    checkNames.length ? `${checkNames.length} check${checkNames.length !== 1 ? 's' : ''}` : '',
    threshold ? `threshold: ${threshold}` : '',
  ].filter(Boolean);

  const host = document.createElement('div');
  host.className = 'codeclimate-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="cc-title"><span class="cc-badge">Code Climate</span>Code Climate config</div>
<div class="cc-sub">${esc(subParts.join(' · ') || 'Code Climate quality configuration')}</div>
${enginesHtml}${excludeHtml}${checksHtml}${settingsHtml}`;

  return { parentNode: host };
}
