import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.ckv-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-ckv{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#b91c1c;color:#fff;vertical-align:middle;margin-right:8px;}
.ckv-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.ckv-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.ckv-sec{margin:12px 0;}
.ckv-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.ckv-chip{display:inline-block;font-size:11px;padding:2px 9px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);margin:1px 3px 1px 0;font-family:ui-monospace,monospace;}
.ckv-chip.fw{background:#fef2f2;border-color:#fca5a5;color:#b91c1c;}
.ckv-chip.skip{background:#fff7ed;border-color:#fdba74;color:#c2410c;}
.ckv-chip.check{background:#f0fdf4;border-color:#86efac;color:#166534;}
.ckv-kv{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;font-size:13px;margin:6px 0;}
.ckv-k{font:12px/1.6 ui-monospace,monospace;color:var(--fg-2,#888);}
.ckv-v{font:12px/1.6 ui-monospace,monospace;font-weight:600;}
.ckv-mono{font:12px/1.4 ui-monospace,monospace;color:var(--fg-2,#888);}
`;

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = jsyaml.load(intake.text || '') || {};
  } catch { cfg = {}; }

  // Support both array and string for framework
  const frameworks = Array.isArray(cfg.framework) ? cfg.framework
    : (cfg.framework ? [cfg.framework] : []);
  const checks = Array.isArray(cfg.check) ? cfg.check : [];
  const skipChecks = Array.isArray(cfg['skip-check']) ? cfg['skip-check'] : [];
  const directories = Array.isArray(cfg.directory) ? cfg.directory : [];
  const output = cfg.output || null;
  const compact = cfg.compact || false;
  const softFail = cfg['soft-fail'] || cfg.soft_fail || false;
  const downloadExternalModules = cfg['download-external-modules'];

  const frameworkHtml = frameworks.length ? `<div class="ckv-sec"><h3>Frameworks (${frameworks.length})</h3><div>
    ${frameworks.map((f) => `<span class="ckv-chip fw">${esc(f)}</span>`).join('')}
  </div></div>` : '';

  const checkHtml = checks.length ? `<div class="ckv-sec"><h3>Enabled checks (${checks.length})</h3><div>
    ${checks.slice(0, 20).map((c) => `<span class="ckv-chip check">${esc(c)}</span>`).join('')}${checks.length > 20 ? `<span class="ckv-chip">+${checks.length - 20} more</span>` : ''}
  </div></div>` : '';

  const skipHtml = skipChecks.length ? `<div class="ckv-sec"><h3>Skipped checks (${skipChecks.length})</h3><div>
    ${skipChecks.slice(0, 20).map((c) => `<span class="ckv-chip skip">${esc(c)}</span>`).join('')}${skipChecks.length > 20 ? `<span class="ckv-chip">+${skipChecks.length - 20} more</span>` : ''}
  </div></div>` : '';

  const dirHtml = directories.length ? `<div class="ckv-sec"><h3>Scan directories (${directories.length})</h3><div>
    ${directories.map((d) => `<span class="ckv-chip">${esc(d)}</span>`).join('')}
  </div></div>` : '';

  const settingsEntries = [
    output ? `<span class="ckv-k">output</span><span class="ckv-v">${esc(output)}</span>` : '',
    compact ? `<span class="ckv-k">compact</span><span class="ckv-v">true</span>` : '',
    softFail ? `<span class="ckv-k">soft-fail</span><span class="ckv-v">true</span>` : '',
    downloadExternalModules != null ? `<span class="ckv-k">download-external-modules</span><span class="ckv-v">${esc(String(downloadExternalModules))}</span>` : '',
  ].filter(Boolean);

  const settingsHtml = settingsEntries.length ? `<div class="ckv-sec"><h3>Settings</h3><div class="ckv-kv">
    ${settingsEntries.join('')}
  </div></div>` : '';

  const sub = [
    frameworks.length ? `${frameworks.join(', ')}` : '',
    checks.length ? `${checks.length} check${checks.length !== 1 ? 's' : ''}` : '',
    skipChecks.length ? `${skipChecks.length} skipped` : '',
    output ? `output: ${output}` : '',
  ].filter(Boolean).join(' · ') || 'Checkov IaC security scanner config';

  const host = document.createElement('div');
  host.className = 'ckv-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="ckv-title"><span class="badge-ckv">Checkov</span>Checkov config</div>
<div class="ckv-sub">${esc(sub)}</div>
${settingsHtml}${frameworkHtml}${checkHtml}${skipHtml}${dirHtml}`;

  return { parentNode: host };
}
