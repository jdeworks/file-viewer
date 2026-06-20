import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.gcl-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-gcl{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#F6B93B;color:#1c1917;vertical-align:middle;margin-right:8px;}
.gcl-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.gcl-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.gcl-sec{margin:12px 0;}
.gcl-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.gcl-pills{display:flex;flex-wrap:wrap;gap:6px;}
.gcl-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.gcl-pill-on{background:#dcfce7;border-color:#86efac;color:#166534;}
.gcl-pill-off{background:#fee2e2;border-color:#fca5a5;color:#991b1b;}
.gcl-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;}
.gcl-kv-k{font-size:12px;color:var(--fg-2,#888);min-width:130px;}
.gcl-kv-v{font-size:13px;font-family:ui-monospace,monospace;}
`;

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = {}; }

  // Support both v1 (linters.enable) and v2 (linters.default + linters.enable)
  const lintersSection = cfg.linters || {};
  const enabledLinters = Array.isArray(lintersSection.enable) ? lintersSection.enable : [];
  const disabledLinters = Array.isArray(lintersSection.disable) ? lintersSection.disable : [];
  const enableAll = lintersSection['enable-all'] === true;
  const disableAll = lintersSection['disable-all'] === true;
  const preset = lintersSection.default; // v2: "standard" | "all" | "none"

  // Run settings
  const runSection = cfg.run || {};
  const timeout = runSection.timeout || '';
  const buildTags = Array.isArray(runSection['build-tags']) ? runSection['build-tags'] : [];
  const goVersion = runSection.go || cfg['run']?.go || '';
  const skipDirs = Array.isArray(runSection['skip-dirs']) ? runSection['skip-dirs'] : [];

  // Issues
  const issuesSection = cfg.issues || {};
  const excludeRules = Array.isArray(issuesSection['exclude-rules']) ? issuesSection['exclude-rules'].length : 0;
  const excludePatterns = Array.isArray(issuesSection.exclude) ? issuesSection.exclude.length : 0;

  // Summary line
  const parts = [];
  if (enabledLinters.length) parts.push(`${enabledLinters.length} enabled`);
  if (disabledLinters.length) parts.push(`${disabledLinters.length} disabled`);
  if (enableAll) parts.push('all linters on');
  if (disableAll) parts.push('all linters off');
  if (timeout) parts.push(`timeout: ${timeout}`);

  const host = document.createElement('div');
  host.className = 'gcl-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="gcl-title"><span class="badge-gcl">golangci-lint</span>Lint config</div>
<div class="gcl-sub">${parts.join(' · ')}</div>

${preset ? `<div class="gcl-sec"><h3>Preset</h3><div class="gcl-pills"><span class="gcl-pill">${esc(preset)}</span></div></div>` : ''}

${enabledLinters.length ? `<div class="gcl-sec"><h3>Enabled Linters</h3><div class="gcl-pills">${enabledLinters.slice(0, 20).map((l) => `<span class="gcl-pill gcl-pill-on">${esc(l)}</span>`).join('')}${enabledLinters.length > 20 ? `<span class="gcl-pill">+${enabledLinters.length - 20} more</span>` : ''}</div></div>` : ''}

${disabledLinters.length ? `<div class="gcl-sec"><h3>Disabled Linters</h3><div class="gcl-pills">${disabledLinters.slice(0, 12).map((l) => `<span class="gcl-pill gcl-pill-off">${esc(l)}</span>`).join('')}${disabledLinters.length > 12 ? `<span class="gcl-pill">+${disabledLinters.length - 12} more</span>` : ''}</div></div>` : ''}

${timeout || goVersion || buildTags.length || skipDirs.length ? `<div class="gcl-sec"><h3>Run Settings</h3>
  ${timeout ? `<div class="gcl-kv"><span class="gcl-kv-k">Timeout</span><span class="gcl-kv-v">${esc(timeout)}</span></div>` : ''}
  ${goVersion ? `<div class="gcl-kv"><span class="gcl-kv-k">Go version</span><span class="gcl-kv-v">${esc(goVersion)}</span></div>` : ''}
  ${buildTags.length ? `<div class="gcl-kv"><span class="gcl-kv-k">Build tags</span><span class="gcl-kv-v">${esc(buildTags.join(', '))}</span></div>` : ''}
  ${skipDirs.length ? `<div class="gcl-kv"><span class="gcl-kv-k">Skip dirs</span><span class="gcl-kv-v">${esc(skipDirs.join(', '))}</span></div>` : ''}
</div>` : ''}

${excludeRules || excludePatterns ? `<div class="gcl-sec"><h3>Issue Exclusions</h3><div class="gcl-pills">${excludeRules ? `<span class="gcl-pill">${excludeRules} exclude rule${excludeRules !== 1 ? 's' : ''}</span>` : ''}${excludePatterns ? `<span class="gcl-pill">${excludePatterns} exclude pattern${excludePatterns !== 1 ? 's' : ''}</span>` : ''}</div></div>` : ''}
`;
  return { parentNode: host };
}
