import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.golangci-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-golangci{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#00acd7;color:#fff;vertical-align:middle;margin-right:8px;}
.golangci-title{font-size:18px;font-weight:700;margin:0 0 2px;}
.golangci-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.golangci-sec{margin:12px 0;}
.golangci-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.golangci-pills{display:flex;flex-wrap:wrap;gap:6px;}
.golangci-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.golangci-pill-on{background:#dcfce7;border-color:#86efac;color:#166534;}
.golangci-pill-off{background:#fee2e2;border-color:#fca5a5;color:#991b1b;}
.golangci-pill-blue{background:#eff6ff;border-color:#bfdbfe;color:#1e40af;}
.golangci-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;}
.golangci-kv-k{font-size:12px;color:var(--fg-2,#888);min-width:130px;}
.golangci-kv-v{font-size:13px;font-family:ui-monospace,monospace;}
`;

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = {}; }

  const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();

  // Support both v1 (linters.enable) and v2 (linters.default + linters.enable)
  const lintersSection = cfg.linters || {};
  const enabledLinters = Array.isArray(lintersSection.enable) ? lintersSection.enable : [];
  const disabledLinters = Array.isArray(lintersSection.disable) ? lintersSection.disable : [];
  const presets = Array.isArray(lintersSection.presets) ? lintersSection.presets : [];
  const enableAll = lintersSection['enable-all'] === true;
  const disableAll = lintersSection['disable-all'] === true;
  const preset = lintersSection.default; // v2: "standard" | "all" | "none"

  // Run settings
  const runSection = cfg.run || {};
  const timeout = runSection.timeout || '';
  const goVersion = runSection.go || '';
  const tests = runSection.tests;
  const parallelRunners = runSection['allow-parallel-runners'];

  // Issues
  const issuesSection = cfg.issues || {};
  const excludeRules = Array.isArray(issuesSection['exclude-rules']) ? issuesSection['exclude-rules'].length : 0;
  const maxIssuesPerLinter = issuesSection['max-issues-per-linter'];
  const maxSameIssues = issuesSection['max-same-issues'];

  // Summary
  const parts = [];
  if (enabledLinters.length) parts.push(`${enabledLinters.length} enabled`);
  if (disabledLinters.length) parts.push(`${disabledLinters.length} disabled`);
  if (enableAll) parts.push('all linters on');
  if (disableAll) parts.push('all linters off');
  if (goVersion) parts.push(`Go ${goVersion}`);
  if (timeout) parts.push(`timeout: ${timeout}`);

  const host = document.createElement('div');
  host.className = 'golangci-doc';

  // Go version chip
  const goChip = goVersion ? `<span style="display:inline-block;padding:2px 8px;border-radius:8px;font-size:11px;font-weight:600;background:#e0f7fa;color:#006064;border:1px solid #b2ebf2;margin-left:6px;font-family:ui-monospace,monospace">Go ${esc(goVersion)}</span>` : '';

  // Enabled linters (up to 15, then +N more)
  const enabledHtml = enabledLinters.length
    ? `<div class="golangci-sec"><h3>Enabled Linters</h3><div class="golangci-pills">${enabledLinters.slice(0, 15).map((l) => `<span class="golangci-pill golangci-pill-on">${esc(l)}</span>`).join('')}${enabledLinters.length > 15 ? `<span class="golangci-pill">+${enabledLinters.length - 15} more</span>` : ''}</div></div>` : '';

  // Disabled linters
  const disabledHtml = disabledLinters.length
    ? `<div class="golangci-sec"><h3>Disabled Linters</h3><div class="golangci-pills">${disabledLinters.slice(0, 12).map((l) => `<span class="golangci-pill golangci-pill-off">${esc(l)}</span>`).join('')}${disabledLinters.length > 12 ? `<span class="golangci-pill">+${disabledLinters.length - 12} more</span>` : ''}</div></div>` : '';

  // Presets
  const presetsHtml = presets.length
    ? `<div class="golangci-sec"><h3>Presets</h3><div class="golangci-pills">${presets.map((p) => `<span class="golangci-pill golangci-pill-blue">${esc(p)}</span>`).join('')}</div></div>` : '';

  // Preset (v2)
  const presetV2Html = preset
    ? `<div class="golangci-sec"><h3>Default Preset</h3><div class="golangci-pills"><span class="golangci-pill golangci-pill-blue">${esc(preset)}</span></div></div>` : '';

  // Run settings card
  const runItems = [];
  if (timeout) runItems.push(`<div class="golangci-kv"><span class="golangci-kv-k">Timeout</span><span class="golangci-kv-v">${esc(timeout)}</span></div>`);
  if (goVersion) runItems.push(`<div class="golangci-kv"><span class="golangci-kv-k">Go version</span><span class="golangci-kv-v">${esc(goVersion)}</span></div>`);
  if (tests !== undefined) runItems.push(`<div class="golangci-kv"><span class="golangci-kv-k">Tests</span><span class="golangci-kv-v">${tests ? 'yes' : 'no'}</span></div>`);
  if (parallelRunners !== undefined) runItems.push(`<div class="golangci-kv"><span class="golangci-kv-k">Parallel runners</span><span class="golangci-kv-v">${parallelRunners ? 'yes' : 'no'}</span></div>`);
  const runCard = runItems.length
    ? `<div class="golangci-sec"><h3>Run Settings</h3>${runItems.join('')}</div>` : '';

  // Issues card
  const issueItems = [];
  if (maxIssuesPerLinter !== undefined) issueItems.push(`<div class="golangci-kv"><span class="golangci-kv-k">Max per linter</span><span class="golangci-kv-v">${esc(maxIssuesPerLinter)}</span></div>`);
  if (maxSameIssues !== undefined) issueItems.push(`<div class="golangci-kv"><span class="golangci-kv-k">Max same issues</span><span class="golangci-kv-v">${esc(maxSameIssues)}</span></div>`);
  if (excludeRules) issueItems.push(`<div class="golangci-kv"><span class="golangci-kv-k">Exclude rules</span><span class="golangci-kv-v">${excludeRules}</span></div>`);
  const issuesCard = issueItems.length
    ? `<div class="golangci-sec"><h3>Issues</h3>${issueItems.join('')}</div>` : '';

  host.innerHTML = `<style>${CSS}</style>
<div class="golangci-title"><span class="badge-golangci">golangci-lint</span>${esc(name || '.golangci.yml')}${goChip}</div>
<div class="golangci-sub">${parts.join(' · ')}</div>
${enabledHtml}
${disabledHtml}
${presetsHtml}
${presetV2Html}
${runCard}
${issuesCard}`;

  return { parentNode: host };
}
